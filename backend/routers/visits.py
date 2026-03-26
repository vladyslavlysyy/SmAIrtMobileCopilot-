"""
routers/visits.py

GET /api/v1/visits
  Devuelve la lista de visitas de un técnico para un día concreto,
  ordenadas por route_order ASC (definido por el modelo de prioridad).
  Si route_order es NULL (aún no calculado), ordena por planned_date.

  Consumido por:
    - RouteTimeline.tsx      → ruta del día del técnico
    - WeeklyCalendarStrip.tsx → carga por día de la semana
"""

from datetime import date, datetime, time
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Visit, VisitStatus
from schemas import VisitOut

router = APIRouter(prefix="/api/v1", tags=["visits"])


@router.get("/visits", response_model=list[VisitOut])
def get_visits(
    technician_id: int = Query(..., description="ID del tècnic"),
    date: date     = Query(..., description="Data en format YYYY-MM-DD"),
    db: Session    = Depends(get_db),
) -> list[VisitOut]:
    """
    Retorna les visites d'un tècnic per a un dia concret.

    Ordre de retorn:
      1. route_order ASC  (si el model ja ha calculat la ruta)
      2. planned_date ASC (fallback si route_order és NULL)

    Això permet al frontend mostrar la llista ordenada tan aviat com
    el model de prioritat hagi corregut, sense canvis d'interfície.
    """
    # Rang del dia: de 00:00:00 a 23:59:59
    day_start = datetime.combine(date, time.min)
    day_end   = datetime.combine(date, time.max)

    visits = (
        db.query(Visit)
        .filter(
            Visit.technician_id == technician_id,
            Visit.planned_date  >= day_start,
            Visit.planned_date  <= day_end,
        )
        # NULLS LAST: les visites sense route_order van al final
        .order_by(
            Visit.route_order.asc().nulls_last(),
            Visit.planned_date.asc(),
        )
        .all()
    )

    if not visits:
        # 200 amb llista buida és correcte; el frontend gestiona l'estat buit
        return []

    return visits


@router.get("/visits/week", response_model=dict[str, int])
def get_week_load(
    technician_id: int  = Query(..., description="ID del tècnic"),
    week_start:    date = Query(..., description="Dilluns de la setmana (YYYY-MM-DD)"),
    db: Session         = Depends(get_db),
) -> dict[str, int]:
    """
    Retorna el nombre de visites pendents per dia per a tota una setmana.
    Consumit per WeeklyCalendarStrip.tsx per pintar la càrrega visual de cada dia.

    Resposta: { "2026-03-23": 4, "2026-03-24": 2, ... }
    """
    from datetime import timedelta

    week_end = datetime.combine(week_start + timedelta(days=6), time.max)
    week_start_dt = datetime.combine(week_start, time.min)

    rows = (
        db.query(
            func.date(Visit.planned_date).label("day"),
            func.count(Visit.id).label("total"),
        )
        .filter(
            Visit.technician_id == technician_id,
            Visit.planned_date  >= week_start_dt,
            Visit.planned_date  <= week_end,
            Visit.status.in_([VisitStatus.pending, VisitStatus.in_progress]),
        )
        .group_by(func.date(Visit.planned_date))
        .all()
    )

    return {str(row.day): row.total for row in rows}