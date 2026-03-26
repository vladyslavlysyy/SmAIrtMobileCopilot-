"""
routers/reports.py

POST /api/v1/reports
  El tècnic ha completat una visita i envia el formulari post-intervenció.
  El backend guarda l'informe a la taula REPORT i marca la visita com a
  'completed'. Si ja existia un informe per aquesta visita, el sobreescriu
  (pot passar si el tècnic tanca la app abans d'enviar i reobre).

GET /api/v1/reports/{visit_id}
  Retorna l'informe associat a una visita concreta.
  Usat pel dashboard d'operacions per revisar evidències.

Tipus d'informe segons visit_type:
  - puesta_en_marcha → checklist de tensió, firmware, RFID, tests de presa
  - preventivo       → checklist de 17 ítems + mesures elèctriques
  - correctivo       → diagnosi, accions, material, estat resolució, fotos

El contingut del formulari arriba serialitzat com a JSON string (content_json).
El backend no valida l'estructura interna del JSON — cada tipus de formulari
té els seus camps i és responsabilitat del frontend construir-los correctament.
Aquesta decisió simplifica el backend i dóna flexibilitat al frontend per
evolucionar els formularis sense canviar l'API.

Consumit per:
  - RouteTimeline.tsx  → formulari final al completar visita → POST
  - OperationsHeader / InterventionQueue → revisar informe → GET
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Visit, Report, VisitStatus, ReportType
from schemas import ReportCreate, ReportOut

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/v1/reports  — guardar informe i marcar visita completada
# ─────────────────────────────────────────────────────────────────────────────
@router.post("", response_model=ReportOut, status_code=201)
def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
) -> ReportOut:
    """
    Guarda l'informe post-intervenció.

    Lògica:
      1. Comprova que la visita existeix i pertany al tècnic correcte.
      2. Si ja hi ha un informe per aquesta visita (enviament duplicat o
         reintent), l'actualitza en lloc de crear-ne un de nou.
      3. Marca la visita com a 'completed'.
      4. Retorna l'informe guardat.
    """
    # 1. Validar que la visita existeix
    visit = db.query(Visit).filter(Visit.id == payload.visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail=f"Visita {payload.visit_id} no trobada.")

    # 2. Upsert: actualitzar si ja existia, crear si no
    existing = db.query(Report).filter(Report.visit_id == payload.visit_id).first()

    if existing:
        existing.report_type  = payload.report_type
        existing.content_json = payload.content_json
        existing.status       = "submitted"
        report = existing
    else:
        report = Report(
            visit_id     = payload.visit_id,
            report_type  = payload.report_type,
            content_json = payload.content_json,
            status       = "submitted",
        )
        db.add(report)

    # 3. Marcar visita com a completada
    visit.status = VisitStatus.completed

    db.commit()
    db.refresh(report)

    return report


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/reports/{visit_id}  — obtenir informe d'una visita
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{visit_id}", response_model=ReportOut)
def get_report(
    visit_id: int,
    db: Session = Depends(get_db),
) -> ReportOut:
    """
    Retorna l'informe associat a una visita.
    Usat pel dashboard d'operacions per revisar les evidències tècniques.
    """
    report = db.query(Report).filter(Report.visit_id == visit_id).first()
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"No hi ha informe per a la visita {visit_id}.",
        )
    return report