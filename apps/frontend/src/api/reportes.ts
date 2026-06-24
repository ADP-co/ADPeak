import logoUdecUrl from '../assets/logo-udec.svg';
import mediaSuperiorLogoUrl from '../assets/MediaSuperiorLogo.png';
import { API_BASE_URL, API_REQUESTS_ENABLED, sessionHeaders } from './client';

export type ReportDataRow = {
  id?: string;
  registro_id?: string | number;
  captureId?: number;
  actividadId?: number;
  actividad: string;
  responsable: string;
  estado: string;
  avance: string;
  plantel?: string;
  plantelId?: string;
  periodo?: string;
  periodoId?: number;
  ciclo?: string;
  meta?: number;
  evidencias?: number;
  vencimiento?: string;
  detalle?: Array<{ campo: string; valor: string }>;
};

export type ReportIndicator = {
  id?: string;
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
    throw new Error('No se pudo obtener la información del reporte.');
  }

  const report = await response.json() as ExportReport;

  if (!Array.isArray(report.indicadores) || report.indicadores.some((indicator) => !Array.isArray(indicator.datos))) {
    throw new Error('La información del reporte está incompleta.');
  }

  return report;
}

export function reportToCsv(report: ExportReport) {
  const includePlantelColumn = shouldShowPlantelColumn(report);
  const detailHeaders = reportDetailHeaders(report);
  const headers = [
    ...(includePlantelColumn ? ['Plantel'] : []),
    'Indicador',
    'Actividad',
    'Responsable',
    'Estado',
    'Avance',
    'Meta',
    'Evidencias',
    'Vencimiento',
    ...detailHeaders,
  ];
  const rows = report.indicadores.flatMap((indicator) =>
    indicator.datos.map((dataRow) => [
      ...(includePlantelColumn ? [dataRow.plantel ?? report.identidadReporte.nombre] : []),
      indicator.nombre,
      dataRow.actividad,
      dataRow.responsable,
      formatStatusLabel(dataRow.estado),
      dataRow.avance,
      dataRow.meta?.toString() ?? '',
      dataRow.evidencias?.toString() ?? '',
      formatDeadline(dataRow.vencimiento),
      ...detailHeaders.map((header) => detailValue(dataRow, header)),
    ])
  );

  const summaryRows = [
    ['Periodo', report.periodo],
    ['Ciclo escolar', report.cicloEscolar],
    ['Fecha de generación', formatReportDate(report.fechaGeneracion)],
    ['Alcance', `${report.identidadReporte.tipo}: ${report.identidadReporte.nombre}`],
  ];
  const csvBody = [...summaryRows, [], headers, ...rows]
    .map((row) => row.map((cell) => `"${cleanExportText(String(cell)).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return `\uFEFF${csvBody}`;
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

type PdfColor = [number, number, number];
type PdfFont = 'F1' | 'F2';

type PdfReportPage = {
  content: PdfContentBuilder;
  y: number;
};

type PdfTableColumn = {
  label: string;
  width: number;
  align?: 'left' | 'center';
  value: (row: ReportDataRow, report: ExportReport) => string;
};

const PDF_WIDTH = 612;
const PDF_HEIGHT = 792;
const PDF_MARGIN_X = 42;
const PDF_CONTENT_WIDTH = PDF_WIDTH - PDF_MARGIN_X * 2;
const PDF_BOTTOM_Y = 58;
const PDF_GREEN: PdfColor = [82, 118, 48];
const PDF_DARK_GREEN: PdfColor = [0, 72, 60];
const PDF_TEXT: PdfColor = [48, 54, 61];
const PDF_MUTED: PdfColor = [93, 101, 111];
const PDF_LINE: PdfColor = [220, 224, 229];
const PDF_LIGHT_GREEN: PdfColor = [238, 246, 232];
const PDF_LIGHT_GRAY: PdfColor = [246, 248, 247];

export async function reportToPdfBlob(report: ExportReport) {
  const headerImage = await createHeaderImage();
  const objects: PdfObject[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
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
  const pageContents = renderPdfReport(report, Boolean(headerImageObjectNumber));

  pageContents.forEach((content) => {
    const pageObjectNumber = objects.length + 1;
    const contentObjectNumber = pageObjectNumber + 1;
    const xObjectResource = headerImageObjectNumber
      ? ` /XObject << /HeaderLogos ${headerImageObjectNumber} 0 R >>`
      : '';

    pageRefs.push(`${pageObjectNumber} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xObjectResource} >> /Contents ${contentObjectNumber} 0 R >>`);
    objects.push({
      dictionary: `<< /Length ${byteLength(content)} >>`,
      stream: content,
    });
  });

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageContents.length} >>`;

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

function shouldShowPlantelColumn(report: ExportReport) {
  const reportType = normalizeStatus(report.identidadReporte.tipo);

  if (reportType !== 'plantel') {
    return true;
  }

  const identityName = normalizeStatus(report.identidadReporte.nombre);
  return report.indicadores
    .flatMap((indicator) => indicator.datos)
    .some((row) => row.plantel && normalizeStatus(row.plantel) !== identityName);
}

function reportDetailHeaders(report: ExportReport) {
  const headers: string[] = [];
  const seen = new Set<string>();

  report.indicadores.forEach((indicator) => {
    indicator.datos.forEach((row) => {
      row.detalle?.forEach((detail) => {
        const header = cleanExportText(detail.campo);
        const key = normalizeStatus(header);

        if (!header || seen.has(key)) {
          return;
        }

        seen.add(key);
        headers.push(header);
      });
    });
  });

  return headers;
}

function detailValue(row: ReportDataRow, header: string) {
  const headerKey = normalizeStatus(header);
  const detail = row.detalle?.find((item) => normalizeStatus(item.campo) === headerKey);
  return detail ? cleanExportText(detail.valor) : '';
}

function formatDetailSummary(row: ReportDataRow) {
  const details = row.detalle
    ?.map((detail) => `${cleanExportText(detail.campo)}: ${cleanExportText(detail.valor)}`)
    .filter((detail) => detail.length > 2) ?? [];

  if (details.length === 0) {
    return '';
  }

  return details.slice(0, 4).join(' | ');
}

function renderPdfReport(report: ExportReport, hasHeaderImage: boolean) {
  const pages: PdfContentBuilder[] = [];
  let current = createPdfReportPage(pages, hasHeaderImage);
  const allRows = report.indicadores.flatMap((indicator) => indicator.datos);
  const statusSummary = summarizeReport(report);

  const ensureSpace = (height: number) => {
    if (current.y - height < PDF_BOTTOM_Y) {
      current = createPdfReportPage(pages, hasHeaderImage);
    }
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(32);
    current.content.fillRect(PDF_MARGIN_X, current.y - 24, PDF_CONTENT_WIDTH, 24, PDF_LIGHT_GREEN);
    current.content.textAt(title, PDF_MARGIN_X + 10, current.y - 16, 11, 'F2', PDF_DARK_GREEN);
    current.y -= 34;
  };

  const drawIndicatorHeader = (indicator: ExportReport['indicadores'][number]) => {
    const titleLines = wrapPdfLine(indicator.nombre, 84).slice(0, 4);
    const descriptionLines = indicator.descripcion
      ? wrapPdfLine(indicator.descripcion, 102).slice(0, 3)
      : [];
    const summaryLines = wrapPdfLine(
      `${indicator.datos.length} registros | Avance promedio ${averageProgress(indicator.datos)} | Estado principal ${dominantStatus(indicator.datos)}`,
      102
    );
    const titleHeight = titleLines.length * 13 + 16;
    const contentHeight = descriptionLines.length * 11 + summaryLines.length * 11 + 8;
    const tableStartHeight = indicator.datos.length > 0 ? 92 : 22;

    ensureSpace(titleHeight + contentHeight + tableStartHeight);

    current.content.fillRect(PDF_MARGIN_X, current.y - titleHeight, PDF_CONTENT_WIDTH, titleHeight, PDF_LIGHT_GRAY);
    titleLines.forEach((line, index) => {
      current.content.textAt(line, PDF_MARGIN_X + 10, current.y - 15 - index * 13, 10.5, 'F2', PDF_GREEN);
    });
    current.y -= titleHeight + 8;

    descriptionLines.forEach((line) => {
      current.content.textAt(line, PDF_MARGIN_X, current.y, 8.5, 'F1', PDF_MUTED);
      current.y -= 11;
    });

    summaryLines.forEach((line) => {
      current.content.textAt(line, PDF_MARGIN_X, current.y, 8.5, 'F1', PDF_MUTED);
      current.y -= 11;
    });

    current.y -= 3;
  };

  current.content.textAt('Resumen', PDF_MARGIN_X, current.y, 20, 'F2', PDF_DARK_GREEN);
  current.y -= 24;
  current.content.textAt(
    `${cleanExportText(report.identidadReporte.tipo)}: ${cleanExportText(report.identidadReporte.nombre)}`,
    PDF_MARGIN_X,
    current.y,
    11,
    'F1',
    PDF_TEXT
  );
  current.y -= 16;
  current.content.textAt(
    `Periodo ${cleanExportText(report.periodo)} | Ciclo escolar ${cleanExportText(report.cicloEscolar)} | Generado ${formatReportDate(report.fechaGeneracion)}`,
    PDF_MARGIN_X,
    current.y,
    9,
    'F1',
    PDF_MUTED
  );
  current.y -= 26;

  drawSectionTitle('Resumen global');
  drawMetricGrid(current, [
    ['Registros revisados', String(statusSummary.total)],
    ['Avance promedio', averageProgress(allRows)],
    ['Aprobados', String(statusSummary.approved)],
    ['En revisión', String(statusSummary.inReview)],
    ['Observados', String(statusSummary.observed)],
    ['Pendientes', String(statusSummary.pending)],
    ['Atrasados', String(statusSummary.late)],
    ['Indicadores', String(report.indicadores.length)],
  ]);
  current.y -= 18;

  drawSectionTitle('Detalle por indicador');

  if (report.indicadores.length === 0) {
    current.content.textAt('No hay indicadores disponibles para el alcance seleccionado.', PDF_MARGIN_X, current.y, 10, 'F1', PDF_MUTED);
    current.y -= 18;
  }

  report.indicadores.forEach((indicator) => {
    drawIndicatorHeader(indicator);

    if (indicator.datos.length === 0) {
      current.content.textAt('Sin registros capturados para este indicador.', PDF_MARGIN_X, current.y, 9, 'F1', PDF_MUTED);
      current.y -= 22;
      return;
    }

    drawIndicatorTable(indicator.datos, report, () => current, ensureSpace, (nextPage) => {
      current = nextPage;
    }, hasHeaderImage, pages);
    current.y -= 14;
  });

  pages.forEach((content, index) => drawPdfFooter(content, index + 1, pages.length));

  return pages.map((content) => content.toBytes());
}

function createPdfReportPage(pages: PdfContentBuilder[], hasHeaderImage: boolean): PdfReportPage {
  const content = new PdfContentBuilder();
  drawPdfHeader(content, hasHeaderImage);
  pages.push(content);

  return {
    content,
    y: 676,
  };
}

function drawPdfHeader(content: PdfContentBuilder, hasHeaderImage: boolean) {
  if (hasHeaderImage) {
    content.line('q');
    content.line('500 0 0 70 56 710 cm');
    content.line('/HeaderLogos Do');
    content.line('Q');
  } else {
    content.textAt('Universidad de Colima', PDF_MARGIN_X, 748, 11, 'F2', PDF_DARK_GREEN);
    content.textAt('Media Superior', PDF_WIDTH - PDF_MARGIN_X - 86, 748, 11, 'F2', PDF_DARK_GREEN);
  }

  content.fillRect(PDF_MARGIN_X, 700, PDF_CONTENT_WIDTH, 3, PDF_GREEN);
}

function drawPdfFooter(content: PdfContentBuilder, pageNumber: number, pageCount: number) {
  content.strokeLine(PDF_MARGIN_X, 44, PDF_WIDTH - PDF_MARGIN_X, 44, PDF_LINE);
  content.textAt(`ADPeak SIGI-POA DGEMS | Página ${pageNumber} de ${pageCount}`, PDF_MARGIN_X, 28, 8, 'F1', PDF_MUTED);
}

function drawMetricGrid(page: PdfReportPage, metrics: Array<[string, string]>) {
  const columns = 4;
  const columnWidth = PDF_CONTENT_WIDTH / columns;
  const rowHeight = 42;

  metrics.forEach(([label, value], index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = PDF_MARGIN_X + column * columnWidth;
    const y = page.y - row * rowHeight;

    page.content.fillRect(x, y - rowHeight + 5, columnWidth - 8, rowHeight - 8, PDF_LIGHT_GRAY);
    page.content.strokeRect(x, y - rowHeight + 5, columnWidth - 8, rowHeight - 8, PDF_LINE);
    page.content.textAt(cleanExportText(label), x + 8, y - 16, 7.5, 'F1', PDF_MUTED);
    page.content.textAt(cleanExportText(value), x + 8, y - 31, 13, 'F2', PDF_DARK_GREEN);
  });

  page.y -= Math.ceil(metrics.length / columns) * rowHeight + 2;
}

function drawIndicatorTable(
  rows: ReportDataRow[],
  report: ExportReport,
  getCurrentPage: () => PdfReportPage,
  ensureSpace: (height: number) => void,
  setCurrentPage: (page: PdfReportPage) => void,
  hasHeaderImage: boolean,
  pages: PdfContentBuilder[]
) {
  const includePlantelColumn = shouldShowPlantelColumn(report);
  const columns: PdfTableColumn[] = includePlantelColumn
    ? [
        { label: 'Actividad', width: 104, value: (row) => row.actividad },
        { label: 'Responsable', width: 76, value: (row) => row.responsable },
        { label: 'Plantel', width: 64, value: (row, currentReport) => row.plantel ?? currentReport.identidadReporte.nombre },
        { label: 'Estado', width: 52, align: 'center', value: (row) => formatStatusLabel(row.estado) },
        { label: 'Avance', width: 38, align: 'center', value: (row) => row.avance },
        { label: 'Detalle', width: 154, value: (row) => formatDetailSummary(row) },
        { label: 'Evid.', width: 40, align: 'center', value: (row) => (typeof row.evidencias === 'number' ? String(row.evidencias) : '') },
      ]
    : [
        { label: 'Actividad', width: 120, value: (row) => row.actividad },
        { label: 'Responsable', width: 88, value: (row) => row.responsable },
        { label: 'Estado', width: 52, align: 'center', value: (row) => formatStatusLabel(row.estado) },
        { label: 'Avance', width: 40, align: 'center', value: (row) => row.avance },
        { label: 'Meta', width: 40, align: 'center', value: (row) => (typeof row.meta === 'number' ? String(row.meta) : '') },
        { label: 'Detalle', width: 148, value: (row) => formatDetailSummary(row) },
        { label: 'Evid.', width: 40, align: 'center', value: (row) => (typeof row.evidencias === 'number' ? String(row.evidencias) : '') },
      ];

  const drawHeader = () => {
    ensureSpace(92);
    const page = getCurrentPage();
    let x = PDF_MARGIN_X;

    page.content.fillRect(PDF_MARGIN_X, page.y - 20, PDF_CONTENT_WIDTH, 20, PDF_DARK_GREEN);
    columns.forEach((column) => {
      page.content.textAt(column.label, x + 5, page.y - 13, 7.4, 'F2', [255, 255, 255]);
      x += column.width;
    });
    page.y -= 20;
  };

  drawHeader();

  rows.forEach((row, rowIndex) => {
    let page = getCurrentPage();
    const wrappedCells = columns.map((column) => wrapPdfLine(column.value(row, report), Math.max(8, Math.floor(column.width / 4.4))));
    const lineCount = Math.max(...wrappedCells.map((cellLines) => cellLines.length));
    const rowHeight = Math.max(24, lineCount * 9.5 + 10);

    if (page.y - rowHeight < PDF_BOTTOM_Y) {
      const nextPage = createPdfReportPage(pages, hasHeaderImage);
      setCurrentPage(nextPage);
      drawHeader();
      page = getCurrentPage();
    }

    let x = PDF_MARGIN_X;
    const fill = rowIndex % 2 === 0 ? [255, 255, 255] as PdfColor : PDF_LIGHT_GRAY;
    page.content.fillRect(PDF_MARGIN_X, page.y - rowHeight, PDF_CONTENT_WIDTH, rowHeight, fill);
    page.content.strokeRect(PDF_MARGIN_X, page.y - rowHeight, PDF_CONTENT_WIDTH, rowHeight, PDF_LINE);

    columns.forEach((column, columnIndex) => {
      const cellLines = wrappedCells[columnIndex];
      const textX = column.align === 'center' ? x + column.width / 2 : x + 5;

      cellLines.slice(0, 3).forEach((line, lineIndex) => {
        page.content.textAt(
          line,
          textX,
          page.y - 12 - lineIndex * 9.5,
          7.1,
          'F1',
          PDF_TEXT,
          column.align ?? 'left'
        );
      });
      x += column.width;
    });

    page.y -= rowHeight;
  });
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
    `Aprobados: ${statusSummary.approved} | En revisión: ${statusSummary.inReview} | Observados: ${statusSummary.observed}`,
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
  const content = new PdfContentBuilder();

  if (hasHeaderImage) {
    content.line('q');
    content.line('520 0 0 72 46 712 cm');
    content.line('/HeaderLogos Do');
    content.line('Q');
  } else {
    content.fillRect(50, 772, 120, 4, PDF_GREEN);
  }

  content.line('BT');
  content.line('/F1 16 Tf');
  content.line(`50 ${titleY} Td`);
  content.text(lines[0] ?? '');
  content.line('/F1 10 Tf');

  lines.slice(1).forEach((line) => {
    content.line('0 -15 Td');
    content.text(line);
  });

  content.line('/F1 9 Tf');
  content.line('0 -24 Td');
  content.text(`Página ${pageNumber} de ${pageCount}`);
  content.line('ET');

  return content.toBytes();
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

class PdfContentBuilder {
  private readonly bytes: number[] = [];

  line(command: string) {
    this.bytes.push(...asciiBytes(command), 0x0a);
  }

  text(value: string) {
    this.bytes.push(...pdfTextLiteralBytes(value), 0x20, 0x54, 0x6a, 0x0a);
  }

  textAt(
    value: string,
    x: number,
    y: number,
    size = 10,
    font: PdfFont = 'F1',
    color: PdfColor = PDF_TEXT,
    align: 'left' | 'center' = 'left'
  ) {
    const normalizedValue = cleanExportText(value);
    const textX = align === 'center'
      ? x - estimatePdfTextWidth(normalizedValue, size) / 2
      : x;

    this.line('BT');
    this.line(`/${font} ${formatPdfNumber(size)} Tf`);
    this.line(`${formatPdfColor(color)} rg`);
    this.line(`${formatPdfNumber(textX)} ${formatPdfNumber(y)} Td`);
    this.text(normalizedValue);
    this.line('ET');
  }

  fillRect(x: number, y: number, width: number, height: number, color: PdfColor) {
    this.line('q');
    this.line(`${formatPdfColor(color)} rg`);
    this.line(`${formatPdfNumber(x)} ${formatPdfNumber(y)} ${formatPdfNumber(width)} ${formatPdfNumber(height)} re f`);
    this.line('Q');
  }

  strokeRect(x: number, y: number, width: number, height: number, color: PdfColor) {
    this.line('q');
    this.line(`${formatPdfColor(color)} RG`);
    this.line('0.5 w');
    this.line(`${formatPdfNumber(x)} ${formatPdfNumber(y)} ${formatPdfNumber(width)} ${formatPdfNumber(height)} re S`);
    this.line('Q');
  }

  strokeLine(x1: number, y1: number, x2: number, y2: number, color: PdfColor) {
    this.line('q');
    this.line(`${formatPdfColor(color)} RG`);
    this.line('0.5 w');
    this.line(`${formatPdfNumber(x1)} ${formatPdfNumber(y1)} m`);
    this.line(`${formatPdfNumber(x2)} ${formatPdfNumber(y2)} l`);
    this.line('S');
    this.line('Q');
  }

  toBytes() {
    return new Uint8Array(this.bytes);
  }
}

function formatPdfNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function formatPdfColor(color: PdfColor) {
  return color.map((value) => (value / 255).toFixed(3).replace(/\.?0+$/, '')).join(' ');
}

function estimatePdfTextWidth(value: string, size: number) {
  return cleanExportText(value).length * size * 0.45;
}

function asciiBytes(value: string) {
  return Array.from(value).map((character) => {
    const code = character.codePointAt(0) ?? 0x20;
    return code <= 0x7f ? code : 0x20;
  });
}

function pdfTextLiteralBytes(value: string) {
  const output = [0x28];

  winAnsiBytes(value).forEach((byte) => {
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) {
      output.push(0x5c, byte);
      return;
    }

    output.push(byte);
  });

  output.push(0x29);
  return output;
}

const cp1252SpecialBytes = new Map<string, number>([
  ['€', 0x80],
  ['‚', 0x82],
  ['ƒ', 0x83],
  ['„', 0x84],
  ['…', 0x85],
  ['†', 0x86],
  ['‡', 0x87],
  ['ˆ', 0x88],
  ['‰', 0x89],
  ['Š', 0x8a],
  ['‹', 0x8b],
  ['Œ', 0x8c],
  ['Ž', 0x8e],
  ['‘', 0x91],
  ['’', 0x92],
  ['“', 0x93],
  ['”', 0x94],
  ['•', 0x95],
  ['–', 0x96],
  ['—', 0x97],
  ['˜', 0x98],
  ['™', 0x99],
  ['š', 0x9a],
  ['›', 0x9b],
  ['œ', 0x9c],
  ['ž', 0x9e],
  ['Ÿ', 0x9f],
]);

function winAnsiBytes(value: string) {
  const normalizedValue = cleanExportText(value);
  const output: number[] = [];

  for (const character of Array.from(normalizedValue)) {
    const code = character.codePointAt(0) ?? 0x20;

    if (code === 0x0a || code === 0x0d || code === 0x09) {
      output.push(0x20);
    } else if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) {
      output.push(code);
    } else if (cp1252SpecialBytes.has(character)) {
      output.push(cp1252SpecialBytes.get(character)!);
    } else {
      const replacement = asciiBytes(stripDiacritics(character));
      output.push(...(replacement.length ? replacement : [0x20]));
    }
  }

  return output;
}

function cleanExportText(value: string) {
  return repairMojibake(value)
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function repairMojibake(value: string) {
  let currentValue = value;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const decodedValue = repairMojibakeOnce(currentValue);

    if (decodedValue === currentValue) {
      return currentValue;
    }

    currentValue = decodedValue;
  }

  return currentValue;
}

function repairMojibakeOnce(value: string) {
  if (!/[\u00c3\u00c2\u00e2\ufffd]/.test(value)) {
    return value;
  }

  const bytes: number[] = [];

  for (const character of Array.from(value)) {
    const code = character.codePointAt(0) ?? 0x20;

    if (code <= 0xff) {
      bytes.push(code);
    } else if (cp1252SpecialBytes.has(character)) {
      bytes.push(cp1252SpecialBytes.get(character)!);
    } else {
      return value;
    }
  }

  const decoded = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  return mojibakeScore(decoded) < mojibakeScore(value) ? decoded : value;
}

function mojibakeScore(value: string) {
  return (value.match(/[\u00c3\u00c2\u00e2\ufffd]/g) ?? []).length;
}

function stripDiacritics(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
    if (word.length > maxLength) {
      if (currentLine) {
        wrappedLines.push(currentLine);
        currentLine = '';
      }

      for (let index = 0; index < word.length; index += maxLength) {
        const chunk = word.slice(index, index + maxLength);

        if (chunk.length === maxLength) {
          wrappedLines.push(chunk);
        } else {
          currentLine = chunk;
        }
      }

      return;
    }

    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxLength) {
      if (currentLine) {
        wrappedLines.push(currentLine);
      }
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

function normalizePdfText(value: string) {
  return cleanExportText(value);
}

function normalizeStatus(value: string) {
  return stripDiacritics(cleanExportText(value)).toLowerCase().replace(/_/g, ' ').trim();
}

function formatStatusLabel(value: string) {
  const status = normalizeStatus(value);

  if (status.includes('aprobado') || status.includes('completo')) {
    return 'Aprobado';
  }

  if (status.includes('revision') || status.includes('enviado')) {
    return 'En revisión';
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
      } else if (status === 'En revisión') {
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
  const rowDetails = formatDetailSummary(dataRow);

  if (rowDetails) {
    details.push(rowDetails);
  }

  if (typeof dataRow.evidencias === 'number' && dataRow.evidencias > 0) {
    details.push(`Evidencias: ${dataRow.evidencias}`);
  }

  if (deadline === 'Atrasado') {
    details.push('Atención: vencido');
  }

  return details.length > 0 ? `  ${details.join(' | ')}` : '';
}
