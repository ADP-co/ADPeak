export type IndicatorStatus =
  | 'Corregir'
  | 'Pendiente'
  | 'En revisión'
  | 'Avance parcial'
  | 'Aprobado';

export type IndicatorStatusCounts = {
  total: number;
  pendientes: number;
  enRevision: number;
  observados: number;
  aprobados: number;
};

export function normalizeIndicatorStatus(value: string): Exclude<IndicatorStatus, 'Avance parcial'> {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized.includes('observado') || normalized.includes('correccion')) {
    return 'Corregir';
  }

  if (normalized.includes('revision') || normalized.includes('enviado')) {
    return 'En revisión';
  }

  if (normalized.includes('aprobado') || normalized.includes('cerrado')) {
    return 'Aprobado';
  }

  return 'Pendiente';
}

export function countIndicatorStatuses(values: string[]): IndicatorStatusCounts {
  return values.reduce<IndicatorStatusCounts>((counts, value) => {
    const status = normalizeIndicatorStatus(value);
    counts.total += 1;

    if (status === 'Aprobado') counts.aprobados += 1;
    else if (status === 'En revisión') counts.enRevision += 1;
    else if (status === 'Corregir') counts.observados += 1;
    else counts.pendientes += 1;

    return counts;
  }, emptyIndicatorStatusCounts());
}

export function aggregateIndicatorStatus(counts: IndicatorStatusCounts): IndicatorStatus {
  if (counts.observados > 0) return 'Corregir';
  if (counts.enRevision > 0) return 'En revisión';
  if (counts.total > 0 && counts.aprobados === counts.total) return 'Aprobado';
  if (counts.aprobados > 0) return 'Avance parcial';
  return 'Pendiente';
}

export function summarizeIndicatorStatusCounts(counts: IndicatorStatusCounts) {
  const parts = [
    statusCountLabel(counts.aprobados, 'aprobado', 'aprobados'),
    statusCountLabel(counts.enRevision, 'en revisión', 'en revisión'),
    statusCountLabel(counts.observados, 'con observación', 'con observación'),
    statusCountLabel(counts.pendientes, 'pendiente', 'pendientes'),
  ].filter(Boolean);

  return parts.join(' · ');
}

export function emptyIndicatorStatusCounts(): IndicatorStatusCounts {
  return {
    total: 0,
    pendientes: 0,
    enRevision: 0,
    observados: 0,
    aprobados: 0,
  };
}

function statusCountLabel(count: number, singular: string, plural: string) {
  if (count === 0) return '';
  return `${count} ${count === 1 ? singular : plural}`;
}
