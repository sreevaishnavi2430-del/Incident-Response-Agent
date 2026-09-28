// API Abstraction Layer for Incident Response Agent
// All components call this module exclusively.
// Swapping between mock data and real backend endpoints only requires updating this file.

import { DUMMY_INCIDENTS, DUMMY_DIAGNOSES, DUMMY_POSTMORTEMS } from './dummyData';

// Toggle between simulated dummy data and real backend API
// Set to true to call Flask endpoints, or false to use seeded dummy data with realistic delay
export const USE_REAL_BACKEND = false;
export const API_BASE_URL = 'http://localhost:5000';

const SIMULATED_LATENCY_MS = 450;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GET /api/incidents
 * Returns array of incident summaries for the incident list page.
 */
export async function getIncidents() {
  if (USE_REAL_BACKEND) {
    const res = await fetch(`${API_BASE_URL}/api/incidents`);
    if (!res.ok) {
      throw new Error(`Failed to fetch incidents (HTTP ${res.status})`);
    }
    return await res.json();
  }

  // Simulated backend response
  await delay(SIMULATED_LATENCY_MS);
  return DUMMY_INCIDENTS.map((inc) => ({
    id: inc.id,
    service: inc.service,
    alert_description: inc.alert_description,
    severity: inc.severity,
    fired_at: inc.fired_at,
    status: inc.status
  }));
}

/**
 * GET /api/incidents/:id
 * Returns full incident with alert metadata and recent changes.
 */
export async function getIncident(id) {
  if (USE_REAL_BACKEND) {
    const res = await fetch(`${API_BASE_URL}/api/incidents/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch incident #${id} (HTTP ${res.status})`);
    }
    return await res.json();
  }

  // Simulated backend response
  await delay(SIMULATED_LATENCY_MS);
  const found = DUMMY_INCIDENTS.find((inc) => inc.id === String(id));
  if (!found) {
    throw new Error(`Incident #${id} not found`);
  }
  return {
    id: found.id,
    service: found.service,
    status: found.status,
    alert: found.alert,
    changes: found.changes
  };
}

/**
 * GET /api/diagnose/:id
 * Returns the AI diagnosis. If pending or not generated yet, returns null.
 */
export async function getDiagnosis(id) {
  if (USE_REAL_BACKEND) {
    const res = await fetch(`${API_BASE_URL}/api/diagnose/${id}`);
    if (res.status === 404 || res.status === 204) {
      return null; // Diagnosis pending
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch diagnosis for incident #${id} (HTTP ${res.status})`);
    }
    return await res.json();
  }

  // Diagnosis typically takes an extra moment (simulating LLM reasoning)
  await delay(SIMULATED_LATENCY_MS + 250);
  const diagnosis = DUMMY_DIAGNOSES[String(id)];
  return diagnosis || null;
}

/**
 * POST /api/postmortem/:id (Stretch Goal)
 * Returns plain text draft or Markdown of incident postmortem.
 */
export async function getPostmortem(id) {
  if (USE_REAL_BACKEND) {
    const res = await fetch(`${API_BASE_URL}/api/postmortem/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`Failed to generate postmortem for incident #${id} (HTTP ${res.status})`);
    }
    return await res.json();
  }

  // Simulated LLM generation delay
  await delay(SIMULATED_LATENCY_MS + 400);
  const text = DUMMY_POSTMORTEMS[String(id)] || `### Incident Postmortem: #${id}\n\nAutomated postmortem draft generated for service. Cause investigation completed.`;
  return { postmortem_text: text };
}
