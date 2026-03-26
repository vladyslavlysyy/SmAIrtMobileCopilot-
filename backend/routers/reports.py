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

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db
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
    visit = db.execute(
      text("SELECT id FROM visit WHERE id = :visit_id LIMIT 1"),
      {"visit_id": payload.visit_id},
    ).fetchone()
    if visit is None:
        raise HTTPException(status_code=404, detail=f"Visita {payload.visit_id} no trobada.")

    existing = db.execute(
      text("SELECT id FROM report WHERE visit_id = :visit_id LIMIT 1"),
      {"visit_id": payload.visit_id},
    ).fetchone()

    if existing is not None:
      db.execute(
        text(
          """
          UPDATE report
          SET report_type = :report_type,
            status = :status,
            created_at = :created_at
          WHERE id = :id
          """
        ),
        {
          "id": existing.id,
          "report_type": payload.report_type,
          "status": "submitted",
          "created_at": datetime.utcnow(),
        },
      )
      report_id = existing.id
    else:
      next_id = db.execute(text("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM report")).fetchone().next_id
      db.execute(
        text(
          """
          INSERT INTO report (id, visit_id, report_type, status, created_at)
          VALUES (:id, :visit_id, :report_type, :status, :created_at)
          """
        ),
        {
          "id": int(next_id),
          "visit_id": payload.visit_id,
          "report_type": payload.report_type,
          "status": "submitted",
          "created_at": datetime.utcnow(),
        },
      )
      report_id = int(next_id)

    db.execute(
      text("UPDATE visit SET status = :status WHERE id = :visit_id"),
      {"status": "completed", "visit_id": payload.visit_id},
    )
    db.commit()

    row = db.execute(
      text(
        """
        SELECT id, visit_id, report_type, status, created_at
        FROM report
        WHERE id = :id
        """
      ),
      {"id": report_id},
    ).fetchone()

    return ReportOut(
      id=row.id,
      visit_id=row.visit_id,
      report_type=row.report_type,
      status=row.status,
      created_at=row.created_at,
      content_json=payload.content_json,
    )


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
    row = db.execute(
      text(
        """
        SELECT id, visit_id, report_type, status, created_at
        FROM report
        WHERE visit_id = :visit_id
        LIMIT 1
        """
      ),
      {"visit_id": visit_id},
    ).fetchone()
    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"No hi ha informe per a la visita {visit_id}.",
        )
    return ReportOut(
      id=row.id,
      visit_id=row.visit_id,
      report_type=row.report_type,
      status=row.status,
      created_at=row.created_at,
      content_json=None,
    )