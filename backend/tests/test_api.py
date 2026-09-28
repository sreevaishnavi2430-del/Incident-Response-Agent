"""API tests running the full Flask app against the in-memory store."""
import pytest

from backend import incident_service
from backend.app import app
from backend.store import InMemoryStore, reset_store


@pytest.fixture()
def fresh_store(monkeypatch):
    """Force the app onto a pristine in-memory store for every test.

    The store used by the routes is fetched as ``app.py -> get_store``; patch it
    there (after reset) so tests never touch Supabase or a shared singleton.
    """
    import backend.app as app_module

    monkeypatch.setenv("SUPABASE_URL", "")
    monkeypatch.setenv("SUPABASE_KEY", "")
    reset_store()

    store = InMemoryStore()
    monkeypatch.setattr(app_module, "get_store", lambda: store, raising=True)
    yield store
    reset_store()


@pytest.fixture()
def client(fresh_store):
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


class TestIncidentEndpoints:
    def test_health_ok(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        body = response.get_json()
        assert body["status"] == "ok"
        assert body["store"] == "InMemoryStore"

    def test_list_incidents_seeded(self, client, fresh_store):
        from backend import seed

        seed.ensure_seeded(fresh_store)
        response = client.get("/api/incidents")
        assert response.status_code == 200
        incidents = response.get_json()
        assert len(incidents) >= 5
        first = incidents[0]
        for key in ("id", "service", "alert_description", "severity", "fired_at", "status", "correlated_count", "top_score"):
            assert key in first
        # sorted newest first
        fired = [item["fired_at"] for item in incidents]
        assert fired == sorted(fired, reverse=True)

    def test_incident_detail_includes_scored_timeline(self, client, fresh_store):
        from backend import seed

        seed.ensure_seeded(fresh_store)
        response = client.get("/api/incidents/inc-1")
        assert response.status_code == 200
        body = response.get_json()
        assert body["service"] == "checkout-service"
        assert body["correlation"]["engine"].startswith("deterministic-rule-engine")
        correlated = [change for change in body["changes"] if change["correlated"]]
        assert correlated, "seeded incident 1 must have correlated changes"
        assert all("correlation_score" in change for change in body["changes"])
        assert body["diagnosis"]["confidence"] in {"low", "medium", "high"}

    def test_incident_not_found(self, client):
        response = client.get("/api/incidents/does-not-exist")
        assert response.status_code == 404

    def test_stats_endpoint(self, client, fresh_store):
        from backend import seed

        seed.ensure_seeded(fresh_store)
        response = client.get("/api/stats")
        assert response.status_code == 200
        body = response.get_json()
        assert body["total_incidents"] >= 5
        assert 0 <= body["correlation_rate"] <= 1
        assert body["pipeline"] == "online"


class TestDiagnosisEndpoint:
    def test_get_existing_diagnosis(self, client, fresh_store):
        from backend import seed

        seed.ensure_seeded(fresh_store)
        response = client.get("/api/diagnose/inc-1")
        assert response.status_code == 200
        body = response.get_json()
        assert body["root_cause_summary"]
        assert body["confidence"] in {"low", "medium", "high"}

    def test_get_pending_diagnosis_returns_404(self, client, fresh_store):
        from backend import seed

        seed.ensure_seeded(fresh_store)
        response = client.get("/api/diagnose/inc-4")
        assert response.status_code == 404

    def test_post_generates_diagnosis_fallback(self, client, fresh_store):
        from backend import seed

        seed.ensure_seeded(fresh_store)
        response = client.post("/api/diagnose/inc-4")
        assert response.status_code == 200
        body = response.get_json()
        assert body["model"] == "deterministic-fallback"
        assert body["root_cause_summary"]
        # evidence ids must reference real correlated changes
        detail = incident_service.get_incident_detail(fresh_store, "inc-4")
        valid = {c["id"] for c in detail["changes"] if c["correlated"]}
        assert set(body["evidence_change_ids"]) <= valid
        # second call is cached
        cached = client.post("/api/diagnose/inc-4")
        assert cached.get_json()["cached"] is True

    def test_post_diagnosis_unknown_incident(self, client):
        assert client.post("/api/diagnose/nope").status_code == 404


class TestLifecycle:
    def test_resolve_and_reopen(self, client, fresh_store):
        from backend import seed

        seed.ensure_seeded(fresh_store)
        response = client.post("/api/incidents/inc-4/status", json={"status": "resolved"})
        assert response.status_code == 200
        assert response.get_json()["status"] == "resolved"
        detail = client.get("/api/incidents/inc-4").get_json()
        assert detail["status"] == "resolved"

    def test_invalid_status_rejected(self, client):
        response = client.post("/api/incidents/inc-4/status", json={"status": "wibble"})
        assert response.status_code == 400


class TestWebhookAndSimulation:
    def test_webhook_ingest_creates_incident_and_correlates(self, client):
        payload = {
            "service": "checkout-service",
            "description": "checkout p99 latency breach",
            "severity": "high",
            "source": "test-monitor",
            "changes": [
                {"change_type": "deploy", "description": "v9.9.9 deployed to production", "minutes_before_alert": 5}
            ],
        }
        response = client.post("/api/webhooks/alerts", json=payload)
        assert response.status_code == 201
        body = response.get_json()
        assert body["correlated_count"] >= 1
        detail = client.get(f"/api/incidents/{body['incident_id']}").get_json()
        assert detail["alert"]["description"] == "checkout p99 latency breach"
        assert any(change["description"].startswith("v9.9.9") for change in detail["changes"])

    def test_webhook_requires_service_and_description(self, client):
        assert client.post("/api/webhooks/alerts", json={"description": "no service"}).status_code == 400
        assert client.post("/api/webhooks/alerts", json={"service": "x"}).status_code == 400
        assert client.post("/api/webhooks/alerts", data="not-json", content_type="text/plain").status_code == 400

    def test_webhook_unknown_service_creates_service(self, client):
        response = client.post("/api/webhooks/alerts", json={
            "service": "brand-new-service",
            "description": "first alert",
        })
        assert response.status_code == 201
        detail = response.get_json()["incident"]
        assert detail["service"] == "brand-new-service"

    def test_simulate_scenario_checkout(self, client):
        response = client.post("/api/simulate/checkout")
        assert response.status_code == 201
        body = response.get_json()
        assert body["correlated_count"] >= 1

    def test_simulate_unexplained_honest_null(self, client):
        response = client.post("/api/simulate/unexplained")
        assert response.status_code == 201
        body = response.get_json()
        assert body["correlated_count"] == 0

    def test_simulate_unknown_scenario(self, client):
        assert client.post("/api/simulate/xyz").status_code == 404

    def test_scenarios_listing(self, client):
        response = client.get("/api/simulate/scenarios")
        assert response.status_code == 200
        keys = {item["key"] for item in response.get_json()}
        assert {"checkout", "auth", "inventory", "unexplained"} <= keys


class TestPostmortem:
    def test_postmortem_template_fallback(self, client, fresh_store):
        from backend import seed

        seed.ensure_seeded(fresh_store)
        response = client.post("/api/incidents/inc-1/postmortem")
        assert response.status_code == 200
        body = response.get_json()
        assert body["model"] == "deterministic-template"
        text = body["postmortem_text"]
        assert "# Incident inc-1" in text
        assert "## Root Cause" in text
