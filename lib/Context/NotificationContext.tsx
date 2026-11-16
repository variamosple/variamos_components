import {
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { io } from "socket.io-client";
import {
  type AccessTokenProvider,
  accessTokenUrl,
  createAccessTokenProvider,
} from "./notificationAccessToken";
import {
  createNotificationApi,
  type NotificationItem,
  notificationItemOf,
  type UserNotificationPreferences,
} from "./notificationApi";
import { notificationSocketOptions } from "./notificationSocket";
import { useSession } from "./SessionContext";
import {
  useNotificationChanges,
  useNotificationList,
  useNotificationPreferences,
} from "./useNotificationState";

export type {
  NotificationItem,
  UserNotificationPreferences,
} from "./notificationApi";

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  preferences: UserNotificationPreferences | null;
  isLoading: boolean;
  fetchNotifications: (
    folder?: "inbox" | "trash",
    page?: number,
    limit?: number,
  ) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  emptyTrash: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (
    updates: Partial<UserNotificationPreferences>,
  ) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export interface NotificationProviderProps {
  apiUrl: string; // e.g., http://localhost:3000
  /**
   * Admin API base address, e.g. https://app.variamos.com/variamos_ms_admin/.
   * When set, requests and the socket carry a notification access token.
   */
  adminApiUrl?: string;
  children: ReactNode;
}

// Headers of the calls to the service: the notification access token when the
// admin service issues one. The session token itself is never sent: it stays
// in the admin cookie.
const headersFrom =
  (tokenProvider: AccessTokenProvider | null) =>
  async (): Promise<Record<string, string>> => {
    const token = await tokenProvider?.get();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

export const NotificationProvider: FC<NotificationProviderProps> = ({
  apiUrl,
  adminApiUrl,
  children,
}) => {
  const userId = useSession().user?.id;
  const tokenProvider = useMemo(
    () =>
      adminApiUrl
        ? createAccessTokenProvider({ url: accessTokenUrl(adminApiUrl) })
        : null,
    [adminApiUrl],
  );
  const api = useMemo(
    () =>
      userId
        ? createNotificationApi({
            apiUrl,
            getHeaders: headersFrom(tokenProvider),
          })
        : null,
    [apiUrl, userId, tokenProvider],
  );
  const list = useNotificationList(api);
  const changes = useNotificationChanges({ api, ...list });
  const { preferences, fetchPreferences, updatePreferences, clearPreferences } =
    useNotificationPreferences(api);
  const { fetchNotifications, receive, clear } = list;

  // Connect the socket and load the inbox once signed in; the cleanup closes
  // the socket of the previous user
  useEffect(() => {
    if (!userId) {
      tokenProvider?.clear();
      clear();
      clearPreferences();
      return;
    }

    const socket = io(apiUrl, notificationSocketOptions(tokenProvider));

    socket.on("notification", (payload: unknown) => {
      const item = notificationItemOf(payload);
      if (item) receive(item);
    });

    void fetchNotifications("inbox");
    void fetchPreferences();

    return () => {
      socket.disconnect();
    };
  }, [
    userId,
    apiUrl,
    tokenProvider,
    fetchNotifications,
    fetchPreferences,
    receive,
    clear,
    clearPreferences,
  ]);

  const { notifications, unreadCount, isLoading } = list;
  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      preferences,
      isLoading,
      fetchNotifications,
      ...changes,
      fetchPreferences,
      updatePreferences,
    }),
    [
      notifications,
      unreadCount,
      preferences,
      isLoading,
      fetchNotifications,
      changes,
      fetchPreferences,
      updatePreferences,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
};
