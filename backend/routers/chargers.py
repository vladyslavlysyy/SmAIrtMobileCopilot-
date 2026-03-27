import json
from pathlib import Path

from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Charger

router = APIRouter(prefix="/api/v1/chargers", tags=["chargers"])


class ChargerOut(BaseModel):
    id: int
    latitude: float | None
    longitude: float | None
    postal_code: str | None
    zone: str | None
    name: str | None = None
    source: str


def _load_cached_imported_chargers() -> list[ChargerOut]:
    cache_path = Path(__file__).resolve().parent.parent / "cache" / "charging_points_spain.json"
    if not cache_path.exists():
        return []

    try:
        raw = json.loads(cache_path.read_text(encoding="utf-8"))
    except Exception:
        return []

    if not isinstance(raw, list):
        return []

    imported: list[ChargerOut] = []
    for idx, item in enumerate(raw, start=1):
        if not isinstance(item, dict):
            continue

        lat = item.get("latitude")
        lon = item.get("longitude")
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            continue

        imported.append(
            ChargerOut(
                id=1_000_000 + idx,
                latitude=float(lat),
                longitude=float(lon),
                postal_code=None,
                zone="OSM Spain",
                name=item.get("name") if isinstance(item.get("name"), str) else None,
                source="osm_imported",
            )
        )

    return imported


@router.get("", response_model=list[ChargerOut])
def list_chargers(db: Session = Depends(get_db)):
    chargers = db.query(Charger).all()
    internal = [
        ChargerOut(
            id=int(c.id),
            latitude=c.latitude,
            longitude=c.longitude,
            postal_code=c.postal_code,
            zone=c.zone,
            name=None,
            source="internal",
        )
        for c in chargers
    ]

    imported = _load_cached_imported_chargers()
    return [*internal, *imported]
