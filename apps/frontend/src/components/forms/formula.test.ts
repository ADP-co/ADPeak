import { describe, expect, it } from 'vitest';
import { evaluateFormula, validateFormulaExpression } from './formula';
import type { ColumnConfig } from './formConfig';

const columns: ColumnConfig[] = [
  { key: 'mujeres', label: 'Mujeres', type: 'number' },
  { key: 'hombres', label: 'Hombres', type: 'number' },
  { key: 'meta_anual', label: 'Meta anual', type: 'number' },
  { key: 'total', label: 'Total', type: 'calculated', calculation: { type: 'formula', expression: '=Mujeres + Hombres' } },
];

describe('formula evaluator', () => {
  it('evaluates Excel-style arithmetic formulas with labels', () => {
    expect(evaluateFormula('=Mujeres + Hombres', { mujeres: 7, hombres: 5 }, columns)).toBe(12);
    expect(evaluateFormula('=[Meta anual] / SUMA(Mujeres; Hombres) * 100', {
      mujeres: 25,
      hombres: 25,
      meta_anual: 10,
    }, columns)).toBe(20);
  });

  it('validates missing references before saving configuration', () => {
    expect(validateFormulaExpression('=Mujeres + Hombres', columns, 'total')).toBe('');
    expect(validateFormulaExpression('=Mujeres + Becarios', columns, 'total')).toContain('Becarios');
  });
});
