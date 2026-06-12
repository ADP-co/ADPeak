import { describe, expect, it } from 'vitest';
import { reportToCsv, reportToPdfBlob, type ExportReport } from './reportes';

const sampleReport: ExportReport = {
  tipoReporte: 'plantel',
  periodo: '2026-2',
  cicloEscolar: '2025-2026',
  fechaGeneracion: '2026-06-12',
  identidadReporte: {
    tipo: 'Plantel',
    nombre: 'Bachillerato 16',
  },
  indicadores: [
    {
      nombre: 'Porcentaje de titulacion por cohorte del NMS',
      descripcion: 'Texto interno que no debe dominar el resumen.',
      datos: [
        {
          actividad: 'Captura de egresados titulados',
          responsable: 'Responsable academico',
          estado: 'Aprobado',
          avance: '100%',
          plantel: 'Bachillerato 16',
          evidencias: 2,
          vencimiento: 'en_tiempo',
        },
      ],
    },
  ],
};

describe('report exports', () => {
  it('uses readable CSV headers for administrators', () => {
    const csv = reportToCsv(sampleReport);

    expect(csv).toContain('"Periodo","Ciclo escolar","Fecha de generacion"');
    expect(csv).toContain('"Captura de egresados titulados"');
    expect(csv).not.toContain('tipo_reporte');
    expect(csv).not.toContain('registro_id');
    expect(csv).not.toContain('identidad_');
  });

  it('builds an executive PDF without internal field names', async () => {
    const pdfText = await reportToPdfBlob(sampleReport).text();

    expect(pdfText).toContain('Resumen ejecutivo de indicadores');
    expect(pdfText).toContain('Captura de egresados titulados');
    expect(pdfText).not.toContain('sin-id');
    expect(pdfText).not.toContain('registro_id');
    expect(pdfText).not.toContain('tipoReporte');
    expect(pdfText).not.toContain('indicadores[].datos[]');
  });
});
