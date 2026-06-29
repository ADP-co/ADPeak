import { API_BASE_URL, API_REQUESTS_ENABLED, sessionHeaders } from './client';
import type { User } from '../context/AuthContext';

type LoginResponse = {
  user: User & {
    username?: string;
  };
  sessionToken: string;
};

export async function loginWithCredentials(username: string, password: string) {
  if (!API_REQUESTS_ENABLED) {
    throw new Error('api_unavailable');
  }

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...sessionHeaders(),
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { message?: string } | undefined;
    throw new Error(payload?.message ?? 'Usuario o contraseña incorrectos.');
  }

  const payload = await response.json() as LoginResponse;

  return {
    ...payload.user,
    sessionToken: payload.sessionToken,
  };
}

export async function updatePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
  if (!API_REQUESTS_ENABLED) {
    throw new Error('El sistema no está conectado.');
  }

  const response = await fetch(`${API_BASE_URL}/auth/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...sessionHeaders(),
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

  return response.json() as Promise<{ user: User }>;
}
