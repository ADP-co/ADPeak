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

export function reportToPdfBlob(report: ExportReport) {
  const lines = buildPdfLines(report);
  const pages = chunkLines(lines, 44);
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const pageRefs: string[] = [];

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectNumber = objects.length + 1;
    const contentObjectNumber = pageObjectNumber + 1;
    pageRefs.push(`${pageObjectNumber} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
    const content = renderPdfPage(pageLines, pageIndex + 1, pages.length);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>`;

  const bodyParts: string[] = ['%PDF-1.4\n'];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(bodyParts.join('').length);
    bodyParts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = bodyParts.join('').length;
  const xrefRows = offsets.map((offset, index) =>
    index === 0 ? '0000000000 65535 f ' : `${String(offset).padStart(10, '0')} 00000 n `
  );
  bodyParts.push(`xref\n0 ${objects.length + 1}\n${xrefRows.join('\n')}\n`);
  bodyParts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob([bodyParts.join('')], { type: 'application/pdf' });
}

export function countReportRows(report: ExportReport) {
  return report.indicadores.reduce((total, indicator) => total + indicator.datos.length, 0);
}

function buildPdfLines(report: ExportReport) {
  const lines = [
    'Reporte de indicadores',
    `${report.identidadReporte.tipo}: ${report.identidadReporte.nombre}`,
    `Periodo: ${report.periodo} | Ciclo escolar: ${report.cicloEscolar}`,
    `Fecha de generacion: ${report.fechaGeneracion}`,
    `Registros exportados: ${countReportRows(report)}`,
    '',
    'Indicadores y registros',
    '',
  ];

  report.indicadores.forEach((indicator) => {
    lines.push(`Indicador: ${indicator.nombre}`);

    if (indicator.descripcion) {
      lines.push(`Descripcion: ${indicator.descripcion}`);
    }

    indicator.datos.forEach((dataRow) => {
      lines.push(`- Registro: ${dataRow.id ?? 'sin-id'} | Actividad: ${dataRow.actividad}`);
      lines.push(`  Responsable: ${dataRow.responsable} | Estado: ${dataRow.estado} | Avance: ${dataRow.avance}`);
      lines.push(`  Plantel: ${dataRow.plantel ?? report.identidadReporte.nombre} | Periodo: ${dataRow.periodo ?? report.periodo} | Ciclo: ${dataRow.ciclo ?? report.cicloEscolar}`);
      lines.push(`  Meta: ${dataRow.meta ?? 'N/D'} | Evidencias: ${dataRow.evidencias ?? 0} | Vencimiento: ${dataRow.vencimiento ?? 'N/D'}`);
    });

    lines.push('');
  });

  return lines.flatMap((line) => wrapPdfLine(line));
}

function renderPdfPage(lines: string[], pageNumber: number, pageCount: number) {
  const commands = ['BT', '/F1 16 Tf', '50 750 Td', `(${escapePdfText(lines[0] ?? '')}) Tj`, '/F1 10 Tf'];
  lines.slice(1).forEach((line) => {
    commands.push('0 -15 Td', `(${escapePdfText(line)}) Tj`);
  });
  commands.push('/F1 9 Tf', '0 -24 Td', `(${escapePdfText(`Pagina ${pageNumber} de ${pageCount}`)}) Tj`, 'ET');
  return commands.join('\n');
}

function wrapPdfLine(line: string, maxLength = 92) {
  const normalizedLine = normalizePdfText(line);

  if (normalizedLine.length <= maxLength) {
    return [normalizedLine];
  }

  const words = normalizedLine.split(' ');
  const wrappedLines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxLength) {
      wrappedLines.push(currentLine);
      currentLine = word;
      return;
    }

    currentLine = nextLine;
  });

  if (currentLine) {
    wrappedLines.push(currentLine);
  }

  return wrappedLines;
}

function chunkLines(lines: string[], size: number) {
  const chunks: string[][] = [];

  for (let index = 0; index < lines.length; index += size) {
    chunks.push(lines.slice(index, index + size));
  }

  return chunks.length > 0 ? chunks : [['Reporte de indicadores']];
}

function normalizePdfText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '');
}

function escapePdfText(value: string) {
  return normalizePdfText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
