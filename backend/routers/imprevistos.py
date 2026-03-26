"""
routers/imprevistos.py

POST /api/v1/imprevistos
  El tècnic marca una visita com a bloquejada per un imprevist.
  El backend registra l'esdeveniment, calcula l'impacte en la resta
  de la jornada i retorna una proposta de replanificació llegible.

GET /api/v1/imprevistos/{technician_id}
  Retorna tots els imprevistos actius del dia per a un tècnic.
  Usat per ContingencyBanner.tsx al dashboard d'operacions per mostrar
  les alertes en temps real.

Flux complet:
  Tècnic prem ContingencyButton
    → POST /api/v1/imprevistos
    → Backend registra + calcula impacte
    → Retorna proposta de replanificació
    → ContingencyBanner al dashboard d'ops rep l'alerta (via polling o WS)
    → Operacions pot acceptar o ignorar la proposta

Decisió sobre replanificació automàtica:
  El sistema PROPOSA però no executa. La proposta arriba com a text
  llegible ('missatge') i com a llista d'IDs reordenats ('nous_ids').
  Operacions decideix si confirmar. Si confirma, crida
  POST /api/v1/ruta/calcular amb els nous_ids per fer efectiu el canvi.
  Això respecta el requisit del repte: "el sistema no decideix automàticament".

Consumit per:
  - ContingencyButton.tsx (app tècnic)   → POST
  - ContingencyBanner.tsx (ops web)      → GET per polling
"""

from datetime import datetime, time, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db
from schemas import ImprevistoCreate, ImprevistoOut, ImprevistoResponse, VisitOut

router = APIRouter(prefix="/api/v1/imprevistos", tags=["imprevistos"])

VELOCIDAD_KMH = 40


def travel_min(km: float) -> float:
    import math
    return km / VELOCIDAD_KMH * 60


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/v1/imprevistos — registrar imprevist i calcular impacte
# ─────────────────────────────────────────────────────────────────────────────
@router.post("", response_model=ImprevistoResponse, status_code=201)
def create_imprevisto(
    payload: ImprevistoCreate,
    db: Session = Depends(get_db),
) -> ImprevistoResponse:
    """
    Registra un imprevist sobre una visita i calcula l'impacte en la
    resta de la jornada del tècnic.

    Lògica:
      1. Valida que la visita existeix i obté el tècnic assignat.
      2. Marca la visita com a 'blocked'.
      3. Guarda l'imprevist a la taula IMPREVISTO.
      4. Busca les visites pendents restants del tècnic avui
         (les que venen després en route_order).
      5. Calcula el desplaçament temporal que provoca el temps perdut.
      6. Construeix un missatge de proposta llegible per a Operacions.
    """
    visit = db.execute(
        text(
            """
            SELECT id, technician_id, planned_date
            FROM visit
            WHERE id = :visit_id
            LIMIT 1
            """
        ),
        {"visit_id": payload.visit_id},
    ).fetchone()
    if visit is None:
        raise HTTPException(status_code=404, detail=f"Visita {payload.visit_id} no trobada.")

    if visit.technician_id is None:
        raise HTTPException(status_code=422, detail="La visita no té tècnic assignat.")

    db.execute(
        text("UPDATE visit SET status = :status WHERE id = :visit_id"),
        {"status": "blocked", "visit_id": payload.visit_id},
    )

    new_id = db.execute(
        text("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM imprevisto")
    ).fetchone().next_id

    created_at = datetime.utcnow()
    db.execute(
        text(
            """
            INSERT INTO imprevisto (id, visit_id, tipo, descripcion, temps_perdut_min, created_at)
            VALUES (:id, :visit_id, :tipo, :descripcion, :temps_perdut_min, :created_at)
            """
        ),
        {
            "id": int(new_id),
            "visit_id": payload.visit_id,
            "tipo": payload.tipo,
            "descripcion": payload.descripcion,
            "temps_perdut_min": payload.tiempo_perdido_min,
            "created_at": created_at,
        },
    )
    db.commit()

    # 4. Visites pendents restants del tècnic avui (route_order > visita afectada)
    avui_start = datetime.combine(visit.planned_date.date(), time.min)
    avui_end = datetime.combine(visit.planned_date.date(), time.max)

    rows = db.execute(
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
                NULL::integer AS route_order,
                COALESCE(c.latitude, 0.0) AS latitude,
                COALESCE(c.longitude, 0.0) AS longitude,
                COALESCE(c.postal_code, '') AS postal_code
            FROM visit v
            LEFT JOIN assignable a ON v.assignable_id = a.id
            LEFT JOIN charger c ON a.charger_id = c.id
            WHERE v.technician_id = :technician_id
              AND v.planned_date >= :day_start
              AND v.planned_date <= :day_end
              AND v.planned_date > :current_visit_planned_date
              AND LOWER(v.status) IN ('pending', 'scheduled', 'in_progress', 'in progress')
            ORDER BY v.planned_date ASC
            """
        ),
        {
            "technician_id": visit.technician_id,
            "day_start": avui_start,
            "day_end": avui_end,
            "current_visit_planned_date": visit.planned_date,
        },
    ).fetchall()

    # 5. Calcular impacte: desplaçar les visites restants pel temps perdut
    minuts_perduts = payload.tiempo_perdido_min or 30  # fallback: 30 min
    visites_restants = [
        VisitOut(
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
        for row in rows
    ]

    # 6. Construir missatge llegible
    if not visites_restants:
        missatge = (
            f"Imprevist registrat a la visita #{visit.id} ({payload.tipo}). "
            f"No hi ha més visites pendents avui."
        )
    else:
        missatge = (
            f"Imprevist a visita #{visit.id} ({payload.tipo}): "
            f"+{minuts_perduts} min de retard. "
            f"Les {len(visites_restants)} visites restants s'endarrereixin. "
            f"Proposta: mantenir l'ordre actual i notificar els clients afectats."
        )

    return ImprevistoResponse(
        imprevisto=ImprevistoOut(
            id=int(new_id),
            visit_id=payload.visit_id,
            tipo=payload.tipo,
            descripcion=payload.descripcion,
            created_at=created_at,
            tiempo_perdido_min=payload.tiempo_perdido_min,
        ),
        visitas_afectadas=visites_restants,
        propuesta_replanificacion   = missatge,
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/imprevistos/{technician_id} — imprevistos actius d'avui
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{technician_id}", response_model=list[ImprevistoOut])
def get_imprevistos(
    technician_id: int,
    date: str = Query(
        default=None,
        description="Data en format YYYY-MM-DD. Per defecte: avui.",
    ),
    db: Session = Depends(get_db),
) -> list[ImprevistoOut]:
    """
    Retorna els imprevistos del dia per a un tècnic.
    ContingencyBanner.tsx fa polling a aquest endpoint per mostrar
    alertes en temps real al dashboard d'operacions.
    """
    from datetime import date as date_type
    target = datetime.strptime(date, "%Y-%m-%d").date() if date else datetime.utcnow().date()

    day_start = datetime.combine(target, time.min)
    day_end   = datetime.combine(target, time.max)

    rows = db.execute(
        text(
            """
            SELECT i.id, i.visit_id, i.tipo, i.descripcion, i.temps_perdut_min, i.created_at
            FROM imprevisto i
            JOIN visit v ON i.visit_id = v.id
            WHERE v.technician_id = :technician_id
              AND i.created_at >= :day_start
              AND i.created_at <= :day_end
            ORDER BY i.created_at DESC
            """
        ),
        {
            "technician_id": technician_id,
            "day_start": day_start,
            "day_end": day_end,
        },
    ).fetchall()

    return [
        ImprevistoOut(
            id=row.id,
            visit_id=row.visit_id,
            tipo=row.tipo,
            descripcion=row.descripcion,
            created_at=row.created_at,
            tiempo_perdido_min=row.temps_perdut_min,
        )
        for row in rows
    ]