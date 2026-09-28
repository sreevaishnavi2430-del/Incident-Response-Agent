"""Central configuration. Every tuning knob lives here (or in .env)."""
import os

from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------- correlation
CORRELATION_WINDOW_MINUTES = int(os.getenv("CORRELATION_WINDOW_MINUTES", "60"))

# Per-signal max contributions to the correlation score (max total = 100).
SCORE_WEIGHTS = {
    "temporal": 30.0,     # exponential decay, half-life below
    "change_type": 35.0,  # weighted by CHANGE_TYPE_WEIGHTS below
    "keywords": 25.0,     # narrative overlap between alert and change
    "blast_radius": 10.0,
}

# Exponential decay half-life for temporal proximity (minutes).
TEMPORAL_DECAY_HALF_LIFE_MINUTES = float(os.getenv("TEMPORAL_DECAY_HALF_LIFE_MINUTES", "20"))

# Changes scoring at or above this are marked "correlated"; below the threshold
# but inside the window they are reported as "considered" context instead.
MIN_CORRELATION_SCORE = float(os.getenv("MIN_CORRELATION_SCORE", "45"))

# How incident-prone each change class is (fraction of the change_type weight).
CHANGE_TYPE_WEIGHTS = {
    "deploy": 1.0,
    "feature_flag": 0.9,
    "config": 0.75,
    "commit": 0.4,  # bare commits reach prod via a deploy; lower direct risk
    "rollback": 0.4,  # rollbacks usually fix rather than cause, but still relevant
}

# Phrases in a change description/metadata that imply production-wide blast radius.
BLAST_RADIUS_KEYWORDS = [
    "production",
    "prod",
    "global",
    "all traffic",
    "100%",
    "all users",
    "secrets manager",
    "jwks",
    "gateway",
]


def compute_max_scores():
    """(max_temporal, max_change_type, max_keywords, max_blast_radius)."""
    return (
        SCORE_WEIGHTS["temporal"],
        SCORE_WEIGHTS["change_type"],
        SCORE_WEIGHTS["keywords"],
        SCORE_WEIGHTS["blast_radius"],
    )


# ------------------------------------------------------------------ diagnosis
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
DIAGNOSIS_MAX_TOKENS = int(os.getenv("DIAGNOSIS_MAX_TOKENS", "1024"))

# ----------------------------------------------------------------- data layer
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# ---------------------------------------------------------------- demo / misc
# Verbose logging of the deterministic pipeline (useful during live demos).
DEBUG = os.getenv("FLASK_DEBUG", "1") == "1"
