import { API_BASE_URL, API_REQUESTS_ENABLED, apiJson, sessionHeaders } from './client';
import type { User } from '../context/AuthContext';

type LoginResponse = {
  user: User & {
    username?: string;
  };
  sessionToken: string;
};

export async function loginWithCredentials(username: string, password: string) {
  const response = await apiJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username,
      password,
    }),
  });

  return {
    ...response.user,
    sessionToken: response.sessionToken,
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
