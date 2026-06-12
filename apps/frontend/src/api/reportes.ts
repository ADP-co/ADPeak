import logoUdecUrl from '../assets/logo-udec.svg';
import mediaSuperiorLogoUrl from '../assets/MediaSuperiorLogo.png';
import { API_BASE_URL, API_REQUESTS_ENABLED, sessionHeaders } from './client';

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

export async function fetchExportReport(request: ReportRequest) {
  if (!API_REQUESTS_ENABLED) {
    throw new Error('api_unavailable');
  }

  const url = new URL(`${API_BASE_URL}/reportes`, window.location.origin);

  for (const [key, value] of Object.entries(request)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, { headers: sessionHeaders() });
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

type PdfStream = {
  dictionary: string;
  stream: string | Uint8Array;
};

type PdfObject = string | PdfStream;

type PdfHeaderImage = {
  width: number;
  height: number;
  bytes: Uint8Array;
};

export async function reportToPdfBlob(report: ExportReport) {
  const lines = buildPdfLines(report);
  const pages = chunkLines(lines, 40);
  const headerImage = await createHeaderImage();
  const objects: PdfObject[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let headerImageObjectNumber: number | undefined;

  if (headerImage) {
    headerImageObjectNumber = objects.length + 1;
    objects.push({
      dictionary: [
        '<< /Type /XObject',
        '/Subtype /Image',
        `/Width ${headerImage.width}`,
        `/Height ${headerImage.height}`,
        '/ColorSpace /DeviceRGB',
        '/BitsPerComponent 8',
        '/Filter /DCTDecode',
        `/Length ${headerImage.bytes.byteLength} >>`,
      ].join(' '),
      stream: headerImage.bytes,
    });
  }

  const pageRefs: string[] = [];

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectNumber = objects.length + 1;
    const contentObjectNumber = pageObjectNumber + 1;
    const xObjectResource = headerImageObjectNumber
      ? ` /XObject << /HeaderLogos ${headerImageObjectNumber} 0 R >>`
      : '';

    pageRefs.push(`${pageObjectNumber} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >>${xObjectResource} >> /Contents ${contentObjectNumber} 0 R >>`);
    const content = renderPdfPage(pageLines, pageIndex + 1, pages.length, Boolean(headerImageObjectNumber));
    objects.push({
      dictionary: `<< /Length ${byteLength(content)} >>`,
      stream: content,
    });
  });

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>`;

  const bodyParts: Array<string | Uint8Array> = ['%PDF-1.4\n'];
  const offsets = [0];
  let currentOffset = byteLength(bodyParts[0]);

  objects.forEach((object, index) => {
    offsets.push(currentOffset);
    currentOffset += pushPdfPart(bodyParts, `${index + 1} 0 obj\n`);

    if (typeof object === 'string') {
      currentOffset += pushPdfPart(bodyParts, object);
    } else {
      currentOffset += pushPdfPart(bodyParts, `${object.dictionary}\nstream\n`);
      currentOffset += pushPdfPart(bodyParts, object.stream);
      currentOffset += pushPdfPart(bodyParts, '\nendstream');
    }

    currentOffset += pushPdfPart(bodyParts, '\nendobj\n');
  });

  const xrefOffset = currentOffset;
  const xrefRows = offsets.map((offset, index) =>
    index === 0 ? '0000000000 65535 f ' : `${String(offset).padStart(10, '0')} 00000 n `
  );
  bodyParts.push(`xref\n0 ${objects.length + 1}\n${xrefRows.join('\n')}\n`);
  bodyParts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(bodyParts.map(toBlobPart), { type: 'application/pdf' });
}

export function countReportRows(report: ExportReport) {
  return report.indicadores.reduce((total, indicator) => total + indicator.datos.length, 0);
}

function buildPdfLines(report: ExportReport) {
  const statusSummary = summarizeReport(report);
  const lines = [
    'Resumen',
    report.identidadReporte.nombre,
    `Periodo: ${report.periodo} | Ciclo escolar: ${report.cicloEscolar}`,
    `Generado: ${formatReportDate(report.fechaGeneracion)}`,
    '',
    `Registros revisados: ${statusSummary.total}`,
    `Aprobados: ${statusSummary.approved} | En revision: ${statusSummary.inReview} | Observados: ${statusSummary.observed}`,
    `Pendientes: ${statusSummary.pending} | Atrasados: ${statusSummary.late}`,
    '',
    'Indicadores',
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

function renderPdfPage(lines: string[], pageNumber: number, pageCount: number, hasHeaderImage: boolean) {
  const titleY = hasHeaderImage ? 705 : 750;
  const commands = [
    ...(hasHeaderImage
      ? ['q', '520 0 0 72 46 712 cm', '/HeaderLogos Do', 'Q']
      : [
          'q',
          '0.32 0.46 0.19 rg',
          '50 772 120 4 re f',
          '1 0.56 0 rg',
          '458 770 8 8 re f',
          '0.78 0 0.5 rg',
          '472 770 8 8 re f',
          '0.32 0.15 0.51 rg',
          '486 770 8 8 re f',
          '0 0.64 0.89 rg',
          '500 770 8 8 re f',
          '0.76 0.85 0.18 rg',
          '514 770 8 8 re f',
          'Q',
        ]),
    'BT',
    '/F1 16 Tf',
    `50 ${titleY} Td`,
    `(${escapePdfText(lines[0] ?? '')}) Tj`,
    '/F1 10 Tf'
  ];
  lines.slice(1).forEach((line) => {
    commands.push('0 -15 Td', `(${escapePdfText(line)}) Tj`);
  });
  commands.push('/F1 9 Tf', '0 -24 Td', `(${escapePdfText(`Pagina ${pageNumber} de ${pageCount}`)}) Tj`, 'ET');
  return commands.join('\n');
}

async function createHeaderImage(): Promise<PdfHeaderImage | undefined> {
  if (
    typeof document === 'undefined' ||
    typeof Image === 'undefined' ||
    typeof atob === 'undefined'
  ) {
    return undefined;
  }

  try {
    const [logoUdec, mediaSuperiorLogo] = await Promise.all([
      loadBrowserImage(logoUdecUrl),
      loadBrowserImage(mediaSuperiorLogoUrl),
    ]);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      return undefined;
    }

    canvas.width = 1200;
    canvas.height = 170;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawImageContained(context, logoUdec, 0, 20, 380, 110);
    drawImageContained(context, mediaSuperiorLogo, 930, 30, 250, 95);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    return {
      width: canvas.width,
      height: canvas.height,
      bytes: dataUrlToBytes(dataUrl),
    };
  } catch {
    return undefined;
  }
}

function loadBrowserImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('logo_load_failed'));
    image.src = src;
  });
}

function drawImageContained(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
) {
  const ratio = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const width = image.naturalWidth * ratio;
  const height = image.naturalHeight * ratio;
  context.drawImage(image, x, y + (maxHeight - height) / 2, width, height);
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function byteLength(value: string | Uint8Array) {
  return typeof value === 'string' ? new TextEncoder().encode(value).byteLength : value.byteLength;
}

function pushPdfPart(parts: Array<string | Uint8Array>, part: string | Uint8Array) {
  parts.push(part);
  return byteLength(part);
}

function toBlobPart(part: string | Uint8Array): BlobPart {
  if (typeof part === 'string') {
    return part;
  }

  const bytes = new Uint8Array(part.byteLength);
  bytes.set(part);
  return bytes.buffer;
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
