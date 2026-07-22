import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button accessibility and form safety', () => {
  it('defaults to a non-submitting button with a visible focus treatment', () => {
    const markup = renderToStaticMarkup(<Button>Guardar</Button>);

    expect(markup).toContain('type="button"');
    expect(markup).toContain('min-h-11');
    expect(markup).toContain('focus-visible:ring-2');
  });

  it('keeps an explicit submit type', () => {
    const markup = renderToStaticMarkup(<Button type="submit">Ingresar</Button>);

    expect(markup).toContain('type="submit"');
  });
});
