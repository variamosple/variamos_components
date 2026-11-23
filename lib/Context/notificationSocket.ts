import { io } from "socket.io-client";
import type { AccessTokenProvider } from "./notificationAccessToken";
import { type NotificationItem, notificationItemOf } from "./notificationApi";

type AuthCallback = (data: object) => void;

export interface NotificationSocketOptions {
  auth: (callback: AuthCallback) => void;
  transports: string[];
  tryAllTransports: boolean;
}

/**
 * Options of the notification socket. The access token is read again on
 * every (re)connection; the room is the user of the token, so no user id
 * is sent (ADR-0001).
 */
export const notificationSocketOptions = (
  tokenProvider: AccessTokenProvider | null,
): NotificationSocketOptions => ({
  auth: (callback) => {
    void (tokenProvider?.get() ?? Promise.resolve(null)).then((token) =>
      callback(token ? { token } : {}),
    );
  },
  // WebSocket first; long polling when a proxy or a network blocks it
  // (ADM-N11). The service accepts both.
  transports: ["websocket", "polling"],
  tryAllTransports: true,
});

export interface NotificationSocketHandlers {
  receive: (item: NotificationItem) => void;
  /** Loads the list shown again, after a reconnection. */
  refresh: () => void;
  setOffline: (isOffline: boolean) => void;
}

/**
 * Opens the socket of the notifications of a user. A notification sent
 * while the socket was down never comes through it: the list is loaded
 * again on each reconnection, and the page is told while it is down
 * (ADM-N11). Returns the function that closes it.
 */
export function connectNotificationSocket(
  apiUrl: string,
  tokenProvider: AccessTokenProvider | null,
  { receive, refresh, setOffline }: NotificationSocketHandlers,
): () => void {
  const socket = io(apiUrl, notificationSocketOptions(tokenProvider));

  socket.on("notification", (payload: unknown) => {
    const item = notificationItemOf(payload);
    if (item) receive(item);
  });

  let connectedBefore = false;
  socket.on("connect", () => {
    setOffline(false);
    if (connectedBefore) refresh();
    connectedBefore = true;
  });
  socket.on("connect_error", () => setOffline(true));
  socket.on("disconnect", (reason: string) => {
    if (reason !== "io client disconnect") setOffline(true);
  });

  return () => {
    socket.disconnect();
  };
}
