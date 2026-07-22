import { describe, expect, it } from 'vitest';
import {
  reportBlockingIssues,
  reportExportBlockReason,
  reportToCsv,
  reportToPdfBlob,
  type ExportReport,
} from './reportes';

const sampleReport: ExportReport = {
  tipoReporte: 'plantel',
  vistaReporte: 'avance',
  periodo: '2026-2',
  cicloEscolar: '2025-2026',
  fechaGeneracion: '2026-06-12',
  identidadReporte: {
    tipo: 'Plantel',
    nombre: 'Bachillerato 16',
  },
  scopeSummary: 'Plantel único: Bachillerato 16',
  estadoConteos: {
    total: 1,
    pendientes: 0,
    enRevision: 0,
    observados: 0,
    aprobados: 1,
  },
  indicadores: [
    {
      id: 'concursos-academicos',
      nombre: 'Concursos Acad\u00c3\u0192\u00c2\u00a9micos',
      descripcion: 'Texto interno que no debe dominar el resumen.',
      datos: [
        {
          registro_id: 'registro-1',
          captureId: 1,
          actividad: 'Captura de egresados titulados',
          responsable: 'Responsable academico',
          estado: 'Aprobado',
          avance: '100%',
          plantel: 'Bachillerato 16',
          meta: 100,
          evidencias: 2,
          justificacion: 'Se capturó avance parcial por validación documental.',
          evidenciaNombre: 'evidencia-titulacion.pdf',
          vencimiento: 'en_tiempo',
          capturadoEn: '2026-06-12T10:15:00.000Z',
          actualizadoEn: '2026-06-12T12:20:00.000Z',
          enviadoPor: 'Plantel 16',
          detalle: [
            { campo: 'Mujeres', valor: '12' },
            { campo: 'Hombres', valor: '10' },
            { campo: 'Total', valor: '22' },
            { campo: 'Programa', valor: 'Analista Programador' },
            { campo: 'Observaciones', valor: 'Dato importado y editable' },
            { campo: 'Nota de seguridad', valor: '=SUMA(1,1)' },
          ],
          qualityWarnings: ['Matricula: valor inusualmente alto'],
        },
      ],
    },
  ],
};

function countPdfText(pdfText: string, value: string) {
  return pdfText.split(value).length - 1;
}

function pdfPageCount(pdfText: string) {
  return Number(pdfText.match(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/)?.[1] ?? 0);
}

function pdfPageStreams(pdfText: string) {
  return Array.from(
    pdfText.matchAll(/<< \/Length \d+ >>\r?\nstream\r?\n([\s\S]*?)\r?\nendstream/g),
    (match) => match[1]
  ).filter((stream) => stream.includes('ADPeak SIGI-POA DGEMS'));
}

function expectPdfBodyAboveFooter(pdfText: string) {
  const rectangleBottoms = Array.from(
    pdfText.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) re [fS]/g),
    (match) => Number(match[2])
  );
  const bodyTextBaselines = Array.from(
    pdfText.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) Td\r?\n\(([^\r\n]*)\) Tj/g)
  )
    .filter((match) => !match[3].startsWith('ADPeak SIGI-POA DGEMS'))
    .map((match) => Number(match[2]));

  expect(rectangleBottoms.length).toBeGreaterThan(0);
  expect(bodyTextBaselines.length).toBeGreaterThan(0);
  expect(Math.min(...rectangleBottoms)).toBeGreaterThanOrEqual(58);
  expect(Math.min(...bodyTextBaselines)).toBeGreaterThanOrEqual(58);
}

describe('report exports', () => {
  it('uses readable CSV headers for administrators', () => {
    const csv = reportToCsv(sampleReport);
    const lines = csv.split('\n');
    const header = lines[10];

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(lines[0]).toContain('"Periodo","2026-2"');
    expect(lines[1]).toContain('"Ciclo escolar","2025-2026"');
    expect(lines[2]).toContain('"Fecha de generación"');
    expect(lines[3]).toContain('"Alcance","Plantel único: Bachillerato 16"');
    expect(lines[4]).toContain('"Registros totales","1"');
    expect(lines[8]).toContain('"Aprobados","1"');
    expect(header).not.toContain('"Plantel"');
    expect(header).not.toContain('"Periodo"');
    expect(header).toContain('"Meta"');
    expect(header).toContain('"Justificación"');
    expect(header).toContain('"Evidencia"');
    expect(header).toContain('"Capturado"');
    expect(header).toContain('"Actualizado"');
    expect(header).toContain('"Enviado por"');
    expect(header).toContain('"Alertas"');
    expect(header).toContain('"Bloqueos"');
    expect(header).toContain('"Mujeres"');
    expect(header).toContain('"Observaciones"');
    expect(csv).toContain('"Captura de egresados titulados"');
    expect(csv).toContain('"Dato importado y editable"');
    expect(csv).toContain('"Se capturó avance parcial por validación documental."');
    expect(csv).toContain('"evidencia-titulacion.pdf"');
    expect(csv).toContain('"Plantel 16"');
    expect(csv).toContain('"Matricula: valor inusualmente alto"');
    expect(csv).toContain('"\'=SUMA(1,1)"');
    expect(csv).not.toContain('"=SUMA(1,1)"');
    expect(csv).toContain('"Concursos Académicos"');
    expect(csv).not.toContain('Acad\u00c3\u0192');
    expect(csv).not.toContain('tipo_reporte');
    expect(csv).not.toContain('registro_id');
    expect(csv).not.toContain('identidad_');
  });

  it('builds an executive PDF without internal field names', async () => {
    const pdfBlob = await reportToPdfBlob(sampleReport);
    const pdfText = new TextDecoder('windows-1252').decode(await pdfBlob.arrayBuffer());

    expect(pdfText).toContain('(Resumen) Tj');
    expect(pdfText).toContain('Indicadores evaluados');
    expect(pdfText).toContain('Resumen ejecutivo');
    expect(pdfText).toContain('Detalle filtrado');
    expect(pdfText).toContain('Plantel único');
    expect(pdfText).toContain('(Total registros) Tj');
    expect(pdfText).toContain('(Planteles) Tj');
    expect(pdfText).toContain('(Responsables) Tj');
    expect(pdfText).toContain('(Faltantes) Tj');
    expect(pdfText).toContain('Captura de egresados');
    expect(pdfText).toContain('titulados');
    expect(pdfText).toContain('Programa:');
    expect(pdfText).toContain('Analista Programador');
    expect(pdfText).toContain('Observaciones: Dato');
    expect(pdfText).toContain('importado y editable');
    expect(pdfText).not.toContain('Acad\u00c3\u0192');
    expect(pdfText).not.toContain('sin-id');
    expect(pdfText).not.toContain('registro_id');
    expect(pdfText).not.toContain('tipoReporte');
    expect(pdfText).not.toContain('indicadores[].datos[]');
  });

  it('reconciles stale estadoConteos from canonical indicator rows in CSV and PDF', async () => {
    const staleCountsReport: ExportReport = {
      ...sampleReport,
      estadoConteos: {
        total: 14,
        pendientes: 14,
        enRevision: 0,
        observados: 0,
        aprobados: 0,
      },
    };
    const csv = reportToCsv(staleCountsReport);
    const pdfText = await (await reportToPdfBlob(staleCountsReport)).text();

    expect(csv).toContain('"Registros totales","1"');
    expect(csv).toContain('"Pendientes","0"');
    expect(csv).toContain('"Aprobados","1"');
    expect(pdfText).toContain('(Total registros) Tj');
    expect(pdfText).toContain('(Aprobados) Tj');
    expect(pdfText).not.toContain('(14) Tj');
  });

  it('builds a detailed PDF centered on stored indicator information', async () => {
    const pdfText = await (await reportToPdfBlob({
      ...sampleReport,
      vistaReporte: 'detalle',
    })).text();

    expect(pdfText).toContain('capturada');
    expect(pdfText).not.toContain('Resumen ejecutivo');
    expect(pdfText).toContain('Pendientes 0');
    expect(pdfText).toContain('Aprobados 1');
    expect(pdfText).toContain('(Programa) Tj');
    expect(pdfText).toContain('Analista Programador');
    expect(pdfText).toContain('(Observaciones) Tj');
    expect(pdfText).toContain('importado y editable');
    expect(pdfText).toContain('Justificaci');
    expect(pdfText).toContain('validaci');
    expect(pdfText).toContain('evidencia-titulacion.pdf');
    expect(pdfText).toContain('Capturado');
    expect(pdfText).toContain('Actualizado');
    expect(pdfText).toContain('Enviado por');
    expect(pdfText).toContain('Plantel 16');
  });

  it('blocks CSV and PDF generation when the report contains non-exportable records', async () => {
    const blockedReport: ExportReport = {
      ...sampleReport,
      indicadores: [
        {
          ...sampleReport.indicadores[0],
          datos: [
            {
              ...sampleReport.indicadores[0].datos[0],
              exportable: false,
              blockingIssues: ['El registro es un borrador y no puede exportarse como reporte oficial.'],
            },
          ],
        },
      ],
    };

    expect(reportBlockingIssues(blockedReport)[0]).toContain('borrador');
    expect(() => reportToCsv(blockedReport)).toThrow(/requiere corrección/);
    await expect(reportToPdfBlob(blockedReport)).rejects.toThrow(/requiere corrección/);
  });

  it('rejects empty scoped data consistently for CSV and PDF exports', async () => {
    const emptyReport: ExportReport = {
      ...sampleReport,
      estadoConteos: {
        total: 0,
        pendientes: 0,
        enRevision: 0,
        observados: 0,
        aprobados: 0,
      },
      indicadores: sampleReport.indicadores.map((indicator) => ({
        ...indicator,
        datos: [],
      })),
    };

    const reason = 'No hay registros capturados para el alcance seleccionado.';

    expect(reportExportBlockReason(emptyReport)).toBe(reason);
    expect(() => reportToCsv(emptyReport)).toThrow(`No se puede generar el archivo: ${reason}`);
    await expect(reportToPdfBlob(emptyReport)).rejects.toThrow(`No se puede generar el archivo: ${reason}`);
  });

  it('treats synthetic progress rows without capture IDs as no captured data', () => {
    const progressOnlyReport: ExportReport = {
      ...sampleReport,
      vistaReporte: 'avance',
      indicadores: sampleReport.indicadores.map((indicator) => ({
        ...indicator,
        datos: indicator.datos.map(({ captureId: _captureId, ...row }) => ({
          ...row,
          exportable: false,
          blockingIssues: ['No hay registros capturados para este indicador.'],
        })),
      })),
    };

    expect(reportExportBlockReason(progressOnlyReport)).toBe(
      'No hay registros capturados para el alcance seleccionado.'
    );
  });

  it('wraps long PDF indicator titles instead of drawing them as one overflowing line', async () => {
    const longTitle = 'Indicador de seguimiento academico institucional para evaluar permanencia y acompanamiento integral de estudiantes de media superior';
    const pdfText = await (await reportToPdfBlob({
      ...sampleReport,
      indicadores: [
        {
          ...sampleReport.indicadores[0],
          nombre: longTitle,
          descripcion: longTitle,
        },
      ],
    })).text();

    expect(pdfText).not.toContain(`(${longTitle}) Tj`);
    expect(pdfText).toContain('(Indicador de seguimiento academico institucional para evaluar permanencia y) Tj');
    expect(pdfText).toContain('(acompanamiento integral de estudiantes de media superior) Tj');
  });

  it('splits tall summary rows across pages without crossing the PDF footer', async () => {
    const longObservation = `OBSERVACION_AVANCE_INICIO ${'contenido de observacion verificable '.repeat(220)} OBSERVACION_AVANCE_FIN`;
    const pdfText = await (await reportToPdfBlob({
      ...sampleReport,
      indicadores: sampleReport.indicadores.map((indicator) => ({
        ...indicator,
        datos: indicator.datos.map((row) => ({
          ...row,
          detalle: [{ campo: 'Observaciones', valor: longObservation }],
        })),
      })),
    })).text();
    const activityHeaderCount = countPdfText(pdfText, '(Actividad) Tj');

    expect(pdfPageCount(pdfText)).toBeGreaterThan(2);
    expect(pdfText).toContain('OBSERVACION_AVANCE_INICIO');
    expect(pdfText).toContain('OBSERVACION_AVANCE_FIN');
    expect(activityHeaderCount).toBeGreaterThan(1);
    expect(countPdfText(pdfText, 'Indicador:')).toBe(activityHeaderCount - 1);
    expectPdfBodyAboveFooter(pdfText);
  });

  it('paginates long justifications and detail values while preserving record context', async () => {
    const longJustification = `JUSTIFICACION_INICIO ${'justificacion documental extensa '.repeat(240)} JUSTIFICACION_FIN`;
    const longObservation = `OBSERVACION_DETALLE_INICIO ${'observacion capturada extensa '.repeat(180)} OBSERVACION_DETALLE_FIN`;
    const longDetail = `DETALLE_OPERATIVO_INICIO ${'detalle operativo verificable '.repeat(180)} DETALLE_OPERATIVO_FIN`;
    const sourceRow = sampleReport.indicadores[0].datos[0];
    const pdfText = await (await reportToPdfBlob({
      ...sampleReport,
      vistaReporte: 'detalle',
      estadoConteos: {
        total: 2,
        pendientes: 0,
        enRevision: 0,
        observados: 0,
        aprobados: 2,
      },
      indicadores: [
        {
          ...sampleReport.indicadores[0],
          datos: [
            {
              ...sourceRow,
              justificacion: longJustification,
              detalle: [
                { campo: 'Observaciones', valor: longObservation },
                { campo: 'Detalle operativo', valor: longDetail },
              ],
            },
            {
              ...sourceRow,
              registro_id: 'registro-2',
              captureId: 2,
              actividad: 'Segundo registro de control',
              detalle: [
                { campo: 'Observaciones', valor: 'Sin observaciones adicionales' },
                { campo: 'Detalle operativo', valor: 'Control completado' },
              ],
            },
          ],
        },
      ],
    })).text();

    expect(pdfPageCount(pdfText)).toBeGreaterThan(2);
    expect(pdfPageCount(pdfText)).toBeLessThan(18);
    expect(pdfText).toContain('JUSTIFICACION_INICIO');
    expect(pdfText).toContain('JUSTIFICACION_FIN');
    expect(countPdfText(pdfText, 'OBSERVACION_DETALLE_FIN')).toBe(1);
    expect(countPdfText(pdfText, 'DETALLE_OPERATIVO_FIN')).toBe(1);
    expect(pdfText).toContain('Justificaci');
    expect(countPdfText(pdfText, '\\(continuaci')).toBeGreaterThan(2);
    expect(pdfText).toContain('Tabla comparativa');
    expectPdfBodyAboveFooter(pdfText);
  });

  it('keeps every CSV detail field in a compact multi-row PDF without duplicating values', async () => {
    const rows = Array.from({ length: 18 }, (_, rowIndex) => ({
      ...sampleReport.indicadores[0].datos[0],
      registro_id: `registro-${rowIndex + 1}`,
      captureId: rowIndex + 1,
      actividad: `Actividad ${rowIndex + 1}`,
      detalle: Array.from({ length: 18 }, (_unused, detailIndex) => ({
        campo: `Campo ${detailIndex + 1}`,
        valor: `VALOR_${rowIndex + 1}_${detailIndex + 1}`,
      })),
    }));
    const wideReport: ExportReport = {
      ...sampleReport,
      vistaReporte: 'detalle',
      indicadores: [{ ...sampleReport.indicadores[0], datos: rows }],
    };
    const csv = reportToCsv(wideReport);
    const pdfText = await (await reportToPdfBlob(wideReport)).text();
    const pageStreams = pdfPageStreams(pdfText);

    expect(pdfPageCount(pdfText)).toBeLessThan(30);
    expect(pageStreams).toHaveLength(pdfPageCount(pdfText));
    expect(pageStreams.at(-1)).toContain('(VALOR_18_18) Tj');
    rows.forEach((row) => {
      row.detalle.forEach(({ campo, valor }) => {
        expect(csv).toContain(`"${campo}"`);
        expect(csv).toContain(`"${valor}"`);
        expect(countPdfText(pdfText, `(${valor}) Tj`)).toBe(1);
      });
    });
    expectPdfBodyAboveFooter(pdfText);
  });

  it('keeps PDF generation usable and exposes explicit feedback when logos cannot load', async () => {
    const pdfText = await (await reportToPdfBlob(sampleReport)).text();

    expect(pdfText).toContain('Aviso: no fue posible incorporar los logotipos oficiales.');
  });
});
