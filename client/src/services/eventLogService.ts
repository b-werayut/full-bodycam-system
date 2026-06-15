import api from './apiClient';
import type { EventLogNotification } from '../features/notifications/types';

export async function getEventLogs(params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });
  query.set('_t', String(Date.now()));

  const response = await api.get(`geteventlogs?${query.toString()}`);
  return Array.isArray(response.data) ? (response.data as EventLogNotification[]) : [];
}

export async function getEventLogCount(): Promise<number> {
  const response = await api.get(`/eventlogs/count?_t=${Date.now()}`);
  const count = (response.data as { count?: number })?.count;
  return typeof count === 'number' && count >= 0 ? count : 0;
}

export async function getUnreadEventLogCount(): Promise<number> {
  const response = await api.get(`/eventlogs/unread-count?_t=${Date.now()}`);
  const count = (response.data as { count?: number })?.count;
  return typeof count === 'number' && count >= 0 ? count : 0;
}

export async function markEventLogRead(id: number) {
  await api.patch(`/eventlogs/${id}/read`);
}
