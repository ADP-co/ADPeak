import { describe, expect, it } from 'vitest';
import type { ColumnConfig } from './formConfig';
import { __indicatorFormTestUtils } from './IndicatorForm';
import { officialWorkbookTemplates } from '../../catalog/officialData.generated';

const titulationColumns: ColumnConfig[] = [
  {
    key: 'egresados_titulados_en_el_ano_2025_mujeres',
    label: 'Egresados titulados en el año 2025 Mujeres',
    type: 'number',
  },
  {
    key: 'egresados_titulados_en_el_ano_2025_hombres',
    label: 'Egresados titulados en el año 2025 Hombres',
    type: 'number',
  },
  {
    key: 'egresados_titulados_en_el_ano_2025_total',
    label: 'Egresados titulados en el año 2025 Total',
    type: 'calculated',
    calculation: {
      type: 'sum',
      sourceKeys: [
        'egresados_titulados_en_el_ano_2025_mujeres',
        'egresados_titulados_en_el_ano_2025_hombres',
      ],
    },
  },
  {
    key: 'matricula_de_primer_ingreso_de_la_misma_cohorte_',
    label: 'Matrícula de primer ingreso de la misma cohorte Mujeres',
    type: 'number',
  },
  {
    key: 'matricula_de_primer_ingreso_de_la_misma_cohorte_2',
    label: 'Matrícula de primer ingreso de la misma cohorte Hombres',
    type: 'number',
  },
  {
    key: 'matricula_de_primer_ingreso_de_la_misma_cohorte_3',
    label: 'Matrícula de primer ingreso de la misma cohorte Total',
    type: 'calculated',
    calculation: {
      type: 'sum',
      sourceKeys: [
        'matricula_de_primer_ingreso_de_la_misma_cohorte_',
        'matricula_de_primer_ingreso_de_la_misma_cohorte_2',
      ],
    },
  },
  {
    key: 'de_titulacion_por_cohorte',
    label: '% de titulación por cohorte',
    type: 'calculated',
    calculation: {
      type: 'percentage',
      numeratorKey: 'egresados_titulados_en_el_ano_2025_total',
      denominatorKey: 'matricula_de_primer_ingreso_de_la_misma_cohorte_3',
      decimals: 2,
    },
  },
];

describe('IndicatorForm calculation helpers', () => {
  it('aggregates official titulation totals from source columns', () => {
    const rows = [
      {
        egresados_titulados_en_el_ano_2025_mujeres: 12,
        egresados_titulados_en_el_ano_2025_hombres: 4,
        egresados_titulados_en_el_ano_2025_total: 0,
        matricula_de_primer_ingreso_de_la_misma_cohorte_: 20,
        matricula_de_primer_ingreso_de_la_misma_cohorte_2: 10,
        matricula_de_primer_ingreso_de_la_misma_cohorte_3: 0,
      },
    ];

    expect(__indicatorFormTestUtils.totalForColumn(rows, titulationColumns[2], titulationColumns)).toBe('16');
    expect(__indicatorFormTestUtils.totalForColumn(rows, titulationColumns[5], titulationColumns)).toBe('30');
    expect(__indicatorFormTestUtils.totalForColumn(rows, titulationColumns[6], titulationColumns)).toBe('53.33');
  });

  it('aggregates the imported official titulation template without relying on generic keys', () => {
    const officialColumns = officialWorkbookTemplates['1.0.0.0.2'].columns;
    const row = {
      egresados_titulados_en_el_ano_2025_mujeres: 12,
      egresados_titulados_en_el_ano_2025_hombres: 4,
      egresados_titulados_en_el_ano_2025_total: 0,
      matricula_de_primer_ingreso_de_la_misma_cohorte_: 20,
      matricula_de_primer_ingreso_de_la_misma_cohorte__2: 10,
      matricula_de_primer_ingreso_de_la_misma_cohorte__3: 0,
      de_titulacion_por_cohorte: 0,
    };
    const egresadosTotal = officialColumns.find((column) => column.key === 'egresados_titulados_en_el_ano_2025_total');
    const matriculaTotal = officialColumns.find((column) => column.key === 'matricula_de_primer_ingreso_de_la_misma_cohorte__3');
    const porcentaje = officialColumns.find((column) => column.key === 'de_titulacion_por_cohorte');

    expect(egresadosTotal).toBeDefined();
    expect(matriculaTotal).toBeDefined();
    expect(porcentaje).toBeDefined();
    expect(__indicatorFormTestUtils.enrichRowWithCalculatedValues(row, officialColumns).egresados_titulados_en_el_ano_2025_total).toBe(16);
    expect(__indicatorFormTestUtils.enrichRowWithCalculatedValues(row, officialColumns).matricula_de_primer_ingreso_de_la_misma_cohorte__3).toBe(30);
    expect(__indicatorFormTestUtils.enrichRowWithCalculatedValues(row, officialColumns).de_titulacion_por_cohorte).toBe(53.33);
    expect(__indicatorFormTestUtils.totalForColumn([row], egresadosTotal!, officialColumns)).toBe('16');
    expect(__indicatorFormTestUtils.totalForColumn([row], matriculaTotal!, officialColumns)).toBe('30');
    expect(__indicatorFormTestUtils.totalForColumn([row], porcentaje!, officialColumns)).toBe('53.33');
  });

  it('blocks invalid integers but allows valid percentage decimals', () => {
    const ptcColumn: ColumnConfig = { key: 'ptc', label: 'PTC', type: 'number' };
    const tasaColumn: ColumnConfig = { key: 'tasa_de_reprobacion', label: 'Tasa de reprobación', type: 'number' };
    const ptcValidation = __indicatorFormTestUtils.numericValidationForColumn(ptcColumn);
    const tasaValidation = __indicatorFormTestUtils.numericValidationForColumn(tasaColumn);

    expect(ptcValidation).toMatchObject({ min: 0, integer: true });
    expect(tasaValidation).toMatchObject({ min: 0, max: 100, integer: false });
    expect(__indicatorFormTestUtils.normalizeNumberInputValue('-3', ptcValidation)).toBe('');
    expect(__indicatorFormTestUtils.normalizeNumberInputValue('3.5', ptcValidation)).toBe('');
    expect(__indicatorFormTestUtils.normalizeNumberInputValue('7.8', tasaValidation)).toBe('7.8');
    expect(__indicatorFormTestUtils.normalizeNumberInputValue('120', tasaValidation)).toBe('100');
  });
});
