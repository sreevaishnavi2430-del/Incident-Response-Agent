"""Persistence layer.

Two interchangeable stores behind one interface:

* SupabaseStore  -- production/postgres persistence (same schema as before).
* InMemoryStore  -- zero-config fallback so the whole pipeline runs with
  nothing but `python -m backend.app` and no .env; seeded with the same demo
  dataset that ships in seed.py.

Every method returns plain dicts with JSON-safe values (UUIDs as strings,
timestamps as ISO strings) so both stores behave identically for the API layer.
"""
from __future__ import annotations

import threading
import uuid
from datetime import datetime, timezone

from .config import SUPABASE_KEY, SUPABASE_URL
from .supabase_client import get_supabase

_TABLES = ("services", "alerts", "changes", "incidents", "diagnoses")


class InMemoryStore:
    """Thread-safe in-memory store, pre-seeded by seed.py at startup."""

    def __init__(self):
        self._lock = threading.RLock()
        self._data: dict[str, dict[str, dict]] = {table: {} for table in _TABLES}

    # ---------------------------------------------------------------- helpers
    @staticmethod
    def _clone(row: dict | None) -> dict | None:
        return None if row is None else {**row}

    def _require_table(self, table: str) -> dict[str, dict]:
        if table not in self._data:
            raise ValueError(f"Unknown table: {table}")
        return self._data[table]

    # ------------------------------------------------------------------- read
    def select(self, table: str, *, eq: dict | None = None) -> list[dict]:
        with self._lock:
            rows = list(self._require_table(table).values())
        if eq:
            rows = [row for row in rows if all(str(row.get(k)) == str(v) for k, v in eq.items())]
        return [self._clone(row) for row in rows]

    def get(self, table: str, row_id: str) -> dict | None:
        with self._lock:
            return self._clone(self._require_table(table).get(str(row_id)))

    # ------------------------------------------------------------------ write
    def insert(self, table: str, row: dict) -> dict:
        with self._lock:
            rows = self._require_table(table)
            new = {**row}
            new["id"] = str(new.get("id") or uuid.uuid4())
            rows[new["id"]] = new
            return self._clone(new)

    def update(self, table: str, row_id: str, patch: dict) -> dict | None:
        with self._lock:
            rows = self._require_table(table)
            current = rows.get(str(row_id))
            if current is None:
                return None
            current.update(patch)
            return self._clone(current)

    def delete(self, table: str, row_id: str) -> bool:
        with self._lock:
            return self._require_table(table).pop(str(row_id), None) is not None

    def count(self, table: str) -> int:
        with self._lock:
            return len(self._require_table(table))


class SupabaseStore:
    """Thin adapter over supabase-py. All filtering happens with .eq() equality.

    Numeric columns stored as NUMERIC in postgres come back as floats, which is
    JSON-safe; everything else passes through untouched.
    """

    def select(self, table: str, *, eq: dict | None = None) -> list[dict]:
        query = get_supabase().table(table).select("*")
        for key, value in (eq or {}).items():
            query = query.eq(key, value)
        return list(query.execute().data or [])

    def get(self, table: str, row_id: str) -> dict | None:
        rows = self.select(table, eq={"id": row_id})
        return rows[0] if rows else None

    def insert(self, table: str, row: dict) -> dict:
        result = get_supabase().table(table).insert(row).execute()
        return (result.data or [row])[0]

    def update(self, table: str, row_id: str, patch: dict) -> dict | None:
        result = get_supabase().table(table).update(patch).eq("id", row_id).execute()
        data = result.data or []
        return data[0] if data else None

    def delete(self, table: str, row_id: str) -> bool:
        result = get_supabase().table(table).delete().eq("id", row_id).execute()
        return bool(result.data)

    def count(self, table: str) -> int:
        return len(self.select(table))


class StoreUnavailable(RuntimeError):
    """Raised when no storage backend can be initialised."""


_store: SupabaseStore | InMemoryStore | None = None
_store_lock = threading.Lock()


def get_store() -> SupabaseStore | InMemoryStore:
    """Return the configured store. Supabase wins when credentials exist,
    otherwise the in-memory store is seeded on first use."""
    global _store
    if _store is not None:
        return _store
    with _store_lock:
        if _store is not None:
            return _store
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                get_supabase()  # fail fast on bad credentials
                _store = SupabaseStore()
                return _store
            except Exception as exc:  # noqa: BLE001 - degrade gracefully
                print(f"[store] Supabase unavailable ({exc}); falling back to in-memory store")
        from . import seed

        memory = InMemoryStore()
        seed.ensure_seeded(memory)
        _store = memory
        return _store


def reset_store() -> None:
    """Used by tests to swap stores deterministically."""
    global _store
    with _store_lock:
        _store = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
