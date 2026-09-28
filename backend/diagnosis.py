"""AI reasoning layer - the only step that uses an LLM.

Takes the deterministic engine's scored correlation and produces a structured,
evidence-cited diagnosis. Guarantees:

* The model only ever cites change IDs that the engine actually correlated
  (validated on every response).
* Confidence is a plain low|medium|high - never a fabricated percentage.
* Without an API key the module degrades to an honest rule-based fallback
  instead of pretending the AI ran.
* Diagnoses are cached per incident (first generation wins) so re-running a
  demo does not churn the evidence trail.
"""
from __future__ import annotations

import json
import re

from .config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL, DIAGNOSIS_MAX_TOKENS

_VALID_CONFIDENCE = {"low", "medium", "high"}

_SYSTEM_PROMPT = """You are an SRE incident commander assistant. You receive:
1. A production alert.
2. The deterministic correlation engine's scored list of recent changes to the same service.

Produce a root-cause hypothesis. Rules:
- Ground every claim in the supplied evidence. Never invent events, numbers, or IDs.
- Cite ONLY change ids from the supplied list in evidence_change_ids.
- confidence must be exactly one of: low, medium, high. Do NOT output percentages.
- suggested_action must be a first, safe, reversible step for a human to take.
  NEVER recommend automatic remediation - a human approves every action.
- If correlated_changes is empty, say honestly that no recent change explains
  the alert and set confidence to low.

Respond with ONLY a JSON object:
{
  "root_cause_summary": string,
  "confidence": "low" | "medium" | "high",
  "suggested_action": string,
  "evidence_change_ids": string[]
}"""


def _extract_json(raw: str) -> dict:
    """Parse the model response defensively: handles fenced code blocks and
    leading/trailing prose around the JSON object."""
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if fence:
        text = fence.group(1)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        return json.loads(text[start:end + 1])
    raise ValueError("Model response contained no JSON object")


def _fallback(alert: dict, scored_changes: list[dict]) -> dict:
    """Deterministic, honest diagnosis used when no LLM is configured.

    Ranked by the engine's score so the fallback is still evidence-based.
    """
    correlated = [change for change in scored_changes if change.get("engine_verdict") == "correlated"]
    if not correlated:
        return {
            "root_cause_summary": (
                "The correlation engine found no change to this service within the "
                "configured window, so no change-based root cause is supported by the evidence. "
                "The alert may stem from external factors, data issues, or a failure that "
                "developed gradually without a deploy."
            ),
            "confidence": "low",
            "suggested_action": (
                "Inspect service logs, dependency health, and metric history around the alert "
                "time before attempting any remediation."
            ),
            "evidence_change_ids": [],
        }
    top = correlated[0]
    others = [change for change in correlated[1:]]
    summary = (
        f"Leading hypothesis: the {top.get('change_type', 'change').replace('_', ' ')} "
        f"\"{top.get('description')}\" occurred {top.get('minutes_before_alert', '?'):g} minutes "
        f"before the alert with correlation score {top.get('correlation_score', 0)}/100"
    )
    if others:
        names = ", ".join(f"{change.get('change_type')} #{change['id']}" for change in others)
        summary += f" (with contributing changes: {names})"
    summary += "."
    return {
        "root_cause_summary": summary,
        "confidence": "medium" if top.get("correlation_score", 0) >= 60 else "low",
        "suggested_action": (
            f"Review change #{top['id']} ({top.get('change_type')}) and compare service health "
            "before and after it; a human must approve any rollback or config adjustment."
        ),
        "evidence_change_ids": [str(change["id"]) for change in correlated],
    }


def _validate(result: dict, scored_changes: list[dict]) -> dict:
    """Enforce the output contract: valid confidence, evidence IDs that exist."""
    valid_ids = {str(change["id"]) for change in scored_changes if change.get("engine_verdict") == "correlated"}
    evidence = []
    for value in result.get("evidence_change_ids") or []:
        value = str(value)
        if value in valid_ids and value not in evidence:
            evidence.append(value)

    confidence = str(result.get("confidence", "low")).lower()
    if confidence not in _VALID_CONFIDENCE:
        confidence = "low"

    return {
        "root_cause_summary": str(result.get("root_cause_summary") or "").strip(),
        "confidence": confidence,
        "suggested_action": str(result.get("suggested_action") or "").strip(),
        "evidence_change_ids": evidence,
    }


def generate_diagnosis(alert: dict, service: dict, scored_changes: list[dict]) -> dict:
    """Produce a diagnosis dict. `scored_changes` is the engine's full scored list;
    only changes the engine marked 'correlated' are shown to the model."""
    correlated = [change for change in scored_changes if change.get("engine_verdict") == "correlated"]

    if not ANTHROPIC_API_KEY:
        result = _fallback(alert, scored_changes)
        result["model"] = "deterministic-fallback"
        return result

    from anthropic import Anthropic

    def change_view(change: dict) -> dict:
        return {
            "id": str(change["id"]),
            "change_type": change.get("change_type"),
            "description": change.get("description"),
            "changed_at": change.get("changed_at"),
            "minutes_before_alert": change.get("minutes_before_alert"),
            "correlation_score": change.get("correlation_score"),
            "score_components": change.get("score_components"),
            "engine_reasons": change.get("correlation_reasons"),
        }

    prompt = {
        "alert": {
            "description": alert.get("description"),
            "severity": alert.get("severity"),
            "fired_at": alert.get("fired_at"),
            "source": alert.get("source"),
        },
        "service": service.get("name"),
        "correlated_changes": [change_view(change) for change in correlated],
    }

    message = Anthropic(api_key=ANTHROPIC_API_KEY).messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=DIAGNOSIS_MAX_TOKENS,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": json.dumps(prompt, indent=2)}],
    )
    raw = next((block.text for block in message.content if getattr(block, "type", "") == "text"), "{}")
    result = _validate(_extract_json(raw), scored_changes)
    if not result["root_cause_summary"]:
        result = _fallback(alert, scored_changes)
        result["model"] = f"{ANTHROPIC_MODEL} (empty response, fallback used)"
        return result
    result["model"] = ANTHROPIC_MODEL
    return result


# ---------------------------------------------------------------------------
# Postmortem generation
# ---------------------------------------------------------------------------

_POSTMORTEM_SYSTEM = """You are an SRE writing the first draft of a blameless postmortem.
You receive the incident record: alert, correlated change timeline, and the
root-cause diagnosis. Write concise Markdown with these sections:
# Incident <id> - <service>, ## Impact, ## Timeline, ## Root Cause, ## Resolution & Follow-ups.
Every claim about the timeline must reference the concrete events supplied.
Never invent events or numbers. Keep it under 450 words. Suggest 2-4 concrete
follow-up actions; note that a human approved the resolution."""


def generate_postmortem(incident: dict) -> dict:
    """Generate a Markdown postmortem draft from the incident record.

    Works without an API key too (deterministic template), so the demo never
    breaks mid-presentation.
    """
    alert = incident["alert"]
    changes = incident["changes"]
    diagnosis = incident.get("diagnosis")

    if not ANTHROPIC_API_KEY:
        return {"postmortem_text": _postmortem_template(incident), "model": "deterministic-template"}

    from anthropic import Anthropic

    payload = {
        "incident": {
            "id": incident["id"],
            "service": incident["service"],
            "service_tier": incident.get("service_tier"),
            "status": incident["status"],
        },
        "alert": alert,
        "correlated_timeline": [
            {
                "id": change["id"],
                "change_type": change["change_type"],
                "description": change["description"],
                "changed_at": change["changed_at"],
                "minutes_before_alert": change.get("minutes_before_alert"),
                "correlated": change["correlated"],
                "correlation_score": change.get("correlation_score"),
            }
            for change in changes
        ],
        "diagnosis": diagnosis,
    }
    message = Anthropic(api_key=ANTHROPIC_API_KEY).messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=1400,
        system=_POSTMORTEM_SYSTEM,
        messages=[{"role": "user", "content": json.dumps(payload, indent=2)}],
    )
    raw = next((block.text for block in message.content if getattr(block, "type", "") == "text"), "")
    if not raw.strip():
        return {"postmortem_text": _postmortem_template(incident), "model": "deterministic-template"}
    return {"postmortem_text": raw.strip(), "model": ANTHROPIC_MODEL}


def _postmortem_template(incident: dict) -> str:
    alert = incident["alert"]
    correlated = [change for change in incident["changes"] if change["correlated"]]
    diagnosis = incident.get("diagnosis")
    lines = [
        f"# Incident {incident['id']} - {incident['service']}",
        "",
        f"**Alert:** {alert['description']}",
        f"**Severity:** {alert['severity']} | **Fired:** {alert['fired_at']} | **Status:** {incident['status']}",
        "",
        "## Timeline",
    ]
    for change in correlated:
        lines.append(
            f"- `{change['changed_at']}` **{change['change_type']}** (score {change.get('correlation_score', 0)}/100, "
            f"{change.get('minutes_before_alert', '?'):g}m before alert): {change['description']}"
        )
    lines.append(f"- `{alert['fired_at']}` **alert fired**")
    lines += ["", "## Root Cause"]
    if diagnosis:
        lines.append(diagnosis["root_cause_summary"])
    else:
        lines.append("_Diagnosis pending - no root-cause hypothesis generated yet._")
    lines += ["", "## Resolution & Follow-ups"]
    if diagnosis and diagnosis.get("suggested_action"):
        lines.append(f"- Suggested first step: {diagnosis['suggested_action']}")
    lines += [
        "- Record the actual mitigation once applied.",
        "- Add an alert or canary covering this failure mode.",
        "- Review the change process that allowed the contributing change to ship.",
    ]
    return "\n".join(lines)
