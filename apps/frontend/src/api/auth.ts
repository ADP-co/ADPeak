import { apiJson } from './client';
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
