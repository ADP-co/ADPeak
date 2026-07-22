export const AUTH_STORAGE_KEY = 'adpeak.session.user';
export const AUTH_INVALIDATED_EVENT = 'adpeak:auth-invalidated';
const API_URL_STORAGE_KEY = 'adpeak.runtime.apiUrl';

const envApiBaseUrl = safePublishedApiUrl(import.meta.env.VITE_API_BASE_URL);
const envApiUrl = safePublishedApiUrl(import.meta.env.VITE_API_URL);
const approvedApiOrigins = apiOrigins(envApiBaseUrl, envApiUrl);
const runtimeApiUrl = readRuntimeApiUrl(approvedApiOrigins);
const configuredApiUrl =
  runtimeApiUrl
    ? `${runtimeApiUrl}/api/v1`
    : envApiBaseUrl ??
      (envApiUrl ? `${envApiUrl}/api/v1` : undefined);
const apiRequestsDisabled = import.meta.env.VITE_API_DISABLED === 'true';

export const API_BASE_URL = (configuredApiUrl ?? '/api/v1').replace(/\/$/, '');
export const API_ORIGIN = (runtimeApiUrl ?? envApiUrl ?? '').replace(/\/$/, '');
export const API_REQUESTS_ENABLED = !apiRequestsDisabled && (Boolean(configuredApiUrl) || !isStaticPublishedHost());

type StoredSession = {
  id?: string;
  role?: string;
  plantelId?: number;
  responsableId?: number;
  sessionToken?: string;
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

export function sessionHeaders(requestUrl = API_BASE_URL) {
  const session = readStoredSession();
  const role = session.role ?? import.meta.env.VITE_ROLE ?? 'plantel';
  const headers: Record<string, string> = {};

  if (session.sessionToken) {
    if (!isApprovedRequestUrl(requestUrl)) {
      return headers;
    }

    headers.Authorization = `Bearer ${session.sessionToken}`;
    headers['x-session-token'] = session.sessionToken;
    return headers;
  }

  if (!import.meta.env.DEV && import.meta.env.MODE !== 'test') {
    return headers;
  }

  return {
    'x-user-id': session.id ?? import.meta.env.VITE_USER_ID ?? defaultUserId(role),
    'x-role': role,
    'x-plantel-id': String(session.plantelId ?? import.meta.env.VITE_PLANTEL_ID ?? 1),
    'x-responsable-id': String(session.responsableId ?? import.meta.env.VITE_RESPONSABLE_ID ?? 1),
  };
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: { invalidateOnUnauthorized?: boolean } = {},
) {
  const response = await fetch(input, init);

  if (response.status === 401 && options.invalidateOnUnauthorized !== false) {
    await invalidateStoredSession(response);
  }

  return response;
}

export async function apiJson<T>(path: string, init: RequestInit = {}) {
  if (!API_REQUESTS_ENABLED) {
    throw new Error('api_unavailable');
  }

  const requestUrl = `${API_BASE_URL}${path}`;
  const response = await authenticatedFetch(requestUrl, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...sessionHeaders(requestUrl),
      ...init.headers,
    },
  });

  if (!response.ok) {
    let message = `api_error_${response.status}`;

    try {
      const payload = await response.json() as { message?: unknown };

      if (typeof payload.message === 'string' && payload.message.trim()) {
        message = payload.message;
      }
    } catch {
      // Keep the generic status code when the backend does not return JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function isStaticPublishedHost() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.location.hostname.endsWith('github.io');
}

function readRuntimeApiUrl(allowedOrigins: ReadonlySet<string>) {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const searchParams = new URLSearchParams(window.location.search);

  if (searchParams.has('api')) {
    const normalizedApiUrl = safeRuntimeApiUrl(searchParams.get('api'), allowedOrigins);

    if (normalizedApiUrl) {
      window.localStorage.setItem(API_URL_STORAGE_KEY, normalizedApiUrl);
      return normalizedApiUrl;
    }

    window.localStorage.removeItem(API_URL_STORAGE_KEY);
    return undefined;
  }

  const storedApiUrl = safeRuntimeApiUrl(
    window.localStorage.getItem(API_URL_STORAGE_KEY),
    allowedOrigins
  );

  if (!storedApiUrl) {
    window.localStorage.removeItem(API_URL_STORAGE_KEY);
  }

  return storedApiUrl;
}

async function invalidateStoredSession(response: Response) {
  if (typeof window === 'undefined') {
    return;
  }

  let message = 'La sesión expiró. Inicia sesión nuevamente.';

  try {
    const payload = await response.clone().json() as { message?: unknown };

    if (typeof payload.message === 'string' && payload.message.trim()) {
      message = payload.message;
    }
  } catch {
    // Keep the safe session-expired message for non-JSON responses.
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_INVALIDATED_EVENT, { detail: { message } }));
}

function safeRuntimeApiUrl(value: string | null, allowedOrigins: ReadonlySet<string>) {
  const normalizedApiUrl = safePublishedApiUrl(value);

  if (!normalizedApiUrl || typeof window === 'undefined' || isLocalHostname(window.location.hostname)) {
    return normalizedApiUrl;
  }

  return allowedOrigins.has(new URL(normalizedApiUrl).origin) ? normalizedApiUrl : undefined;
}

function normalizeApiUrl(value?: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString().replace(/\/$/, '') : undefined;
  } catch {
    return undefined;
  }
}

function safePublishedApiUrl(value?: string | null) {
  const normalizedApiUrl = normalizeApiUrl(value);

  if (!normalizedApiUrl || typeof window === 'undefined') {
    return normalizedApiUrl;
  }

  if (isLocalHostname(window.location.hostname)) {
    return normalizedApiUrl;
  }

  const targetHostname = new URL(normalizedApiUrl).hostname;
  return isLocalHostname(targetHostname) ? undefined : normalizedApiUrl;
}

function apiOrigins(...values: Array<string | undefined>) {
  const origins = new Set<string>();

  if (typeof window !== 'undefined') {
    origins.add(window.location.origin);
  }

  values.forEach((value) => {
    if (value) {
      origins.add(new URL(value).origin);
    }
  });

  return origins;
}

function isApprovedRequestUrl(value: string) {
  if (typeof window === 'undefined' || isLocalHostname(window.location.hostname)) {
    return true;
  }

  try {
    return approvedApiOrigins.has(new URL(value, window.location.origin).origin);
  } catch {
    return false;
  }
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
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
