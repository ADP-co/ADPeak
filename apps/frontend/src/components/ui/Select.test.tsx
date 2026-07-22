import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Select } from './Select';

describe('Select accessibility', () => {
  it('links an error to the select and exposes the invalid state', () => {
    const markup = renderToStaticMarkup(
      <Select
        id="status"
        label="Estado"
        options={[{ value: 'activo', label: 'Activo' }]}
        error="Selecciona un estado"
        aria-describedby="status-hint"
      />
    );

    expect(markup).toContain('aria-describedby="status-hint status-error"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('id="status-error"');
    expect(markup).toContain('role="alert"');
  });
});
