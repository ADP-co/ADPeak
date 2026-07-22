import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const API_URL_STORAGE_KEY = 'adpeak.runtime.apiUrl';
const AUTH_STORAGE_KEY = 'adpeak.session.user';

function installWindow(href: string, initialStorage: Record<string, string> = {}) {
  const url = new URL(href);
  const values = new Map(Object.entries(initialStorage));
  const localStorage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
  const dispatchEvent = vi.fn();

  vi.stubGlobal('window', {
    location: {
      hostname: url.hostname,
      origin: url.origin,
      search: url.search,
    },
    localStorage,
    dispatchEvent,
  });

  return { localStorage, values, dispatchEvent };
}

describe('runtime API origin security', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('VITE_API_DISABLED', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rejects and does not persist an arbitrary API origin on a public host', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.approved.example');
    const { localStorage, values } = installWindow(
      'https://app.example/?api=https%3A%2F%2Fattacker.example',
      { [API_URL_STORAGE_KEY]: 'https://previous-attacker.example' }
    );

    const client = await import('./client');

    expect(client.API_BASE_URL).toBe('https://api.approved.example/api/v1');
    expect(values.has(API_URL_STORAGE_KEY)).toBe(false);
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(localStorage.removeItem).toHaveBeenCalledWith(API_URL_STORAGE_KEY);
  });

  it('removes an unapproved API origin left in public storage', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.approved.example');
    const { localStorage, values } = installWindow('https://app.example/', {
      [API_URL_STORAGE_KEY]: 'https://attacker.example',
    });

    const client = await import('./client');

    expect(client.API_BASE_URL).toBe('https://api.approved.example/api/v1');
    expect(values.has(API_URL_STORAGE_KEY)).toBe(false);
    expect(localStorage.removeItem).toHaveBeenCalledWith(API_URL_STORAGE_KEY);
  });

  it('accepts a configured origin publicly and limits session tokens to approved origins', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.approved.example');
    const { localStorage, values } = installWindow(
      'https://app.example/?api=https%3A%2F%2Fapi.approved.example%2Fruntime',
      {
        [AUTH_STORAGE_KEY]: JSON.stringify({
          role: 'director',
          sessionToken: 'secret-session-token',
        }),
      }
    );

    const client = await import('./client');

    expect(client.API_BASE_URL).toBe('https://api.approved.example/runtime/api/v1');
    expect(values.get(API_URL_STORAGE_KEY)).toBe('https://api.approved.example/runtime');
    expect(localStorage.setItem).toHaveBeenCalledWith(
      API_URL_STORAGE_KEY,
      'https://api.approved.example/runtime'
    );
    expect(client.sessionHeaders('https://api.approved.example/api/v1/indicadores')).toEqual({
      Authorization: 'Bearer secret-session-token',
      'x-session-token': 'secret-session-token',
    });
    expect(client.sessionHeaders('https://attacker.example/collect')).toEqual({});
  });

  it('keeps arbitrary runtime API overrides available from localhost development', async () => {
    const { values } = installWindow(
      'http://localhost:5173/?api=https%3A%2F%2Ftemporary-api.example',
      {
        [AUTH_STORAGE_KEY]: JSON.stringify({ sessionToken: 'local-session-token' }),
      }
    );

    const client = await import('./client');

    expect(client.API_BASE_URL).toBe('https://temporary-api.example/api/v1');
    expect(values.get(API_URL_STORAGE_KEY)).toBe('https://temporary-api.example');
    expect(client.sessionHeaders()).toEqual({
      Authorization: 'Bearer local-session-token',
      'x-session-token': 'local-session-token',
    });
  });

  it('clears an invalid session and notifies the auth provider after a 401 response', async () => {
    const { localStorage, dispatchEvent } = installWindow('https://app.example/', {
      [AUTH_STORAGE_KEY]: JSON.stringify({ sessionToken: 'expired-session-token' }),
    });
    vi.stubGlobal('CustomEvent', class CustomEvent {
      type: string;
      detail: unknown;

      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    });
    const unauthorizedResponse = {
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ message: 'La sesión expiró.' }),
      clone: vi.fn(),
    };
    unauthorizedResponse.clone.mockReturnValue(unauthorizedResponse);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(unauthorizedResponse));

    const client = await import('./client');

    await expect(client.apiJson('/indicadores')).rejects.toThrow('La sesión expiró.');
    expect(localStorage.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: client.AUTH_INVALIDATED_EVENT,
    }));
  });

  it('applies the same 401 invalidation to direct authenticated fetches', async () => {
    const { localStorage, dispatchEvent } = installWindow('https://app.example/', {
      [AUTH_STORAGE_KEY]: JSON.stringify({ sessionToken: 'expired-direct-token' }),
    });
    vi.stubGlobal('CustomEvent', class CustomEvent {
      type: string;
      detail: unknown;

      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    });
    const unauthorizedResponse = {
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ message: 'La sesión ya no es válida.' }),
      clone: vi.fn(),
    };
    unauthorizedResponse.clone.mockReturnValue(unauthorizedResponse);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(unauthorizedResponse));

    const client = await import('./client');
    const response = await client.authenticatedFetch('https://app.example/api/v1/reportes');

    expect(response.status).toBe(401);
    expect(localStorage.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: client.AUTH_INVALIDATED_EVENT,
      detail: { message: 'La sesión ya no es válida.' },
    }));
  });

  it('does not invalidate an existing session for a failed login attempt', async () => {
    const { localStorage, dispatchEvent } = installWindow('https://app.example/', {
      [AUTH_STORAGE_KEY]: JSON.stringify({ sessionToken: 'current-session-token' }),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    const client = await import('./client');
    await client.authenticatedFetch(
      'https://app.example/api/v1/auth/login',
      { method: 'POST' },
      { invalidateOnUnauthorized: false },
    );

    expect(localStorage.removeItem).not.toHaveBeenCalledWith(AUTH_STORAGE_KEY);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
});
