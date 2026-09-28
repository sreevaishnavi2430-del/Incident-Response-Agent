# Incident Response Agent

> Ingests alerts, correlates them against recent changes (deploys, config edits, commits, feature flags), and produces an evidence-backed root-cause hypothesis with a suggested first step — replacing 20+ minutes of manual digging across five tools with one deterministic pipeline.

**The core principle: a deterministic engine finds the evidence, AI only explains it.** Every diagnosis is traceable to specific, scored change events — never "the AI read some logs."

---

## Architecture

```
 alert webhook ──▶ 1. INGEST ──▶ 2. CHANGE HISTORY ──▶ 3. CORRELATION ENGINE ──▶ 4. TIMELINE
                                                     (rule-based, no AI)          │
                                                                                  ▼
                                        6. DASHBOARD ◀── 5. AI DIAGNOSIS ◀── scored evidence
                                        (React)          (Claude, cited)     trail
```

| Stage | Implementation | AI? |
|-------|----------------|-----|
| 1. Ingest signals | `POST /api/webhooks/alerts` (Datadog/PagerDuty-style JSON) + seeded stream | No |
| 2. Ingest change history | `changes` table: deploys, configs, commits, flags with timestamps + scope metadata | No |
| 3. Correlation engine | Same-service matching in a time window, **weighted 0–100 score** with per-factor breakdown | **No — deterministic** |
| 4. Incident timeline | Ordered evidence trail: correlated / considered / excluded verdicts per change | No |
| 5. AI diagnosis | Claude reads *only* the engine's correlated evidence, returns cited JSON hypothesis | Yes (only here) |
| 6. Dashboard | Incident list, scored timeline, diagnosis panel with click-through evidence, postmortem draft | — |

### The correlation score (the differentiator)

Each same-service change inside the window gets a 0–100 score:

| Factor | Max | Logic |
|--------|-----|-------|
| Temporal proximity | 30 | Exponential decay, 20-minute half-life — a change 4 min before the alert outweighs one 50 min before |
| Change type | 35 | deploys 1.0 > flags 0.9 > config 0.75 > commits 0.4 (historical incident-proneness) |
| Narrative overlap | 25 | Stem-aware keyword match between alert and change description ("gateway" ↔ "payment gateway timeout") |
| Blast radius | 10 | Production/global scope keywords boost risk |

Changes ≥ 45 are **correlated** (evidence); in-window changes below 45 are **considered** (shown transparently, never hidden); the rest are **excluded** decoys. All knobs live in `backend/config.py` or env vars.

The AI layer is *constrained* by the engine: it can only cite correlated change IDs (validated server-side), must use honest `low|medium|high` confidence (no fabricated percentages), and must never recommend auto-remediation. If no change correlates, the system says so explicitly instead of inventing a cause.

---

## Quickstart (zero configuration)

```bash
# Backend — no .env needed; seeds an in-memory demo dataset automatically
cd backend
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt   # Linux: .venv/bin/pip
.venv/Scripts/python -m pytest tests -q     # 33 tests
.venv/Scripts/python -m backend.app         # serves on :5000

# Frontend
cd frontend
npm install
npm run dev                                 # serves on :5173, proxies to :5000
```

Without `SUPABASE_URL`/`SUPABASE_KEY` the API runs on a seeded in-memory store; without `ANTHROPIC_API_KEY` the diagnosis layer degrades to an honest rule-based fallback (labelled `deterministic-fallback` in the UI). Perfect for offline demos — add keys to go live.

## Demo dataset

Five scenarios, timestamps generated **relative to startup** so the demo is always fresh:

1. **checkout-service** — deploy + feature-flag combo with decoys (classic multi-cause)
2. **auth-api** — JWT key rotation without grace window (single clear cause, pre-resolved)
3. **inventory-worker** — blocking commit misdiagnosed as a scaling problem (pre-diagnosed)
4. **search-indexer** — config-driven memory creep (open; diagnosis auto-runs on view)
5. **payments-ledger** — failure with **no** correlated change (the honest null result)

Plus four **replayable scenarios** ("Simulate alert" button) that flow through the real webhook ingest path live.

## API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Liveness + store type |
| GET | `/api/stats` | Dashboard aggregates (correlation rate, avg top score) |
| GET | `/api/incidents` | Summaries with correlated counts + top scores |
| GET | `/api/incidents/<id>` | Full detail: alert, scored timeline, correlation summary, diagnosis |
| GET | `/api/diagnose/<id>` | Stored diagnosis (404 = pending) |
| POST | `/api/diagnose/<id>` | Run AI reasoning (cached afterwards) |
| POST | `/api/incidents/<id>/status` | Lifecycle: `open` / `diagnosed` / `resolved` |
| POST | `/api/incidents/<id>/postmortem` | Markdown postmortem draft |
| POST | `/api/webhooks/alerts` | Real alert ingest — runs the pipeline immediately |
| GET | `/api/simulate/scenarios` | Bundled demo scenarios |
| POST | `/api/simulate/<key>` | Replay a scenario through the webhook path |

Webhook example:

```bash
curl -X POST localhost:5000/api/webhooks/alerts -H "Content-Type: application/json" -d '{
  "service": "checkout-service",
  "description": "5xx rate on /checkout spiked to 22%",
  "severity": "high",
  "source": "datadog-monitor",
  "changes": [{"change_type": "deploy", "description": "v2.15.0 deployed to production", "minutes_before_alert": 6}]
}'
```

## Optional: Supabase persistence

1. Run `backend/schema.sql` in the Supabase SQL editor.
2. Fill `SUPABASE_URL` / `SUPABASE_KEY` in `.env` (copy `.env.example`).
3. Optionally seed: `python -m backend.seed_supabase`.

## Demo script (90 seconds)

1. Open the dashboard — point out **real stats**: correlation rate, avg engine score, honest "no fabricated percentages" confidence badges.
2. Open incident **#1**: timeline shows the deploy (71/100) and flag (88/100) correlated, two decoys excluded — with the engine's reasons printed under each correlated change.
3. Click an evidence chip in the diagnosis → timeline scrolls and flashes the exact change. *"Every AI claim traces to a scored event."*
4. Press **Simulate alert → Checkout 5xx spike**: a new incident flows through the webhook ingest, engine correlates 2 changes, diagnosis auto-runs.
5. Press **Simulate alert → Ledger failure (no recent change)**: show the AI explicitly *refusing* to invent a cause — trust through honesty.
6. Resolve the incident (human-in-the-loop), then draft the postmortem.

## Honest framing

Incidents and change events are simulated (seeded + replayable) rather than pulled from a live observability stack — the correlation and diagnosis pipeline is fully functional and plugs into real Datadog/PagerDuty/GitHub Actions webhooks with no architectural changes.

## Project layout

```
backend/
  app.py               Flask API (all endpoints)
  correlation.py       Deterministic scoring engine (no AI)
  diagnosis.py         AI reasoning layer + postmortems (only LLM usage)
  incident_service.py  Business logic: ingest, lifecycle, stats, simulation
  store.py             Store abstraction: Supabase or in-memory
  seed.py              Demo dataset + replay scenarios
  schema.sql           Postgres/Supabase schema
  tests/               33 pytest tests (engine + full API)
frontend/
  src/api.js           Single API abstraction (mock/live switch)
  src/pages/           Incident list + detail
  src/components/      Timeline, diagnosis panel, stat cards, badges
```
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
