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
from sqlalchemy.exc import OperationalError
from pydantic import BaseModel

from database import get_db
from models import Visit, VisitStatus, Technician, normalize_visit_type
from schemas import VisitOut

router = APIRouter(prefix="/api/v1", tags=["visits"])


def _execute_with_retry(db: Session, statement, params: dict | None = None, retries: int = 1):
    """Retry once when PostgreSQL drops the underlying connection unexpectedly."""
    last_error = None
    for _ in range(retries + 1):
        try:
            return db.execute(statement, params or {})
        except OperationalError as exc:
            last_error = exc
            db.rollback()
    raise last_error


class CreateFromContractRequest(BaseModel):
    contract_id: int
    technician_id: int | None = None
    visit_type: str = "maintenance"
    planned_date: str | None = None


class CreateFromIncidenceRequest(BaseModel):
    incidence_id: int
    technician_id: int | None = None
    escalate_to: str | None = None  # None|p4|p5


def _rows_to_visits(rows) -> list[VisitOut]:
    visits = []
    for row in rows:
        visits.append(
            VisitOut(
                id=row.id,
                assignable_id=row.assignable_id,
                technician_id=row.technician_id,
                visit_type=normalize_visit_type(row.visit_type),
                status=row.status,
                planned_date=row.planned_date,
                estimated_duration=row.estimated_duration,
                score=row.score,
                route_order=row.route_order,
                latitude=row.latitude,
                longitude=row.longitude,
                postal_code=row.postal_code,
            )
        )
    return visits


@router.get("/visits", response_model=list[VisitOut])
def get_visits(
    technician_id: int | None = Query(default=None, description="ID del tècnic"),
    date: date | None     = Query(default=None, description="Data en format YYYY-MM-DD"),
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
    target_date = date or datetime.utcnow().date()
    day_start = datetime.combine(target_date, time.min)
    day_end   = datetime.combine(target_date, time.max)

    tech_filter = "AND v.technician_id = :tech_id" if technician_id is not None else ""

    # SQL query amb JOIN a charger per obtenir coordenades
    query_str = text(f"""
        SELECT 
            v.id,
            v.assignable_id,
            v.technician_id,
            v.visit_type,
            v.status,
            v.planned_date,
            v.estimated_duration,
            v.score,
            NULL::integer as route_order,
            COALESCE(c.latitude, 0.0) as latitude,
            COALESCE(c.longitude, 0.0) as longitude,
            COALESCE(c.postal_code, '') as postal_code
        FROM visit v
        LEFT JOIN assignable a ON v.assignable_id = a.id
        LEFT JOIN charger c ON a.charger_id = c.id
                WHERE 1=1
                    {tech_filter}
          AND v.planned_date >= :day_start
          AND v.planned_date <= :day_end
        ORDER BY 
            v.planned_date ASC
    """)

    params = {
        "day_start": day_start,
        "day_end": day_end,
    }
    if technician_id is not None:
        params["tech_id"] = technician_id

    rows = db.execute(query_str, params).fetchall()

    if not rows:
        return []

    return _rows_to_visits(rows)


@router.get("/visits/all", response_model=list[VisitOut])
def get_all_visits(
    technician_id: int | None = Query(default=None, description="ID del tècnic"),
    date_from: date | None = Query(default=None, description="Data inici (YYYY-MM-DD)"),
    date_to: date | None = Query(default=None, description="Data fi (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
) -> list[VisitOut]:
    """
    Retorna totes les visites, amb filtres opcionals per tècnic i rang de dates.
    """
    tech_filter = "AND v.technician_id = :tech_id" if technician_id is not None else ""
    from_filter = "AND v.planned_date >= :date_from" if date_from is not None else ""
    to_filter = "AND v.planned_date <= :date_to" if date_to is not None else ""

    query_str = text(f"""
        SELECT
            v.id,
            v.assignable_id,
            v.technician_id,
            v.visit_type,
            v.status,
            v.planned_date,
            v.estimated_duration,
            v.score,
            NULL::integer as route_order,
            COALESCE(c.latitude, 0.0) as latitude,
            COALESCE(c.longitude, 0.0) as longitude,
            COALESCE(c.postal_code, '') as postal_code
        FROM visit v
        LEFT JOIN assignable a ON v.assignable_id = a.id
        LEFT JOIN charger c ON a.charger_id = c.id
        WHERE 1=1
          {tech_filter}
          {from_filter}
          {to_filter}
        ORDER BY v.planned_date ASC
    """)

    params = {}
    if technician_id is not None:
        params["tech_id"] = technician_id
    if date_from is not None:
        params["date_from"] = datetime.combine(date_from, time.min)
    if date_to is not None:
        params["date_to"] = datetime.combine(date_to, time.max)

    rows = db.execute(query_str, params).fetchall()

    if not rows:
        return []

    return _rows_to_visits(rows)


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


@router.post("/visits/from-contract", response_model=VisitOut, status_code=201)
def create_visit_from_contract(
    payload: CreateFromContractRequest,
    db: Session = Depends(get_db),
) -> VisitOut:
    """
    Create a visit from a contract in manual admin flow.

    Note: current schema links visit -> assignable_id, so contract_id is mapped
    to assignable_id when IDs are aligned in seed/source data.
    """
    vt = normalize_visit_type(payload.visit_type or "maintenance")
    if vt not in {"maintenance", "commissioning"}:
        raise HTTPException(status_code=422, detail="visit_type must be maintenance or commissioning")

    try:
        contract = _execute_with_retry(
            db,
            text("SELECT id FROM contract WHERE id = :id LIMIT 1"),
            {"id": payload.contract_id},
        ).fetchone()
    except OperationalError:
        raise HTTPException(status_code=503, detail="Base de dades temporalment no disponible")

    if not contract:
        raise HTTPException(status_code=404, detail=f"Contracte {payload.contract_id} no trobat")

    try:
        assignable = _execute_with_retry(
            db,
            text("SELECT id FROM assignable WHERE id = :id LIMIT 1"),
            {"id": payload.contract_id},
        ).fetchone()
    except OperationalError:
        raise HTTPException(status_code=503, detail="Base de dades temporalment no disponible")

    if not assignable:
        raise HTTPException(
            status_code=422,
            detail="No existeix assignable associat al contracte (mapping per ID requerit)",
        )

    try:
        next_id = _execute_with_retry(
            db,
            text("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM visit"),
        ).fetchone().next_id
    except OperationalError:
        raise HTTPException(status_code=503, detail="Base de dades temporalment no disponible")

    planned_dt = datetime.strptime(payload.planned_date, "%Y-%m-%dT%H:%M") if payload.planned_date else datetime.utcnow()

    try:
        _execute_with_retry(
            db,
            text(
                """
                INSERT INTO visit (id, assignable_id, technician_id, visit_type, status, planned_date, estimated_duration, score)
                VALUES (:id, :assignable_id, :technician_id, :visit_type, :status, :planned_date, :estimated_duration, :score)
                """
            ),
            {
                "id": int(next_id),
                "assignable_id": payload.contract_id,
                "technician_id": payload.technician_id,
                "visit_type": vt,
                "status": "pending",
                "planned_date": planned_dt,
                "estimated_duration": 45,
                "score": None,
            },
        )
        db.commit()
    except OperationalError:
        db.rollback()
        raise HTTPException(status_code=503, detail="Base de dades temporalment no disponible")

    row = _execute_with_retry(
        db,
        text(
            """
            SELECT
                v.id,
                v.assignable_id,
                v.technician_id,
                v.visit_type,
                v.status,
                v.planned_date,
                v.estimated_duration,
                v.score,
                NULL::integer as route_order,
                COALESCE(c.latitude, 0.0) as latitude,
                COALESCE(c.longitude, 0.0) as longitude,
                COALESCE(c.postal_code, '') as postal_code
            FROM visit v
            LEFT JOIN assignable a ON v.assignable_id = a.id
            LEFT JOIN charger c ON a.charger_id = c.id
            WHERE v.id = :id
            """
        ),
        {"id": int(next_id)},
    ).fetchone()

    return _rows_to_visits([row])[0]


@router.post("/visits/from-incidence", response_model=VisitOut, status_code=201)
def create_visit_from_incidence(
    payload: CreateFromIncidenceRequest,
    db: Session = Depends(get_db),
) -> VisitOut:
    """
    Create diagnosis visit from incidence, with optional escalation to P4/P5.
    """
    incidence = db.execute(
        text("SELECT id FROM incidence WHERE id = :id LIMIT 1"),
        {"id": payload.incidence_id},
    ).fetchone()
    if not incidence:
        raise HTTPException(status_code=404, detail=f"Incidencia {payload.incidence_id} no trobada")

    assignable = db.execute(
        text("SELECT id FROM assignable WHERE id = :id LIMIT 1"),
        {"id": payload.incidence_id},
    ).fetchone()
    if not assignable:
        raise HTTPException(
            status_code=422,
            detail="No existeix assignable associat a la incidència (mapping per ID requerit)",
        )

    visit_type = "diagnosis"
    if (payload.escalate_to or "").lower() == "p4":
        visit_type = "non_critical_corrective"
    elif (payload.escalate_to or "").lower() == "p5":
        visit_type = "critical_corrective"

    next_id = db.execute(text("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM visit")).fetchone().next_id
    db.execute(
        text(
            """
            INSERT INTO visit (id, assignable_id, technician_id, visit_type, status, planned_date, estimated_duration, score)
            VALUES (:id, :assignable_id, :technician_id, :visit_type, :status, :planned_date, :estimated_duration, :score)
            """
        ),
        {
            "id": int(next_id),
            "assignable_id": payload.incidence_id,
            "technician_id": payload.technician_id,
            "visit_type": visit_type,
            "status": "pending",
            "planned_date": datetime.utcnow(),
            "estimated_duration": 45,
            "score": None,
        },
    )
    db.commit()

    row = db.execute(
        text(
            """
            SELECT
                v.id,
                v.assignable_id,
                v.technician_id,
                v.visit_type,
                v.status,
                v.planned_date,
                v.estimated_duration,
                v.score,
                NULL::integer as route_order,
                COALESCE(c.latitude, 0.0) as latitude,
                COALESCE(c.longitude, 0.0) as longitude,
                COALESCE(c.postal_code, '') as postal_code
            FROM visit v
            LEFT JOIN assignable a ON v.assignable_id = a.id
            LEFT JOIN charger c ON a.charger_id = c.id
            WHERE v.id = :id
            """
        ),
        {"id": int(next_id)},
    ).fetchone()

    return _rows_to_visits([row])[0]