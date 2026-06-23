import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getEventLogs } from '../../../services/eventLogService';
import { getAccessToken } from '../../../services/apiClient';
import { useNotificationStore } from '../../../stores/notificationStore';
import { NotificationToast } from '../components/NotificationToast';
import { playNotificationSound } from '../notificationSound';
import type { EventLogNotification } from '../types';

const EVENT_LOG_FALLBACK_POLL_INTERVAL_MS = 60_000;

interface UseEventLogNotificationsOptions {
  enabled: boolean;
  darkMode: boolean;
}

function getRetryAfterMs(error: unknown) {
  const response = (error as {
    response?: {
      status?: number;
      headers?: Record<string, string | number | undefined> & {
        get?: (name: string) => string | null;
      };
      data?: { retryAfter?: number | string };
    };
  })?.response;

  if (response?.status !== 429) {
    return null;
  }

  const retryAfterValue =
    response.headers?.['retry-after'] ??
    response.headers?.['Retry-After'] ??
    response.headers?.get?.('retry-after') ??
    response.data?.retryAfter;
  const retryAfterSeconds = Number(retryAfterValue);

  if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) {
    return EVENT_LOG_FALLBACK_POLL_INTERVAL_MS;
  }

  return retryAfterSeconds * 1000;
}

export function useEventLogNotifications({ enabled, darkMode }: UseEventLogNotificationsOptions) {
  const notificationWsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventLogPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markAsShown = useNotificationStore((state) => state.markAsShown);
  const seedLatestEventLogId = useNotificationStore((state) => state.seedLatestEventLogId);

  useEffect(() => {
    if (!enabled) return;

    let shouldReconnect = true;
    let latestEventLogId = useNotificationStore.getState().latestEventLogId;
    let nextPollDelayMs = EVENT_LOG_FALLBACK_POLL_INTERVAL_MS;

    const showNotificationToast = (notification: EventLogNotification) => {
      playNotificationSound(notification.severity);
      toast.custom(
        (toastId) => (
          <NotificationToast
            notification={notification}
            darkMode={darkMode}
            onClose={() => toast.dismiss(toastId)}
            onOpen={() => {
              toast.dismiss(toastId);
              window.dispatchEvent(new Event('eventlog:open-notifications'));
            }}
          />
        ),
        {
          duration:
            notification.severity?.toLowerCase() === 'high' ||
            notification.severity?.toLowerCase() === 'critical'
              ? 9000
              : 6500,
        },
      );
    };

    const handleIncomingNotifications = (notifications: EventLogNotification[]) => {
      const newNotifications = notifications.filter((notification) => {
        const wasMarked = markAsShown(notification.id);
        if (wasMarked) {
          latestEventLogId = Math.max(latestEventLogId ?? 0, notification.id);
        }
        return wasMarked;
      });

      if (newNotifications.length === 0) {
        return;
      }

      window.dispatchEvent(
        new CustomEvent('eventlog:notification', {
          detail: newNotifications,
        }),
      );

      newNotifications.forEach(showNotificationToast);
    };

    const pollEventLogs = async (seedOnly = false) => {
      if (!seedOnly && notificationWsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      try {
        const notifications = await getEventLogs({ limit: 10 });
        nextPollDelayMs = EVENT_LOG_FALLBACK_POLL_INTERVAL_MS;
        const latestId = notifications.reduce(
          (max, notification) => Math.max(max, notification.id || 0),
          latestEventLogId ?? 0,
        );

        if (seedOnly || latestEventLogId === null) {
          latestEventLogId = latestId;
          seedLatestEventLogId(latestId);
          return;
        }

        const newNotifications = notifications
          .filter((notification) => notification.id > (latestEventLogId ?? 0))
          .sort((a, b) => a.id - b.id);

        handleIncomingNotifications(newNotifications);
      } catch (error) {
        const retryAfterMs = getRetryAfterMs(error);
        if (retryAfterMs !== null) {
          nextPollDelayMs = retryAfterMs;
          console.warn(
            `Event log notification polling rate-limited; retrying in ${Math.ceil(retryAfterMs / 1000)}s`,
          );
          return;
        }

        console.error('Failed to poll event log notifications:', error);
      }
    };

    const scheduleFallbackPoll = (delayMs = nextPollDelayMs) => {
      if (!shouldReconnect) {
        return;
      }

      if (eventLogPollTimerRef.current) {
        clearTimeout(eventLogPollTimerRef.current);
      }

      eventLogPollTimerRef.current = setTimeout(async () => {
        await pollEventLogs();
        scheduleFallbackPoll();
      }, delayMs);
    };

    const connectNotificationSocket = () => {
      // แนบ access token ใน query เพื่อให้ server ผูก user/location กับ socket (ไม่งั้นเป็น anonymous -> ไม่ได้ noti)
      const token = getAccessToken();
      const ws = new WebSocket(`/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`);
      notificationWsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type !== 'notification' || !Array.isArray(message.data)) {
            return;
          }

          handleIncomingNotifications(message.data);
        } catch (error) {
          console.error('Failed to parse notification websocket message:', error);
        }
      };

      ws.onclose = (event) => {
        if (!shouldReconnect || event.code === 1000) {
          return;
        }

        reconnectTimerRef.current = setTimeout(connectNotificationSocket, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectNotificationSocket();
    pollEventLogs(true);
    scheduleFallbackPoll();

    return () => {
      shouldReconnect = false;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (eventLogPollTimerRef.current) {
        clearTimeout(eventLogPollTimerRef.current);
        eventLogPollTimerRef.current = null;
      }

      if (notificationWsRef.current) {
        notificationWsRef.current.close(1000, 'App notification listener unmounted');
        notificationWsRef.current = null;
      }
    };
  }, [darkMode, enabled, markAsShown, seedLatestEventLogId]);
}
