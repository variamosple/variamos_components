import type { AccessTokenProvider } from "./notificationAccessToken";

type AuthCallback = (data: object) => void;

export interface NotificationSocketOptions {
  auth: (callback: AuthCallback) => void;
  transports: string[];
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
  transports: ["websocket"],
});
