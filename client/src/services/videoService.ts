import api from './apiClient';

export async function searchRecordings<TResponse>(payload: unknown) {
  const response = await api.post('/recording/search', payload);
  return response.data as TResponse;
}

export async function getPlayback<TResponse>(payload: unknown) {
  const response = await api.post('/getplayback', payload);
  return response.data as TResponse;
}

export async function convertAndCacheVideo<TResponse>(playbackParams: unknown, signal?: AbortSignal) {
  const response = await api.post('/convert-and-cache', { playbackParams }, { signal });
  return response.data as TResponse;
}

export async function checkVideoCache<TResponse>(playbackParams: unknown, signal?: AbortSignal) {
  const response = await api.post('/check-video-cache', { playbackParams }, { signal });
  return response.data as TResponse;
}

export async function cancelConversion(payload: unknown) {
  await api.post('/cancel-conversion', payload);
}
