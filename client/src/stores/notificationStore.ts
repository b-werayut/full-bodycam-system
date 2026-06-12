import { create } from 'zustand';

interface NotificationState {
  latestEventLogId: number | null;
  shownNotificationIds: Set<number>;
  markAsShown: (id: number) => boolean;
  seedLatestEventLogId: (id: number) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  latestEventLogId: null,
  shownNotificationIds: new Set<number>(),
  markAsShown: (id) => {
    const { shownNotificationIds } = get();
    if (!id || shownNotificationIds.has(id)) {
      return false;
    }

    const nextIds = new Set(shownNotificationIds);
    nextIds.add(id);
    set((state) => ({
      shownNotificationIds: nextIds,
      latestEventLogId: Math.max(state.latestEventLogId ?? 0, id),
    }));
    return true;
  },
  seedLatestEventLogId: (id) => set({ latestEventLogId: id }),
  clearNotifications: () => set({ latestEventLogId: null, shownNotificationIds: new Set<number>() }),
}));
