import { describe, expect, it } from 'vitest';
import type { ColumnConfig } from './formConfig';
import { __indicatorFormTestUtils } from './IndicatorForm';

const { planIndicatorPaste } = __indicatorFormTestUtils;

describe('IndicatorForm TSV paste helpers', () => {
  it('distributes tab and newline cells from the selected editable cell', () => {
    const columns: ColumnConfig[] = [
      { key: 'cantidad', label: 'Cantidad', type: 'number' },
      { key: 'detalle', label: 'Detalle', type: 'text' },
    ];
    const result = planIndicatorPaste({
      clipboardText: '12\tPrimera fila\r\n8\tSegunda fila\r\n',
      startRowIndex: 0,
      startColumnKey: 'cantidad',
      columns,
      rows: [
        { cantidad: '', detalle: '' },
        { cantidad: '', detalle: '' },
      ],
      canAddRows: false,
      isReadOnly: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.rows).toEqual([
      { cantidad: '12', detalle: 'Primera fila' },
      { cantidad: '8', detalle: 'Segunda fila' },
    ]);
    expect(result.addedRows).toBe(0);
  });

  it('skips readonly and calculated columns while preserving their values', () => {
    const columns: ColumnConfig[] = [
      { key: 'plantel', label: 'Plantel', type: 'readonly' },
      { key: 'mujeres', label: 'Mujeres', type: 'number' },
      {
        key: 'total',
        label: 'Total',
        type: 'calculated',
        calculation: { type: 'sum', sourceKeys: ['mujeres', 'hombres'] },
      },
      { key: 'hombres', label: 'Hombres', type: 'number' },
      { key: 'observacion', label: 'Observacion', type: 'text' },
    ];
    const result = planIndicatorPaste({
      clipboardText: '3\t4\tDato pegado',
      startRowIndex: 0,
      startColumnKey: 'mujeres',
      columns,
      rows: [{ plantel: 'Plantel 01', mujeres: '', total: 99, hombres: '', observacion: '' }],
      canAddRows: false,
      isReadOnly: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.rows[0]).toEqual({
      plantel: 'Plantel 01',
      mujeres: '3',
      total: 99,
      hombres: '4',
      observacion: 'Dato pegado',
    });
  });

  it('rejects row overflow atomically when adding rows is not allowed', () => {
    const columns: ColumnConfig[] = [{ key: 'cantidad', label: 'Cantidad', type: 'number' }];
    const rows = [{ cantidad: '7' }];
    const result = planIndicatorPaste({
      clipboardText: '10\n11',
      startRowIndex: 0,
      startColumnKey: 'cantidad',
      columns,
      rows,
      canAddRows: false,
      isReadOnly: false,
    });

    expect(result).toMatchObject({ ok: false, reason: 'overflow' });
    expect(rows).toEqual([{ cantidad: '7' }]);
  });

  it('rejects column overflow without wrapping cells into another row', () => {
    const columns: ColumnConfig[] = [
      { key: 'cantidad', label: 'Cantidad', type: 'number' },
      { key: 'total', label: 'Total', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['cantidad'] } },
    ];
    const rows = [{ cantidad: '7', total: 7 }];
    const result = planIndicatorPaste({
      clipboardText: '10\t11',
      startRowIndex: 0,
      startColumnKey: 'cantidad',
      columns,
      rows,
      canAddRows: true,
      isReadOnly: false,
    });

    expect(result).toMatchObject({ ok: false, reason: 'overflow' });
    expect(rows).toEqual([{ cantidad: '7', total: 7 }]);
  });

  it('adds only the rows required when row creation is allowed', () => {
    const columns: ColumnConfig[] = [
      { key: 'plantel', label: 'Plantel', type: 'readonly' },
      { key: 'cantidad', label: 'Cantidad', type: 'number' },
    ];
    const result = planIndicatorPaste({
      clipboardText: '10\n11',
      startRowIndex: 0,
      startColumnKey: 'cantidad',
      columns,
      rows: [{ plantel: 'Plantel 01', cantidad: '' }],
      canAddRows: true,
      isReadOnly: false,
      createRow: () => ({ plantel: 'Plantel 01', cantidad: '' }),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.addedRows).toBe(1);
    expect(result.rows).toEqual([
      { plantel: 'Plantel 01', cantidad: '10' },
      { plantel: 'Plantel 01', cantidad: '11' },
    ]);
  });

  it('rejects an invalid numeric cell without applying earlier cells', () => {
    const columns: ColumnConfig[] = [
      { key: 'mujeres', label: 'Mujeres', type: 'number' },
      { key: 'hombres', label: 'Hombres', type: 'number' },
    ];
    const rows = [{ mujeres: '1', hombres: '2' }];
    const result = planIndicatorPaste({
      clipboardText: '5\tno-es-numero',
      startRowIndex: 0,
      startColumnKey: 'mujeres',
      columns,
      rows,
      canAddRows: false,
      isReadOnly: false,
    });

    expect(result).toMatchObject({ ok: false, reason: 'invalid' });
    if (!result.ok && result.reason !== 'read_only') {
      expect(result.message).toContain('Hombres');
    }
    expect(rows).toEqual([{ mujeres: '1', hombres: '2' }]);
  });

  it('normalizes comma decimals only for columns that permit decimals', () => {
    const decimalColumn: ColumnConfig = {
      key: 'tasa',
      label: 'Tasa',
      type: 'number',
      validation: { integer: false, max: 100, decimals: 2 },
    };
    const accepted = planIndicatorPaste({
      clipboardText: '12,5',
      startRowIndex: 0,
      startColumnKey: 'tasa',
      columns: [decimalColumn],
      rows: [{ tasa: '' }],
      canAddRows: false,
      isReadOnly: false,
    });

    expect(accepted.ok).toBe(true);
    if (accepted.ok) {
      expect(accepted.rows[0].tasa).toBe('12.5');
    }

    const integerRows = [{ cantidad: '9' }];
    const rejected = planIndicatorPaste({
      clipboardText: '12,5',
      startRowIndex: 0,
      startColumnKey: 'cantidad',
      columns: [{ key: 'cantidad', label: 'Cantidad', type: 'number' }],
      rows: integerRows,
      canAddRows: false,
      isReadOnly: false,
    });

    expect(rejected).toMatchObject({ ok: false, reason: 'invalid' });
    expect(integerRows).toEqual([{ cantidad: '9' }]);
  });

  it('does not produce changes in read-only mode', () => {
    const rows = [{ cantidad: '4' }];
    const result = planIndicatorPaste({
      clipboardText: '20',
      startRowIndex: 0,
      startColumnKey: 'cantidad',
      columns: [{ key: 'cantidad', label: 'Cantidad', type: 'number' }],
      rows,
      canAddRows: true,
      isReadOnly: true,
    });

    expect(result).toEqual({ ok: false, reason: 'read_only' });
    expect(rows).toEqual([{ cantidad: '4' }]);
  });
});
