"""
schemas.py — Schemas Pydantic para request/response de la API.
Separados de los modelos ORM para controlar exactamente qué se expone.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from models import VisitType, VisitStatus, ReportType, ImprevistoType


# ─────────────────────────────────────────────────────────────────────────────
# TECHNICIAN
# ─────────────────────────────────────────────────────────────────────────────
class TechnicianOut(BaseModel):
    id:   int
    name: str
    zone: str

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
# VISIT
# ─────────────────────────────────────────────────────────────────────────────
class VisitOut(BaseModel):
    id:                   int
    visit_type:           VisitType
    status:               VisitStatus
    planned_date:         datetime
    address:              Optional[str]
    postal_code:          Optional[str]
    latitude:             float
    longitude:            float
    estimated_duration:   int
    last_priority_score:  Optional[float]
    route_order:          Optional[int]
    technician_id:        Optional[int]
    contract_id:          Optional[int]
    incidence_id:         Optional[int]

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
# RUTA — calcular (aceptar lista y devolver coordenadas para el mapa)
# ─────────────────────────────────────────────────────────────────────────────
class Coordenada(BaseModel):
    latitude:  float
    longitude: float


class CalcularRutaRequest(BaseModel):
    """
    El técnico acepta la lista ordenada propuesta y pide las coordenadas
    para pintar el mapa. Se envía la lista de IDs ya en el orden aceptado.
    """
    technician_id:    int
    visit_ids_ordered: list[int]   # orden aceptado por el técnico
    origen:           Coordenada   # posición actual del técnico


class SegmentoRuta(BaseModel):
    visit_id:         int
    address:          Optional[str]
    coordenada:       Coordenada
    distancia_km:     float        # desde el punto anterior
    tiempo_viaje_min: float        # desde el punto anterior
    hora_llegada_est: str          # "HH:MM"


class CalcularRutaResponse(BaseModel):
    coordenadas_ruta:  list[Coordenada]   # para pintar el polyline en el mapa
    segmentos:         list[SegmentoRuta] # detalle por parada
    distancia_total_km: float
    tiempo_total_min:   float


# ─────────────────────────────────────────────────────────────────────────────
# RUTA — asignar incidencia (ya definido en ruta_optima.py, aquí centralizado)
# ─────────────────────────────────────────────────────────────────────────────
class AsignarIncidenciaRequest(BaseModel):
    tecnico_id:          str
    ubicacion_actual:    Coordenada
    ruta_actual_ids:     list[int]
    nueva_incidencia_id: int


class EstadisticasRuta(BaseModel):
    tiempo_total: str
    distancia:    str


class ImpactoSimulacion(BaseModel):
    tiempo_extra:    str
    distancia_extra: str
    recomendado:     bool


class AsignarOkResponse(BaseModel):
    orden_optimo_ids:       list[int]
    coordenadas_ruta:       list[Coordenada]
    estadisticas_nueva_ruta: EstadisticasRuta
    impacto_simulacion:     ImpactoSimulacion


class AsignarErrorResponse(BaseModel):
    asignacion_permitida:    bool = False
    codigo_error:            str
    estadisticas_simulacion: dict
    mensaje:                 str


# ─────────────────────────────────────────────────────────────────────────────
# REPORT
# ─────────────────────────────────────────────────────────────────────────────
class ReportCreate(BaseModel):
    visit_id:     int
    report_type:  ReportType
    content_json: Optional[str] = None   # JSON serializado del checklist


class ReportOut(BaseModel):
    id:           int
    visit_id:     int
    report_type:  ReportType
    status:       str
    created_at:   datetime
    content_json: Optional[str]

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
# IMPREVISTO
# ─────────────────────────────────────────────────────────────────────────────
class ImprevistoCreate(BaseModel):
    visit_id:            int
    tipo:                ImprevistoType
    descripcion:         Optional[str] = None
    tiempo_perdido_min:  Optional[int] = None


class ImprevistoOut(BaseModel):
    id:                  int
    visit_id:            int
    tipo:                ImprevistoType
    descripcion:         Optional[str]
    created_at:          datetime
    tiempo_perdido_min:  Optional[int]

    model_config = {"from_attributes": True}


class ImprevistoResponse(BaseModel):
    imprevisto:           ImprevistoOut
    visitas_afectadas:    list[VisitOut]   # visitas del día que se ven desplazadas
    propuesta_replanificacion: Optional[str]   # mensaje legible para el técnico


# ─────────────────────────────────────────────────────────────────────────────
# METRICS
# ─────────────────────────────────────────────────────────────────────────────
class KmPorTecnico(BaseModel):
    technician_id:   int
    technician_name: str
    km_total:        float


class RetardoPorCausa(BaseModel):
    causa:   str
    total:   int


class SlaByType(BaseModel):
    visit_type:        VisitType
    total:             int
    completadas:       int
    porcentaje_sla:    float


class MetricsResponse(BaseModel):
    completadas:           int
    pendientes:            int
    en_progreso:           int
    km_por_tecnico:        list[KmPorTecnico]
    horas_efectivas_total: float
    retardos_por_causa:    list[RetardoPorCausa]
    sla_por_tipo:          list[SlaByType]


# ─────────────────────────────────────────────────────────────────────────────
# USERS
# ─────────────────────────────────────────────────────────────────────────────
class UserInfoCreate(BaseModel):
    name: str
    telefono: str
    email: str
    passwd: str
    is_technician: bool = False
    zone: Optional[str] = None


class UserInfoOut(BaseModel):
    id: int
    name: str
    telefono: str
    email: str
    is_technician: bool
    technician_id: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class ClassifyTechnicianRequest(BaseModel):
    zone: Optional[str] = None