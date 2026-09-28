"""Demo dataset + live simulation scenarios.

Timestamps are generated relative to "now" so the demo always shows fresh,
realistic incidents regardless of when the backend was started. Row IDs are
deterministic so tests and the frontend can rely on them.

Five scenarios cover the interesting diagnosis cases:
  1. checkout-service - classic deploy + feature-flag combo (two strong causes)
  2. auth-api         - config change, single clear cause (pre-resolved)
  3. inventory-worker - commit introduced a blocking call (pre-diagnosed)
  4. search-indexer   - memory creep after config change (open / pending diagnosis)
  5. payments-ledger  - alert with NO correlated change in the window; the
                        pipeline must honestly say "no recent change found"
                        instead of inventing a cause.

`SIMULATION_SCENARIOS` mirrors the same scenarios as alert payloads so the
"Simulate incoming alert" button can replay them through the webhook like a
real Datadog/PagerDuty integration would.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

SEED_SERVICES = [
    {"id": "svc-checkout", "name": "checkout-service", "owner": "payments-team", "tier": "tier-1"},
    {"id": "svc-auth", "name": "auth-api", "owner": "identity-team", "tier": "tier-1"},
    {"id": "svc-inventory", "name": "inventory-worker", "owner": "fulfilment-team", "tier": "tier-2"},
    {"id": "svc-search", "name": "search-indexer", "owner": "discovery-team", "tier": "tier-3"},
    {"id": "svc-ledger", "name": "payments-ledger", "owner": "payments-team", "tier": "tier-1"},
]


def _iso(minutes_ago: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)).isoformat().replace("+00:00", "Z")


def build_seed_rows(now: datetime | None = None) -> dict[str, list[dict]]:
    """Build the full demo dataset relative to `now` (defaults to actual now)."""
    base = now or datetime.now(timezone.utc)

    def iso(minutes_ago: float) -> str:
        return (base - timedelta(minutes=minutes_ago)).isoformat().replace("+00:00", "Z")

    alerts = [
        {
            "id": "alert-1",
            "service_id": "svc-checkout",
            "source": "datadog-monitor",
            "description": "5xx rate on /checkout spiked to 18.4%",
            "severity": "high",
            "fired_at": iso(8),
        },
        {
            "id": "alert-2",
            "service_id": "svc-auth",
            "source": "pagerduty",
            "description": "Token verification failure rate exceeds 42% on /oauth/verify",
            "severity": "high",
            "fired_at": iso(35),
        },
        {
            "id": "alert-3",
            "service_id": "svc-inventory",
            "source": "prometheus-alertmanager",
            "description": "Kafka consumer lag on 'order-events' surpassed 120,000 messages",
            "severity": "medium",
            "fired_at": iso(22),
        },
        {
            "id": "alert-4",
            "service_id": "svc-search",
            "source": "datadog-monitor",
            "description": "Memory utilization on search-indexer-pod-02 reached 92% (OOM threat)",
            "severity": "low",
            "fired_at": iso(4),
        },
        {
            "id": "alert-5",
            "service_id": "svc-ledger",
            "source": "cloudwatch-alarm",
            "description": "Ledger reconciliation job failed: checksum mismatch on nightly batch",
            "severity": "medium",
            "fired_at": iso(51),
        },
    ]

    changes = [
        # --- scenario 1: checkout (deploy + flag combo, plus decoys) ---
        {
            "id": "chg-1",
            "service_id": "svc-checkout",
            "change_type": "deploy",
            "actor": "ci-bot",
            "description": "v2.14.0 deployed to production - updated payment gateway timeout from 5s to 2s",
            "changed_at": iso(12),
            "metadata": {"version": "v2.14.0", "scope": "production", "pipeline": "github-actions"},
        },
        {
            "id": "chg-2",
            "service_id": "svc-checkout",
            "change_type": "feature_flag",
            "actor": "j.reyes",
            "description": "flag:enable_new_stripe_sdk enabled for 10% of production checkout traffic",
            "changed_at": iso(10.5),
            "metadata": {"flag": "enable_new_stripe_sdk", "rollout": "10%", "scope": "production"},
        },
        {
            "id": "chg-3",
            "service_id": "svc-checkout",
            "change_type": "config",
            "actor": "m.okafor",
            "description": "Increased Redis cache TTL from 300s to 3600s",
            "changed_at": iso(42),
            "metadata": {"key": "cache_ttl"},
        },
        {
            "id": "chg-4",
            "service_id": "svc-checkout",
            "change_type": "commit",
            "actor": "d.chen",
            "description": "chore(deps): bump billing-client-proto to v1.4.2",
            "changed_at": iso(77),
            "metadata": {"sha": "9f31c2a"},
        },
        # --- scenario 2: auth (single clear config cause, outside window decoys) ---
        {
            "id": "chg-5",
            "service_id": "svc-auth",
            "change_type": "config",
            "actor": "s.novak",
            "description": "Rotated RSA JWT verification public key in AWS Secrets Manager without grace window",
            "changed_at": iso(39),
            "metadata": {"scope": "global", "secret": "auth/jwt/public-key"},
        },
        {
            "id": "chg-6",
            "service_id": "svc-auth",
            "change_type": "deploy",
            "actor": "ci-bot",
            "description": "v1.8.9 deployed - minor security patch on bcrypt library and session store",
            "changed_at": iso(96),
            "metadata": {"version": "v1.8.9"},
        },
        {
            "id": "chg-7",
            "service_id": "svc-auth",
            "change_type": "feature_flag",
            "actor": "s.novak",
            "description": "flag:enforce_strict_origin_header enabled for internal microservices",
            "changed_at": iso(135),
            "metadata": {"flag": "enforce_strict_origin_header"},
        },
        # --- scenario 3: inventory (commit + misleading scale-up) ---
        {
            "id": "chg-8",
            "service_id": "svc-inventory",
            "change_type": "commit",
            "actor": "a.dubois",
            "description": "feat(sync): add synchronous HTTP call to legacy ERP warehouse audit API per order item",
            "changed_at": iso(29),
            "metadata": {"sha": "4bd0e91"},
        },
        {
            "id": "chg-9",
            "service_id": "svc-inventory",
            "change_type": "deploy",
            "actor": "k8s-operator",
            "description": "v3.4.1 deployed - scaled worker deployment replica count from 4 to 8 pods",
            "changed_at": iso(26),
            "metadata": {"version": "v3.4.1", "scope": "production"},
        },
        {
            "id": "chg-10",
            "service_id": "svc-inventory",
            "change_type": "config",
            "actor": "a.dubois",
            "description": "Updated PostgreSQL connection pool max connections to 60",
            "changed_at": iso(88),
            "metadata": {"key": "pool_max"},
        },
        # --- scenario 4: search indexer (open incident, config cause) ---
        {
            "id": "chg-11",
            "service_id": "svc-search",
            "change_type": "config",
            "actor": "l.hartman",
            "description": "Elasticsearch indexer batch buffer size raised from 256MB to 1024MB in production config",
            "changed_at": iso(6),
            "metadata": {"key": "batch_buffer", "scope": "production"},
        },
        {
            "id": "chg-12",
            "service_id": "svc-search",
            "change_type": "deploy",
            "actor": "ci-bot",
            "description": "v1.12.0 deployed - nightly reindex schedule moved from 02:00 to 00:30 UTC",
            "changed_at": iso(70),
            "metadata": {"version": "v1.12.0"},
        },
        # --- scenario 5: ledger - noise only, nothing inside the window ---
        {
            "id": "chg-13",
            "service_id": "svc-ledger",
            "change_type": "commit",
            "actor": "t.iqbal",
            "description": "docs(runbook): clarify reconciliation checksum escalation steps",
            "changed_at": iso(150),
            "metadata": {"sha": "e7710d3"},
        },
        {
            "id": "chg-14",
            "service_id": "svc-ledger",
            "change_type": "config",
            "actor": "t.iqbal",
            "description": "Bumped nightly batch size from 10k to 25k records",
            "changed_at": iso(140),
            "metadata": {"key": "batch_size"},
        },
    ]

    incidents = [
        {
            "id": "inc-1",
            "alert_id": "alert-1",
            "correlated_change_ids": ["chg-1", "chg-2"],
            "status": "diagnosed",
        },
        {
            "id": "inc-2",
            "alert_id": "alert-2",
            "correlated_change_ids": ["chg-5"],
            "status": "resolved",
        },
        {
            "id": "inc-3",
            "alert_id": "alert-3",
            "correlated_change_ids": ["chg-8", "chg-9"],
            "status": "diagnosed",
        },
        {
            "id": "inc-4",
            "alert_id": "alert-4",
            "correlated_change_ids": ["chg-11"],
            "status": "open",
        },
        {
            "id": "inc-5",
            "alert_id": "alert-5",
            "correlated_change_ids": [],
            "status": "open",
        },
    ]

    diagnoses = [
        {
            "id": "diag-1",
            "incident_id": "inc-1",
            "root_cause_summary": "The payment gateway timeout reduction (5s to 2s) deployed 4 minutes before the alert combined with the enable_new_stripe_sdk rollout routed live traffic through an SDK path with p99 latency above the new ceiling, aborting legitimate checkout requests mid-handshake.",
            "confidence": "high",
            "suggested_action": "Revert the gateway timeout to 5s in Helm values and disable flag enable_new_stripe_sdk for production traffic; a human must approve the rollback before execution.",
            "evidence_change_ids": ["chg-1", "chg-2"],
            "generated_at": iso(7),
            "model": "seed-reference",
        },
        {
            "id": "diag-2",
            "incident_id": "inc-2",
            "root_cause_summary": "JWT verification public key was rotated without a dual-key grace window, so bearer tokens signed by the previous key failed signature checks immediately, driving 42% verification failures.",
            "confidence": "high",
            "suggested_action": "Re-add the previous public key to the JWKS keystore with a 24h overlap; rotate out after token expiry. Requires on-call approval.",
            "evidence_change_ids": ["chg-5"],
            "generated_at": iso(33),
            "model": "seed-reference",
        },
        {
            "id": "diag-3",
            "incident_id": "inc-3",
            "root_cause_summary": "A commit added a synchronous HTTP call to the legacy ERP audit API inside the Kafka consumer loop, multiplying per-message processing time roughly 8x and exhausting consumer concurrency even after scaling to 8 pods.",
            "confidence": "medium",
            "suggested_action": "Roll back commit 4bd0e91 or move the ERP audit call to an async task queue; operator approval required before rollback.",
            "evidence_change_ids": ["chg-8"],
            "generated_at": iso(20),
            "model": "seed-reference",
        },
    ]

    return {
        "services": [dict(row) for row in SEED_SERVICES],
        "alerts": alerts,
        "changes": changes,
        "incidents": incidents,
        "diagnoses": diagnoses,
    }


def ensure_seeded(store=None) -> None:
    """Populate the given store (or the shared in-memory one) with demo data if empty."""
    from .store import InMemoryStore

    target = store or _default_memory_store()
    if isinstance(target, InMemoryStore) and target.count("incidents") == 0:
        rows = build_seed_rows()
        for table in ("services", "alerts", "changes", "incidents", "diagnoses"):
            for row in rows[table]:
                target.insert(table, row)


_memory_singleton: InMemoryStore | None = None


def _default_memory_store() -> InMemoryStore:
    global _memory_singleton
    if _memory_singleton is None:
        from .store import InMemoryStore as _Store

        _memory_singleton = _Store()
    return _memory_singleton


def get_memory_store() -> InMemoryStore:
    """The shared in-memory store instance used when Supabase is not configured."""
    memory = _default_memory_store()
    ensure_seeded(memory)
    return memory


def _iso_compat(minutes_ago: float) -> str:
    """Public helper reused by simulation scenarios."""
    return _iso(minutes_ago)


# ---------------------------------------------------------------------------
# Webhook-replayable scenarios for the "simulate incoming alert" demo button.
# ---------------------------------------------------------------------------

SIMULATION_SCENARIOS: list[dict] = [
    {
        "key": "checkout",
        "label": "Checkout 5xx spike (deploy + flag combo)",
        "service": "checkout-service",
        "payload": {
            "source": "datadog-monitor",
            "description": "5xx rate on /checkout spiked to 23.1% (rising)",
            "severity": "high",
        },
        # Fresh pre-alert changes replayed into the change log, like CI would emit.
        "changes": [
            {
                "change_type": "deploy",
                "actor": "ci-bot",
                "description": "v2.15.0-rc.3 deployed to production - payment gateway timeout lowered to 2s again",
                "minutes_before_alert": 6,
                "metadata": {"version": "v2.15.0-rc.3", "scope": "production"},
            },
            {
                "change_type": "feature_flag",
                "actor": "j.reyes",
                "description": "flag:enable_new_stripe_sdk re-enabled for 25% of production traffic",
                "minutes_before_alert": 4.5,
                "metadata": {"flag": "enable_new_stripe_sdk", "rollout": "25%", "scope": "production"},
            },
        ],
    },
    {
        "key": "auth",
        "label": "Auth token failures (key rotation)",
        "service": "auth-api",
        "payload": {
            "source": "pagerduty",
            "description": "Token verification failure rate exceeds 55% on /oauth/verify",
            "severity": "high",
        },
        "changes": [
            {
                "change_type": "config",
                "actor": "s.novak",
                "description": "Rotated RSA JWT verification public key in AWS Secrets Manager (no overlap window)",
                "minutes_before_alert": 3,
                "metadata": {"scope": "global", "secret": "auth/jwt/public-key"},
            },
        ],
    },
    {
        "key": "inventory",
        "label": "Kafka consumer lag (blocking commit)",
        "service": "inventory-worker",
        "payload": {
            "source": "prometheus-alertmanager",
            "description": "Kafka consumer lag on 'order-events' surpassed 200,000 messages",
            "severity": "medium",
        },
        "changes": [
            {
                "change_type": "commit",
                "actor": "a.dubois",
                "description": "feat(sync): synchronous ERP warehouse audit call added per order item",
                "minutes_before_alert": 11,
                "metadata": {"sha": "7c2f9ab"},
            },
        ],
    },
    {
        "key": "unexplained",
        "label": "Ledger failure with NO recent change (honest null result)",
        "service": "payments-ledger",
        "payload": {
            "source": "cloudwatch-alarm",
            "description": "Ledger reconciliation job failed: duplicate entry detected in daily rollup",
            "severity": "medium",
        },
        "changes": [],
    },
]
