import { beforeEach, describe, expect, it, vi } from 'vitest';

const clientMocks = vi.hoisted(() => ({
  apiJson: vi.fn(),
}));

vi.mock('./client', () => ({
  API_REQUESTS_ENABLED: true,
  apiJson: clientMocks.apiJson,
}));

import { fetchAuditEvents, type AuditEvent } from './catalog';

describe('audit catalog API', () => {
  beforeEach(() => {
    clientMocks.apiJson.mockReset();
  });

  it('fetches the Director audit feed without a local fallback', async () => {
    const events: AuditEvent[] = [{
      id: 1,
      userId: 'director-1',
      role: 'director',
      action: 'capture_saved',
      resourceType: 'capture',
      resourceId: '9',
      status: 'ok',
      createdAt: '2026-07-12T10:00:00.000Z',
      requestId: 'req-9',
    }];
    clientMocks.apiJson.mockResolvedValueOnce({ events });

    await expect(fetchAuditEvents()).resolves.toEqual(events);
    expect(clientMocks.apiJson).toHaveBeenCalledWith('/auditoria');
  });

  it('propagates audit API failures instead of showing local data', async () => {
    clientMocks.apiJson.mockRejectedValueOnce(new Error('forbidden'));

    await expect(fetchAuditEvents()).rejects.toThrow('forbidden');
  });
});
