import { describe, expect, it } from 'vitest';
import { FIELD_EDITOR_PRIMARY_GRID, supportsNumericValidation } from './IndicatorConfigForm';

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
});
