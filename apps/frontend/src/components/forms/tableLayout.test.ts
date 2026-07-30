import { describe, expect, it } from 'vitest';
import { officialWorkbookTemplates } from '../../catalog/officialData.generated';
import type { ColumnConfig, HeaderCellConfig } from './formConfig';
import {
  headerLayoutIsValid,
  normalizedHeaderRows,
  tableMinimumWidth,
} from './tableLayout';

describe('indicator table layout', () => {
  it('repairs grouped Excel headers that overlap their subcolumns', () => {
    const rows: HeaderCellConfig[][] = [
      [
        { label: 'Plantel', rowspan: 2 },
        { label: 'Programa Educativo', rowspan: 2 },
        { label: 'Egresados', colspan: 3, rowspan: 2 },
        { label: 'MatrÃ­cula', colspan: 3, rowspan: 2 },
        { label: '% titulaciÃ³n', rowspan: 2 },
      ],
      [
        { label: 'Mujeres' },
        { label: 'Hombres' },
        { label: 'Total' },
        { label: 'Mujeres' },
        { label: 'Hombres' },
        { label: 'Total' },
      ],
    ];

    const repaired = normalizedHeaderRows(rows, 9);

    expect(headerLayoutIsValid(repaired, 9)).toBe(true);
    expect(repaired[0][2].rowspan).toBeUndefined();
    expect(repaired[0][3].rowspan).toBeUndefined();
    expect(repaired[0][0].rowspan).toBe(2);
    expect(repaired[0][4].rowspan).toBe(2);
  });

  it('falls back to column labels when grouped geometry cannot be repaired safely', () => {
    expect(normalizedHeaderRows([[{ label: 'Grupo', colspan: 8 }]], 3)).toEqual([]);
  });

  it('keeps enough intrinsic width for readable numeric columns', () => {
    const columns: ColumnConfig[] = [
      { key: 'plantel', label: 'Plantel', type: 'readonly' },
      { key: 'programa', label: 'Programa Educativo', type: 'text' },
      ...Array.from({ length: 6 }, (_, index) => ({
        key: `valor_${index}`,
        label: `Valor ${index}`,
        type: 'number' as const,
      })),
      { key: 'total', label: 'Total', type: 'calculated' },
    ];

    expect(tableMinimumWidth(columns)).toBeGreaterThan(1200);
  });

  it('keeps every imported official template within its declared columns', () => {
    Object.values(officialWorkbookTemplates).forEach((template) => {
      const rows = normalizedHeaderRows(
        (template.headerRows ?? []) as HeaderCellConfig[][],
        template.columns.length
      );

      if (rows.length > 0) {
        expect(headerLayoutIsValid(rows, template.columns.length), template.indicatorCode).toBe(true);
      }

      expect(
        tableMinimumWidth(template.columns as ColumnConfig[]),
        template.indicatorCode
      ).toBeGreaterThanOrEqual(720);
    });
  });
});
