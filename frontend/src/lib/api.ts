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

export type VisitStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

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

export interface HealthResponse {
  status: 'ok' | string;
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
    const response = await fetch(`${BASE_URL}/api/v1/visits${qs}`);
    return handleResponse(response);
  },

  /**
   * GET /api/v1/visits?date={YYYY-MM-DD}
   * Returns all visits for a date (used by operations dashboard)
   */
  getVisits: async (date?: string, technicianId?: number): Promise<Visit[]> => {
    const qs = buildQueryString({ date, technician_id: technicianId });
    const response = await fetch(`${BASE_URL}/api/v1/visits${qs}`);
    return handleResponse(response);
  },

  /**
   * GET /api/v1/visits/all?technician_id={id}&date_from={YYYY-MM-DD}&date_to={YYYY-MM-DD}
   * Returns all visits with optional filters (used by metrics recent interventions)
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
    const response = await fetch(`${BASE_URL}/api/v1/visits/all${qs}`);
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
   * Returns user directory; technician names are used in metrics table.
   */
  getUsers: async (): Promise<UserInfo[]> => {
    const response = await fetch(`${BASE_URL}/api/v1/users`);
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
  correctivo_critico: 'P5 - Crítico',
  correctivo_no_critico: 'P4 - Urgente',
  diagnosi: 'P3 - Diagnóstico',
  puesta_en_marcha: 'P2 - Puesta en marcha',
  preventivo: 'P1 - Preventivo',
};

export const STATUS_LABELS: Record<VisitStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
  blocked: 'Bloqueada',
  cancelled: 'Cancelada',
};

export const STATUS_COLORS: Record<VisitStatus, string> = {
  pending: '#6B7280', // gray
  in_progress: '#3B82F6', // blue
  completed: '#10B981', // green
  blocked: '#EF4444', // red
  cancelled: '#9CA3AF', // neutral
};
