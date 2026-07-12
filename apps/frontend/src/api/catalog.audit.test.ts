import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiJsonMock } = vi.hoisted(() => ({
  apiJsonMock: vi.fn(),
}));

vi.mock('./client', () => ({
  API_REQUESTS_ENABLED: true,
  apiJson: apiJsonMock,
}));

import { fetchAuditEvents, type AuditEvent } from './catalog';

describe('audit catalog API', () => {
  beforeEach(() => {
    apiJsonMock.mockReset();
  });

  it('fetches the sanitized audit collection from the dedicated route', async () => {
    const events: AuditEvent[] = [{
      id: 2,
      userId: 'director-1',
      role: 'director',
      action: 'capture_approved',
      resourceType: 'capture',
      resourceId: '19',
      before: { estado: 'en_revision' },
      after: { estado: 'aprobado' },
      status: 'ok',
      createdAt: '2026-07-12T10:00:00.000Z',
      requestId: 'request-19',
    }];
    apiJsonMock.mockResolvedValue({ events });

    await expect(fetchAuditEvents()).resolves.toEqual(events);
    expect(apiJsonMock).toHaveBeenCalledWith('/auditoria');
  });
});
