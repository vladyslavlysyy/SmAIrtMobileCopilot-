"""Optional importer for charger points from CSV.

Expected CSV headers:
  latitude,longitude,postal_code,zone

Usage:
  python scripts/import_charging_points.py path/to/file.csv
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

from sqlalchemy.orm import Session

from database import SessionLocal
from models import Charger


def parse_float(raw: str) -> float | None:
    raw = (raw or "").strip()
    if not raw:
        return None
    return float(raw)


def parse_row(row: dict[str, str]) -> dict:
    return {
        "latitude": parse_float(row.get("latitude", "")),
        "longitude": parse_float(row.get("longitude", "")),
        "postal_code": (row.get("postal_code") or "").strip() or None,
        "zone": (row.get("zone") or "").strip() or None,
    }


def import_csv(db: Session, csv_path: Path) -> tuple[int, int]:
    created = 0
    skipped = 0

    with csv_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            parsed = parse_row(row)
            if parsed["latitude"] is None or parsed["longitude"] is None:
                skipped += 1
                continue

            charger = Charger(**parsed)
            db.add(charger)
            created += 1

    db.commit()
    return created, skipped


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python scripts/import_charging_points.py <csv_path>")
        return 1

    csv_path = Path(sys.argv[1]).expanduser().resolve()
    if not csv_path.exists():
        print(f"CSV file not found: {csv_path}")
        return 1

    db = SessionLocal()
    try:
        created, skipped = import_csv(db, csv_path)
        print(f"Imported chargers: {created}")
        print(f"Skipped rows: {skipped}")
        return 0
    except Exception as exc:  # pragma: no cover
        db.rollback()
        print(f"Import failed: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
