import { fieldOf } from "../Common/fieldOf";
/**
 * Short-lived token used to call the notification service, issued by the
 * admin service to the signed-in user (ADR-0001 of the admin module).
 */
export interface NotificationAccessToken {
  token: string;
  expiresAt: number;
}

/** Address of the token route from the admin API base address. */
export function accessTokenUrl(adminApiUrl: string): string {
  const base = adminApiUrl.replace(/\/+$/, "").replace(/\/v1$/, "");
  return `${base}/v1/notifications/access-token`;
}

export interface AccessTokenProviderOptions {
  url: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  /** A token is renewed this long before it expires. */
  refreshMarginMs?: number;
}

export interface AccessTokenProvider {
  /** A valid token, or null when the admin service cannot issue one. */
  get(): Promise<string | null>;
  clear(): void;
}

/**
 * Keeps one token in memory, renews it shortly before it expires, and
 * shares a single request between concurrent callers.
 */
export function createAccessTokenProvider({
  url,
  fetchImpl = (...args) => fetch(...args),
  now = Date.now,
  refreshMarginMs = 60_000,
}: AccessTokenProviderOptions): AccessTokenProvider {
  let current: NotificationAccessToken | null = null;
  let pending: Promise<string | null> | null = null;

  const request = async (): Promise<string | null> => {
    try {
      // The admin service reads the session from its httpOnly cookie
      const response = await fetchImpl(url, { credentials: "include" });
      if (!response.ok) return null;
      const data = fieldOf(await response.json(), "data");
      const token = fieldOf(data, "token");
      const expiresAt = Date.parse(String(fieldOf(data, "expiresAt")));
      if (typeof token !== "string" || Number.isNaN(expiresAt)) return null;
      current = { token, expiresAt };
      return token;
    } catch {
      return null;
    }
  };

  return {
    get() {
      if (current && now() < current.expiresAt - refreshMarginMs) {
        return Promise.resolve(current.token);
      }
      pending ??= request().finally(() => {
        pending = null;
      });
      return pending;
    },
    clear() {
      current = null;
    },
  };
}
