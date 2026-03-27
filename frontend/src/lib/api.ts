/**
 * API Client para SmAIrt Mobility Copilot
 * Conecta toda la aplicación a FastAPI backend en http://localhost:8000
 */

export const BASE_URL = 'http://localhost:8000';

// ═══════════════════════════════════════════════
// TIPOS EXPORTADOS (mapeo del backend)
// ═══════════════════════════════════════════════

export type VisitType =
  | 'correctivo_critico'
  | 'correctivo_no_critico'
  | 'diagnosi'
  | 'puesta_en_marcha'
  | 'preventivo';

export type VisitStatus =
  | 'pending'
  | 'schedule'
  | 'scheduled'
  | 'SCHEDULED'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'cancelled';

export type ReportType = 'puesta_en_marcha' | 'preventivo' | 'correctivo';

export type ImprevistoType = 'trafico' | 'material' | 'cliente' | 'incidencia_adicional';

export interface Coordenada {
  latitude: number;
  longitude: number;
}

export interface Visit {
  id: number;
  technician_id: number | null;
  contract_id: number | null;
  incidence_id: number | null;
  visit_type: VisitType;
  status: VisitStatus;
  planned_date: string; // ISO timestamp
  address: string | null;
  postal_code: string | null;
  estimated_duration: number; // minutes
  last_priority_score: number | null;
  route_order: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Technician {
  id: number;
  name: string;
  zone: string;
}

export interface Report {
  id: number;
  visit_id: number;
  report_type: ReportType;
  status: string;
  created_at: string;
  content_json: string | null; // JSON string with checklist
}

export interface Imprevisto {
  id: number;
  visit_id: number;
  tipo: ImprevistoType;
  descripcion: string | null;
  created_at: string;
  tiempo_perdido_min: number | null;
}

export interface Charger {
  id: number;
  latitude: number | null;
  longitude: number | null;
  postal_code: string | null;
  zone: string | null;
}

export interface Contract {
  id: number;
  type: string | null;
  charger_id: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

export interface Incidence {
  id: number;
  charger_id: number | null;
  status: string;
  priority: string | null;
}

export interface RouteResponse {
  coordenadas_ruta: Coordenada[];
  segmentos: Array<{
    desde: number;
    hasta: number;
    distancia_km: number;
    tiempo_min: number;
    direccion?: string;
  }>;
  distancia_total_km: number;
  tiempo_total_min: number;
  jornada_valida: boolean;
  mensaje_jornada: string;
}

export interface CalcRouteRequest {
  technician_id: number;
  visit_ids_ordered: number[];
  origen: Coordenada;
}

export interface AsignIncidenciaRequest {
  tecnico_id: number;
  ubicacion_actual: Coordenada;
  ruta_actual_ids: number[];
  nueva_incidencia_id: number;
}

export interface AsignIncidenciaResponse {
  orden_optimo_ids?: number[];
  coordenadas_ruta?: Coordenada[];
  estadisticas_nueva_ruta?: {
    distancia_total_km: number;
    tiempo_total_min: number;
  };
  impacto_simulacion?: {
    visitas_canceladas?: number[];
    tiempo_extra_min?: number;
  };
  asignacion_permitida?: boolean;
  codigo_error?: string;
  mensaje?: string;
}

export interface PlanningAssignRequest {
  visit_id: number;
}

export interface PlanningAssignResponse {
  visit_id: number;
  priority: number;
  candidates: Array<{
    technician_id: number;
    technician_name: string;
    proposed_date: string;
    insertion_index: number;
    will_cancel: number | null;
  }>;
  recommended: {
    technician_id: number;
    technician_name: string;
    proposed_date: string;
    insertion_index: number;
  };
}

export interface PlanningConfirmRequest {
  visit_id: number;
  technician_id: number;
  proposed_date: string;
  insertion_index: number;
  cancelled_visit_id?: number;
}

export interface PlanningConfirmResponse {
  ok: boolean;
  visit_id: number;
  technician_id: number;
  assigned_date: string;
  cancelled_visit_id?: number;
}

export interface CreateVisitFromContractRequest {
  contract_id: number;
  technician_id?: number;
  visit_type?: 'preventivo' | 'puesta_en_marcha';
  planned_date?: string;
}

export interface CreateVisitFromIncidenceRequest {
  incidence_id: number;
  technician_id?: number;
  escalate_to?: 'p4' | 'p5';
}

export interface ReassignVisitRequest {
  visit_id: number;
  technician_id: number;
  planned_date?: string;
}

export interface AssignRouteAdminRequest {
  technician_id: number;
  visit_ids_ordered: number[];
  target_date: string;
  hora_inici?: string;
}

export interface ManualAssignVisitRequest {
  visit_id: number;
  technician_id: number;
  target_date?: string;
  hora_inici?: string;
}

export interface LoteRecommendRequest {
  origen: Coordenada;
  destino: Coordenada;
  target_date?: string;
  limite_horas?: number;
}

export interface LoteRecommendationResponse {
  resumen: {
    distancia_km: number;
    tiempo_total_min: number;
    horas_totales: number;
    tareas_realizadas: number;
  };
  paradas_ordenadas: Array<{
    visit_id: number;
    assignable_id: number | null;
    latitude: number;
    longitude: number;
    postal_code: string;
    estimated_duration: number;
    score_ia: number;
  }>;
  ruta_geojson: {
    type: string;
    geometry: {
      type: string;
      coordinates: number[][];
    };
  };
}

export interface AddVisitToSlotRequest {
  technician_id: number;
  visit_id: number;
  target_date: string;
  hora_inici?: string;
  limite_horas?: number;
  origen?: Coordenada;
  destino?: Coordenada;
}

export interface AddVisitToSlotResponse {
  ok: boolean;
  technician_id: number;
  target_date: string;
  visit_ids_ordered: number[];
  visits_assigned: number;
  recomendacion: LoteRecommendationResponse;
}

export interface ReportSubmitRequest {
  visit_id: number;
  report_type: ReportType;
  content_json?: string; // JSON stringified checklist
}

export interface ImprevistoSubmitRequest {
  visit_id: number;
  tipo: ImprevistoType;
  descripcion?: string;
  tiempo_perdido_min?: number;
}

export interface ImprevistoResponse {
  imprevisto: Imprevisto;
  visitas_afectadas?: number[];
  propuesta_replanificacion?: {
    orden_ids: number[];
    distancia_total_km: number;
    tiempo_total_min: number;
  };
}

export interface MetricsResponse {
  completades: number;
  pendentes: number;
  programades: number;
  en_progreso: number;
  km_por_tecnico: Array<{
    technician_id: number;
    technician_name: string;
    km_total: number;
  }>;
  horas_efectivas_total: number;
  retardos_por_causa: Array<{
    causa: string;
    total: number;
  }>;
  sla_por_tipo: Array<{
    visit_type: string;
    total: number;
    completades: number;
    porcentaje_sla: number;
  }>;
}

export interface UserInfo {
  id: number;
  name: string;
  username: string | null;
  phone: string;
  email: string;
  is_technician: boolean;
  technician_id: number | null;
  created_at: string;
}

export interface UserCreateRequest {
  name: string;
  username?: string;
  phone: string;
  email: string;
  passwd: string;
  is_technician: boolean;
  zone?: string;
  start_work_day?: string;
  end_work_day?: string;
}

export interface HealthResponse {
  status: 'ok' | string;
}

// ═══════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || `API Error: ${response.status}`;
    throw new Error(errorMessage);
  }
  return response.json();
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return query ? `?${query}` : '';
}

// ═══════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════

export const api = {
  /**
   * GET /health
   */
  health: async (): Promise<HealthResponse> => {
    const response = await fetch(`${BASE_URL}/health`);
    return handleResponse(response);
  },

  /**
   * GET /api/v1/visits?technician_id={id}&date={YYYY-MM-DD}
   * Returns visits for a technician on a day, ordered by route_order
   */
  getVisitsByTechnician: async (technicianId: number, date?: string): Promise<Visit[]> => {
    const qs = buildQueryString({
      technician_id: technicianId,
      date,
    });
    const response = await fetch(`${BASE_URL}/api/v1/visits${qs}`, {
      cache: 'no-store',
    });
    return handleResponse(response);
  },

  /**
   * GET /api/v1/visits?date={YYYY-MM-DD}
   * Returns all visits for a date (used by operations dashboard)
   */
  getVisits: async (date?: string, technicianId?: number): Promise<Visit[]> => {
    const qs = buildQueryString({ date, technician_id: technicianId });
    const response = await fetch(`${BASE_URL}/api/v1/visits${qs}`, {
      cache: 'no-store',
    });
    return handleResponse(response);
  },

  /**
   * GET /api/v1/visits/all?technician_id={id}&date_from={YYYY-MM-DD}&date_to={YYYY-MM-DD}
   * Returns all visits in a date range (used by admin calendars)
   */
  getAllVisits: async (params?: {
    technicianId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Visit[]> => {
    const qs = buildQueryString({
      technician_id: params?.technicianId,
      date_from: params?.dateFrom,
      date_to: params?.dateTo,
    });
    const response = await fetch(`${BASE_URL}/api/v1/visits/all${qs}`, {
      cache: 'no-store',
    });
    return handleResponse(response);
  },

  /**
   * GET /api/v1/visits/week?technician_id={id}&week_start={YYYY-MM-DD}
   * Returns { "2026-03-26": 3, "2026-03-27": 2, ... }
   */
  getWeeklyVisits: async (
    technicianId: number,
    weekStart: string
  ): Promise<Record<string, number>> => {
    const qs = buildQueryString({
      technician_id: technicianId,
      week_start: weekStart,
    });
    const response = await fetch(`${BASE_URL}/api/v1/visits/week${qs}`);
    return handleResponse(response);
  },

  /**
   * POST /api/v1/ruta/calcular
   * Body: { technician_id, visit_ids_ordered, origen: {latitude, longitude} }
   */
  calculateRoute: async (request: CalcRouteRequest): Promise<RouteResponse> => {
    const response = await fetch(`${BASE_URL}/api/v1/ruta/calcular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  /**
   * POST /api/v1/ruta/asignar-incidencia
   * Assign critical incident to active route
   */
  assignIncidence: async (request: AsignIncidenciaRequest): Promise<AsignIncidenciaResponse> => {
    const response = await fetch(`${BASE_URL}/api/v1/ruta/asignar-incidencia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  /**
   * POST /api/v1/planning/assign
   * Get candidates for a visit assignment
   */
  planningAssign: async (request: PlanningAssignRequest): Promise<PlanningAssignResponse> => {
    const response = await fetch(`${BASE_URL}/api/v1/planning/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  /**
   * POST /api/v1/planning/confirm
   * Confirm a visit assignment
   */
  planningConfirm: async (request: PlanningConfirmRequest): Promise<PlanningConfirmResponse> => {
    const response = await fetch(`${BASE_URL}/api/v1/planning/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  /**
   * POST /api/v1/visits/from-contract
   */
  createVisitFromContract: async (request: CreateVisitFromContractRequest): Promise<Visit> => {
    const response = await fetch(`${BASE_URL}/api/v1/visits/from-contract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  /**
   * POST /api/v1/visits/from-incidence
   */
  createVisitFromIncidence: async (request: CreateVisitFromIncidenceRequest): Promise<Visit> => {
    const response = await fetch(`${BASE_URL}/api/v1/visits/from-incidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  /**
   * POST /api/v1/visits/reassign
   */
  reassignVisit: async (request: ReassignVisitRequest): Promise<Visit> => {
    const response = await fetch(`${BASE_URL}/api/v1/visits/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  /**
   * POST /api/v1/ruta/assignar
   */
  assignRouteAdmin: async (request: AssignRouteAdminRequest): Promise<{
    ok: boolean;
    technician_id: number;
    target_date: string;
    visits_assigned: number;
  }> => {
    const response = await fetch(`${BASE_URL}/api/v1/ruta/assignar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  /**
   * POST /api/v1/ruta/manual-assign
   */
  manualAssignVisit: async (request: ManualAssignVisitRequest): Promise<{
    ok: boolean;
    visit_id: number;
    technician_id: number;
    assigned_at: string;
  }> => {
    const response = await fetch(`${BASE_URL}/api/v1/ruta/manual-assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  /**
   * POST /api/v1/ruta/recomendar-lote
   * Recommendation-only optimized route for admin planning.
   */
  recommendLote: async (request: LoteRecommendRequest): Promise<LoteRecommendationResponse> => {
    const response = await fetch(`${BASE_URL}/api/v1/ruta/recomendar-lote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  /**
   * POST /api/v1/ruta/slot/add-and-recalculate
   * Adds one task to a day slot and recalculates optimal route for that slot.
   */
  addVisitToSlotAndRecalculate: async (
    request: AddVisitToSlotRequest
  ): Promise<AddVisitToSlotResponse> => {
    const response = await fetch(`${BASE_URL}/api/v1/ruta/slot/add-and-recalculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  /**
   * POST /api/v1/reports
   * Submit a report after visiting
   */
  submitReport: async (request: ReportSubmitRequest): Promise<Report> => {
    const response = await fetch(`${BASE_URL}/api/v1/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  /**
   * GET /api/v1/reports/{visit_id}
   */
  getReport: async (visitId: number): Promise<Report> => {
    const response = await fetch(`${BASE_URL}/api/v1/reports/${visitId}`);
    return handleResponse(response);
  },

  /**
   * POST /api/v1/imprevistos
   * Report an unexpected event
   */
  submitImprevisto: async (request: ImprevistoSubmitRequest): Promise<ImprevistoResponse> => {
    const response = await fetch(`${BASE_URL}/api/v1/imprevistos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  /**
   * GET /api/v1/imprevistos/{technician_id}?date={YYYY-MM-DD}
   * Get imprevistos for a technician today
   */
  getImprevistos: async (technicianId: number, date?: string): Promise<Imprevisto[]> => {
    const qs = buildQueryString({ date });
    const response = await fetch(`${BASE_URL}/api/v1/imprevistos/${technicianId}${qs}`);
    return handleResponse(response);
  },

  /**
   * GET /api/v1/metrics?date_from={YYYY-MM-DD}&date_to={YYYY-MM-DD}&technician_id={id}
   * Get metrics for a date range
   */
  getMetrics: async (params: {
    dateFrom?: string;
    dateTo?: string;
    technicianId?: number;
  }): Promise<MetricsResponse> => {
    const qs = buildQueryString({
      date_from: params.dateFrom,
      date_to: params.dateTo,
      technician_id: params.technicianId,
    });
    const response = await fetch(`${BASE_URL}/api/v1/metrics${qs}`);
    const raw = await handleResponse<any>(response);
    return {
      completades: raw.completades ?? raw.completadas ?? 0,
      pendentes: raw.pendentes ?? raw.pendientes ?? 0,
      programades: raw.programades ?? raw.programadas ?? 0,
      en_progreso: raw.en_progreso ?? 0,
      km_por_tecnico: raw.km_por_tecnico ?? [],
      horas_efectivas_total: raw.horas_efectivas_total ?? 0,
      retardos_por_causa: raw.retardos_por_causa ?? [],
      sla_por_tipo: (raw.sla_por_tipo ?? []).map((s: any) => ({
        visit_type: s.visit_type,
        total: s.total,
        completades: s.completades ?? s.completadas ?? 0,
        porcentaje_sla: s.porcentaje_sla ?? 0,
      })),
    };
  },

  /**
   * GET /api/v1/users
   */
  getUsers: async (): Promise<UserInfo[]> => {
    const response = await fetch(`${BASE_URL}/api/v1/users`);
    return handleResponse(response);
  },

  /**
   * POST /api/v1/users
   */
  createUser: async (request: UserCreateRequest): Promise<UserInfo> => {
    const response = await fetch(`${BASE_URL}/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },
};

// ═══════════════════════════════════════════════
// PRIORITY SYSTEM HELPERS
// ═══════════════════════════════════════════════

export const PRIORITY_LEVELS: Record<VisitType, number> = {
  correctivo_critico: 5,
  correctivo_no_critico: 4,
  diagnosi: 3,
  puesta_en_marcha: 2,
  preventivo: 1,
};

export const PRIORITY_COLORS: Record<VisitType, string> = {
  correctivo_critico: '#EF4444', // red
  correctivo_no_critico: '#F97316', // orange
  diagnosi: '#EAB308', // yellow
  puesta_en_marcha: '#22C55E', // green
  preventivo: '#3B82F6', // blue
};

export const PRIORITY_LABELS: Record<VisitType, string> = {
  correctivo_critico: 'P5 - Correctiu critic',
  correctivo_no_critico: 'P4 - Correctiu urgent',
  diagnosi: 'P3 - Diagnosi',
  puesta_en_marcha: 'P2 - Posada en marxa',
  preventivo: 'P1 - Preventiu',
};

export const STATUS_LABELS: Record<VisitStatus, string> = {
  pending: 'Pendent',
  schedule: 'Programada',
  scheduled: 'Programada',
  SCHEDULED: 'Programada',
  in_progress: 'En curs',
  completed: 'Completada',
  blocked: 'Bloquejada',
  cancelled: 'Cancel-lada',
};

export const STATUS_COLORS: Record<VisitStatus, string> = {
  pending: '#6B7280', // gray
  schedule: '#8B5CF6', // violet
  scheduled: '#8B5CF6', // violet
  SCHEDULED: '#8B5CF6', // violet
  in_progress: '#3B82F6', // blue
  completed: '#10B981', // green
  blocked: '#EF4444', // red
  cancelled: '#9CA3AF', // neutral
};
