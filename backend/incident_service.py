"""Incident service: business logic between the correlation engine and the API.

Responsibilities:
* build incident detail payloads (alert + scored change timeline + diagnosis),
* detect incidents for new incoming alerts (webhook ingest),
* drive the incident lifecycle (diagnose, resolve, reopen),
* compute dashboard stats.

Every incident detail embeds a `correlation` block summarising what the
deterministic engine concluded - this is the first-class evidence trail that
distinguishes the product from "AI read some logs".
"""
from __future__ import annotations

from datetime import datetime, timezone

from . import correlation, seed
from .config import CORRELATION_WINDOW_MINUTES
from .store import get_store, now_iso

_SERVICE_CACHE: dict[str, dict] | None = None


def _services(store) -> dict[str, dict]:
    global _SERVICE_CACHE
    if _SERVICE_CACHE is None:
        _SERVICE_CACHE = {row["id"]: row for row in store.select("services")}
    return _SERVICE_CACHE


def invalidate_service_cache() -> None:
    global _SERVICE_CACHE
    _SERVICE_CACHE = None


def _service_name(store, service_id: str) -> str:
    service = _services(store).get(str(service_id))
    return service["name"] if service else str(service_id)


def _ensure_incidents(store) -> None:
    """Create an incident for any alert that does not have one yet."""
    existing_alert_ids = {str(incident["alert_id"]) for incident in store.select("incidents")}
    for alert in store.select("alerts"):
        if str(alert["id"]) in existing_alert_ids:
            continue
        changes = store.select("changes", eq={"service_id": alert["service_id"]})
        scored = correlation.correlate_changes_scored(alert, changes)
        store.insert("incidents", {
            "alert_id": alert["id"],
            "correlated_change_ids": [change["id"] for change in scored if change["engine_verdict"] == "correlated"],
            "status": "open",
        })


def _diagnosis_for(store, incident_id: str) -> dict | None:
    rows = store.select("diagnoses", eq={"incident_id": incident_id})
    if not rows:
        return None
    row = rows[0]
    return {
        "id": row.get("id"),
        "root_cause_summary": row.get("root_cause_summary"),
        "confidence": row.get("confidence"),
        "suggested_action": row.get("suggested_action"),
        "evidence_change_ids": row.get("evidence_change_ids") or [],
        "generated_at": row.get("generated_at"),
        "model": row.get("model"),
    }


def _serialize_change(change: dict, correlated_ids: set[str], fired_at: datetime) -> dict:
    changed_at = correlation.parse_timestamp(change["changed_at"])
    minutes_before = round(correlation.minutes_between(fired_at, changed_at), 2)
    return {
        "id": change["id"],
        "service_id": change.get("service_id"),
        "change_type": change.get("change_type"),
        "actor": change.get("actor"),
        "description": change.get("description"),
        "changed_at": change.get("changed_at"),
        "metadata": change.get("metadata") or {},
        "minutes_before_alert": minutes_before,
        "correlated": str(change["id"]) in correlated_ids,
        "correlation_score": change.get("correlation_score", 0),
        "score_components": change.get("score_components") or {},
        "correlation_reasons": change.get("correlation_reasons") or [],
        "engine_verdict": change.get("engine_verdict", "excluded"),
    }


def build_incident_detail(store, incident: dict) -> dict | None:
    """Full incident payload: alert, scored timeline, correlation summary, diagnosis."""
    alerts = store.select("alerts", eq={"id": incident["alert_id"]})
    if not alerts:
        return None
    alert = alerts[0]

    services = _services(store)
    service = services.get(str(alert["service_id"])) or {
        "id": alert["service_id"],
        "name": str(alert["service_id"]),
        "owner": "unknown",
        "tier": "unknown",
    }

    changes = store.select("changes", eq={"service_id": alert["service_id"]})
    scored = correlation.correlate_changes_scored(alert, changes)
    correlated_ids = {str(change["id"]) for change in scored if change["engine_verdict"] == "correlated"}

    fired_at = correlation.parse_timestamp(alert["fired_at"])
    timeline = [_serialize_change(change, correlated_ids, fired_at) for change in scored]
    # Chronological order (oldest first) reads naturally as a "what happened" trail.
    timeline.sort(key=lambda item: item["changed_at"], reverse=False)

    verdicts = correlation.timeline_verdicts(scored)
    diagnosis = _diagnosis_for(store, incident["id"])

    return {
        "id": incident["id"],
        "service": service["name"],
        "service_tier": service.get("tier"),
        "service_owner": service.get("owner"),
        "status": incident.get("status", "open"),
        "correlation_window_minutes": CORRELATION_WINDOW_MINUTES,
        "alert": {
            "id": alert["id"],
            "description": alert.get("description"),
            "severity": alert.get("severity"),
            "fired_at": alert.get("fired_at"),
            "source": alert.get("source"),
        },
        "changes": timeline,
        "correlation": {
            "window_minutes": CORRELATION_WINDOW_MINUTES,
            "engine": "deterministic-rule-engine-v2",
            "correlated_change_ids": sorted(correlated_ids, key=lambda cid: -next(
                (c["correlation_score"] for c in scored if str(c["id"]) == cid), 0)),
            **verdicts,
        },
        "diagnosis": diagnosis,
    }


def build_summary(store, incident: dict) -> dict | None:
    """Compact payload for the incident list page."""
    detail = build_incident_detail(store, incident)
    if not detail:
        return None
    return {
        "id": detail["id"],
        "service": detail["service"],
        "service_tier": detail["service_tier"],
        "alert_description": detail["alert"]["description"],
        "severity": detail["alert"]["severity"],
        "fired_at": detail["alert"]["fired_at"],
        "status": detail["status"],
        "correlated_count": detail["correlation"]["correlated_count"],
        "top_score": max(
            (change["correlation_score"] for change in detail["changes"] if change["correlated"]),
            default=0,
        ),
        "diagnosed": detail["diagnosis"] is not None,
    }


def list_incidents(store) -> list[dict]:
    _ensure_incidents(store)
    summaries = [summary for summary in (build_summary(store, incident) for incident in store.select("incidents")) if summary]
    summaries.sort(key=lambda item: item["fired_at"], reverse=True)
    return summaries


def get_incident_detail(store, incident_id: str) -> dict | None:
    _ensure_incidents(store)
    incident = store.get("incidents", incident_id)
    if not incident:
        return None
    return build_incident_detail(store, incident)


def set_incident_status(store, incident_id: str, status: str) -> dict | None:
    status = (status or "").lower()
    if status not in {"open", "diagnosed", "resolved"}:
        raise ValueError(f"Invalid status: {status!r} (expected open|diagnosed|resolved)")
    updated = store.update("incidents", incident_id, {"status": status})
    return updated


def ingest_alert(store, payload: dict, change_events: list[dict] | None = None) -> dict:
    """Webhook ingest: register an alert (plus any reported change events) and
    run the deterministic correlation pipeline immediately.

    Returns the created incident detail. This mirrors what a Datadog /
    PagerDuty / GitHub Actions webhook integration would hit.
    """
    if not payload.get("description"):
        raise ValueError("Alert payload must include a description")
    if not payload.get("service"):
        raise ValueError("Alert payload must include a service name")

    service = _resolve_or_create_service(store, payload["service"])
    fired_at = payload.get("fired_at") or now_iso()
    alert = store.insert("alerts", {
        "service_id": service["id"],
        "source": payload.get("source") or "webhook",
        "description": payload["description"],
        "severity": (payload.get("severity") or "medium").lower(),
        "fired_at": fired_at,
    })

    for event in change_events or []:
        changed_at = event.get("changed_at")
        if not changed_at and event.get("minutes_before_alert") is not None:
            fired = correlation.parse_timestamp(fired_at)
            changed_at = (fired - _timedelta_minutes(float(event["minutes_before_alert"]))).isoformat().replace("+00:00", "Z")
        store.insert("changes", {
            "service_id": service["id"],
            "change_type": (event.get("change_type") or "commit").lower(),
            "actor": event.get("actor") or "unknown",
            "description": event.get("description") or "(no description supplied)",
            "changed_at": changed_at or now_iso(),
            "metadata": event.get("metadata") or {},
        })

    changes = store.select("changes", eq={"service_id": service["id"]})
    scored = correlation.correlate_changes_scored(alert, changes)
    correlated_ids = [change["id"] for change in scored if change["engine_verdict"] == "correlated"]

    incident = store.insert("incidents", {
        "alert_id": alert["id"],
        "correlated_change_ids": correlated_ids,
        "status": "open",
    })
    detail = build_incident_detail(store, incident)
    if detail is None:  # pragma: no cover - defensive
        raise RuntimeError("Failed to build incident detail after ingest")
    return detail


def _timedelta_minutes(minutes: float):
    from datetime import timedelta

    return timedelta(minutes=minutes)


def _resolve_or_create_service(store, name: str) -> dict:
    invalidate_service_cache()
    services = _services(store)
    for service in services.values():
        if service["name"].lower() == name.lower():
            return service
    created = store.insert("services", {"name": name, "owner": "unknown", "tier": "unknown"})
    invalidate_service_cache()
    return created


def dashboard_stats(store) -> dict:
    """Aggregates for the header / list page stat cards."""
    summaries = list_incidents(store)
    open_count = sum(1 for item in summaries if item["status"] == "open")
    resolved = sum(1 for item in summaries if item["status"] == "resolved")
    diagnosed = sum(1 for item in summaries if item["status"] == "diagnosed")
    high = sum(1 for item in summaries if item["severity"] in {"high", "critical"})
    correlated = sum(1 for item in summaries if item["correlated_count"] > 0)
    scores = [item["top_score"] for item in summaries if item["correlated_count"] > 0]
    return {
        "total_incidents": len(summaries),
        "open": open_count,
        "diagnosed": diagnosed,
        "resolved": resolved,
        "high_severity": high,
        "incidents_with_correlated_changes": correlated,
        "correlation_rate": round(correlated / len(summaries), 2) if summaries else 0.0,
        "avg_top_score": round(sum(scores) / len(scores), 1) if scores else 0.0,
        "pipeline": "online",
    }


def replay_simulation_scenario(store, scenario_key: str) -> dict:
    """Replay one of the bundled scenarios through the webhook ingest path."""
    scenario = next((item for item in seed.SIMULATION_SCENARIOS if item["key"] == scenario_key), None)
    if scenario is None:
        raise ValueError(f"Unknown simulation scenario: {scenario_key!r}")
    return ingest_alert(store, dict(scenario["payload"], service=scenario["service"]), scenario.get("changes"))
