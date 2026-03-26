"""
routers/metrics.py

GET /api/v1/metrics
  Retorna en un sol objecte totes les mètriques necessàries per al
  dashboard d'anàlisi (metrics-dashboard). Tot calculat amb queries
  SQL agregades, sense lògica de negoci en Python.

  Paràmetres opcionals:
    - date_from / date_to : rang de dates (per defecte: mes actual)
    - technician_id       : filtrar per un tècnic concret

Mètriques retornades (seguint el que demana l'enunciat):
  - completades / pendents / en_progres   → InterventionsAreaChart
  - km_per_tècnic                         → KmBarChart
  - hores_efectives_total                 → MetricsKpiGrid
  - retards_per_causa (imprevistos)       → RecentInterventionsTable
  - sla_per_tipus                         → SlaRadialChart

Decisió sobre km_per_tècnic:
  Els quilòmetres no es guarden a la BD visita per visita. Es calculen
  on-the-fly sumant les distàncies Haversine entre les visites completades
  d'un tècnic per dia, ordenades per route_order. És una aproximació
  suficient per a demo; en producció vindrien del GPS del vehicle.

Decisió sobre SLA:
  Definim que una visita compleix SLA si s'ha completat abans de
  planned_date + marge_per_tipus:
    - correctivo_critico    → 0h  (s'ha de completar immediatament)
    - correctivo_no_critico → 24h
    - preventivo            → 72h
    - puesta_en_marcha      → 48h
    - diagnosi              → 24h

Consumit per:
  - InterventionsAreaChart.tsx
  - KmBarChart.tsx
  - SlaRadialChart.tsx
  - MetricsKpiGrid.tsx
  - RecentInterventionsTable.tsx
"""

import math
from datetime import datetime, date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Visit, Technician, Imprevisto, VisitStatus, VisitType
from schemas import MetricsResponse, KmPorTecnico, RetardoPorCausa, SlaByType

router = APIRouter(prefix="/api/v1", tags=["metrics"])

# Marges SLA en hores per tipus de visita
SLA_MARGES: dict[VisitType, int] = {
    VisitType.correctivo_critico:    0,
    VisitType.correctivo_no_critico: 24,
    VisitType.preventivo:            72,
    VisitType.puesta_en_marcha:      48,
    VisitType.diagnosi:              24,
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a  = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/metrics
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/metrics", response_model=MetricsResponse)
def get_metrics(
    date_from:     Optional[date] = Query(default=None, description="Inici del rang (YYYY-MM-DD)"),
    date_to:       Optional[date] = Query(default=None, description="Fi del rang (YYYY-MM-DD)"),
    technician_id: Optional[int]  = Query(default=None, description="Filtrar per tècnic"),
    db: Session = Depends(get_db),
) -> MetricsResponse:
    """
    Un sol endpoint que alimenta tot el dashboard de mètriques.
    Minimitza el nombre de crides HTTP del frontend.
    """
    # Rang per defecte: mes actual
    today     = datetime.utcnow().date()
    from_dt   = datetime.combine(date_from or today.replace(day=1), datetime.min.time())
    to_dt     = datetime.combine(date_to   or today,                datetime.max.time())

    # Query base
    q = db.query(Visit).filter(
        Visit.planned_date >= from_dt,
        Visit.planned_date <= to_dt,
    )
    if technician_id:
        q = q.filter(Visit.technician_id == technician_id)

    visites = q.all()

    # ── 1. Comptadors d'estat ──────────────────────────────────────────────
    completades  = sum(1 for v in visites if v.status == VisitStatus.completed)
    pendents     = sum(1 for v in visites if v.status == VisitStatus.pending)
    en_progres   = sum(1 for v in visites if v.status == VisitStatus.in_progress)

    # ── 2. Km per tècnic ──────────────────────────────────────────────────
    # Agrupa visites completades per tècnic i calcula la suma de distàncies
    # Haversine entre visites consecutives (ordenades per route_order).
    tec_visits: dict[int, list[Visit]] = {}
    for v in visites:
        if v.status == VisitStatus.completed and v.technician_id:
            tec_visits.setdefault(v.technician_id, []).append(v)

    technicians_db = {t.id: t for t in db.query(Technician).all()}
    km_per_tec: list[KmPorTecnico] = []

    for tec_id, tvs in tec_visits.items():
        tvs_sorted = sorted(tvs, key=lambda v: (v.route_order or 999, v.planned_date))
        total_km   = 0.0
        for i in range(1, len(tvs_sorted)):
            prev = tvs_sorted[i - 1]
            curr = tvs_sorted[i]
            total_km += haversine_km(prev.latitude, prev.longitude, curr.latitude, curr.longitude)

        tec = technicians_db.get(tec_id)
        km_per_tec.append(KmPorTecnico(
            technician_id   = tec_id,
            technician_name = tec.name if tec else f"Tècnic {tec_id}",
            km_total        = round(total_km, 2),
        ))

    # ── 3. Hores efectives totals ──────────────────────────────────────────
    # Suma de estimated_duration de les visites completades, en hores.
    hores_efectives = sum(
        (v.estimated_duration or 45)
        for v in visites
        if v.status == VisitStatus.completed
    ) / 60

    # ── 4. Retards per causa (imprevistos) ────────────────────────────────
    imp_q = (
        db.query(Imprevisto.tipo, func.count(Imprevisto.id).label("total"))
        .join(Visit, Imprevisto.visit_id == Visit.id)
        .filter(
            Visit.planned_date >= from_dt,
            Visit.planned_date <= to_dt,
        )
    )
    if technician_id:
        imp_q = imp_q.filter(Visit.technician_id == technician_id)

    retards: list[RetardoPorCausa] = [
        RetardoPorCausa(causa=row.tipo.value, total=row.total)
        for row in imp_q.group_by(Imprevisto.tipo).all()
    ]

    # ── 5. SLA per tipus de visita ─────────────────────────────────────────
    # Agrupa per visit_type i compta quantes s'han completat dins del marge SLA.
    sla_stats: dict[VisitType, dict] = {}
    for v in visites:
        vt = v.visit_type
        sla_stats.setdefault(vt, {"total": 0, "completades": 0, "dins_sla": 0})
        sla_stats[vt]["total"] += 1
        if v.status == VisitStatus.completed:
            sla_stats[vt]["completades"] += 1
            # Considerem que completed_at ≈ planned_date + estimated_duration (aprox.)
            # En producció usaríem un camp completed_at real.
            marge_h     = SLA_MARGES.get(vt, 24)
            deadline_dt = v.planned_date + timedelta(hours=marge_h)
            # Si completed_at no existeix, assumim que va acabar a temps si
            # planned_date + estimated_duration < deadline
            estimated_end = v.planned_date + timedelta(minutes=v.estimated_duration or 45)
            if estimated_end <= deadline_dt:
                sla_stats[vt]["dins_sla"] += 1

    sla_per_tipus: list[SlaByType] = [
        SlaByType(
            visit_type     = vt,
            total          = data["total"],
            completades    = data["completades"],
            porcentaje_sla = round(
                (data["dins_sla"] / data["completades"] * 100) if data["completades"] else 0,
                1,
            ),
        )
        for vt, data in sla_stats.items()
    ]

    return MetricsResponse(
        completades            = completades,
        pendentes              = pendents,
        en_progreso            = en_progres,
        km_por_tecnico         = km_per_tec,
        horas_efectivas_total  = round(hores_efectives, 2),
        retardos_por_causa     = retards,
        sla_por_tipo           = sla_per_tipus,
    )