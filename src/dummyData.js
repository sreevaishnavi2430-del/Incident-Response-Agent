// Seeded realistic incidents matching backend data contracts exactly

export const DUMMY_INCIDENTS = [
  {
    id: "1",
    service: "checkout-service",
    alert_description: "5xx rate on /checkout spiked to 18.4%",
    severity: "high", // "high" | "medium" | "low"
    fired_at: "2026-09-20T14:32:00Z",
    status: "diagnosed", // "open" | "diagnosed" | "resolved"
    alert: {
      description: "5xx rate on /checkout spiked to 18.4%",
      severity: "high",
      fired_at: "2026-09-20T14:32:00Z"
    },
    changes: [
      {
        id: "1",
        change_type: "deploy", // "deploy" | "config" | "commit" | "feature_flag"
        description: "v2.14.0 — updated payment gateway timeout from 5s to 2s",
        changed_at: "2026-09-20T14:28:00Z",
        correlated: true
      },
      {
        id: "2",
        change_type: "feature_flag",
        description: "flag:enable_new_stripe_sdk enabled for 10% production checkout traffic",
        changed_at: "2026-09-20T14:29:30Z",
        correlated: true
      },
      {
        id: "3",
        change_type: "config",
        description: "Increased Redis cache TTL from 300s to 3600s",
        changed_at: "2026-09-20T13:50:00Z",
        correlated: false
      },
      {
        id: "4",
        change_type: "commit",
        description: "chore(deps): bump billing-client-proto to v1.4.2",
        changed_at: "2026-09-20T13:15:00Z",
        correlated: false
      }
    ]
  },
  {
    id: "2",
    service: "auth-api",
    alert_description: "Token verification failure rate exceeds 42% on /oauth/verify",
    severity: "high",
    fired_at: "2026-09-20T16:15:20Z",
    status: "diagnosed",
    alert: {
      description: "Token verification failure rate exceeds 42% on /oauth/verify",
      severity: "high",
      fired_at: "2026-09-20T16:15:20Z"
    },
    changes: [
      {
        id: "5",
        change_type: "config",
        description: "Rotated RSA JWT verification public key in AWS Secrets Manager without grace window",
        changed_at: "2026-09-20T16:11:45Z",
        correlated: true
      },
      {
        id: "6",
        change_type: "deploy",
        description: "v1.8.9 — minor security patch on bcrypt library and session store",
        changed_at: "2026-09-20T15:30:00Z",
        correlated: false
      },
      {
        id: "7",
        change_type: "commit",
        description: "refactor(tokens): optimize claims deserialization loop",
        changed_at: "2026-09-20T14:55:00Z",
        correlated: false
      },
      {
        id: "8",
        change_type: "feature_flag",
        description: "flag:enforce_strict_origin_header enabled for internal microservices",
        changed_at: "2026-09-20T14:00:00Z",
        correlated: false
      }
    ]
  },
  {
    id: "3",
    service: "inventory-worker",
    alert_description: "Kafka consumer lag backlog on 'order-events' surpassed 120,000 messages",
    severity: "medium",
    fired_at: "2026-09-20T18:05:00Z",
    status: "diagnosed",
    alert: {
      description: "Kafka consumer lag backlog on 'order-events' surpassed 120,000 messages",
      severity: "medium",
      fired_at: "2026-09-20T18:05:00Z"
    },
    changes: [
      {
        id: "9",
        change_type: "deploy",
        description: "v3.4.1 — scaled worker deployment replica count from 4 to 8 pods",
        changed_at: "2026-09-20T18:01:00Z",
        correlated: true
      },
      {
        id: "10",
        change_type: "commit",
        description: "feat(sync): add synchronous HTTP call to legacy ERP warehouse audit API per order item",
        changed_at: "2026-09-20T17:58:10Z",
        correlated: true
      },
      {
        id: "11",
        change_type: "config",
        description: "Updated PostgreSQL connection pool max connections to 60",
        changed_at: "2026-09-20T16:45:00Z",
        correlated: false
      }
    ]
  },
  {
    id: "4",
    service: "search-indexer",
    alert_description: "Memory utilization on search-indexer-pod-02 reached 92% (OOM threat)",
    severity: "low",
    fired_at: "2026-09-20T19:40:00Z",
    status: "open", // Active / Pending diagnosis incident
    alert: {
      description: "Memory utilization on search-indexer-pod-02 reached 92% (OOM threat)",
      severity: "low",
      fired_at: "2026-09-20T19:40:00Z"
    },
    changes: [
      {
        id: "12",
        change_type: "deploy",
        description: "v1.12.0 — batch indexer buffer size adjusted from 256MB to 1024MB",
        changed_at: "2026-09-20T19:35:10Z",
        correlated: true
      },
      {
        id: "13",
        change_type: "config",
        description: "Elasticsearch heap limit set to 4GB in container spec",
        changed_at: "2026-09-20T18:30:00Z",
        correlated: false
      }
    ]
  }
];

export const DUMMY_DIAGNOSES = {
  "1": {
    root_cause_summary: "The payment gateway timeout reduction (5s -> 2s) combined with enabling the new Stripe SDK caused legitimate checkout requests under load to abort before completing downstream handshakes.",
    confidence: "high", // "high" | "medium" | "low"
    suggested_action: "Revert the timeout change in Helm values back to 5s and toggle off feature flag 'enable_new_stripe_sdk'.",
    evidence_change_ids: ["1", "2"]
  },
  "2": {
    root_cause_summary: "New RSA JWT public key was rotated in Secrets Manager without a dual-key grace period, causing tokens signed by the previous key to immediately fail signature verification across all active user sessions.",
    confidence: "high",
    suggested_action: "Re-introduce the legacy public key into the JWKS endpoint keystore to validate existing unexpired tokens alongside the new key.",
    evidence_change_ids: ["5"]
  },
  "3": {
    root_cause_summary: "Adding a synchronous external ERP HTTP call inside the Kafka event processing loop introduced ~450ms blocking latency per message, exhausting consumer concurrency despite scaling to 8 pods.",
    confidence: "medium",
    suggested_action: "Roll back commit #10 or wrap the ERP audit call into an asynchronous decoupled background task queue.",
    evidence_change_ids: ["10"]
  }
  // Incident "4" has NO diagnosis yet — explicitly used to test "diagnosis pending" state!
};

export const DUMMY_POSTMORTEMS = {
  "1": `### Incident Postmortem: #1 — Checkout Service Outage

**Incident Period:** 2026-09-20 14:32:00 UTC - 2026-09-20 14:48:00 UTC (16 mins)  
**Impact:** 18.4% of checkout requests failed with 504 Gateway Timeouts. Estimated 420 dropped transactions.  
**Severity:** HIGH / P1  

#### 1. Root Cause
At 14:28 UTC, release v2.14.0 reduced the upstream payment gateway timeout parameter from 5s to 2s. Ninety seconds later, feature flag \`enable_new_stripe_sdk\` routed 10% of checkout traffic to the upgraded integration, which exhibited a p99 latency of 2.8s under current network conditions. This combination caused requests to time out prematurely at the API gateway layer.

#### 2. Correlated Evidence
- **Change #1 (Deploy @ 14:28:00Z):** v2.14.0 — updated payment gateway timeout from 5s to 2s
- **Change #2 (Feature Flag @ 14:29:30Z):** flag:enable_new_stripe_sdk enabled for 10% production checkout traffic

#### 3. Resolution & Mitigation
The on-call team reverted the payment gateway timeout back to 5.0 seconds and disabled the feature flag. Error rates normalized within 90 seconds of deploy rollback.

#### 4. Action Items & Prevention
1. Enforce automated integration latency benchmark tests in staging prior to reducing timeout thresholds.
2. Add circuit breaker telemetry to decouple third-party payment SDK response fluctuations.`,

  "2": `### Incident Postmortem: #2 — Auth API JWT Verification Spike

**Incident Period:** 2026-09-20 16:15:20 UTC - 2026-09-20 16:32:10 UTC (17 mins)  
**Impact:** 42% authentication failures across all internal and user OAuth sessions.  
**Severity:** HIGH / P1  

#### 1. Root Cause
Secrets Manager key rotation at 16:11 UTC replaced the RSA verification public key immediately without maintaining the prior key in the active JWKS verification set. Active client bearer tokens minted in the previous 2 hours failed signature checking.

#### 2. Correlated Evidence
- **Change #5 (Config @ 16:11:45Z):** Rotated RSA JWT verification public key in AWS Secrets Manager without grace window

#### 3. Action Items & Prevention
1. Implement a 24-hour overlapping dual-key JWKS rotation schedule.
2. Add automated validation canary before retiring previous public key pairs.`,

  "3": `### Incident Postmortem: #3 — Inventory Consumer Backlog

**Incident Period:** 2026-09-20 18:05:00 UTC - 2026-09-20 18:28:00 UTC (23 mins)  
**Impact:** Kafka lag reached 120,000 unhandled order messages, delaying shipment packing manifests by 25 minutes.  
**Severity:** MEDIUM / P2  

#### 1. Root Cause
Commit #10 introduced a blocking synchronous REST call to the legacy ERP warehouse audit service directly inside the single-threaded Kafka consumer loop, multiplying processing time by 8x.

#### 2. Correlated Evidence
- **Change #10 (Commit @ 17:58:10Z):** feat(sync): add synchronous HTTP call to legacy ERP warehouse audit API per order item

#### 3. Action Items & Prevention
1. Shift external ERP auditing to an asynchronous Celery / worker task queue.
2. Add linter check forbidding blocking HTTP calls inside stream message handlers.`
};
