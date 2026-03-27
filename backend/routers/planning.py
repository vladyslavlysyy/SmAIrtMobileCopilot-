"""
routers/planning.py

POST /api/v1/planning/assign   → proposta (read-only)
POST /api/v1/planning/confirm  → aplica el canvi

─────────────────────────────────────────────────────────────────────────
CÀLCUL DE TEMPS — com funciona exactament
─────────────────────────────────────────────────────────────────────────

Per a una ruta [V1, V2, V3] d'un tècnic amb dipòsit D:

  temps_total =
      travel(D → V1)                      ← anada des del dipòsit
    + estimated_duration(V1)              ← temps a la visita
    + travel(V1 → V2)                     ← desplaçament
    + estimated_duration(V2)
    + travel(V2 → V3)
    + estimated_duration(V3)
    + travel(V3 → D)                      ← TORNADA al dipòsit

  travel(A→B) = haversine_km(A, B) / 40 km/h × 60  [minuts]

La fórmula de Haversine calcula la distància en línia recta sobre l'esfera
terrestre. Suposem velocitat mitjana de 40 km/h (zona metropolitana).
És una aproximació; per a rutes reals caldria una API de mapes.

COST D'INSERCIÓ d'un nou punt N entre prev i next:
  extra_km = dist(prev→N) + dist(N→next) − dist(prev→next)
  (és el desvio net, pot ser negatiu si N queda entre ells per geometria)
  extra_min = travel(extra_km) + estimated_duration(N)
  cost = extra_km × 0.6 + extra_min × 0.4

─────────────────────────────────────────────────────────────────────────
P5 — CANCEL·LACIÓ JERÀRQUICA
─────────────────────────────────────────────────────────────────────────

Si cap tècnic té capacitat natural, P5 busca quina visita és
més prescindible per cancel·lar-la i alliberar espai.

Ordre jeràrquic de prescindibilitat (de més a menys):
  1. P1 (preventiu) — deadline més llunyà primer
  2. P2 (puesta en marcha) — no crític
  3. P3 (diagnosi) — es pot reprogramar
  4. P4 (correctiu no crític) — pot esperar un dia
  ❌ P5 — MAI es cancel·la una visita crítica

Per a cada nivell, pren la visita amb deadline més llunyà
(la més fàcil de reprogramar). Si alliberant-la hi cap la nova P5,
és el candidat amb cancel·lació.
"""

import math
from datetime import datetime, date, timedelta, time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import ProgrammingError, SQLAlchemyError
from sqlalchemy import text
from pydantic import BaseModel

from database import get_db
from models import Visit, Technician, VisitStatus, DEFAULT_PRIORITY, ZONE_DEPOTS, DEFAULT_DEPOT

router = APIRouter(prefix="/api/v1/planning", tags=["planning"])

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────
VELOCIDAD_KMH      = 40     # km/h velocitat mitjana metropolitana
LIMITE_JORNADA_MIN = 480    # 8 hores
MARGE_OPORTUNISTA  = 360    # P2: jornada ≤ 360 min per poder inserir
COST_KM_WEIGHT     = 0.6    # pes quilòmetres en la funció de cost
COST_MIN_WEIGHT    = 0.4    # pes temps en la funció de cost
CANCEL_PENALTY     = 50.0   # penalització per cancel·lar qualsevol visita
DELAY_PENALTY      = 5.0    # penalització per dia de retard (P4/P1)

# Ordre jeràrquic de prescindibilitat per a P5 (de més a menys)
P5_CANCEL_ORDER = [1, 2, 3, 4]   # mai 5


# ─────────────────────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class AssignRequest(BaseModel):
    visit_id: int


class CandidateTechnician(BaseModel):
    technician_id:      int
    technician_name:    str
    proposed_date:      str        # "YYYY-MM-DD"
    insertion_index:    int
    extra_km:           float
    extra_min:          float
    cost:               float
    cancelled_visit_id: Optional[int] = None
    cancelled_reason:   Optional[str] = None


class AssignProposal(BaseModel):
    visit_id:    int
    priority:    int
    candidates:  list[CandidateTechnician]
    recommended: CandidateTechnician


class ConfirmRequest(BaseModel):
    visit_id:           int
    technician_id:      int
    proposed_date:      str
    insertion_index:    int
    cancelled_visit_id: Optional[int] = None


class ConfirmResponse(BaseModel):
    ok:                 bool
    visit_id:           int
    technician_id:      int
    assigned_date:      str
    cancelled_visit_id: Optional[int]


class TechnicianLiteOut(BaseModel):
    id: int
    name: str
    zone: str


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS GEOMÈTRICS
# ─────────────────────────────────────────────────────────────────────────────
def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distància en km entre dos punts GPS (fórmula de Haversine)."""
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp     = math.radians(lat2 - lat1)
    dl     = math.radians(lon2 - lon1)
    a      = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def travel_min(km: float) -> float:
    """Minuts de viatge a velocitat mitjana."""
    return km / VELOCIDAD_KMH * 60


def insertion_extra(
    prev:    tuple[float, float],
    new:     tuple[float, float],
    nxt:     tuple[float, float] | None,
) -> tuple[float, float]:
    """
    Extra (km, min) d'inserir `new` entre `prev` i `nxt`.
    Si nxt és None (al final), cost = dist(prev→new) sense compensació.
    """
    d_pn = haversine_km(*prev, *new)
    if nxt:
        d_ns  = haversine_km(*new, *nxt)
        d_ps  = haversine_km(*prev, *nxt)
        ekm   = max(d_pn + d_ns - d_ps, 0.0)
    else:
        ekm = d_pn
    return ekm, travel_min(ekm)


def total_time_with_depot(
    depot:  tuple[float, float],
    visits: list[Visit],
) -> float:
    """
    Temps total de jornada comptant ANADA i TORNADA al dipòsit.

      temps = travel(depot→V0) + dur(V0)
            + travel(V0→V1)   + dur(V1)
            + ...
            + travel(Vn-1→Vn) + dur(Vn)
            + travel(Vn→depot)           ← tornada

    Retorna minuts totals.
    """
    if not visits:
        return 0.0

    total = 0.0
    prev  = depot

    for v in visits:
        if v.lat is None or v.lon is None:
            total += v.estimated_duration or 45
            continue
        curr   = (v.lat, v.lon)
        total += travel_min(haversine_km(*prev, *curr))
        total += v.estimated_duration or 45
        prev   = curr

    # Tornada al dipòsit des de l'última visita
    last = visits[-1]
    if last.lat and last.lon:
        total += travel_min(haversine_km(last.lat, last.lon, *depot))

    return total


def best_insertion(
    depot:     tuple[float, float],
    route:     list[Visit],
    new_lat:   float,
    new_lon:   float,
    new_dur:   int,
    min_idx:   int = 0,   # no inserir abans d'aquest índex (respecte P5 existents)
) -> tuple[int, float, float, float]:
    """
    Troba la posició d'inserció òptima (mínim cost) per a un nou punt.
    Retorna (idx, extra_km, extra_min, cost).
    """
    new = (new_lat, new_lon)
    best_cost = float("inf")
    best_idx  = min_idx
    best_ekm  = 0.0
    best_emin = 0.0

    # Punts de la ruta incloent dipòsit d'inici
    points = [depot] + [(v.lat, v.lon) for v in route if v.lat and v.lon]

    for i in range(min_idx, len(route) + 1):
        prev = points[i] if i < len(points) else depot
        nxt  = points[i + 1] if i + 1 < len(points) else None

        if prev[0] is None:
            continue

        ekm, emin = insertion_extra(prev, new, nxt)
        emin_total = emin + new_dur
        cost = ekm * COST_KM_WEIGHT + emin_total * COST_MIN_WEIGHT

        if cost < best_cost:
            best_cost = cost
            best_idx  = i
            best_ekm  = ekm
            best_emin = emin_total

    return best_idx, round(best_ekm, 2), round(best_emin, 1), round(best_cost, 3)


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS DE BD
# ─────────────────────────────────────────────────────────────────────────────
def get_day_visits(db: Session, technician_id: int, target: date) -> list[Visit]:
    day_start = datetime.combine(target, time.min)
    day_end   = datetime.combine(target, time.max)
    return (
        db.query(Visit)
        .filter(
            Visit.technician_id == technician_id,
            Visit.planned_date  >= day_start,
            Visit.planned_date  <= day_end,
            Visit.status.in_([VisitStatus.pending, VisitStatus.in_progress]),
        )
        .order_by(Visit.planned_date.asc())
        .all()
    )


def get_technicians(db: Session) -> list[Technician]:
    return db.query(Technician).all()


@router.get("/technicians", response_model=list[TechnicianLiteOut])
def list_technicians(db: Session = Depends(get_db)) -> list[TechnicianLiteOut]:
    """Return technicians for frontend selectors and realtime map.

    Uses a conservative query compatible with current schema, and derives
    display name from user_info when available.
    """
    has_user_info = bool(
        db.execute(
            text(
                """
                SELECT EXISTS(
                  SELECT 1
                  FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = 'user_info'
                )
                """
            )
        ).scalar()
    )

    if has_user_info:
        rows = db.execute(
            text(
                """
                SELECT
                  t.id,
                  COALESCE(u.name, CONCAT('Tecnico ', t.id::text)) AS name,
                  COALESCE(t.zone, 'General') AS zone
                FROM technician t
                LEFT JOIN user_info u ON u.id = t.id
                ORDER BY t.id ASC
                """
            )
        ).fetchall()
    else:
        rows = db.execute(
            text(
                """
                SELECT
                  t.id,
                  CONCAT('Tecnico ', t.id::text) AS name,
                  COALESCE(t.zone, 'General') AS zone
                FROM technician t
                ORDER BY t.id ASC
                """
            )
        ).fetchall()

    return [
        TechnicianLiteOut(id=int(r.id), name=str(r.name), zone=str(r.zone))
        for r in rows
    ]


# ─────────────────────────────────────────────────────────────────────────────
# P5 — inserció forçada avui, cancel·lació jeràrquica
# ─────────────────────────────────────────────────────────────────────────────
def plan_p5(db: Session, nv: Visit, today: date) -> list[CandidateTechnician]:
    """
    Busca el tècnic de mínim cost per inserir la visita avui.
    Si ningú té capacitat, busca la visita més prescindible jeràrquicament
    (P1 → P2 → P3 → P4) per alliberar espai.
    """
    if not nv.lat or not nv.lon:
        return []

    new       = (nv.lat, nv.lon)
    new_dur   = nv.estimated_duration or 45
    candidates: list[CandidateTechnician] = []

    for tec in get_technicians(db):
        depot = tec.depot
        route = get_day_visits(db, tec.id, today)
        t_cur = total_time_with_depot(depot, route)

        # Respectar l'ordre estricte de P5 existents:
        # no inserir davant d'una visita que ja és crítica
        min_idx = next(
            (i for i, v in enumerate(route) if v.effective_priority < 5),
            len(route),
        )

        idx, ekm, emin, cost = best_insertion(depot, route, nv.lat, nv.lon, new_dur, min_idx)

        if t_cur + emin <= LIMITE_JORNADA_MIN:
            # Capacitat natural → candidat directe
            candidates.append(CandidateTechnician(
                technician_id   = tec.id,
                technician_name = tec.name,
                proposed_date   = str(today),
                insertion_index = idx,
                extra_km        = ekm,
                extra_min       = emin,
                cost            = cost,
            ))
        else:
            # Sense capacitat → buscar visita cancel·lable jeràrquicament
            for cancel_priority in P5_CANCEL_ORDER:
                candidates_cancel = [
                    v for v in route
                    if v.effective_priority == cancel_priority
                ]
                if not candidates_cancel:
                    continue

                # La més prescindible: la de deadline més llunyà
                def deadline_key(v: Visit) -> date:
                    if v.contract and v.contract.end_date:
                        return v.contract.end_date
                    return date(2099, 12, 31)  # sense deadline = molt lluny

                prescindible = max(candidates_cancel, key=deadline_key)

                # Temps que s'allibera si cancel·lem aquesta visita
                freed_min = (prescindible.estimated_duration or 45)
                if prescindible.lat and prescindible.lon:
                    # Aproximació: el temps de viatge cap a ella i des d'ella
                    freed_min += travel_min(haversine_km(*new, prescindible.lat, prescindible.lon)) * 2

                if t_cur - freed_min + emin <= LIMITE_JORNADA_MIN:
                    p_name = {1: "preventiu", 2: "posada en marxa",
                              3: "diagnosi", 4: "correctiu no crític"}.get(cancel_priority, "")
                    candidates.append(CandidateTechnician(
                        technician_id      = tec.id,
                        technician_name    = tec.name,
                        proposed_date      = str(today),
                        insertion_index    = idx,
                        extra_km           = ekm,
                        extra_min          = emin,
                        cost               = round(cost + CANCEL_PENALTY, 3),
                        cancelled_visit_id = prescindible.id,
                        cancelled_reason   = (
                            f"S'ha de cancel·lar visita P{cancel_priority} ({p_name}) "
                            f"#{prescindible.id} per alliberar {round(freed_min)} min."
                        ),
                    ))
                    break  # trobat el més prescindible d'aquest nivell, parar

    return sorted(candidates, key=lambda c: c.cost)


# ─────────────────────────────────────────────────────────────────────────────
# P4 — ASAP sense tocar el dia actual
# ─────────────────────────────────────────────────────────────────────────────
def plan_p4(
    db: Session,
    nv: Visit,
    today: date,
    max_days: int = 7,
    start_offset: int = 1,
) -> list[CandidateTechnician]:
    if not nv.lat or not nv.lon:
        return []

    new_dur    = nv.estimated_duration or 45
    candidates = []

    for tec in get_technicians(db):
        depot = tec.depot
        for delta in range(start_offset, max_days + 1):
            target  = today + timedelta(days=delta)
            route   = get_day_visits(db, tec.id, target)
            t_total = total_time_with_depot(depot, route)

            if t_total + new_dur > LIMITE_JORNADA_MIN:
                continue

            idx, ekm, emin, base_cost = best_insertion(depot, route, nv.lat, nv.lon, new_dur)
            cost = round(base_cost + delta * DELAY_PENALTY, 3)

            candidates.append(CandidateTechnician(
                technician_id   = tec.id,
                technician_name = tec.name,
                proposed_date   = str(target),
                insertion_index = idx,
                extra_km        = ekm,
                extra_min       = emin,
                cost            = cost,
            ))
            break  # primer dia disponible per a aquest tècnic

    return sorted(candidates, key=lambda c: c.cost)


# ─────────────────────────────────────────────────────────────────────────────
# P3 — Diagnosi (prèvia a una visita associada)
# ─────────────────────────────────────────────────────────────────────────────
def plan_p3(db: Session, nv: Visit, today: date) -> list[CandidateTechnician]:
    """
    Intenta planificar el dia anterior a una visita associada del mateix charger.
    Si no en troba cap, tracta com P4.
    """
    charger_id = None
    if nv.contract:
        charger_id = nv.contract.charger_id
    elif nv.incidence:
        charger_id = nv.incidence.charger_id

    related_date = None
    if charger_id:
        related = (
            db.query(Visit)
            .join(Visit.contract)
            .filter(
                Visit.status.in_([VisitStatus.pending, VisitStatus.in_progress]),
                Visit.visit_type.in_(["puesta_en_marcha", "correctivo_critico", "correctivo_no_critico"]),
                Visit.planned_date >= datetime.combine(today, time.min),
            )
            .first()
        )
        if related:
            related_date = related.planned_date.date()

    if related_date:
        target = related_date - timedelta(days=1)
        if target < today:
            target = today
        return plan_p4(db, nv, target - timedelta(days=1), max_days=3, start_offset=0)

    return plan_p4(db, nv, today)


# ─────────────────────────────────────────────────────────────────────────────
# P2 — Oportunista (jornada lleugers + bonus codi postal)
# ─────────────────────────────────────────────────────────────────────────────
def plan_p2(db: Session, nv: Visit, today: date) -> list[CandidateTechnician]:
    if not nv.lat or not nv.lon:
        return []

    new_dur    = nv.estimated_duration or 45
    new_pc     = nv.postal_code
    candidates = []

    for tec in get_technicians(db):
        depot = tec.depot
        for delta in range(0, 14):
            target  = today + timedelta(days=delta)
            route   = get_day_visits(db, tec.id, target)
            t_total = total_time_with_depot(depot, route)

            if t_total > MARGE_OPORTUNISTA:
                continue
            if t_total + new_dur > LIMITE_JORNADA_MIN:
                continue

            same_pc = any(v.postal_code == new_pc for v in route) if new_pc else False
            pc_bonus = -10.0 if same_pc else 0.0

            idx, ekm, emin, base_cost = best_insertion(depot, route, nv.lat, nv.lon, new_dur)
            candidates.append(CandidateTechnician(
                technician_id   = tec.id,
                technician_name = tec.name,
                proposed_date   = str(target),
                insertion_index = idx,
                extra_km        = ekm,
                extra_min       = emin,
                cost            = round(base_cost + delta * DELAY_PENALTY + pc_bonus, 3),
            ))

            if len(candidates) >= 3:
                break
        if len(candidates) >= 3:
            break

    return sorted(candidates, key=lambda c: c.cost)


# ─────────────────────────────────────────────────────────────────────────────
# P1 — Preventiu contractual (omple buits)
# ─────────────────────────────────────────────────────────────────────────────
def plan_p1(db: Session, nv: Visit, today: date) -> list[CandidateTechnician]:
    if nv.contract and nv.contract.end_date:
        dies_restants = (nv.contract.end_date - today).days
        if dies_restants <= 3:
            return plan_p4(db, nv, today)
        max_days = min(dies_restants, 30)
    else:
        max_days = 14

    return plan_p4(db, nv, today, max_days=max_days)


# ─────────────────────────────────────────────────────────────────────────────
# DISPATCHER
# ─────────────────────────────────────────────────────────────────────────────
def dispatch(db: Session, nv: Visit, today: date) -> list[CandidateTechnician]:
    p = nv.effective_priority
    if p == 5: return plan_p5(db, nv, today)
    if p == 4: return plan_p4(db, nv, today)
    if p == 3: return plan_p3(db, nv, today)
    if p == 2: return plan_p2(db, nv, today)
    return plan_p1(db, nv, today)


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/assign", response_model=AssignProposal)
def assign_visit(payload: AssignRequest, db: Session = Depends(get_db)) -> AssignProposal:
    """
    Calcula la proposta d'assignació. NO escriu res a la BD.
    Operacions revisa i confirma amb /confirm.
    """
    try:
        visit = db.query(Visit).filter(Visit.id == payload.visit_id).first()
        if not visit:
            raise HTTPException(404, f"Visita {payload.visit_id} no trobada.")
        if visit.technician_id is not None:
            raise HTTPException(409, "La visita ja té tècnic assignat.")
        if not visit.lat or not visit.lon:
            raise HTTPException(
                422,
                "La visita no té coordenades. "
                "Comprova que el charger associat (via contracte o incidència) "
                "té latitude i longitude.",
            )

        today      = datetime.utcnow().date()
        candidates = dispatch(db, visit, today)

        if not candidates:
            raise HTTPException(
                409,
                f"No s'ha trobat cap slot per a la visita P{visit.effective_priority}. "
                "Considera augmentar la prioritat o ampliar la finestra.",
            )

        return AssignProposal(
            visit_id    = visit.id,
            priority    = visit.effective_priority,
            candidates  = candidates,
            recommended = candidates[0],
        )
    except ProgrammingError as exc:
        db.rollback()
        raise HTTPException(
            503,
            "Planning no disponible amb l'esquema actual de BD. "
            "Cal aplicar les migrations de planning.",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "Error de base de dades al calcular planning.") from exc


@router.post("/confirm", response_model=ConfirmResponse)
def confirm_assignment(payload: ConfirmRequest, db: Session = Depends(get_db)) -> ConfirmResponse:
    """
    Operacions confirma. S'apliquen tots els canvis a la BD.
    """
    try:
        visit = db.query(Visit).filter(Visit.id == payload.visit_id).first()
        if not visit:
            raise HTTPException(404, f"Visita {payload.visit_id} no trobada.")

        proposed_date       = datetime.strptime(payload.proposed_date, "%Y-%m-%d").date()
        visit.technician_id = payload.technician_id
        visit.planned_date  = datetime.combine(proposed_date, time(8, 0))
        visit.status        = VisitStatus.pending

        # Cancel·lar visita desplaçada si escau (P5)
        if payload.cancelled_visit_id:
            cancelled = db.query(Visit).filter(Visit.id == payload.cancelled_visit_id).first()
            if cancelled:
                cancelled.status = VisitStatus.cancelled

        db.commit()

        return ConfirmResponse(
            ok                 = True,
            visit_id           = visit.id,
            technician_id      = payload.technician_id,
            assigned_date      = payload.proposed_date,
            cancelled_visit_id = payload.cancelled_visit_id,
        )
    except ProgrammingError as exc:
        db.rollback()
        raise HTTPException(
            503,
            "Planning no disponible amb l'esquema actual de BD. "
            "Cal aplicar les migrations de planning.",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "Error de base de dades al confirmar planning.") from exc