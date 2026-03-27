const VISIT_TYPE_LABELS_CA: Record<string, string> = {
  correctivo_critico: 'correctiu critic',
  correctivo_no_critico: 'correctiu no critic',
  diagnosi: 'diagnosi',
  diagnosis: 'diagnosi',
  puesta_en_marcha: 'posada en marxa',
  startup: 'posada en marxa',
  preventivo: 'preventiu',
  preventive: 'preventiu',
  maintenance: 'manteniment',
  manteinance: 'manteniment',
  mantenimiento: 'manteniment',
  manteniment: 'manteniment',
};

const STATUS_LABELS_CA: Record<string, string> = {
  pending: 'pendent',
  in_progress: 'en curs',
  completed: 'completada',
  cancelled: 'cancel-lada',
  blocked: 'bloquejada',
  scheduled: 'programat',
};

function normalizeLabelKey(value: string): string {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function prettifyLabel(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function getVisitTypeLabelCa(value: string): string {
  const key = normalizeLabelKey(value);
  return VISIT_TYPE_LABELS_CA[key] ?? prettifyLabel(value);
}

export function getStatusLabelCa(value: string): string {
  const key = normalizeLabelKey(value);
  return STATUS_LABELS_CA[key] ?? prettifyLabel(value);
}
