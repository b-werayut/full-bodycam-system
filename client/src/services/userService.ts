import api from './apiClient';

export async function listUsers<TUser>() {
  const response = await api.get('/users');
  return response.data as TUser[];
}

export async function getUserDetails<TUser>(userId: number) {
  const response = await api.get(`/users/${userId}/details`);
  return response.data as TUser;
}

export async function createUser<TUser>(payload: {
  username: string;
  password?: string;
  roleId: number | null;
  Active: boolean;
}) {
  const response = await api.post('/users', payload);
  return response.data as { data?: TUser };
}

export async function updateUser<TUser>(
  userId: number,
  payload: {
    username: string;
    roleId: number | null;
    Active: boolean;
    password?: string;
  },
) {
  const response = await api.put(`/users/${userId}`, payload);
  return response.data as { data?: TUser };
}

export async function deleteUser(userId: number) {
  await api.delete(`/users/${userId}`);
}

export async function resetUserPassword(userId: number, password: string) {
  await api.put(`/users/${userId}/password`, { password });
}

export async function changeCurrentUserPassword(currentPassword: string, newPassword: string) {
  await api.put('/me/password', { currentPassword, newPassword });
}
