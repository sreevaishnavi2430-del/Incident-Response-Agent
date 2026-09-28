// API Abstraction Layer for Incident Response Agent
// All components call this module exclusively.
// The Flask backend self-seeds an in-memory demo dataset when Supabase is not
// configured, so USE_REAL_BACKEND can stay true in almost every environment.
// Dummy mode (VITE_USE_REAL_BACKEND=false) still works for UI-only demos.

import { DUMMY_INCIDENTS, DUMMY_DIAGNOSES, DUMMY_POSTMORTEMS } from './dummyData';

export const USE_REAL_BACKEND = import.meta.env.VITE_USE_REAL_BACKEND !== 'false';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const SIMULATED_LATENCY_MS = 450;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body */
    }
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

/**
 * GET /api/stats
 * Aggregates for the dashboard stat cards.
 */
export async function getStats() {
  if (USE_REAL_BACKEND) {
    return request('/api/stats');
  }
  await delay(SIMULATED_LATENCY_MS);
  return {
    total_incidents: DUMMY_INCIDENTS.length,
    open: DUMMY_INCIDENTS.filter((i) => i.status === 'open').length,
    diagnosed: DUMMY_INCIDENTS.filter((i) => i.status === 'diagnosed').length,
    resolved: DUMMY_INCIDENTS.filter((i) => i.status === 'resolved').length,
    high_severity: DUMMY_INCIDENTS.filter((i) => i.severity === 'high').length,
    incidents_with_correlated_changes: DUMMY_INCIDENTS.filter((i) => i.changes.some((c) => c.correlated)).length,
    correlation_rate: 0.8,
    avg_top_score: 71,
    pipeline: 'online'
  };
}

/**
 * GET /api/incidents
 * Returns array of incident summaries for the incident list page.
 */
export async function getIncidents() {
  if (USE_REAL_BACKEND) {
    return request('/api/incidents');
  }

  await delay(SIMULATED_LATENCY_MS);
  return DUMMY_INCIDENTS.map((inc) => ({
    id: inc.id,
    service: inc.service,
    alert_description: inc.alert_description,
    severity: inc.severity,
    fired_at: inc.fired_at,
    status: inc.status,
    correlated_count: inc.changes.filter((c) => c.correlated).length,
    top_score: inc.changes.find((c) => c.correlated)?.correlation_score ?? 0,
    diagnosed: Boolean(DUMMY_DIAGNOSES[inc.id])
  }));
}

/**
 * GET /api/incidents/:id
 * Returns full incident with alert metadata and scored change timeline.
 */
export async function getIncident(id) {
  if (USE_REAL_BACKEND) {
    return request(`/api/incidents/${id}`);
  }

  await delay(SIMULATED_LATENCY_MS);
  const found = DUMMY_INCIDENTS.find((inc) => inc.id === String(id));
  if (!found) {
    const error = new Error(`Incident #${id} not found`);
    error.status = 404;
    throw error;
  }
  return {
    id: found.id,
    service: found.service,
    status: found.status,
    correlation: {
      window_minutes: 60,
      engine: 'deterministic-rule-engine-v2',
      correlated_change_ids: found.changes.filter((c) => c.correlated).map((c) => c.id),
      correlated_count: found.changes.filter((c) => c.correlated).length,
      considered_count: found.changes.filter((c) => !c.correlated && c.minutes_before_alert >= 0).length,
      excluded_count: found.changes.filter((c) => c.minutes_before_alert < 0).length
    },
    alert: found.alert,
    changes: found.changes.map((change) => ({
      ...change,
      correlation_score: change.correlation_score ?? (change.correlated ? 72 : 18),
      score_components: change.score_components ?? { temporal: 0, change_type: 0, keywords: 0, blast_radius: 0 },
      correlation_reasons: change.correlation_reasons ?? [],
      engine_verdict: change.correlated ? 'correlated' : 'excluded'
    })),
    diagnosis: DUMMY_DIAGNOSES[found.id]
      ? { ...DUMMY_DIAGNOSES[found.id], model: 'seed-reference' }
      : null
  };
}

/**
 * POST /api/diagnose/:id
 * Runs the AI reasoning layer over the correlated timeline and returns the
 * structured diagnosis. Second call returns the cached diagnosis.
 */
export async function runDiagnosis(id) {
  if (USE_REAL_BACKEND) {
    return request(`/api/diagnose/${id}`, { method: 'POST' });
  }

  await delay(SIMULATED_LATENCY_MS + 550);
  const diagnosis = DUMMY_DIAGNOSES[String(id)];
  if (!diagnosis) {
    return {
      root_cause_summary:
        'No recent change to this service correlates with the alert inside the 60-minute window, so no change-based root cause is currently supported by the evidence.',
      confidence: 'low',
      suggested_action:
        'Inspect service logs, dependency health, and metric history before attempting any remediation. Human approval required for any change.',
      evidence_change_ids: [],
      model: 'deterministic-fallback'
    };
  }
  return { ...diagnosis, cached: false };
}

/**
 * POST /api/incidents/:id/status
 * Update incident lifecycle status (open | diagnosed | resolved).
 */
export async function setIncidentStatus(id, status) {
  if (USE_REAL_BACKEND) {
    return request(`/api/incidents/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  }
  await delay(250);
  const incident = DUMMY_INCIDENTS.find((inc) => inc.id === String(id));
  if (incident) incident.status = status;
  return { id, status };
}

/**
 * POST /api/incidents/:id/postmortem
 * Returns { postmortem_text, model } Markdown draft.
 */
export async function getPostmortem(id) {
  if (USE_REAL_BACKEND) {
    return request(`/api/incidents/${id}/postmortem`, { method: 'POST' });
  }

  await delay(SIMULATED_LATENCY_MS + 400);
  const text = DUMMY_POSTMORTEMS[String(id)] ||
    `### Incident Postmortem: #${id}\n\nAutomated postmortem draft generated for service. Cause investigation completed.`;
  return { postmortem_text: text, model: 'seed-reference' };
}

/**
 * GET /api/simulate/scenarios
 * Bundled replay scenarios for the live demo.
 */
export async function getSimulateScenarios() {
  if (USE_REAL_BACKEND) {
    return request('/api/simulate/scenarios');
  }
  await delay(200);
  return [
    { key: 'checkout', label: 'Checkout 5xx spike (deploy + flag combo)', service: 'checkout-service' },
    { key: 'auth', label: 'Auth token failures (key rotation)', service: 'auth-api' },
    { key: 'inventory', label: 'Kafka consumer lag (blocking commit)', service: 'inventory-worker' },
    { key: 'unexplained', label: 'Ledger failure with NO recent change (honest null result)', service: 'payments-ledger' }
  ];
}

/**
 * POST /api/simulate/:key
 * Replays a bundled scenario through the webhook ingest path and returns the
 * newly created incident detail.
 */
export async function runSimulation(scenarioKey) {
  if (USE_REAL_BACKEND) {
    return request(`/api/simulate/${scenarioKey}`, { method: 'POST' });
  }
  await delay(700);
  const incident = DUMMY_INCIDENTS[0];
  return {
    incident_id: incident.id,
    correlated_count: incident.changes.filter((c) => c.correlated).length,
    incident: { ...incident, status: 'open', diagnosis: null }
  };
}
