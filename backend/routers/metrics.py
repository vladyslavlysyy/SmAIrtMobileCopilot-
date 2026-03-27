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
from sqlalchemy import text

from database import get_db
from models import Visit, Technician, VisitStatus, VisitType
from schemas import MetricsResponse, KmPorTecnico, RetardoPorCausa, SlaByType

router = APIRouter(prefix="/api/v1", tags=["metrics"])

# Marges SLA en hores per tipus de visita
SLA_MARGES: dict[str, int] = {
    "correctivo_critico":    0,
    "correctivo_no_critico": 24,
    "preventivo":            72,
    "puesta_en_marcha":      48,
    "diagnosi":              24,
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
    Utilitza SQL queries per llegir directament de la BD.
    """
    has_date_filter = date_from is not None or date_to is not None
    today = datetime.utcnow().date()
    from_dt = datetime.combine(date_from or today.replace(day=1), datetime.min.time())
    to_dt = datetime.combine(date_to or today, datetime.max.time())

    date_filter = "AND v.planned_date >= :from_dt AND v.planned_date <= :to_dt" if has_date_filter else ""
    tech_filter = "AND v.technician_id = :technician_id" if technician_id is not None else ""
    params = {}
    if has_date_filter:
        params["from_dt"] = from_dt
        params["to_dt"] = to_dt
    if technician_id is not None:
        params["technician_id"] = technician_id

    count_query = text(f"""
        SELECT
            COUNT(CASE WHEN LOWER(v.status) = 'completed' THEN 1 END) AS completadas,
            COUNT(CASE WHEN LOWER(v.status) = 'pending' THEN 1 END) AS pendientes,
            COUNT(CASE WHEN LOWER(v.status) IN ('schedule', 'scheduled') THEN 1 END) AS programadas,
            COUNT(CASE WHEN LOWER(v.status) IN ('in_progress', 'in progress', 'en_progreso') THEN 1 END) AS en_progreso
        FROM visit v
                WHERE 1=1
                    {date_filter}
          {tech_filter}
    """)
    count_row = db.execute(count_query, params).fetchone()
    completades = count_row.completadas or 0
    pendents = count_row.pendientes or 0
    programades = count_row.programadas or 0
    en_progres = count_row.en_progreso or 0

    km_query = text(f"""
        SELECT
            v.technician_id,
            COALESCE(c.latitude, 0.0) AS lat,
            COALESCE(c.longitude, 0.0) AS lon
        FROM visit v
        LEFT JOIN assignable a ON v.assignable_id = a.id
        LEFT JOIN charger c ON a.charger_id = c.id
                WHERE 1=1
                    {date_filter}
          AND LOWER(v.status) IN ('completed', 'completado', 'done')
          {tech_filter}
        ORDER BY v.technician_id ASC, v.planned_date ASC
    """)
    km_rows = db.execute(km_query, params).fetchall()

    km_per_tec_dict: dict[int, list[tuple[float, float]]] = {}
    for row in km_rows:
        km_per_tec_dict.setdefault(int(row.technician_id), []).append((float(row.lat), float(row.lon)))

    km_per_tec: list[KmPorTecnico] = []
    for tec_id, coords in km_per_tec_dict.items():
        total_km = 0.0
        for i in range(1, len(coords)):
            lat1, lon1 = coords[i - 1]
            lat2, lon2 = coords[i]
            total_km += haversine_km(lat1, lon1, lat2, lon2)
        km_per_tec.append(
            KmPorTecnico(
                technician_id=tec_id,
                technician_name=f"Tecnico {tec_id}",
                km_total=round(total_km, 2),
            )
        )

    hours_query = text(f"""
        SELECT SUM(COALESCE(v.estimated_duration, 45)) / 60.0 AS total_horas
        FROM visit v
                WHERE 1=1
                    {date_filter}
          AND LOWER(v.status) IN ('completed', 'completado', 'done')
          {tech_filter}
    """)
    hours_row = db.execute(hours_query, params).fetchone()
    hores_efectives = float(hours_row.total_horas or 0.0)

    try:
        imprevisto_query = text(f"""
            SELECT i.tipo, COUNT(i.id) AS total
            FROM imprevisto i
            JOIN visit v ON i.visit_id = v.id
                        WHERE 1=1
                            {date_filter}
              {tech_filter}
            GROUP BY i.tipo
        """)
        imprevisto_rows = db.execute(imprevisto_query, params).fetchall()
        retards = [
            RetardoPorCausa(causa=str(row.tipo or "Sin especificar"), total=int(row.total))
            for row in imprevisto_rows
        ]
    except Exception:
        # If this optional query fails, clear the failed transaction so
        # following queries (SLA, etc.) can still run.
        db.rollback()
        retards = []

    sla_query = text(f"""
        SELECT
            v.visit_type,
            COUNT(v.id) AS total,
            COUNT(CASE WHEN LOWER(v.status) IN ('completed', 'completado', 'done') THEN 1 END) AS completadas
        FROM visit v
                WHERE 1=1
                    {date_filter}
          {tech_filter}
        GROUP BY v.visit_type
    """)
    sla_rows = db.execute(sla_query, params).fetchall()
    sla_per_tipus = [
        SlaByType(
            visit_type=str(row.visit_type),
            total=int(row.total),
            completadas=int(row.completadas or 0),
            porcentaje_sla=round(((row.completadas or 0) / row.total * 100) if row.total else 0, 1),
        )
        for row in sla_rows
    ]

    return MetricsResponse(
        completadas=int(completades),
        pendientes=int(pendents),
        programadas=int(programades),
        en_progreso=int(en_progres),
        km_por_tecnico=km_per_tec,
        horas_efectivas_total=round(hores_efectives, 2),
        retardos_por_causa=retards,
        sla_por_tipo=sla_per_tipus,
    )