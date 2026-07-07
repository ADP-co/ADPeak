import { describe, expect, it } from 'vitest';
import { reportBlockingIssues, reportToCsv, reportToPdfBlob, type ExportReport } from './reportes';

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
  scopeSummary: 'Plantel unico: Bachillerato 16',
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

describe('report exports', () => {
  it('uses readable CSV headers for administrators', () => {
    const csv = reportToCsv(sampleReport);
    const lines = csv.split('\n');
    const header = lines[10];

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(lines[0]).toContain('"Periodo","2026-2"');
    expect(lines[1]).toContain('"Ciclo escolar","2025-2026"');
    expect(lines[2]).toContain('"Fecha de generación"');
    expect(lines[3]).toContain('"Alcance","Plantel unico: Bachillerato 16"');
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
    const pdfText = await (await reportToPdfBlob(sampleReport)).text();

    expect(pdfText).toContain('(Resumen) Tj');
    expect(pdfText).toContain('Indicadores evaluados');
    expect(pdfText).toContain('Resumen ejecutivo');
    expect(pdfText).toContain('Detalle filtrado');
    expect(pdfText).toContain('Plantel unico');
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
    expect(() => reportToCsv(blockedReport)).toThrow(/requieren corrección/);
    await expect(reportToPdfBlob(blockedReport)).rejects.toThrow(/requieren corrección/);
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
});
