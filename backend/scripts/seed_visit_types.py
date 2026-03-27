"""Seed visit table with at least N records per canonical visit type.

Usage:
  c:/.../.venv/Scripts/python.exe backend/scripts/seed_visit_types.py --per-type 3
"""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta
from pathlib import Path
import sys

from sqlalchemy import text

# Ensure backend package root is importable when running from scripts/.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
  sys.path.insert(0, str(BACKEND_ROOT))

from database import SessionLocal

VISIT_TYPES = [
    'correctivo_critico',
    'correctivo_no_critico',
    'diagnosi',
    'puesta_en_marcha',
    'preventivo',
]


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description='Ensure minimum volume by visit_type.')
  parser.add_argument('--per-type', type=int, default=3, help='Minimum rows per visit_type.')
  parser.add_argument('--status', default='pending', help='Status for inserted rows (default: pending).')
  return parser.parse_args()


def main() -> None:
  args = parse_args()
  if args.per_type < 1:
    raise SystemExit('--per-type must be >= 1')

  db = SessionLocal()
  try:
    assignable_ids = [
      int(r.id)
      for r in db.execute(text('SELECT id FROM assignable ORDER BY id')).fetchall()
    ]
    if not assignable_ids:
      raise SystemExit('No assignable rows found. Cannot seed visits safely.')

    technician_ids = [
      int(r.id)
      for r in db.execute(text('SELECT id FROM technician ORDER BY id')).fetchall()
    ]

    max_visit_id = db.execute(text('SELECT COALESCE(MAX(id), 0) FROM visit')).scalar() or 0
    next_id = int(max_visit_id) + 1

    now = datetime.utcnow().replace(second=0, microsecond=0)
    inserted = 0

    for idx, visit_type in enumerate(VISIT_TYPES):
      current = db.execute(
        text('SELECT COUNT(*) FROM visit WHERE LOWER(visit_type) = :visit_type'),
        {'visit_type': visit_type},
      ).scalar() or 0

      missing = max(0, args.per_type - int(current))
      for n in range(missing):
        assignable_id = assignable_ids[(idx + n) % len(assignable_ids)]
        technician_id = (
          technician_ids[(idx + n) % len(technician_ids)] if technician_ids else None
        )
        planned_date = now + timedelta(hours=(idx * 3 + n))

        db.execute(
          text(
            '''
            INSERT INTO visit (
              id,
              assignable_id,
              technician_id,
              visit_type,
              status,
              planned_date,
              estimated_duration,
              score
            )
            VALUES (
              :id,
              :assignable_id,
              :technician_id,
              :visit_type,
              :status,
              :planned_date,
              :estimated_duration,
              :score
            )
            '''
          ),
          {
            'id': next_id,
            'assignable_id': assignable_id,
            'technician_id': technician_id,
            'visit_type': visit_type,
            'status': args.status,
            'planned_date': planned_date,
            'estimated_duration': 45,
            'score': None,
          },
        )

        next_id += 1
        inserted += 1

    db.commit()

    print(f'SEED_OK inserted={inserted}')
    for visit_type in VISIT_TYPES:
      total = db.execute(
        text('SELECT COUNT(*) FROM visit WHERE LOWER(visit_type) = :visit_type'),
        {'visit_type': visit_type},
      ).scalar() or 0
      print(f'{visit_type}={int(total)}')
  finally:
    db.close()


if __name__ == '__main__':
  main()
