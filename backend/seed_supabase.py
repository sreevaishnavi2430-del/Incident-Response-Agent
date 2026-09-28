"""Seed a Supabase project with the demo dataset.

Usage (from the backend/ directory or repo root with backend on the path):
    python -m backend.seed_supabase

Requires SUPABASE_URL and SUPABASE_KEY in the environment / .env, and the
schema from backend/schema.sql to exist already.
"""
from __future__ import annotations

from . import seed
from .supabase_client import get_supabase


def main() -> None:
    client = get_supabase()
    rows = seed.build_seed_rows()

    # Insert parents before children; map seed IDs to database-generated UUIDs.
    id_map: dict[str, str] = {}

    def insert(table: str, seed_rows: list[dict]) -> dict[str, str]:
        mapping: dict[str, str] = {}
        for row in seed_rows:
            payload = {key: value for key, value in row.items() if key != "id"}
            result = client.table(table).insert(payload).execute()
            inserted = (result.data or [{}])[0]
            mapping[row["id"]] = inserted.get("id") or row["id"]
        return mapping

    id_map.update(insert("services", rows["services"]))
    id_map.update(insert("alerts", [
        {**row, "service_id": id_map[row["service_id"]]} for row in rows["alerts"]
    ]))
    id_map.update(insert("changes", [
        {**row, "service_id": id_map[row["service_id"]]} for row in rows["changes"]
    ]))
    id_map.update(insert("incidents", [
        {
            **row,
            "alert_id": id_map[row["alert_id"]],
            "correlated_change_ids": [id_map[cid] for cid in row["correlated_change_ids"]],
        }
        for row in rows["incidents"]
    ]))
    insert("diagnoses", [
        {
            **row,
            "incident_id": id_map[row["incident_id"]],
            "evidence_change_ids": [id_map[cid] for cid in row.get("evidence_change_ids") or []],
        }
        for row in rows["diagnoses"]
    ])

    total = sum(len(value) for value in rows.values())
    print(f"Seeded {total} rows across 5 tables.")


if __name__ == "__main__":
    main()
