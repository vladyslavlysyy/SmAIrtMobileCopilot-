"""
optimizer.py - Route optimization helpers adapted to current DB schema.

Current schema constraints:
- visit(assignable_id, technician_id, visit_type, status, planned_date, estimated_duration, score)
- assignable(priority, charger_id)
- charger(latitude, longitude, zone, num_visits)

This module keeps the IA flow lightweight and robust:
1) score pending visits with XGBoost if model exists
2) pick top-10
3) refine with real travel-time (OSMnx) when available
4) build route and GeoJSON
"""

from __future__ import annotations

from datetime import date, datetime, time
import math
import os
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session
from models import normalize_visit_type

MODEL_PATH = os.path.join(os.path.dirname(__file__), "modelo_rutas_fsm_optimizado.json")
DEFAULT_SPEED_KMH = 60.0

VISIT_TYPE_NUM_MAP = {
    "critical_corrective": 5,
    "non_critical_corrective": 4,
    "diagnosis": 3,
    "commissioning": 2,
    "maintenance": 1,
}

PRIORITY_FROM_VISIT_TYPE = {
    "critical_corrective": 5,
    "non_critical_corrective": 4,
    "diagnosis": 3,
    "commissioning": 2,
    "maintenance": 1,
}


def calcular_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _travel_minutes_from_km(km: float) -> float:
    return (km / DEFAULT_SPEED_KMH) * 60.0


def _load_xgb_model() -> Any | None:
    try:
        import xgboost as xgb

        model = xgb.XGBRegressor()
        model.load_model(MODEL_PATH)
        return model
    except Exception:
        return None


def _default_score(row: dict[str, Any]) -> float:
    # Fallback heuristic if model file is missing.
    priority = float(row["priority"])
    waiting = min(float(row["days_waiting"]), 120.0)
    impact = float(row["impacto_cliente"])
    km = float(row["km"])
    return (priority * 12.0) + (impact * 7.0) + (waiting * 0.2) - (km * 0.8)


def _fetch_pending_tasks(
    db: Session,
    technician_id: int,
    target_date: date | None,
) -> list[dict[str, Any]]:
    day_filter = ""
    params: dict[str, Any] = {"tech_id": technician_id}
    if target_date is not None:
        params["day_start"] = datetime.combine(target_date, time.min)
        params["day_end"] = datetime.combine(target_date, time.max)
        day_filter = "AND v.planned_date >= :day_start AND v.planned_date <= :day_end"

    rows = db.execute(
        text(
            f"""
            SELECT
                v.id,
                v.assignable_id,
                v.technician_id,
                v.visit_type,
                v.status,
                v.planned_date,
                v.estimated_duration,
                COALESCE(v.score, 0.0) AS score,
                COALESCE(a.priority, 0) AS assignable_priority,
                COALESCE(c.num_visits, 0) AS visitas_totales,
                COALESCE(c.latitude, 0.0) AS latitude,
                COALESCE(c.longitude, 0.0) AS longitude,
                COALESCE(c.zone, '') AS zone,
                COALESCE(c.postal_code, '') AS postal_code
            FROM visit v
            LEFT JOIN assignable a ON v.assignable_id = a.id
            LEFT JOIN charger c ON a.charger_id = c.id
            WHERE LOWER(v.status) IN ('pending', 'scheduled')
              AND (v.technician_id IS NULL OR v.technician_id = :tech_id)
              {day_filter}
            ORDER BY v.planned_date ASC
            """
        ),
        params,
    ).fetchall()

    out: list[dict[str, Any]] = []
    today = datetime.utcnow().date()
    for r in rows:
        if r.latitude is None or r.longitude is None:
            continue
        visit_type = normalize_visit_type(r.visit_type)
        priority = int(r.assignable_priority or PRIORITY_FROM_VISIT_TYPE.get(visit_type, 3) or 3)
        days_waiting = max((today - r.planned_date.date()).days, 0) if r.planned_date else 0
        out.append(
            {
                "visit_id": int(r.id),
                "assignable_id": int(r.assignable_id) if r.assignable_id is not None else None,
                "technician_id": int(r.technician_id) if r.technician_id is not None else None,
                "visit_type": r.visit_type,
                "status": r.status,
                "planned_date": r.planned_date,
                "estimated_duration": int(r.estimated_duration or 45),
                "latitude": float(r.latitude),
                "longitude": float(r.longitude),
                "zone": r.zone,
                "postal_code": r.postal_code,
                # features
                "priority": priority,
                "visit_type_num": VISIT_TYPE_NUM_MAP.get(visit_type, 1),
                "days_waiting": days_waiting,
                "visitas_totales": int(r.visitas_totales or 0),
                "impacto_cliente": max(1, min(5, priority)),
            }
        )
    return out


def generar_ruta_ia(
    db: Session,
    technician_id: int,
    origen_lat: float,
    origen_lon: float,
    target_date: date | None = None,
    limite_horas: float = 8.0,
) -> dict[str, Any]:
    tasks = _fetch_pending_tasks(db, technician_id, target_date)
    if not tasks:
        return {
            "resumen": {
                "distancia_km": 0.0,
                "tiempo_total_min": 0.0,
                "horas_totales": 0.0,
                "tareas_realizadas": 0,
            },
            "paradas_ordenadas": [],
            "ruta_geojson": {"type": "Feature", "geometry": {"type": "LineString", "coordinates": []}},
        }

    for t in tasks:
        t["km"] = calcular_haversine(origen_lat, origen_lon, t["latitude"], t["longitude"])
        t["tiempo_llegada"] = _travel_minutes_from_km(t["km"])

    df = pd.DataFrame(tasks)
    model = _load_xgb_model()

    if model is not None:
        x = df[
            [
                "priority",
                "visit_type_num",
                "days_waiting",
                "visitas_totales",
                "impacto_cliente",
                "tiempo_llegada",
                "km",
            ]
        ]
        df["score_ia"] = model.predict(x)
    else:
        df["score_ia"] = df.apply(lambda r: _default_score(r.to_dict()), axis=1)

    finalists = df.sort_values(by="score_ia", ascending=False).head(10).to_dict("records")

    # Try OSM refinement; fallback to haversine-only route.
    use_osm = True
    G = None
    ox = None
    nx = None
    try:
        import osmnx as _ox
        import networkx as _nx

        ox = _ox
        nx = _nx
        place = f"{(finalists[0].get('zone') or 'Tarragona')}, Spain"
        G = ox.graph_from_place(place, network_type="drive")
        G = ox.add_edge_speeds(G)
        G = ox.add_edge_travel_times(G)
    except Exception:
        use_osm = False

    limite_min = limite_horas * 60.0
    t_used = 0.0
    dist_m = 0.0
    cur_lat, cur_lon = origen_lat, origen_lon
    cur_node = None
    base_node = None
    route_nodes: list[int] = []

    if use_osm and ox is not None and G is not None:
        base_node = ox.nearest_nodes(G, origen_lon, origen_lat)
        cur_node = base_node
        route_nodes = [base_node]
        for f in finalists:
            f["osm_node"] = ox.nearest_nodes(G, f["longitude"], f["latitude"])

    selected: list[dict[str, Any]] = []
    remaining = finalists.copy()

    while remaining:
        best = None
        best_score = -10**9
        for cand in remaining:
            stay = float(cand.get("estimated_duration", 45) or 45)
            if use_osm and nx is not None and G is not None and cur_node is not None and base_node is not None:
                try:
                    p_out = nx.shortest_path(G, cur_node, cand["osm_node"], weight="travel_time")
                    t_out = nx.path_weight(G, p_out, weight="travel_time") / 60.0
                    d_out = nx.path_weight(G, p_out, weight="length")
                    p_back = nx.shortest_path(G, cand["osm_node"], base_node, weight="travel_time")
                    t_back = nx.path_weight(G, p_back, weight="travel_time") / 60.0
                except Exception:
                    continue
            else:
                km_out = calcular_haversine(cur_lat, cur_lon, cand["latitude"], cand["longitude"])
                t_out = _travel_minutes_from_km(km_out)
                d_out = km_out * 1000.0
                km_back = calcular_haversine(cand["latitude"], cand["longitude"], origen_lat, origen_lon)
                t_back = _travel_minutes_from_km(km_back)

            if t_used + t_out + stay + t_back > limite_min:
                continue

            score_final = float(cand["score_ia"]) - (t_out * 1.5)
            if score_final > best_score:
                best_score = score_final
                best = {
                    "task": cand,
                    "t_out": t_out,
                    "d_out": d_out,
                    "path_out": p_out if use_osm else None,
                }

        if best is None:
            break

        win = best["task"]
        t_used += best["t_out"] + float(win.get("estimated_duration", 45) or 45)
        dist_m += best["d_out"]

        if use_osm and best["path_out"] is not None and route_nodes:
            route_nodes.extend(best["path_out"][1:])
            cur_node = win["osm_node"]
        cur_lat, cur_lon = win["latitude"], win["longitude"]

        selected.append(
            {
                "visit_id": int(win["visit_id"]),
                "assignable_id": int(win["assignable_id"]) if win.get("assignable_id") is not None else None,
                "latitude": float(win["latitude"]),
                "longitude": float(win["longitude"]),
                "postal_code": win.get("postal_code", ""),
                "estimated_duration": int(win.get("estimated_duration", 45) or 45),
                "score_ia": round(float(win["score_ia"]), 2),
            }
        )

        remaining = [r for r in remaining if r["visit_id"] != win["visit_id"]]

    # Return to origin.
    if use_osm and nx is not None and G is not None and cur_node is not None and base_node is not None:
        try:
            p_back = nx.shortest_path(G, cur_node, base_node, weight="travel_time")
            dist_m += nx.path_weight(G, p_back, weight="length")
            t_used += nx.path_weight(G, p_back, weight="travel_time") / 60.0
            if route_nodes:
                route_nodes.extend(p_back[1:])
        except Exception:
            pass
    else:
        km_back = calcular_haversine(cur_lat, cur_lon, origen_lat, origen_lon)
        dist_m += km_back * 1000.0
        t_used += _travel_minutes_from_km(km_back)

    coords: list[list[float]] = []
    if use_osm and G is not None and len(route_nodes) > 1:
        for u, v in zip(route_nodes[:-1], route_nodes[1:]):
            edge_data = G.get_edge_data(u, v)
            if not edge_data:
                continue
            edge = edge_data[min(edge_data.keys())]
            if "geometry" in edge:
                coords.extend([[c[0], c[1]] for c in list(edge["geometry"].coords)])
            else:
                coords.append([G.nodes[u]["x"], G.nodes[u]["y"]])
    else:
        coords = [[origen_lon, origen_lat]] + [[s["longitude"], s["latitude"]] for s in selected] + [[origen_lon, origen_lat]]

    return {
        "resumen": {
            "distancia_km": round(dist_m / 1000.0, 2),
            "tiempo_total_min": round(t_used, 2),
            "horas_totales": round(t_used / 60.0, 2),
            "tareas_realizadas": len(selected),
        },
        "paradas_ordenadas": selected,
        "ruta_geojson": {
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": coords},
        },
    }


def generar_geometria_simple(visits: list[dict[str, Any]], origen: tuple[float, float] | None = None) -> dict[str, Any]:
    points: list[list[float]] = []
    if origen is not None:
        points.append([origen[1], origen[0]])

    ordered = [v for v in visits if v.get("latitude") is not None and v.get("longitude") is not None]
    for v in ordered:
        points.append([float(v["longitude"]), float(v["latitude"])])

    if origen is not None and len(points) > 1:
        points.append([origen[1], origen[0]])

    segs: list[dict[str, Any]] = []
    dist_total = 0.0
    time_total = 0.0
    for i in range(len(points) - 1):
        lon1, lat1 = points[i]
        lon2, lat2 = points[i + 1]
        km = calcular_haversine(lat1, lon1, lat2, lon2)
        tmin = _travel_minutes_from_km(km)
        dist_total += km
        time_total += tmin
        segs.append({"from_idx": i, "to_idx": i + 1, "distance_km": round(km, 2), "travel_min": round(tmin, 1)})

    time_total += sum(float(v.get("estimated_duration", 45) or 45) for v in ordered)

    return {
        "coordenadas_ruta": [{"latitude": p[1], "longitude": p[0]} for p in points],
        "segmentos": segs,
        "distancia_total_km": round(dist_total, 2),
        "tiempo_total_min": round(time_total, 1),
        "ruta_geojson": {"type": "Feature", "geometry": {"type": "LineString", "coordinates": points}},
    }
