import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';

describe('Input accessibility', () => {
  it('links an error message and marks the input invalid', () => {
    const markup = renderToStaticMarkup(
      <Input
        id="email"
        label="Email"
        error="Email is required"
        aria-describedby="email-hint"
      />
    );

    expect(markup).toContain('aria-describedby="email-hint email-error"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('id="email-error"');
    expect(markup).toContain('Email is required');
  });

  it('preserves caller-provided ARIA state when there is no error', () => {
    const markup = renderToStaticMarkup(
      <Input
        id="name"
        label="Name"
        aria-describedby="name-hint"
        aria-invalid="grammar"
      />
    );

    expect(markup).toContain('aria-describedby="name-hint"');
    expect(markup).toContain('aria-invalid="grammar"');
    expect(markup).not.toContain('id="name-error"');
  });
});
