import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import type {
  NotificationApi,
  NotificationFolder,
  NotificationItem,
  UserNotificationPreferences,
} from "./notificationApi";

// A failed call is logged; the drawer keeps what it shows
export async function logFailure(failure: string, action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    console.error(failure, error);
  }
}

const countUnread = (items: NotificationItem[]) =>
  items.filter((item) => !item.isRead).length;

/** The notifications shown, the unread count, and how to load them. */
export function useNotificationList(api: NotificationApi | null) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchNotifications = useCallback(
    async (folder: NotificationFolder = "inbox", page = 1, limit = 10) => {
      if (!api) return;
      setIsLoading(true);
      await logFailure("Failed to fetch notifications:", async () => {
        const items = await api.list({ folder, page, limit });
        if (!items) return;
        setNotifications(items);
        if (folder === "inbox") setUnreadCount(countUnread(items));
      });
      setIsLoading(false);
    },
    [api],
  );

  const receive = useCallback((item: NotificationItem) => {
    setNotifications((prev) => [item, ...prev]);
    setUnreadCount((prev) => prev + 1);
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    setNotifications,
    setUnreadCount,
    fetchNotifications,
    receive,
    clear,
  };
}

interface NotificationChanges {
  api: NotificationApi | null;
  notifications: NotificationItem[];
  setNotifications: Dispatch<SetStateAction<NotificationItem[]>>;
  setUnreadCount: Dispatch<SetStateAction<number>>;
}

/** Marking as read and deleting, applied to the list once the service agrees. */
export function useNotificationChanges({
  api,
  notifications,
  setNotifications,
  setUnreadCount,
}: NotificationChanges) {
  const markAsRead = useCallback(
    (id: string) =>
      logFailure("Failed to mark notification as read:", async () => {
        if (!(await api?.markAsRead(id))) return;
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }),
    [api, setNotifications, setUnreadCount],
  );

  const markAllAsRead = useCallback(
    () =>
      logFailure("Failed to mark all notifications as read:", async () => {
        if (!(await api?.markAllAsRead())) return;
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }),
    [api, setNotifications, setUnreadCount],
  );

  const emptyTrash = useCallback(
    () =>
      logFailure("Failed to empty trash:", async () => {
        if (await api?.emptyTrash()) setNotifications([]);
      }),
    [api, setNotifications],
  );

  const deleteNotification = useCallback(
    (id: string) =>
      logFailure("Failed to delete notification:", async () => {
        const wasUnread =
          notifications.find((n) => n.id === id)?.isRead === false;
        if (!(await api?.remove(id))) return;
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
      }),
    [api, notifications, setNotifications, setUnreadCount],
  );

  return useMemo(
    () => ({ markAsRead, markAllAsRead, emptyTrash, deleteNotification }),
    [markAsRead, markAllAsRead, emptyTrash, deleteNotification],
  );
}

/** The notification preferences of the signed-in user. */
export function useNotificationPreferences(api: NotificationApi | null) {
  const [preferences, setPreferences] =
    useState<UserNotificationPreferences | null>(null);

  const fetchPreferences = useCallback(
    () =>
      logFailure("Failed to fetch preferences:", async () => {
        const saved = await api?.preferences();
        if (saved) setPreferences(saved);
      }),
    [api],
  );

  const updatePreferences = useCallback(
    (updates: Partial<UserNotificationPreferences>) =>
      logFailure("Failed to update preferences:", async () => {
        const saved = await api?.updatePreferences(updates);
        if (saved) setPreferences(saved);
      }),
    [api],
  );

  const clearPreferences = useCallback(() => setPreferences(null), []);

  return { preferences, fetchPreferences, updatePreferences, clearPreferences };
}
