import { describe, expect, it } from 'vitest';
import {
  buildTemplateColumns,
  configColumnsFromTemplate,
  duplicateSelection,
  FIELD_EDITOR_PRIMARY_GRID,
  shouldPersistTemplateStructure,
  supportsNumericValidation,
  templateColumnsFingerprint,
} from './IndicatorConfigForm';
import type { ColumnConfig } from './formConfig';

describe('IndicatorConfigForm field editor layout', () => {
  it('uses stable responsive grid tracks for the primary controls', () => {
    expect(FIELD_EDITOR_PRIMARY_GRID).toContain('md:grid-cols-[minmax(0,1fr)_220px]');
    expect(FIELD_EDITOR_PRIMARY_GRID).not.toContain('flex-row');
  });

  it('shows numeric validation only for editable number fields', () => {
    expect(supportsNumericValidation('number')).toBe(true);
    expect(supportsNumericValidation('readonly')).toBe(false);
    expect(supportsNumericValidation('text')).toBe(false);
    expect(supportsNumericValidation('calculated')).toBe(false);
  });

  it('round-trips formulas through unambiguous keys and preserves decimals', () => {
    const officialColumns: ColumnConfig[] = [
      { key: 'mujeres_2025', label: 'Total', type: 'number', validation: { min: 0, integer: true } },
      { key: 'hombres_2025', label: 'Total', type: 'number', validation: { min: 0, integer: true } },
      {
        key: 'egresados_total',
        label: 'Total',
        type: 'calculated',
        calculation: { type: 'sum', sourceKeys: ['mujeres_2025', 'hombres_2025'] },
      },
      {
        key: 'porcentaje_titulacion',
        label: '% de titulación',
        type: 'calculated',
        validation: { min: 0, max: 100 },
        calculation: {
          type: 'percentage',
          numeratorKey: 'egresados_total',
          denominatorKey: 'matricula_total',
          decimals: 4,
        },
      },
      { key: 'matricula_total', label: 'Total', type: 'number', validation: { min: 0, integer: true } },
    ];
    const configured = configColumnsFromTemplate(officialColumns);
    const result = buildTemplateColumns(configured);

    expect(configured[2].formula).toBe('=[mujeres_2025] + [hombres_2025]');
    expect(configured[3].formula).toBe('=[egresados_total] / [matricula_total] * 100');
    expect(result.error).toBe('');
    expect(result.columns[2].calculation).toEqual(officialColumns[2].calculation);
    expect(result.columns[3].calculation).toEqual(officialColumns[3].calculation);
    expect(result.columns[3].validation).toEqual(officialColumns[3].validation);
    expect(templateColumnsFingerprint(result.columns)).toBe(templateColumnsFingerprint(officialColumns));
    expect(shouldPersistTemplateStructure(
      false,
      result.columns,
      templateColumnsFingerprint(officialColumns)
    )).toBe(false);

    const changedColumns = result.columns.map((column) =>
      column.key === 'egresados_total' ? { ...column, label: 'Total modificado' } : column
    );
    expect(shouldPersistTemplateStructure(
      false,
      changedColumns,
      templateColumnsFingerprint(officialColumns)
    )).toBe(true);
  });

  it('detects duplicate responsible selections before normalization', () => {
    expect(duplicateSelection(['Adriana Ruiz Rivera', 'Adriana Ruiz Rivera'])).toBe('Adriana Ruiz Rivera');
    expect(duplicateSelection(['Adriana Ruiz Rivera', 'Ángel Ordóñez'])).toBe('');
  });
});
