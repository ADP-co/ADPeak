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
    throw new Error('No se pudo obtener la informacion del reporte.');
  }

  const report = await response.json() as ExportReport;

  if (!Array.isArray(report.indicadores) || report.indicadores.some((indicator) => !Array.isArray(indicator.datos))) {
    throw new Error('La informacion del reporte esta incompleta.');
  }

  return report;
}

export function reportToCsv(report: ExportReport) {
  const headers = [
    'Periodo',
    'Ciclo escolar',
    'Fecha de generacion',
    'Alcance',
    'Plantel',
    'Indicador',
    'Actividad',
    'Responsable',
    'Estado',
    'Avance',
    'Evidencias',
    'Vencimiento',
  ];
  const rows = report.indicadores.flatMap((indicator) =>
    indicator.datos.map((dataRow) => [
      report.periodo,
      report.cicloEscolar,
      formatReportDate(report.fechaGeneracion),
      report.identidadReporte.nombre,
      dataRow.plantel ?? report.identidadReporte.nombre,
      indicator.nombre,
      dataRow.actividad,
      dataRow.responsable,
      formatStatusLabel(dataRow.estado),
      dataRow.avance,
      dataRow.evidencias?.toString() ?? '',
      formatDeadline(dataRow.vencimiento),
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
  const statusSummary = summarizeReport(report);
  const lines = [
    'Resumen ejecutivo de indicadores',
    report.identidadReporte.nombre,
    `Periodo: ${report.periodo} | Ciclo escolar: ${report.cicloEscolar}`,
    `Generado: ${formatReportDate(report.fechaGeneracion)}`,
    '',
    `Registros revisados: ${statusSummary.total}`,
    `Aprobados: ${statusSummary.approved} | En revision: ${statusSummary.inReview} | Observados: ${statusSummary.observed}`,
    `Pendientes: ${statusSummary.pending} | Atrasados: ${statusSummary.late}`,
    '',
    'Detalle por indicador',
    '',
  ];

  report.indicadores.forEach((indicator) => {
    lines.push(indicator.nombre);
    lines.push(`${indicator.datos.length} registros | Avance promedio: ${averageProgress(indicator.datos)} | Estado principal: ${dominantStatus(indicator.datos)}`);

    indicator.datos.forEach((dataRow) => {
      lines.push(buildRecordLine(dataRow, report));

      const details = buildRecordDetails(dataRow);
      if (details) {
        lines.push(details);
      }
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

function normalizeStatus(value: string) {
  return normalizePdfText(value).toLowerCase().replace(/_/g, ' ').trim();
}

function formatStatusLabel(value: string) {
  const status = normalizeStatus(value);

  if (status.includes('aprobado') || status.includes('completo')) {
    return 'Aprobado';
  }

  if (status.includes('revision') || status.includes('enviado')) {
    return 'En revision';
  }

  if (status.includes('observado') || status.includes('corregir')) {
    return 'Observado';
  }

  if (status.includes('rezagado') || status.includes('atrasado')) {
    return 'Atrasado';
  }

  if (status.includes('pendiente') || status.includes('borrador') || status.includes('progreso')) {
    return 'Pendiente';
  }

  return value.replace(/_/g, ' ');
}

function formatDeadline(value?: string) {
  if (!value) {
    return '';
  }

  const deadline = normalizeStatus(value);

  if (deadline.includes('atrasado')) {
    return 'Atrasado';
  }

  if (deadline.includes('en tiempo')) {
    return 'En tiempo';
  }

  return value.replace(/_/g, ' ');
}

function formatReportDate(value: string) {
  if (!value) {
    return '';
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function summarizeReport(report: ExportReport) {
  const rows = report.indicadores.flatMap((indicator) => indicator.datos);

  return rows.reduce(
    (summary, dataRow) => {
      const status = formatStatusLabel(dataRow.estado);
      const deadline = formatDeadline(dataRow.vencimiento);

      if (status === 'Aprobado') {
        summary.approved += 1;
      } else if (status === 'En revision') {
        summary.inReview += 1;
      } else if (status === 'Observado') {
        summary.observed += 1;
      } else if (status === 'Atrasado') {
        summary.late += 1;
      } else {
        summary.pending += 1;
      }

      if (deadline === 'Atrasado' && status !== 'Atrasado') {
        summary.late += 1;
      }

      summary.total += 1;
      return summary;
    },
    { total: 0, approved: 0, inReview: 0, observed: 0, pending: 0, late: 0 }
  );
}

function progressValue(value: string) {
  const numericValue = Number(value.replace('%', '').trim());
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function averageProgress(rows: ReportDataRow[]) {
  const values = rows.map((row) => progressValue(row.avance)).filter((value): value is number => value !== undefined);

  if (values.length === 0) {
    return 'Sin avance';
  }

  const average = values.reduce((total, value) => total + value, 0) / values.length;
  return `${Math.round(average)}%`;
}

function dominantStatus(rows: ReportDataRow[]) {
  if (rows.length === 0) {
    return 'Sin registros';
  }

  const counts = rows.reduce<Record<string, number>>((current, row) => {
    const status = formatStatusLabel(row.estado);
    current[status] = (current[status] ?? 0) + 1;
    return current;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Sin registros';
}

function buildRecordLine(dataRow: ReportDataRow, report: ExportReport) {
  const plantel = dataRow.plantel ?? report.identidadReporte.nombre;
  return `- ${dataRow.actividad} | ${plantel} | ${dataRow.responsable} | ${formatStatusLabel(dataRow.estado)} | ${dataRow.avance}`;
}

function buildRecordDetails(dataRow: ReportDataRow) {
  const details: string[] = [];
  const deadline = formatDeadline(dataRow.vencimiento);

  if (typeof dataRow.evidencias === 'number' && dataRow.evidencias > 0) {
    details.push(`Evidencias: ${dataRow.evidencias}`);
  }

  if (deadline === 'Atrasado') {
    details.push('Atencion: vencido');
  }

  return details.length > 0 ? `  ${details.join(' | ')}` : '';
}
