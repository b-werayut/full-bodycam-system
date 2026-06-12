import api from './apiClient';

export async function getReports<TReport>() {
  const response = await api.get(`/getReport?_t=${Date.now()}`);
  return response.data as TReport[];
}

export async function getOfficers<TOfficer>() {
  const response = await api.get(`/getofficerData?_t=${Date.now()}`);
  return response.data as TOfficer[];
}

export async function getLocations<TLocation>() {
  const response = await api.get(`/getlocation?_t=${Date.now()}`);
  return response.data as TLocation[];
}

export async function createMission(payload: unknown) {
  await api.post('/createmission', payload);
}

export async function updateMission<TResponse>(payload: unknown) {
  const response = await api.put('/updatemission', payload);
  return response.data as TResponse;
}

export async function deleteMission<TResponse>(endpoint: string, payload: unknown) {
  const response = await api.delete(endpoint, { data: payload });
  return response.data as TResponse;
}

export async function patchMissionAction<TResponse>(endpoint: string, payload: unknown) {
  const response = await api.patch(endpoint, payload);
  return response.data as TResponse;
}
