"""Tests for the deterministic correlation engine."""
from datetime import datetime, timedelta, timezone

from backend.correlation import (
    correlate_changes,
    correlate_changes_scored,
    parse_timestamp,
    timeline_verdicts,
)

NOW = datetime.now(timezone.utc)
ALERT_MINUTES_AGO = 10  # the reference alert always fires 10 minutes before NOW


def _iso(minutes_ago: float) -> str:
    return (NOW - timedelta(minutes=minutes_ago)).isoformat().replace("+00:00", "Z")


ALERT = {
    "id": "a1",
    "service_id": "svc-1",
    "description": "5xx rate on checkout payment gateway spiked",
    "severity": "high",
    "fired_at": _iso(ALERT_MINUTES_AGO),
}


def _change(id, change_type, minutes_before_alert, description, service_id="svc-1", metadata=None):
    """Create a change that happened `minutes_before_alert` before the alert.

    Negative values place the change after the alert fired.
    """
    return {
        "id": id,
        "service_id": service_id,
        "change_type": change_type,
        "description": description,
        "changed_at": _iso(ALERT_MINUTES_AGO + minutes_before_alert),
        "metadata": metadata or {},
    }


class TestTimestampParsing:
    def test_z_suffix(self):
        parsed = parse_timestamp("2026-09-20T14:32:00Z")
        assert parsed.tzinfo is not None
        assert parsed.utcoffset().total_seconds() == 0

    def test_offset_suffix(self):
        parsed = parse_timestamp("2026-09-20T16:32:00+02:00")
        assert parsed.hour == 14

    def test_datetime_passthrough(self):
        assert parse_timestamp(NOW) == NOW


class TestCorrelation:
    def test_change_inside_window_is_correlated(self):
        change = _change("c1", "deploy", 4, "v2.14.0 deployed to production - timeout lowered")
        result = correlate_changes(ALERT, [change])
        assert [c["id"] for c in result] == ["c1"]
        assert result[0]["minutes_before_alert"] == 4.0

    def test_change_outside_window_excluded(self):
        change = _change("c1", "deploy", 90, "v2.14.0 deployed to production - timeout lowered")
        result = correlate_changes(ALERT, [change])
        assert result == []

    def test_change_after_alert_not_correlated(self):
        change = _change("c1", "deploy", -5, "deployed after alert fired")
        result = correlate_changes(ALERT, [change])
        assert result == []

    def test_other_service_changes_never_correlated(self):
        change = _change("c1", "deploy", 4, "deploy", service_id="svc-other")
        assert correlate_changes(ALERT, [change]) == []

    def test_sorted_by_score_not_time(self):
        older_deploy = _change("old", "deploy", 50, "v1.0.0 deployed to production")
        recent_commit = _change("new", "commit", 2, "docs: update readme")
        scored = correlate_changes_scored(ALERT, [older_deploy, recent_commit])
        correlated = [c for c in scored if c["correlated"]]
        # deploy scores higher than the trivial commit despite being older
        assert correlated[0]["id"] == "old"

    def test_verdicts_partition(self):
        changes = [
            _change("in", "deploy", 4, "deploy to production"),
            _change("weak", "commit", 55, "docs tweak"),
            _change("out", "config", 200, "old config change"),
        ]
        scored = correlate_changes_scored(ALERT, changes)
        verdicts = {c["id"]: c["engine_verdict"] for c in scored}
        assert verdicts["out"] == "excluded"
        assert verdicts["in"] in {"correlated", "considered"}
        assert verdicts["weak"] in {"correlated", "considered"}
        summary = timeline_verdicts(scored)
        assert summary["correlated_count"] + summary["considered_count"] + summary["excluded_count"] == 3


class TestScoring:
    def test_scores_are_bounded(self):
        change = _change("c1", "deploy", 1, "payment gateway production rollout all traffic")
        result = correlate_changes_scored(ALERT, [change])[0]
        assert 0 <= result["correlation_score"] <= 100

    def test_components_present(self):
        change = _change("c1", "deploy", 4, "payment gateway timeout lowered in production")
        result = correlate_changes_scored(ALERT, [change])[0]
        assert set(result["score_components"].keys()) == {"temporal", "change_type", "keywords", "blast_radius"}
        assert result["correlation_reasons"]  # at least one human-readable reason

    def test_keyword_overlap_beats_generic(self):
        relevant = _change("rel", "deploy", 20, "payment gateway retry logic changed")
        irrelevant = _change("irr", "deploy", 20, "internal logging format tweak")
        scores = {c["id"]: c["correlation_score"] for c in correlate_changes_scored(ALERT, [relevant, irrelevant])}
        assert scores["rel"] > scores["irr"]

    def test_blast_radius_keywords_boost(self):
        scoped = _change("scoped", "config", 10, "changed retry count", metadata={"scope": "staging"})
        prod = _change("prod", "config", 10, "changed retry count", metadata={"scope": "production"})
        scores = {c["id"]: c["correlation_score"] for c in correlate_changes_scored(ALERT, [scoped, prod])}
        assert scores["prod"] > scores["scoped"]

    def test_temporal_decay_monotonic(self):
        near = _change("near", "deploy", 2, "deploy to production")
        far = _change("far", "deploy", 55, "deploy to production")
        scores = {c["id"]: c["correlation_score"] for c in correlate_changes_scored(ALERT, [near, far])}
        assert scores["near"] > scores["far"]
