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

from database import get_db
from models import Visit, Imprevisto, VisitStatus
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
    # 1. Validar visita
    visit = db.query(Visit).filter(Visit.id == payload.visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail=f"Visita {payload.visit_id} no trobada.")

    if visit.technician_id is None:
        raise HTTPException(status_code=422, detail="La visita no té tècnic assignat.")

    # 2. Marcar visita com a bloquejada
    visit.status = VisitStatus.blocked

    # 3. Guardar imprevist
    imprevisto = Imprevisto(
        visit_id            = payload.visit_id,
        tipo                = payload.tipo,
        descripcion         = payload.descripcion,
        temps_perdut_min    = payload.tiempo_perdido_min,
    )
    db.add(imprevisto)
    db.commit()
    db.refresh(imprevisto)

    # 4. Visites pendents restants del tècnic avui (route_order > visita afectada)
    avui_start = datetime.combine(visit.planned_date.date(), time.min)
    avui_end   = datetime.combine(visit.planned_date.date(), time.max)

    visites_restants = (
        db.query(Visit)
        .filter(
            Visit.technician_id == visit.technician_id,
            Visit.planned_date  >= avui_start,
            Visit.planned_date  <= avui_end,
            Visit.status        == VisitStatus.pending,
            Visit.route_order   >  (visit.route_order or 0),
        )
        .order_by(Visit.route_order.asc().nulls_last())
        .all()
    )

    # 5. Calcular impacte: desplaçar les visites restants pel temps perdut
    minuts_perduts = payload.tiempo_perdido_min or 30  # fallback: 30 min
    nous_ids       = [v.id for v in visites_restants]

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
        imprevisto                  = ImprevistoOut.model_validate(imprevisto),
        visitas_afectadas           = [VisitOut.model_validate(v) for v in visites_restants],
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

    # Join amb Visit per filtrar per tècnic i dia
    imprevistos = (
        db.query(Imprevisto)
        .join(Visit, Imprevisto.visit_id == Visit.id)
        .filter(
            Visit.technician_id == technician_id,
            Imprevisto.created_at >= day_start,
            Imprevisto.created_at <= day_end,
        )
        .order_by(Imprevisto.created_at.desc())
        .all()
    )

    return imprevistos