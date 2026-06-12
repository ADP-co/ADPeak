export type ReportDataRow = {
  id?: string;
  actividad: string;
  responsable: string;
  estado: string;
  avance: string;
  plantel?: string;
  plantelId?: string;
  periodo?: string;
  ciclo?: string;
  meta?: number;
  evidencias?: number;
  vencimiento?: string;
};

export type ReportIndicator = {
  nombre: string;
  descripcion?: string;
  datos: ReportDataRow[];
};

export type ExportReport = {
  tipoReporte: string;
  periodo: string;
  cicloEscolar: string;
  fechaGeneracion: string;
  identidadReporte: {
    tipo: string;
    nombre: string;
  };
  indicadores: ReportIndicator[];
};

export type ReportRequest = {
  plantel?: string;
  plantelId?: string;
  periodo?: string;
  cicloEscolar?: string;
};

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export async function fetchExportReport(request: ReportRequest) {
  const url = new URL(`${API_ORIGIN}/demo/report`, window.location.origin);

  for (const [key, value] of Object.entries(request)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url);
  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok || !contentType.includes('application/json')) {
    throw new Error('El backend de reportes no devolvio JSON valido.');
  }

  const report = await response.json() as ExportReport;

  if (!Array.isArray(report.indicadores) || report.indicadores.some((indicator) => !Array.isArray(indicator.datos))) {
    throw new Error('El reporte no incluye indicadores[].datos[].');
  }

  return report;
}

export function reportToCsv(report: ExportReport) {
  const headers = [
    'tipo_reporte',
    'periodo_reporte',
    'ciclo_escolar',
    'fecha_generacion',
    'identidad_tipo',
    'identidad_nombre',
    'indicador',
    'descripcion_indicador',
    'registro_id',
    'ciclo',
    'periodo',
    'plantel',
    'actividad',
    'responsable',
    'estado',
    'vencimiento',
    'meta',
    'avance',
    'evidencias',
  ];
  const rows = report.indicadores.flatMap((indicator) =>
    indicator.datos.map((dataRow) => [
      report.tipoReporte,
      report.periodo,
      report.cicloEscolar,
      report.fechaGeneracion,
      report.identidadReporte.tipo,
      report.identidadReporte.nombre,
      indicator.nombre,
      indicator.descripcion ?? '',
      dataRow.id ?? '',
      dataRow.ciclo ?? '',
      dataRow.periodo ?? '',
      dataRow.plantel ?? report.identidadReporte.nombre,
      dataRow.actividad,
      dataRow.responsable,
      dataRow.estado,
      dataRow.vencimiento ?? '',
      dataRow.meta?.toString() ?? '',
      dataRow.avance,
      dataRow.evidencias?.toString() ?? '',
    ])
  );

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function countReportRows(report: ExportReport) {
  return report.indicadores.reduce((total, indicator) => total + indicator.datos.length, 0);
}
