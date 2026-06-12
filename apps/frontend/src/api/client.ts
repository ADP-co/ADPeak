export const AUTH_STORAGE_KEY = 'adpeak.session.user';

const configuredApiUrl =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : undefined);

export const API_BASE_URL = (configuredApiUrl ?? '/api/v1').replace(/\/$/, '');
export const API_ORIGIN = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
export const API_REQUESTS_ENABLED = Boolean(configuredApiUrl) || !isStaticPublishedHost();

type StoredSession = {
  id?: string;
  role?: string;
  plantelId?: number;
  responsableId?: number;
};

function readStoredSession(): StoredSession {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) ?? '{}') as StoredSession;
  } catch {
    return {};
  }
}

export function sessionHeaders() {
  const session = readStoredSession();
  const role = session.role ?? import.meta.env.VITE_ROLE ?? 'plantel';

  return {
    'x-user-id': session.id ?? import.meta.env.VITE_USER_ID ?? defaultUserId(role),
    'x-role': role,
    'x-plantel-id': String(session.plantelId ?? import.meta.env.VITE_PLANTEL_ID ?? 1),
    'x-responsable-id': String(session.responsableId ?? import.meta.env.VITE_RESPONSABLE_ID ?? 1),
  };
}

export async function apiJson<T>(path: string, init: RequestInit = {}) {
  if (!API_REQUESTS_ENABLED) {
    throw new Error('api_unavailable');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...sessionHeaders(),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`api_error_${response.status}`);
  }

  return response.json() as Promise<T>;
}

function isStaticPublishedHost() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.location.hostname.endsWith('github.io');
}

function defaultUserId(role: string) {
  if (role === 'admin' || role === 'director') {
    return 'director-1';
  }

  if (role === 'responsable') {
    return 'responsable-1';
  }

  return 'plantel-1';
}
