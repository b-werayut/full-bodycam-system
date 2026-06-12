import api from './apiClient';

export interface AuthUser {
  userId: number;
  username: string;
  roleId: number | null;
  roleName: string;
  securityLevel: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export async function login(username: string, password: string) {
  const response = await api.post('/login', { username, password });
  return response.data as AuthResponse;
}

export async function logout() {
  await api.post('/logout');
}

export async function refreshAuthToken() {
  const response = await api.post('/refresh');
  return response.data as AuthResponse;
}
