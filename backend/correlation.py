"""Deterministic correlation engine.

Cross-references an incoming alert against the recent change history of the
same service and produces a *scored* set of candidate causes. This module is
deliberately rule-based and AI-free: every number it emits can be explained to
a human auditor.

Scoring model (weights are configuration, not magic):
    temporal proximity   -> 0..45  (closer to the alert is stronger)
    change type weight   -> 0..25  (deploys & flags historically cause most incidents)
    description keywords -> 0..20  (narrative overlap between alert and change)
    blast radius         -> 0..10  (production / global scope escalates risk)

A change only qualifies as *correlated* if it lands inside the configured time
window AND scores at least MIN_CORRELATION_SCORE. Anything in the window but
below the threshold is kept as "considered but weak" context for the AI layer.
"""

from datetime import datetime, timezone

from .config import (
    BLAST_RADIUS_KEYWORDS,
    CHANGE_TYPE_WEIGHTS,
    CORRELATION_WINDOW_MINUTES,
    MIN_CORRELATION_SCORE,
    SCORE_WEIGHTS,
    TEMPORAL_DECAY_HALF_LIFE_MINUTES,
    compute_max_scores,
)

_MAX_TEMPORAL, _MAX_TYPE, _MAX_KEYWORD, _MAX_BLAST = compute_max_scores()


def parse_timestamp(value: str) -> datetime:
    """Parse ISO-8601 timestamps (with or without trailing Z) into aware UTC datetimes."""
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)
    return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(timezone.utc)


def minutes_between(later: datetime, earlier: datetime) -> float:
    return (later - earlier).total_seconds() / 60.0


def _temporal_score(minutes_before: float) -> float:
    """Exponential decay: a change 4 minutes before the alert scores ~4x one 60 minutes before."""
    if minutes_before < 0:
        return 0.0
    decay = 0.5 ** (minutes_before / TEMPORAL_DECAY_HALF_LIFE_MINUTES)
    return round(SCORE_WEIGHTS["temporal"] * decay, 1)


def _type_score(change_type: str) -> float:
    """Weight by how often a change class actually causes production incidents."""
    weight = CHANGE_TYPE_WEIGHTS.get((change_type or "").lower(), 0.2)
    return round(SCORE_WEIGHTS["change_type"] * weight, 1)


def _keyword_score(alert_text: str, change_text: str) -> float:
    """Narrative overlap: does the change description talk about the same
    subsystem as the alert? Combines exact token overlap with stem-aware
    substring matching so "gateway" in the alert matches "gateways" in the
    change description."""
    if not alert_text or not change_text:
        return 0.0
    alert_words = _stopword_free({word for word in _tokens(alert_text) if len(word) > 2})
    change_words = _tokens(change_text)
    change_blob = " ".join(sorted(change_words))
    if not alert_words:
        return 0.0

    overlap = set()
    for word in alert_words:
        if word in change_words:
            overlap.add(word)
        else:  # light stemming: gateway ~ gateways, deploy ~ deployed
            stem = word[:-1] if len(word) > 4 and word.endswith("s") else word
            if stem and (stem in change_blob or word in change_blob):
                overlap.add(word)
    if not overlap:
        return 0.0
    density = len(overlap) / len(alert_words)
    return round(SCORE_WEIGHTS["keywords"] * min(1.0, density * 3.0), 1)


def _tokens(text: str) -> set[str]:
    """Lowercase word tokens with punctuation stripped."""
    for char in "()/,:;'\"[]{}":
        text = text.replace(char, " ")
    return {word.lower() for word in text.split()}


def _stopword_free(tokens: set[str]) -> set[str]:
    return tokens - _STOPWORDS


_STOPWORDS = {
    "the", "and", "for", "from", "with", "without", "into", "onto", "per",
    "new", "old", "all", "any", "not", "out", "off", "was", "were", "been",
    "this", "that", "are", "have", "has", "had", "its", "his", "her",
    "rate", "spiked", "surpassed", "exceeds", "reached", "failed", "failure",
}


def _blast_radius_score(change: dict) -> float:
    """Scope of the change: production-wide or global changes are riskier suspects."""
    description = (change.get("description") or "").lower()
    metadata = " ".join(str(value) for value in (change.get("metadata") or {}).values()).lower()
    haystack = f"{description} {metadata}"
    hits = sum(1 for keyword in BLAST_RADIUS_KEYWORDS if keyword in haystack)
    if hits == 0:
        return 0.0
    return round(SCORE_WEIGHTS["blast_radius"] * min(1.0, 0.6 + 0.4 * (hits - 1)), 1)


def score_change(alert: dict, change: dict, fired_at: datetime) -> dict:
    """Score one candidate change against one alert. Returns the change plus evidence."""
    changed_at = parse_timestamp(change["changed_at"])
    minutes_before = round(minutes_between(fired_at, changed_at), 2)
    in_window = 0 <= minutes_before <= CORRELATION_WINDOW_MINUTES

    components = {
        "temporal": _temporal_score(minutes_before) if in_window else 0.0,
        "change_type": _type_score(change.get("change_type")) if in_window else 0.0,
        "keywords": _keyword_score(
            f"{alert.get('description') or ''} {alert.get('source') or ''}",
            change.get("description") or "",
        ) if in_window else 0.0,
        "blast_radius": _blast_radius_score(change) if in_window else 0.0,
    }
    total = round(sum(components.values()), 1)

    reasons = []
    if components["temporal"] > 0:
        reasons.append(f"occurred {minutes_before:g}m before the alert (temporal proximity {components['temporal']}/{_MAX_TEMPORAL})")
    if components["change_type"] > 0:
        reasons.append(f"{(change.get('change_type') or 'change').replace('_', ' ')} changes are high-risk ({components['change_type']}/{_MAX_TYPE})")
    if components["keywords"] > 0:
        reasons.append(f"description overlaps the alert signal ({components['keywords']}/{_MAX_KEYWORD})")
    if components["blast_radius"] > 0:
        reasons.append(f"production-scope change ({components['blast_radius']}/{_MAX_BLAST})")

    return {
        **change,
        "minutes_before_alert": minutes_before,
        "in_window": in_window,
        "correlation_score": total,
        "score_components": components,
        "correlation_reasons": reasons,
        "correlated": bool(in_window and total >= MIN_CORRELATION_SCORE),
    }


def correlate_changes(
    alert: dict,
    changes: list[dict],
    window_minutes: int = CORRELATION_WINDOW_MINUTES,
) -> list[dict]:
    """Backward-compatible helper: return only the changes the engine marks as correlated.

    Sorted by correlation score (strongest evidence first).
    """
    scored = correlate_changes_scored(alert, changes, window_minutes)
    correlated = [item for item in scored if item["correlated"]]
    return sorted(correlated, key=lambda item: (-item["correlation_score"], item["minutes_before_alert"]))


def correlate_changes_scored(
    alert: dict,
    changes: list[dict],
    window_minutes: int = CORRELATION_WINDOW_MINUTES,
) -> list[dict]:
    """Full scored view: every change of the alert's service, with correlation evidence.

    Correlated changes first (by score), then in-window-but-weak candidates
    ("considered"), then everything else chronologically. This is the evidence
    trail the incident timeline and the AI layer both consume.
    """
    fired_at = parse_timestamp(alert["fired_at"])
    scored = [
        score_change(alert, change, fired_at)
        for change in changes
        if str(change.get("service_id")) == str(alert.get("service_id"))
    ]
    correlated = [item for item in scored if item["correlated"]]
    considered = [item for item in scored if item["in_window"] and not item["correlated"]]
    excluded = [item for item in scored if not item["in_window"]]

    correlated.sort(key=lambda item: (-item["correlation_score"], item["minutes_before_alert"]))
    considered.sort(key=lambda item: -item["correlation_score"])
    excluded.sort(key=lambda item: item["changed_at"], reverse=True)

    for item in correlated:
        item["engine_verdict"] = "correlated"
    for item in considered:
        item["engine_verdict"] = "considered"
    for item in excluded:
        item["engine_verdict"] = "excluded"
    return correlated + considered + excluded


def timeline_verdicts(scored_changes: list[dict]) -> dict:
    """Summary of what the deterministic engine concluded, for the AI layer and the UI."""
    return {
        "correlated_count": sum(1 for item in scored_changes if item["engine_verdict"] == "correlated"),
        "considered_count": sum(1 for item in scored_changes if item["engine_verdict"] == "considered"),
        "excluded_count": sum(1 for item in scored_changes if item["engine_verdict"] == "excluded"),
    }
