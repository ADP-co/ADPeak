import { API_BASE_URL, API_REQUESTS_ENABLED, authenticatedFetch, sessionHeaders } from './client';
import type { User } from '../context/AuthContext';

type LoginResponse = {
  user: User & {
    username?: string;
  };
  sessionToken?: string;
};

export async function loginWithCredentials(username: string, password: string) {
  if (!API_REQUESTS_ENABLED) {
    throw new Error('api_unavailable');
  }

  const response = await authenticatedFetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  }, { invalidateOnUnauthorized: false });

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { message?: string } | undefined;
    throw new Error(payload?.message ?? 'Usuario o contraseña incorrectos.');
  }

  const payload = await response.json() as LoginResponse;

  return payload.user;
}

export async function fetchCurrentSession() {
  if (!API_REQUESTS_ENABLED) {
    return null;
  }

  const response = await authenticatedFetch(`${API_BASE_URL}/auth/session`, {}, { invalidateOnUnauthorized: false });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { message?: string } | undefined;
    throw new Error(payload?.message ?? 'No se pudo validar la sesión.');
  }

  const payload = await response.json() as { user: User };
  return payload.user;
}

export async function logoutSession() {
  if (!API_REQUESTS_ENABLED) {
    return;
  }

  await authenticatedFetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
  }, { invalidateOnUnauthorized: false });
}

export async function updatePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
  if (!API_REQUESTS_ENABLED) {
    throw new Error('El sistema no está conectado.');
  }

  const response = await authenticatedFetch(`${API_BASE_URL}/auth/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...sessionHeaders(`${API_BASE_URL}/auth/password`),
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
      confirmPassword,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { message?: string } | undefined;
    throw new Error(payload?.message ?? 'No se pudo actualizar la contraseña.');
  }

  return response.json() as Promise<{ user: User; sessionToken?: string }>;
}
