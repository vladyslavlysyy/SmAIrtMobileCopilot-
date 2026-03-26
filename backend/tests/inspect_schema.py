"""
inspect_schema.py - Inspect actual database schema
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database import SessionLocal
from sqlalchemy import inspect

db = SessionLocal()
inspector = inspect(db.bind)

# Get all table names
tables = inspector.get_table_names()
print('Available tables:')
for table in sorted(tables):
    print(f'  - {table}')

print()

# Get each table's columns
for table in sorted(tables):
    print(f'{table} columns:')
    cols = inspector.get_columns(table)
    for col in cols:
        print(f'  - {col["name"]}: {col["type"]}')
    print()

db.close()
