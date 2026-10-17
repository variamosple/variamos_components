import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import {
  accessTokenUrl,
  createAccessTokenProvider,
} from "./notificationAccessToken";
import { useSession } from "./SessionContext";

export interface NotificationItem {
  id: string;
  templateKey: string;
  variables: Record<string, any>;
  metadata: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface UserNotificationPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  mutedEventTypes: string[];
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  preferences: UserNotificationPreferences | null;
  isLoading: boolean;
  fetchNotifications: (folder?: "inbox" | "trash", page?: number, limit?: number) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  emptyTrash: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<UserNotificationPreferences>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export interface NotificationProviderProps {
  apiUrl: string; // e.g., http://localhost:3000
  /**
   * Admin API base address, e.g. https://app.variamos.com/variamos_ms_admin/.
   * When set, requests and the socket carry a notification access token.
   */
  adminApiUrl?: string;
  children: ReactNode;
}

export const NotificationProvider: FC<NotificationProviderProps> = ({
  apiUrl,
  adminApiUrl,
  children,
}) => {
  const { user } = useSession();
  const tokenProvider = useMemo(
    () =>
      adminApiUrl
        ? createAccessTokenProvider({ url: accessTokenUrl(adminApiUrl) })
        : null,
    [adminApiUrl],
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Helper for API headers: the notification access token when the admin
  // service issues one. The recipientId parameters stay during the
  // transition: the service ignores them once the token is verified.
  const getHeaders = async (): Promise<Record<string, string>> => {
    const accessToken = await tokenProvider?.get();
    const token = accessToken ?? localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // 1. Fetch notifications
  const fetchNotifications = async (folder: "inbox" | "trash" = "inbox", page = 1, limit = 10) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${apiUrl}/notifications?recipientId=${user.id}&page=${page}&limit=${limit}&folder=${folder}`,
        { headers: await getHeaders() }
      );
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);

        // Fetch unread count for inbox
        if (folder === "inbox") {
          const unread = data.filter((n: NotificationItem) => !n.isRead).length;
          setUnreadCount(unread);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Mark single notification as read
  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`${apiUrl}/notifications/${id}/read`, {
        method: "PATCH",
        headers: await getHeaders(),
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // 3. Mark all as read
  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${apiUrl}/notifications/read-all?recipientId=${user.id}`, {
        method: "PATCH",
        headers: await getHeaders(),
      });
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  // 4. Empty trash
  const emptyTrash = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${apiUrl}/notifications/trash?recipientId=${user.id}`, {
        method: "DELETE",
        headers: await getHeaders(),
      });
      if (response.ok) {
        setNotifications([]);
      }
    } catch (error) {
      console.error("Failed to empty trash:", error);
    }
  };

  // 4b. Delete notification
  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`${apiUrl}/notifications/${id}`, {
        method: "DELETE",
        headers: await getHeaders(),
      });
      if (response.ok) {
        setNotifications((prev) => {
          const removed = prev.find((n) => n.id === id);
          if (removed && !removed.isRead) {
            setUnreadCount((count) => Math.max(0, count - 1));
          }
          return prev.filter((n) => n.id !== id);
        });
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  // 5. Fetch preferences
  const fetchPreferences = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${apiUrl}/notifications/preferences?recipientId=${user.id}`, {
        headers: await getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error("Failed to fetch preferences:", error);
    }
  };

  // 6. Update preferences
  const updatePreferences = async (updates: Partial<UserNotificationPreferences>) => {
    if (!user) return;
    try {
      const response = await fetch(`${apiUrl}/notifications/preferences?recipientId=${user.id}`, {
        method: "PATCH",
        headers: await getHeaders(),
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error("Failed to update preferences:", error);
    }
  };

  // Connect WebSockets and fetch initial data on login
  useEffect(() => {
    if (!user) {
      tokenProvider?.clear();
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setNotifications([]);
      setUnreadCount(0);
      setPreferences(null);
      return;
    }

    // The access token is read again on every (re)connection; the userId
    // query stays during the transition, as a fallback in observe mode.
    const newSocket = io(apiUrl, {
      auth: (callback) => {
        void (tokenProvider?.get() ?? Promise.resolve(null)).then((token) =>
          callback(token ? { token } : {}),
        );
      },
      query: { userId: user.id },
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      console.log("WebSocket connected to notifications microservice");
    });

    newSocket.on("notification", (newNotification: NotificationItem) => {
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    setSocket(newSocket);

    // Initial load
    fetchNotifications("inbox");
    fetchPreferences();

    return () => {
      newSocket.disconnect();
    };
  }, [user, apiUrl, tokenProvider]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        preferences,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        emptyTrash,
        deleteNotification,
        fetchPreferences,
        updatePreferences,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
