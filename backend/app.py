"""Incident Response Agent - HTTP API.

Endpoints:
    GET  /health
    GET  /api/stats
    GET  /api/incidents
    GET  /api/incidents/<id>
    GET  /api/diagnose/<id>
    POST /api/diagnose/<id>
    POST /api/incidents/<id>/status
    POST /api/incidents/<id>/postmortem
    POST /api/webhooks/alerts          (Datadog/PagerDuty-style alert ingest)
    GET  /api/simulate/scenarios
    POST /api/simulate/<key>

Runs with no external services: when Supabase credentials are missing the API
serves the seeded in-memory store; when ANTHROPIC_API_KEY is missing the
diagnosis layer degrades to a deterministic fallback. Perfect for demos.
"""
from __future__ import annotations

import logging

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from . import incident_service
from .config import CORRELATION_WINDOW_MINUTES
from .diagnosis import generate_diagnosis, generate_postmortem
from .store import StoreUnavailable, get_store, now_iso

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("ira")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})


def _store():
    try:
        return get_store()
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Store unavailable")
        raise StoreUnavailable(str(exc)) from exc


def _json_error(message: str, status: int):
    return jsonify({"error": message}), status


@app.get("/health")
def health():
    try:
        store = _store()
        return jsonify({
            "status": "ok",
            "store": type(store).__name__,
            "correlation_window_minutes": CORRELATION_WINDOW_MINUTES,
        })
    except StoreUnavailable:
        return _json_error("Storage backend unavailable", 503)


@app.get("/api/stats")
def stats():
    return jsonify(incident_service.dashboard_stats(_store()))


@app.get("/api/incidents")
def list_incidents():
    try:
        return jsonify(incident_service.list_incidents(_store()))
    except Exception as exc:
        logger.exception("Failed to list incidents")
        return _json_error(f"Failed to list incidents: {exc}", 500)


@app.get("/api/incidents/<incident_id>")
def incident_detail(incident_id):
    detail = incident_service.get_incident_detail(_store(), incident_id)
    if not detail:
        return _json_error("Incident not found", 404)
    return jsonify(detail)


@app.get("/api/diagnose/<incident_id>")
def get_diagnosis(incident_id):
    """Return the stored diagnosis, or 404 if none exists yet (pending state)."""
    detail = incident_service.get_incident_detail(_store(), incident_id)
    if not detail:
        return _json_error("Incident not found", 404)
    if not detail["diagnosis"]:
        return _json_error("Diagnosis pending for this incident", 404)
    return jsonify(detail["diagnosis"])


@app.post("/api/diagnose/<incident_id>")
def create_diagnosis(incident_id):
    """Run the AI reasoning layer over the engine's correlation and persist it."""
    store = _store()
    detail = incident_service.get_incident_detail(store, incident_id)
    if not detail:
        return _json_error("Incident not found", 404)

    existing = detail.get("diagnosis")
    if existing:
        return jsonify({**existing, "cached": True})

    alert = detail["alert"]
    service = {"name": detail["service"]}
    diagnosis = generate_diagnosis(alert, service, detail["changes"])

    store.insert("diagnoses", {
        "incident_id": incident_id,
        **diagnosis,
        "generated_at": now_iso(),
    })
    logger.info("Diagnosis generated for incident %s (model=%s)", incident_id, diagnosis.get("model"))
    return jsonify(diagnosis)


@app.post("/api/incidents/<incident_id>/status")
def update_status(incident_id):
    payload = request.get_json(silent=True) or {}
    status = payload.get("status")
    try:
        updated = incident_service.set_incident_status(_store(), incident_id, status)
    except ValueError as exc:
        return _json_error(str(exc), 400)
    if not updated:
        return _json_error("Incident not found", 404)
    return jsonify({"id": incident_id, "status": status.lower()})


@app.post("/api/incidents/<incident_id>/postmortem")
def postmortem(incident_id):
    store = _store()
    detail = incident_service.get_incident_detail(store, incident_id)
    if not detail:
        return _json_error("Incident not found", 404)
    try:
        result = generate_postmortem(detail)
    except Exception as exc:
        logger.exception("Postmortem generation failed for %s", incident_id)
        return _json_error(f"Postmortem generation failed: {exc}", 502)
    return jsonify(result)


@app.post("/api/webhooks/alerts")
def webhook_alert():
    """Accept a real alert webhook (Datadog/PagerDuty-style) and run the pipeline.

    Expected body:
    {
      "service": "checkout-service",
      "description": "...",
      "severity": "high",
      "source": "datadog-monitor",          (optional)
      "fired_at": "2026-09-20T14:32:00Z",   (optional, defaults to now)
      "changes": [ {"change_type": "deploy", "description": "...",
                    "minutes_before_alert": 6} ]   (optional)
    }
    """
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _json_error("Body must be a JSON object", 400)
    try:
        detail = incident_service.ingest_alert(_store(), payload, payload.get("changes"))
    except ValueError as exc:
        return _json_error(str(exc), 400)
    except Exception as exc:
        logger.exception("Webhook ingest failed")
        return _json_error(f"Failed to ingest alert: {exc}", 500)
    return jsonify({
        "incident_id": detail["id"],
        "correlated_change_ids": detail["correlation"]["correlated_change_ids"],
        "correlated_count": detail["correlation"]["correlated_count"],
        "incident": detail,
    }), 201


@app.get("/api/simulate/scenarios")
def simulate_scenarios():
    from . import seed

    return jsonify([
        {"key": scenario["key"], "label": scenario["label"], "service": scenario["service"]}
        for scenario in seed.SIMULATION_SCENARIOS
    ])


@app.post("/api/simulate/<scenario_key>")
def simulate_scenario(scenario_key):
    """Replay a bundled scenario through the webhook ingest path (live demo)."""
    store = _store()
    try:
        detail = incident_service.replay_simulation_scenario(store, scenario_key)
    except ValueError as exc:
        return _json_error(str(exc), 404)
    return jsonify({
        "incident_id": detail["id"],
        "correlated_count": detail["correlation"]["correlated_count"],
        "incident": detail,
    }), 201


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
