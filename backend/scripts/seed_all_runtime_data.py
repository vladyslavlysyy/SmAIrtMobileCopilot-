"""Seed full runtime dataset for realtime map and dashboards.

This script inserts a large, connected dataset using the CURRENT database schema
without altering tables, migrations, or ORM models.

It seeds:
  - chargers
  - technicians (+ user_info when available)
  - incidences
  - visits (tasks)

Usage examples:
  python backend/scripts/seed_all_runtime_data.py --reset
  python backend/scripts/seed_all_runtime_data.py --techs 30 --visits-per-tech 40 --incidences 400
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from datetime import datetime, timedelta, time
from pathlib import Path
from typing import Any

from sqlalchemy import text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from database import SessionLocal


DEFAULT_TECHS = 20
DEFAULT_VISITS_PER_TECH = 30
DEFAULT_INCIDENCES = 250
RANDOM_SEED = 42

VISIT_TYPES = [
    "correctivo_critico",
    "correctivo_no_critico",
    "diagnosi",
    "puesta_en_marcha",
    "preventivo",
]

VISIT_STATUSES = ["pending", "pending", "pending", "in_progress", "completed"]
INCIDENCE_PRIORITIES = ["low", "medium", "high", "critical"]
ZONE_POOL = ["Tarragona", "Reus", "Cambrils", "Valls", "Salou", "Tortosa"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed full runtime data without schema changes")
    parser.add_argument("--reset", action="store_true", help="Delete existing runtime data first")
    parser.add_argument("--techs", type=int, default=DEFAULT_TECHS, help="Number of technicians to create")
    parser.add_argument(
        "--visits-per-tech",
        type=int,
        default=DEFAULT_VISITS_PER_TECH,
        help="Number of visits/tasks per technician",
    )
    parser.add_argument(
        "--incidences",
        type=int,
        default=DEFAULT_INCIDENCES,
        help="Number of incidences to create",
    )
    parser.add_argument(
        "--chargers-json",
        default=str(BACKEND_ROOT / "cache" / "charging_points_spain.json"),
        help="Path to chargers JSON file",
    )
    return parser.parse_args()


def table_exists(db, table_name: str) -> bool:
    row = db.execute(
        text(
            """
            SELECT EXISTS(
              SELECT 1
              FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = :table_name
            )
            """
        ),
        {"table_name": table_name},
    ).scalar()
    return bool(row)


def get_columns(db, table_name: str) -> set[str]:
    rows = db.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = :table_name
            """
        ),
        {"table_name": table_name},
    ).fetchall()
    return {str(r.column_name) for r in rows}


def next_id(db, table_name: str) -> int:
    return int(
        db.execute(text(f"SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM {table_name}")).scalar()
        or 1
    )


def filtered_payload(columns: set[str], payload: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in payload.items() if k in columns}


def insert_row(db, table_name: str, columns: set[str], payload: dict[str, Any]) -> None:
    data = filtered_payload(columns, payload)
    if not data:
        return
    col_names = ", ".join(data.keys())
    val_names = ", ".join(f":{k}" for k in data.keys())
    db.execute(text(f"INSERT INTO {table_name} ({col_names}) VALUES ({val_names})"), data)


def delete_if_exists(db, table_name: str) -> None:
    if table_exists(db, table_name):
        db.execute(text(f"DELETE FROM {table_name}"))


def load_charger_points(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        return []

    points: list[dict[str, Any]] = []
    seen: set[tuple[float, float]] = set()
    for item in raw:
        if not isinstance(item, dict):
            continue
        lat = item.get("latitude")
        lon = item.get("longitude")
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            continue
        key = (round(float(lat), 6), round(float(lon), 6))
        if key in seen:
            continue
        seen.add(key)
        points.append(
            {
                "latitude": float(lat),
                "longitude": float(lon),
                "postal_code": item.get("postal_code") if isinstance(item.get("postal_code"), str) else None,
                "zone": item.get("zone") if isinstance(item.get("zone"), str) else "OSM Spain",
            }
        )
    return points


def seed_chargers(db, charger_points: list[dict[str, Any]]) -> list[int]:
    if not table_exists(db, "charger"):
        return []
    cols = get_columns(db, "charger")
    start_id = next_id(db, "charger")

    if not charger_points:
        # Fallback small cloud around Tarragona if JSON is missing.
        base_lat = 41.1189
        base_lon = 1.2445
        for idx in range(200):
            charger_points.append(
                {
                    "latitude": base_lat + ((idx % 20) * 0.002),
                    "longitude": base_lon + ((idx // 20) * 0.002),
                    "postal_code": "43001",
                    "zone": "Tarragona",
                }
            )

    ids: list[int] = []
    for offset, point in enumerate(charger_points):
        cid = start_id + offset
        payload = {
            "id": cid,
            "latitude": point["latitude"],
            "longitude": point["longitude"],
            "postal_code": point.get("postal_code"),
            "zone": point.get("zone"),
            "name": f"Charger {cid}",
        }
        insert_row(db, "charger", cols, payload)
        ids.append(cid)

    return ids


def seed_users_and_technicians(db, tech_count: int) -> list[int]:
    if not table_exists(db, "technician"):
        return []

    tech_cols = get_columns(db, "technician")
    tech_start = next_id(db, "technician")

    has_user = table_exists(db, "user_info")
    user_cols = get_columns(db, "user_info") if has_user else set()
    user_start = next_id(db, "user_info") if has_user else tech_start

    ids: list[int] = []
    now = datetime.utcnow()

    for i in range(tech_count):
        tid = user_start + i if has_user else tech_start + i
        zone = ZONE_POOL[i % len(ZONE_POOL)]

        if has_user:
            user_payload = {
                "id": tid,
                "name": f"Tecnico {tid}",
                "username": f"tecnico_{tid}",
                "phone": f"600{tid:06d}"[-9:],
                "telefono": f"600{tid:06d}"[-9:],
                "email": f"tecnico{tid}@demo.local",
                "passwd": "demo123",
                "created_at": now,
                "is_technician": True,
                "technician_id": tid,
            }
            insert_row(db, "user_info", user_cols, user_payload)

        tech_payload = {
            "id": tid,
            "name": f"Tecnico {tid}",
            "zone": zone,
            "vehicle": "van",
            "status": "available",
            "start_work_day": time(8, 0),
            "end_work_day": time(17, 0),
        }
        insert_row(db, "technician", tech_cols, tech_payload)
        ids.append(tid)

    return ids


def seed_assignables(db, charger_ids: list[int], total_needed: int) -> list[int]:
    if not table_exists(db, "assignable"):
        return []

    cols = get_columns(db, "assignable")
    start_id = next_id(db, "assignable")
    ids: list[int] = []

    for i in range(total_needed):
        aid = start_id + i
        payload = {
            "id": aid,
            "status": "pending",
            "priority": (i % 5) + 1,
            "charger_id": charger_ids[i % len(charger_ids)] if charger_ids else None,
        }
        insert_row(db, "assignable", cols, payload)
        ids.append(aid)

    return ids


def seed_incidences(db, incidence_count: int, incidence_assignable_ids: list[int], charger_ids: list[int]) -> int:
    if not table_exists(db, "incidence"):
        return 0

    cols = get_columns(db, "incidence")
    inserted = 0
    now = datetime.utcnow()

    for i in range(incidence_count):
        iid = incidence_assignable_ids[i] if i < len(incidence_assignable_ids) else None
        payload = {
            "id": iid,
            "charger_id": charger_ids[i % len(charger_ids)] if charger_ids else None,
            "domain_id": 1000 + i,
            "status": "open",
            "priority": INCIDENCE_PRIORITIES[i % len(INCIDENCE_PRIORITIES)],
            "auto_create_visit": True,
            "created_at": now - timedelta(minutes=i),
        }
        insert_row(db, "incidence", cols, payload)
        inserted += 1

    return inserted


def seed_visits(
    db,
    technician_ids: list[int],
    visits_per_tech: int,
    task_assignable_ids: list[int],
    incidence_assignable_ids: list[int],
) -> int:
    if not table_exists(db, "visit"):
        return 0

    cols = get_columns(db, "visit")
    start_id = next_id(db, "visit")
    now = datetime.utcnow().replace(second=0, microsecond=0)
    inserted = 0

    if not technician_ids:
        return 0

    if not task_assignable_ids and not incidence_assignable_ids:
        return 0

    assignable_pool = task_assignable_ids + incidence_assignable_ids

    for t_idx, tech_id in enumerate(technician_ids):
        for j in range(visits_per_tech):
            vid = start_id + inserted
            planned = now + timedelta(minutes=(j * 25), hours=t_idx % 3)

            # Ensure many visits are planned for "today" so realtime endpoint returns data.
            if j > visits_per_tech // 2:
                planned = planned + timedelta(days=1)

            assignable_id = assignable_pool[(inserted) % len(assignable_pool)]
            visit_type = VISIT_TYPES[(t_idx + j) % len(VISIT_TYPES)]
            status = VISIT_STATUSES[(t_idx + j) % len(VISIT_STATUSES)]

            payload = {
                "id": vid,
                "assignable_id": assignable_id,
                "technician_id": tech_id,
                "visit_type": visit_type,
                "status": status,
                "planned_date": planned,
                "estimated_duration": 35 + (j % 6) * 10,
                "score": None,
                "route_order": j + 1,
                "address": f"Parada {vid}",
                "postal_code": "43001",
                "location_source": "charger_snapshot",
            }
            insert_row(db, "visit", cols, payload)
            inserted += 1

    return inserted


def maybe_seed_contracts(db, contract_assignable_ids: list[int], charger_ids: list[int]) -> int:
    if not table_exists(db, "contract"):
        return 0

    cols = get_columns(db, "contract")
    inserted = 0
    today = datetime.utcnow().date()

    for i, aid in enumerate(contract_assignable_ids):
        payload = {
            "id": aid,
            "type": "preventivo",
            "client_id": 2000 + i,
            "charger_id": charger_ids[i % len(charger_ids)] if charger_ids else None,
            "domain_id": 3000 + i,
            "start_date": today,
            "end_date": today + timedelta(days=365),
            "number_of_visits": 4,
            "total_visits": 4,
            "frequency": "mensual",
            "status": "active",
        }
        insert_row(db, "contract", cols, payload)
        inserted += 1

    return inserted


def main() -> None:
    args = parse_args()
    random.seed(RANDOM_SEED)

    if args.techs < 1:
        raise SystemExit("--techs must be >= 1")
    if args.visits_per_tech < 1:
        raise SystemExit("--visits-per-tech must be >= 1")
    if args.incidences < 0:
        raise SystemExit("--incidences must be >= 0")

    chargers_path = Path(args.chargers_json).expanduser().resolve()
    charger_points = load_charger_points(chargers_path)

    db = SessionLocal()
    try:
        if args.reset:
            # Child-to-parent delete order, only if table exists.
            for table_name in [
                "imprevisto",
                "report",
                "visit",
                "incidence",
                "contract",
                "assignable",
                "technician",
                "user_info",
                "charger",
            ]:
                delete_if_exists(db, table_name)

        charger_ids = seed_chargers(db, charger_points)
        technician_ids = seed_users_and_technicians(db, args.techs)

        total_visits = len(technician_ids) * args.visits_per_tech
        total_assignables = total_visits + args.incidences
        assignable_ids = seed_assignables(db, charger_ids, total_assignables)

        task_assignable_ids = assignable_ids[:total_visits]
        incidence_assignable_ids = assignable_ids[total_visits: total_visits + args.incidences]

        contracts_inserted = maybe_seed_contracts(db, task_assignable_ids[: min(300, len(task_assignable_ids))], charger_ids)
        incidences_inserted = seed_incidences(db, args.incidences, incidence_assignable_ids, charger_ids)
        visits_inserted = seed_visits(
            db,
            technician_ids=technician_ids,
            visits_per_tech=args.visits_per_tech,
            task_assignable_ids=task_assignable_ids,
            incidence_assignable_ids=incidence_assignable_ids,
        )

        db.commit()

        print("SEED_OK")
        print(f"chargers_inserted={len(charger_ids)}")
        print(f"technicians_inserted={len(technician_ids)}")
        print(f"contracts_inserted={contracts_inserted}")
        print(f"incidences_inserted={incidences_inserted}")
        print(f"visits_inserted={visits_inserted}")
        print(f"assignables_inserted={len(assignable_ids)}")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
