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
from sqlalchemy import text, func

from database import get_db
from models import Visit, VisitStatus, Technician
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
    Utilitza SQL queries per treure dades del charger via assignable.

    Ordre de retorn:
      1. route_order ASC  (si el model ja ha calculat la ruta)
      2. planned_date ASC (fallback si route_order és NULL)
    """
    # Rang del dia: de 00:00:00 a 23:59:59
    day_start = datetime.combine(date, time.min)
    day_end   = datetime.combine(date, time.max)

    # SQL query amb JOIN a charger per obtenir coordenades
    query_str = text("""
        SELECT 
            v.id,
            v.assignable_id,
            v.technician_id,
            v.visit_type,
            v.status,
            v.planned_date,
            v.estimated_duration,
            v.score,
            v.route_order,
            COALESCE(c.latitude, 0.0) as latitude,
            COALESCE(c.longitude, 0.0) as longitude,
            COALESCE(c.postal_code, '') as postal_code
        FROM visit v
        LEFT JOIN assignable a ON v.assignable_id = a.id
        LEFT JOIN charger c ON a.charger_id = c.id
        WHERE v.technician_id = :tech_id
          AND v.planned_date >= :day_start
          AND v.planned_date <= :day_end
        ORDER BY 
            COALESCE(v.route_order, 999999) ASC,
            v.planned_date ASC
    """)
    
    rows = db.execute(query_str, {
        "tech_id": technician_id,
        "day_start": day_start,
        "day_end": day_end,
    }).fetchall()

    if not rows:
        return []

    # Map SQL rows to VisitOut schema
    visits = []
    for row in rows:
        visit = VisitOut(
            id=row.id,
            assignable_id=row.assignable_id,
            technician_id=row.technician_id,
            visit_type=row.visit_type,
            status=row.status,
            planned_date=row.planned_date,
            estimated_duration=row.estimated_duration,
            score=row.score,
            route_order=row.route_order,
            latitude=row.latitude,
            longitude=row.longitude,
            postal_code=row.postal_code,
        )
        visits.append(visit)

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

    query_str = text("""
        SELECT 
            DATE(v.planned_date) as day,
            COUNT(v.id) as total
        FROM visit v
        WHERE v.technician_id = :tech_id
          AND v.planned_date >= :week_start
          AND v.planned_date <= :week_end
          AND v.status IN ('pending', 'in_progress')
        GROUP BY DATE(v.planned_date)
        ORDER BY DATE(v.planned_date) ASC
    """)
    
    rows = db.execute(query_str, {
        "tech_id": technician_id,
        "week_start": week_start_dt,
        "week_end": week_end,
    }).fetchall()

    return {str(row.day): row.total for row in rows}