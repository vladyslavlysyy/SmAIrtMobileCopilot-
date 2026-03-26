"""
routers/ruta.py

Dos endpoints de ruta, en orden de uso natural del técnico:

  1. POST /api/v1/ruta/calcular
       El técnico acepta la lista ordenada propuesta y pide las
       coordenadas para pintar el mapa + hora estimada de cada parada.

  2. POST /api/v1/ruta/asignar-incidencia
       Llega una incidencia nueva. Se inserta en el punto óptimo de la
       ruta activa y se valida que no exceda la jornada (480 min).
       Devuelve JORNADA_EXCEDIDA si no cabe.

Geometría:
  - Distancias calculadas con Haversine (sin API externa, funciona offline)
  - Velocidad media: 40 km/h (zona metropolitana Camp de Tarragona)
  - Jornada máxima: 480 min (8h)

Consumido por:
  - RouteTimeline.tsx      → botón "Acceptar ruta" → /calcular
  - ContingencyBanner.tsx  → nueva incidencia crítica → /asignar-incidencia
"""

import math
from datetime import datetime, timedelta
from typing import Union

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Visit, VisitType, VisitStatus
from schemas import (
    CalcularRutaRequest, CalcularRutaResponse, SegmentoRuta, Coordenada,
    AsignarIncidenciaRequest, AsignarOkResponse, AsignarErrorResponse,
    EstadisticasRuta, ImpactoSimulacion,
)

router = APIRouter(prefix="/api/v1/ruta", tags=["ruta"])

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTES
# ─────────────────────────────────────────────────────────────────────────────
VELOCIDAD_KMH      = 40
LIMITE_JORNADA_MIN = 480   # 8 horas


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS GEOMÉTRICOS
# ─────────────────────────────────────────────────────────────────────────────
def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distancia en km entre dos coordenadas (Haversine)."""
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a  = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def travel_min(km: float) -> float:
    return (km / VELOCIDAD_KMH) * 60


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS DE RUTA
# ─────────────────────────────────────────────────────────────────────────────
def visitas_a_dicts(visits: list[Visit]) -> list[dict]:
    return [
        {
            "id":           v.id,
            "lat":          v.latitude,
            "lon":          v.longitude,
            "duration_min": v.estimated_duration or 45,
            "visit_type":   v.visit_type,
            "address":      v.address,
        }
        for v in visits
    ]


def calcular_stats(
    origen: tuple[float, float],
    visitas: list[dict],
) -> tuple[float, float]:
    """Devuelve (tiempo_total_min, distancia_total_km)."""
    total_km = total_min = 0.0
    pos = origen
    for v in visitas:
        km = haversine_km(pos[0], pos[1], v["lat"], v["lon"])
        total_km  += km
        total_min += travel_min(km) + v["duration_min"]
        pos = (v["lat"], v["lon"])
    return total_min, total_km


def insertar_optimo(
    origen: tuple[float, float],
    ruta: list[dict],
    nueva: dict,
) -> list[dict]:
    """
    Inserta `nueva` en la posición que minimiza el desvío total.
    Las visitas correctivo_critico existentes no se reordenan:
    la nueva se inserta antes del primer no-crítico.
    """
    primer_no_critico = next(
        (i for i, v in enumerate(ruta) if v["visit_type"] != VisitType.correctivo_critico),
        len(ruta),
    )

    puntos       = [origen] + [(v["lat"], v["lon"]) for v in ruta]
    mejor_coste  = float("inf")
    mejor_idx    = primer_no_critico

    for i in range(primer_no_critico, len(ruta) + 1):
        prev     = puntos[i]
        sig      = puntos[i + 1] if i + 1 < len(puntos) else None
        coste    = haversine_km(prev[0], prev[1], nueva["lat"], nueva["lon"])
        if sig:
            coste += haversine_km(nueva["lat"], nueva["lon"], sig[0], sig[1])
            coste -= haversine_km(prev[0], prev[1], sig[0], sig[1])
        if coste < mejor_coste:
            mejor_coste = coste
            mejor_idx   = i

    return ruta[:mejor_idx] + [nueva] + ruta[mejor_idx:]


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 1 — calcular ruta aceptada
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/calcular", response_model=CalcularRutaResponse)
def calcular_ruta(
    payload: CalcularRutaRequest,
    db: Session = Depends(get_db),
) -> CalcularRutaResponse:
    """
    El técnico acepta la lista ordenada propuesta por el modelo.
    Devuelve:
      - coordenadas_ruta  → polyline para el mapa
      - segmentos         → detalle por parada (distancia, tiempo, hora estimada)
      - totales           → distancia y tiempo de toda la jornada

    La hora estimada de llegada a cada parada se calcula a partir
    de la hora actual del servidor. En producción se recibiría del cliente.
    """
    if not payload.visit_ids_ordered:
        raise HTTPException(status_code=422, detail="La llista de visites és buida.")

    # Cargar visitas en el orden que el técnico ha aceptado
    visitas_db = db.query(Visit).filter(Visit.id.in_(payload.visit_ids_ordered)).all()
    visita_map = {v.id: v for v in visitas_db}

    visitas_ordenadas = []
    for vid in payload.visit_ids_ordered:
        if vid not in visita_map:
            raise HTTPException(status_code=404, detail=f"Visita {vid} no trobada.")
        visitas_ordenadas.append(visita_map[vid])

    # Persistir route_order en BD para que GET /visits lo refleje
    for idx, v in enumerate(visitas_ordenadas):
        v.route_order = idx
    db.commit()

    # Calcular segmentos
    origen    = (payload.origen.latitude, payload.origen.longitude)
    pos       = origen
    ahora     = datetime.now()
    hora_acum = ahora

    segmentos:        list[SegmentoRuta] = []
    coordenadas_ruta: list[Coordenada]   = [Coordenada(latitude=origen[0], longitude=origen[1])]
    total_km  = 0.0
    total_min = 0.0

    for v in visitas_ordenadas:
        km      = haversine_km(pos[0], pos[1], v.latitude, v.longitude)
        t_viaje = travel_min(km)

        hora_acum += timedelta(minutes=t_viaje)
        total_km  += km
        total_min += t_viaje + (v.estimated_duration or 45)

        segmentos.append(SegmentoRuta(
            visit_id         = v.id,
            address          = v.address,
            coordenada       = Coordenada(latitude=v.latitude, longitude=v.longitude),
            distancia_km     = round(km, 2),
            tiempo_viaje_min = round(t_viaje, 1),
            hora_llegada_est = hora_acum.strftime("%H:%M"),
        ))
        coordenadas_ruta.append(Coordenada(latitude=v.latitude, longitude=v.longitude))

        hora_acum += timedelta(minutes=v.estimated_duration or 45)
        pos = (v.latitude, v.longitude)

    return CalcularRutaResponse(
        coordenadas_ruta    = coordenadas_ruta,
        segmentos           = segmentos,
        distancia_total_km  = round(total_km, 2),
        tiempo_total_min    = round(total_min, 1),
    )


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 2 — asignar incidencia nueva a ruta activa
# ─────────────────────────────────────────────────────────────────────────────
@router.post(
    "/asignar-incidencia",
    response_model=Union[AsignarOkResponse, AsignarErrorResponse],
)
def asignar_incidencia(
    payload: AsignarIncidenciaRequest,
    db: Session = Depends(get_db),
) -> Union[AsignarOkResponse, AsignarErrorResponse]:
    """
    Inserta una nueva incidencia en el punto óptimo de la ruta activa.
    Respeta el orden estricto de correctivo_critico existentes.
    Valida que la jornada no supere los 480 min.
    """
    origen = (payload.ubicacion_actual.latitude, payload.ubicacion_actual.longitude)

    # Cargar ruta actual
    visitas_db  = db.query(Visit).filter(Visit.id.in_(payload.ruta_actual_ids)).all()
    visita_map  = {v.id: v for v in visitas_db}
    ruta_actual = [visita_map[i] for i in payload.ruta_actual_ids if i in visita_map]

    # Cargar nueva incidencia
    nueva_db = db.query(Visit).filter(Visit.id == payload.nueva_incidencia_id).first()
    if not nueva_db:
        return AsignarErrorResponse(
            codigo_error            = "INCIDENCIA_NO_ENCONTRADA",
            estadisticas_simulacion = {},
            mensaje                 = f"No s'ha trobat la incidència amb ID {payload.nueva_incidencia_id}.",
        )

    ruta_dicts  = visitas_a_dicts(ruta_actual)
    nueva_dict  = visitas_a_dicts([nueva_db])[0]

    # Stats actuales (sin la nueva)
    tiempo_actual, km_actual = calcular_stats(origen, ruta_dicts)

    # Ruta candidata con la nueva insertada en posición óptima
    ruta_nueva   = insertar_optimo(origen, ruta_dicts, nueva_dict)
    tiempo_nuevo, km_nuevo = calcular_stats(origen, ruta_nueva)

    # Validar jornada
    if tiempo_nuevo > LIMITE_JORNADA_MIN:
        return AsignarErrorResponse(
            asignacion_permitida    = False,
            codigo_error            = "JORNADA_EXCEDIDA",
            estadisticas_simulacion = {
                "tiempo_total_estimado": f"{round(tiempo_nuevo)} min",
                "limite_jornada":        f"{LIMITE_JORNADA_MIN} min",
                "tiempo_excedido":       f"{round(tiempo_nuevo - LIMITE_JORNADA_MIN)} min",
            },
            mensaje = (
                "No és possible afegir la incidència perquè la ruta "
                "superaria la jornada laboral."
            ),
        )

    # Persistir nuevo route_order
    for idx, v_dict in enumerate(ruta_nueva):
        v = visita_map.get(v_dict["id"]) or nueva_db
        v.route_order = idx
    db.commit()

    tiempo_extra = round(tiempo_nuevo - tiempo_actual)
    km_extra     = round(km_nuevo - km_actual, 1)

    coordenadas = [Coordenada(latitude=origen[0], longitude=origen[1])] + [
        Coordenada(latitude=v["lat"], longitude=v["lon"]) for v in ruta_nueva
    ]

    return AsignarOkResponse(
        orden_optimo_ids        = [v["id"] for v in ruta_nueva],
        coordenadas_ruta        = coordenadas,
        estadisticas_nueva_ruta = EstadisticasRuta(
            tiempo_total = f"{round(tiempo_nuevo)} min",
            distancia    = f"{round(km_nuevo, 1)} km",
        ),
        impacto_simulacion = ImpactoSimulacion(
            tiempo_extra    = f"+{tiempo_extra} min",
            distancia_extra = f"+{km_extra} km",
            recomendado     = (tiempo_extra <= 30 and km_extra <= 10),
        ),
    )