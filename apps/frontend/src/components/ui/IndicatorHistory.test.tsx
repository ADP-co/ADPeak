import { describe, expect, it } from 'vitest';
import { historyViewForKey, isDirectorAuditRole, safeAuditJson } from './IndicatorHistory';

describe('IndicatorHistory audit safety', () => {
  it('selects the forensic audit only for Director UI roles', () => {
    expect(isDirectorAuditRole('admin')).toBe(true);
    expect(isDirectorAuditRole('director')).toBe(true);
    expect(isDirectorAuditRole('responsable')).toBe(false);
    expect(isDirectorAuditRole('plantel')).toBe(false);
    expect(isDirectorAuditRole(undefined)).toBe(false);
  });

  it('redacts sensitive values before rendering expandable audit JSON', () => {
    const rendered = safeAuditJson({
      safe: 'visible',
      password: 'plain-password',
      passwordHash: 'private-hash',
      token: 'private-token',
      headers: {
        authorization: 'Bearer private-authorization',
        cookie: 'session=private-cookie',
      },
      evidencia: {
        storageRef: 'private/evidence.pdf',
        contenidoBase64: 'cHJpdmF0ZS1ldmlkZW5jZQ==',
        preview: 'data:application/pdf;base64,private-data',
      },
    });

    expect(rendered).toContain('"safe": "visible"');
    expect(rendered).toContain('"preview": "[omitido]"');
    expect(rendered).not.toMatch(/plain-password|private-hash|private-token|private-authorization|private-cookie|private\/evidence|private-data/);
    expect(rendered).not.toMatch(/passwordHash|authorization|cookie|storageRef|contenidoBase64/);
  });

  it('supports arrow, Home and End navigation for the history tabs', () => {
    expect(historyViewForKey('indicators', 'ArrowRight')).toBe('audit');
    expect(historyViewForKey('audit', 'ArrowLeft')).toBe('indicators');
    expect(historyViewForKey('audit', 'Home')).toBe('indicators');
    expect(historyViewForKey('indicators', 'End')).toBe('audit');
    expect(historyViewForKey('indicators', 'Enter')).toBeNull();
  });
});
