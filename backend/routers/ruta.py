"""Ruteo con OSMnx + NetworkX (TSP sobre mini-grafo de paradas)."""

from datetime import datetime, timedelta
from functools import lru_cache
from typing import Any, Union
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db
from schemas import (
    CalcularRutaRequest,
    CalcularRutaResponse,
    SegmentoRuta,
    Coordenada,
    AsignarIncidenciaRequest,
    AsignarOkResponse,
    AsignarErrorResponse,
    EstadisticasRuta,
    ImpactoSimulacion,
)
from optimizer import generar_ruta_ia, generar_geometria_simple, generar_ruta_ia_desde_visitas
from models import ZONE_DEPOTS, DEFAULT_DEPOT

router = APIRouter(prefix="/api/v1/ruta", tags=["ruta"])

LIMITE_JORNADA_MIN = 480
MAP_PLACE = "Tarragona, Spain"


class GenerarRutaAdminRequest(BaseModel):
    technician_id: int
    origen: Coordenada
    destino: Coordenada | None = None
    target_date: str | None = None  # YYYY-MM-DD
    limite_horas: float = 8.0


class RecomendarLoteRequest(BaseModel):
    origen: Coordenada
    destino: Coordenada
    target_date: str | None = None  # YYYY-MM-DD
    limite_horas: float = 8.0


class AssignarRutaAdminRequest(BaseModel):
    technician_id: int
    visit_ids_ordered: list[int]
    target_date: str  # YYYY-MM-DD
    hora_inici: str = "08:00"


class GeometriaRutaRequest(BaseModel):
    visit_ids: list[int]
    origen: Coordenada | None = None


class ManualAssignVisitRequest(BaseModel):
    visit_id: int
    technician_id: int
    target_date: str | None = None  # YYYY-MM-DD
    hora_inici: str | None = None   # HH:MM


class AddVisitToSlotRequest(BaseModel):
    technician_id: int
    visit_id: int
    target_date: str  # YYYY-MM-DD
    hora_inici: str = "08:00"
    limite_horas: float = 8.0
    origen: Coordenada | None = None
    destino: Coordenada | None = None


def _require_routing_libs() -> tuple[Any, Any, Any]:
    try:
        import osmnx as ox
        import networkx as nx
        from networkx.algorithms.approximation import traveling_salesman_problem
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Falten dependències de ruteig. Instal·la 'osmnx' i 'networkx' "
                "al venv del backend."
            ),
        ) from exc
    return ox, nx, traveling_salesman_problem


@lru_cache(maxsize=2)
def _get_drive_graph(place: str):
    ox, _, _ = _require_routing_libs()
    graph = ox.graph_from_place(place, network_type="drive")
    graph = ox.add_edge_speeds(graph)
    graph = ox.add_edge_travel_times(graph)
    return graph


def _rotate_start(path: list[int], start_idx: int) -> list[int]:
    if not path:
        return path
    if start_idx in path:
        pivot = path.index(start_idx)
        return path[pivot:] + path[:pivot]
    return path


def generar_ruta_optima(paradas: list[dict], place: str = MAP_PLACE) -> dict:
    """
    Espera `paradas` con formato:
    {"id": int|str, "coords": (lat, lon), "estancia": int, "address": str|None}
    La primera parada debe ser el origen (estancia=0 recomendado).
    """
    if len(paradas) < 2:
        raise HTTPException(status_code=422, detail="Calen almenys origen + 1 parada.")

    ox, nx, traveling_salesman_problem = _require_routing_libs()
    G = _get_drive_graph(place)

    nodos_paradas: list[int] = []
    idx_to_parada: dict[int, dict] = {}

    for i, p in enumerate(paradas):
        lat, lon = p["coords"]
        node = ox.nearest_nodes(G, lon, lat)
        nodos_paradas.append(node)
        idx_to_parada[i] = p

    # Mini-grafo completo entre paradas para aislar el TSP de cortes de conectividad urbana.
    tsp_graph = nx.complete_graph(len(nodos_paradas))
    for i in range(len(nodos_paradas)):
        for j in range(len(nodos_paradas)):
            if i == j:
                continue
            u = nodos_paradas[i]
            v = nodos_paradas[j]
            try:
                cost = nx.shortest_path_length(G, u, v, weight="travel_time")
            except nx.NetworkXNoPath:
                cost = 999999
            tsp_graph[i][j]["weight"] = cost

    tsp_idx_route = list(traveling_salesman_problem(tsp_graph, weight="weight", cycle=False))
    tsp_idx_route = _rotate_start(tsp_idx_route, 0)

    # Si por heurística el origen no queda primero, lo forzamos.
    if tsp_idx_route and tsp_idx_route[0] != 0:
        tsp_idx_route = [0] + [i for i in tsp_idx_route if i != 0]

    ruta_nodos = [nodos_paradas[i] for i in tsp_idx_route]
    paradas_ordenadas = [idx_to_parada[i] for i in tsp_idx_route]

    geometria_geojson: list[list[float]] = []
    distancia_total_m = 0.0
    tiempo_total_seg = 0.0
    legs: list[dict] = []

    for idx in range(len(ruta_nodos) - 1):
        u = ruta_nodos[idx]
        v = ruta_nodos[idx + 1]

        try:
            path_nodes = nx.shortest_path(G, u, v, weight="travel_time")
        except nx.NetworkXNoPath:
            continue

        leg_m = nx.path_weight(G, path_nodes, weight="length")
        leg_s = nx.path_weight(G, path_nodes, weight="travel_time")
        distancia_total_m += leg_m
        tiempo_total_seg += leg_s

        to_stop = paradas_ordenadas[idx + 1]
        legs.append(
            {
                "to_id": to_stop.get("id"),
                "distance_km": round(leg_m / 1000, 2),
                "travel_min": round(leg_s / 60, 1),
            }
        )

        for n_u, n_v in zip(path_nodes[:-1], path_nodes[1:]):
            edge_data = G.get_edge_data(n_u, n_v)
            if not edge_data:
                continue
            edge = edge_data[min(edge_data.keys())]
            if "geometry" in edge:
                coords = list(edge["geometry"].coords)
                geometria_geojson.extend([[c[0], c[1]] for c in coords])
            else:
                geometria_geojson.append([G.nodes[n_u]["x"], G.nodes[n_u]["y"]])

    return {
        "resumen": {
            "distancia_km": round(distancia_total_m / 1000, 2),
            "tiempo_conduccion_min": round(tiempo_total_seg / 60, 2),
            "tiempo_paradas_min": sum(int(p.get("estancia", 0) or 0) for p in paradas_ordenadas),
        },
        "paradas_ordenadas": paradas_ordenadas,
        "ruta_geojson": {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": geometria_geojson,
            },
        },
        "legs": legs,
    }


def validar_jornada_laboral(
    paradas: list[dict],
    limite_horas: float = 6,
    place: str = MAP_PLACE,
) -> dict:
    """
    Valida si la ruta óptima TSP cabe en una jornada laboral.
    Formato de `paradas`: [{"coords": (lat, lon), "estancia": int, ...}, ...]
    """
    if len(paradas) < 2:
        raise HTTPException(status_code=422, detail="Calen almenys origen + 1 parada.")

    ox, nx, traveling_salesman_problem = _require_routing_libs()
    G = _get_drive_graph(place)

    nodos_paradas = [ox.nearest_nodes(G, p["coords"][1], p["coords"][0]) for p in paradas]

    tsp_graph = nx.complete_graph(len(nodos_paradas))
    for i in range(len(nodos_paradas)):
        for j in range(len(nodos_paradas)):
            if i == j:
                continue
            try:
                tiempo_segundos = nx.shortest_path_length(
                    G,
                    nodos_paradas[i],
                    nodos_paradas[j],
                    weight="travel_time",
                )
            except nx.NetworkXNoPath:
                tiempo_segundos = 999999
            tsp_graph[i][j]["weight"] = tiempo_segundos

    ruta_indices = list(traveling_salesman_problem(tsp_graph, weight="weight", cycle=False))
    ruta_indices = _rotate_start(ruta_indices, 0)
    if ruta_indices and ruta_indices[0] != 0:
        ruta_indices = [0] + [i for i in ruta_indices if i != 0]

    tiempo_conduccion_segundos = 0.0
    for i in range(len(ruta_indices) - 1):
        u = ruta_indices[i]
        v = ruta_indices[i + 1]
        tiempo_conduccion_segundos += float(tsp_graph[u][v].get("weight", 0.0))

    tiempo_conduccion_min = tiempo_conduccion_segundos / 60
    tiempo_paradas_min = sum(int(p.get("estancia", 0) or 0) for p in paradas)
    tiempo_total_min = tiempo_conduccion_min + tiempo_paradas_min
    tiempo_total_horas = tiempo_total_min / 60

    return {
        "conduccion_minutos": round(tiempo_conduccion_min, 1),
        "paradas_minutos": int(tiempo_paradas_min),
        "total_horas": round(tiempo_total_horas, 2),
        "limite_horas": float(limite_horas),
        "excede_jornada": bool(tiempo_total_horas > limite_horas),
    }


def _visit_to_stop(v: dict) -> dict:
    if v["lat"] is None or v["lon"] is None:
        raise HTTPException(status_code=422, detail=f"La visita {v['id']} no té coordenades.")
    return {
        "id": v["id"],
        "coords": (float(v["lat"]), float(v["lon"])),
        "estancia": int(v["estimated_duration"] or 45),
        "address": v["address"],
    }


def _fetch_visits_with_coords(db: Session, visit_ids: list[int]) -> dict[int, dict]:
    if not visit_ids:
        return {}
    rows = db.execute(
        text(
            """
            SELECT
                v.id,
                v.technician_id,
                v.estimated_duration,
                v.planned_date,
                NULL::varchar AS address,
                c.latitude AS lat,
                c.longitude AS lon
            FROM visit v
            LEFT JOIN assignable a ON v.assignable_id = a.id
            LEFT JOIN charger c ON a.charger_id = c.id
            WHERE v.id = ANY(:visit_ids)
            """
        ),
        {"visit_ids": visit_ids},
    ).fetchall()
    return {
        int(r.id): {
            "id": int(r.id),
            "technician_id": r.technician_id,
            "estimated_duration": r.estimated_duration,
            "planned_date": r.planned_date,
            "address": r.address,
            "lat": r.lat,
            "lon": r.lon,
        }
        for r in rows
    }


@router.post("/calcular", response_model=CalcularRutaResponse)
def calcular_ruta(
    payload: CalcularRutaRequest,
    db: Session = Depends(get_db),
) -> CalcularRutaResponse:
    if not payload.visit_ids_ordered:
        raise HTTPException(status_code=422, detail="La llista de visites és buida.")

    visit_map = _fetch_visits_with_coords(db, payload.visit_ids_ordered)

    for visit_id in payload.visit_ids_ordered:
        if visit_id not in visit_map:
            raise HTTPException(status_code=404, detail=f"Visita {visit_id} no trobada.")

    paradas = [
        {
            "id": "origen",
            "coords": (payload.origen.latitude, payload.origen.longitude),
            "estancia": 0,
            "address": "Origen",
        }
    ]
    paradas.extend(_visit_to_stop(visit_map[visit_id]) for visit_id in payload.visit_ids_ordered)

    resultado = generar_ruta_optima(paradas)
    ordered_stops = [p for p in resultado["paradas_ordenadas"] if p.get("id") != "origen"]
    leg_by_to_id = {leg["to_id"]: leg for leg in resultado.get("legs", [])}

    hora_acum = datetime.now()
    segmentos: list[SegmentoRuta] = []

    for stop in ordered_stops:
        visit = visit_map[stop["id"]]
        leg = leg_by_to_id.get(visit["id"], {"distance_km": 0.0, "travel_min": 0.0})
        hora_acum += timedelta(minutes=float(leg["travel_min"]))

        segmentos.append(
            SegmentoRuta(
                visit_id=visit["id"],
                address=visit["address"],
                coordenada=Coordenada(latitude=float(stop["coords"][0]), longitude=float(stop["coords"][1])),
                distancia_km=float(leg["distance_km"]),
                tiempo_viaje_min=float(leg["travel_min"]),
                hora_llegada_est=hora_acum.strftime("%H:%M"),
            )
        )
        hora_acum += timedelta(minutes=int(stop.get("estancia", 0) or 0))

    coords = resultado["ruta_geojson"]["geometry"].get("coordinates", [])
    if coords:
        coordenadas_ruta = [Coordenada(latitude=latlon[1], longitude=latlon[0]) for latlon in coords]
    else:
        coordenadas_ruta = [
            Coordenada(latitude=p["coords"][0], longitude=p["coords"][1])
            for p in resultado["paradas_ordenadas"]
        ]

    tiempo_total = resultado["resumen"]["tiempo_conduccion_min"] + resultado["resumen"]["tiempo_paradas_min"]
    return CalcularRutaResponse(
        coordenadas_ruta=coordenadas_ruta,
        segmentos=segmentos,
        distancia_total_km=float(resultado["resumen"]["distancia_km"]),
        tiempo_total_min=float(round(tiempo_total, 2)),
    )


@router.post(
    "/asignar-incidencia",
    response_model=Union[AsignarOkResponse, AsignarErrorResponse],
)
def asignar_incidencia(
    payload: AsignarIncidenciaRequest,
    db: Session = Depends(get_db),
) -> Union[AsignarOkResponse, AsignarErrorResponse]:
    current_map = _fetch_visits_with_coords(db, payload.ruta_actual_ids)
    ordered_current = [current_map[i] for i in payload.ruta_actual_ids if i in current_map]

    new_visit_map = _fetch_visits_with_coords(db, [payload.nueva_incidencia_id])
    new_visit = new_visit_map.get(payload.nueva_incidencia_id)
    if not new_visit:
        return AsignarErrorResponse(
            codigo_error="INCIDENCIA_NO_ENCONTRADA",
            estadisticas_simulacion={},
            mensaje=f"No s'ha trobat la incidència amb ID {payload.nueva_incidencia_id}.",
        )

    origen = {
        "id": "origen",
        "coords": (payload.ubicacion_actual.latitude, payload.ubicacion_actual.longitude),
        "estancia": 0,
        "address": "Origen",
    }

    current_stops = [origen] + [_visit_to_stop(v) for v in ordered_current]
    new_stops = current_stops + [_visit_to_stop(new_visit)]

    actual = generar_ruta_optima(current_stops)
    propuesta = generar_ruta_optima(new_stops)

    jornada = validar_jornada_laboral(
        new_stops,
        limite_horas=(LIMITE_JORNADA_MIN / 60),
    )

    tiempo_actual = actual["resumen"]["tiempo_conduccion_min"] + actual["resumen"]["tiempo_paradas_min"]
    tiempo_nuevo = propuesta["resumen"]["tiempo_conduccion_min"] + propuesta["resumen"]["tiempo_paradas_min"]
    km_actual = float(actual["resumen"]["distancia_km"])
    km_nuevo = float(propuesta["resumen"]["distancia_km"])

    if jornada["excede_jornada"]:
        estimado_min = jornada["conduccion_minutos"] + jornada["paradas_minutos"]
        excedido = max(0, round(estimado_min - LIMITE_JORNADA_MIN))
        return AsignarErrorResponse(
            asignacion_permitida=False,
            codigo_error="JORNADA_EXCEDIDA",
            estadisticas_simulacion={
                "tiempo_total_estimado": f"{round(estimado_min)} min",
                "limite_jornada": f"{LIMITE_JORNADA_MIN} min",
                "tiempo_excedido": f"{excedido} min",
            },
            mensaje="No és possible afegir la incidència perquè la ruta superaria la jornada laboral.",
        )

    orden_optimo_ids = [p["id"] for p in propuesta["paradas_ordenadas"] if p.get("id") != "origen"]
    coords = propuesta["ruta_geojson"]["geometry"].get("coordinates", [])
    coordenadas_ruta = [
        Coordenada(latitude=latlon[1], longitude=latlon[0]) for latlon in coords
    ]

    tiempo_extra = round(tiempo_nuevo - tiempo_actual)
    distancia_extra = round(km_nuevo - km_actual, 1)

    return AsignarOkResponse(
        orden_optimo_ids=orden_optimo_ids,
        coordenadas_ruta=coordenadas_ruta,
        estadisticas_nueva_ruta=EstadisticasRuta(
            tiempo_total=f"{round(tiempo_nuevo)} min",
            distancia=f"{round(km_nuevo, 1)} km",
        ),
        impacto_simulacion=ImpactoSimulacion(
            tiempo_extra=f"+{tiempo_extra} min",
            distancia_extra=f"+{distancia_extra} km",
            recomendado=(tiempo_extra <= 30 and distancia_extra <= 10),
        ),
    )


@router.post("/generar")
def generar_ruta_admin(
    payload: GenerarRutaAdminRequest,
    db: Session = Depends(get_db),
):
    """
    Admin flow: generate IA route candidates for a technician and date.
    """
    target = datetime.strptime(payload.target_date, "%Y-%m-%d").date() if payload.target_date else None
    return generar_ruta_ia(
        db=db,
        technician_id=payload.technician_id,
        origen_lat=payload.origen.latitude,
        origen_lon=payload.origen.longitude,
        destino_lat=payload.destino.latitude if payload.destino else None,
        destino_lon=payload.destino.longitude if payload.destino else None,
        target_date=target,
        limite_horas=payload.limite_horas,
    )


@router.post("/recomendar-lote")
def recomendar_lote_admin(
    payload: RecomendarLoteRequest,
    db: Session = Depends(get_db),
):
    """
    Recommendation-only flow: generates an optimized route proposal.
    It does NOT assign visits to technicians.
    """
    target = datetime.strptime(payload.target_date, "%Y-%m-%d").date() if payload.target_date else None
    return generar_ruta_ia(
        db=db,
        technician_id=0,
        origen_lat=payload.origen.latitude,
        origen_lon=payload.origen.longitude,
        destino_lat=payload.destino.latitude,
        destino_lon=payload.destino.longitude,
        target_date=target,
        limite_horas=payload.limite_horas,
    )


@router.post("/assignar")
def assignar_ruta_admin(
    payload: AssignarRutaAdminRequest,
    db: Session = Depends(get_db),
):
    """
    Admin confirms (or manually edited) route order and assigns schedule to technician.
    """
    if not payload.visit_ids_ordered:
        raise HTTPException(status_code=422, detail="visit_ids_ordered buit")

    target_date = datetime.strptime(payload.target_date, "%Y-%m-%d").date()
    hh, mm = map(int, payload.hora_inici.split(":"))
    minutes_cursor = hh * 60 + mm

    existing = _fetch_visits_with_coords(db, payload.visit_ids_ordered)
    missing = [vid for vid in payload.visit_ids_ordered if vid not in existing]
    if missing:
        raise HTTPException(status_code=404, detail=f"Visites no trobades: {missing}")

    for vid in payload.visit_ids_ordered:
        visit = existing[vid]
        planned_dt = datetime.combine(target_date, datetime.min.time()) + timedelta(minutes=minutes_cursor)
        db.execute(
            text(
                """
                UPDATE visit
                SET technician_id = :tech_id,
                    planned_date = :planned_date,
                    status = :status
                WHERE id = :id
                """
            ),
            {
                "tech_id": payload.technician_id,
                "planned_date": planned_dt,
                "status": "SCHEDULED",
                "id": vid,
            },
        )
        minutes_cursor += int(visit.get("estimated_duration") or 45)

    db.commit()
    return {
        "ok": True,
        "technician_id": payload.technician_id,
        "target_date": payload.target_date,
        "visits_assigned": len(payload.visit_ids_ordered),
    }


@router.post("/manual-assign")
def manual_assign_visit(
    payload: ManualAssignVisitRequest,
    db: Session = Depends(get_db),
):
    """Assign a single visit to a technician with permissive admin behavior."""
    visit_row = db.execute(
        text(
            """
            SELECT id, planned_date
            FROM visit
            WHERE id = :id
            LIMIT 1
            """
        ),
        {"id": payload.visit_id},
    ).fetchone()
    if not visit_row:
        raise HTTPException(status_code=404, detail=f"Visita {payload.visit_id} no trobada")

    # Ensure technician exists to avoid manual assignment failures.
    db.execute(
        text(
            """
            INSERT INTO technician (id, zone, vehicle, status, start_work_day, end_work_day)
            VALUES (:id, :zone, :vehicle, :status, :start_work_day, :end_work_day)
            ON CONFLICT (id) DO NOTHING
            """
        ),
        {
            "id": payload.technician_id,
            "zone": "General",
            "vehicle": "N/A",
            "status": "available",
            "start_work_day": None,
            "end_work_day": None,
        },
    )

    if payload.target_date:
        target_date = datetime.strptime(payload.target_date, "%Y-%m-%d").date()
    else:
        target_date = visit_row.planned_date.date() if visit_row.planned_date else datetime.utcnow().date()

    if payload.hora_inici:
        hh, mm = map(int, payload.hora_inici.split(":"))
    else:
        base_dt = visit_row.planned_date or datetime.utcnow()
        hh, mm = base_dt.hour, base_dt.minute

    planned_dt = datetime.combine(target_date, datetime.min.time()) + timedelta(hours=hh, minutes=mm)

    db.execute(
        text(
            """
            UPDATE visit
            SET technician_id = :tech_id,
                planned_date = :planned_date,
                status = :status
            WHERE id = :id
            """
        ),
        {
            "tech_id": payload.technician_id,
            "planned_date": planned_dt,
            "status": "SCHEDULED",
            "id": payload.visit_id,
        },
    )
    db.commit()

    return {
        "ok": True,
        "visit_id": payload.visit_id,
        "technician_id": payload.technician_id,
        "assigned_at": planned_dt.isoformat(),
    }


@router.post("/slot/add-and-recalculate")
def add_visit_to_slot_and_recalculate(
    payload: AddVisitToSlotRequest,
    db: Session = Depends(get_db),
):
    """Add one independent visit to a technician day slot and recompute optimal order."""
    target_date = datetime.strptime(payload.target_date, "%Y-%m-%d").date()
    day_start = datetime.combine(target_date, datetime.min.time())
    day_end = datetime.combine(target_date, datetime.max.time())

    visit_exists = db.execute(
        text(
            """
            SELECT id
            FROM visit
            WHERE id = :id
            LIMIT 1
            """
        ),
        {"id": payload.visit_id},
    ).fetchone()
    if not visit_exists:
        raise HTTPException(status_code=404, detail=f"Visita {payload.visit_id} no trobada")

    tech = db.execute(
        text(
            """
            SELECT id, zone
            FROM technician
            WHERE id = :id
            LIMIT 1
            """
        ),
        {"id": payload.technician_id},
    ).fetchone()
    if not tech:
        raise HTTPException(status_code=404, detail=f"Tècnic {payload.technician_id} no trobat")

    if payload.origen is not None:
        origen_lat = payload.origen.latitude
        origen_lon = payload.origen.longitude
    else:
        depot = ZONE_DEPOTS.get((tech.zone or "").strip(), DEFAULT_DEPOT)
        origen_lat, origen_lon = depot

    if payload.destino is not None:
        destino_lat = payload.destino.latitude
        destino_lon = payload.destino.longitude
    else:
        destino_lat = origen_lat
        destino_lon = origen_lon

    slot_rows = db.execute(
        text(
            """
            SELECT id
            FROM visit
            WHERE technician_id = :tech_id
              AND planned_date >= :day_start
              AND planned_date <= :day_end
              AND LOWER(status) IN ('pending', 'schedule', 'scheduled', 'in_progress')
            ORDER BY planned_date ASC, id ASC
            """
        ),
        {
            "tech_id": payload.technician_id,
            "day_start": day_start,
            "day_end": day_end,
        },
    ).fetchall()

    visit_ids = [int(r.id) for r in slot_rows]
    if payload.visit_id not in visit_ids:
        visit_ids.append(payload.visit_id)

    recommendation = generar_ruta_ia_desde_visitas(
        db=db,
        visit_ids=visit_ids,
        origen_lat=origen_lat,
        origen_lon=origen_lon,
        destino_lat=destino_lat,
        destino_lon=destino_lon,
    )

    ordered_ids = [int(p["visit_id"]) for p in recommendation.get("paradas_ordenadas", [])]
    if not ordered_ids:
        raise HTTPException(
            status_code=422,
            detail="No s'ha pogut calcular una ruta vàlida per a les visites del slot",
        )

    hh, mm = map(int, payload.hora_inici.split(":"))
    minutes_cursor = hh * 60 + mm

    existing = _fetch_visits_with_coords(db, ordered_ids)
    for idx, vid in enumerate(ordered_ids):
        visit = existing.get(vid)
        if not visit:
            continue

        planned_dt = datetime.combine(target_date, datetime.min.time()) + timedelta(minutes=minutes_cursor)
        db.execute(
            text(
                """
                UPDATE visit
                SET technician_id = :tech_id,
                    planned_date = :planned_date,
                    status = :status
                WHERE id = :id
                """
            ),
            {
                "tech_id": payload.technician_id,
                "planned_date": planned_dt,
                "status": "SCHEDULED",
                "id": vid,
            },
        )
        minutes_cursor += int(visit.get("estimated_duration") or 45)

    db.commit()

    return {
        "ok": True,
        "technician_id": payload.technician_id,
        "target_date": payload.target_date,
        "visit_ids_ordered": ordered_ids,
        "visits_assigned": len(ordered_ids),
        "recomendacion": recommendation,
    }


@router.post("/geometria")
def geometria_ruta(payload: GeometriaRutaRequest, db: Session = Depends(get_db)):
    """
    Mobile flow: draw geometry from an already ordered route (no IA reordering).
    """
    if not payload.visit_ids:
        return {
            "coordenadas_ruta": [],
            "segmentos": [],
            "distancia_total_km": 0,
            "tiempo_total_min": 0,
            "ruta_geojson": {"type": "Feature", "geometry": {"type": "LineString", "coordinates": []}},
        }

    visit_map = _fetch_visits_with_coords(db, payload.visit_ids)
    ordered = [visit_map[vid] for vid in payload.visit_ids if vid in visit_map]
    origin = (payload.origen.latitude, payload.origen.longitude) if payload.origen else None
    return generar_geometria_simple(ordered, origin)