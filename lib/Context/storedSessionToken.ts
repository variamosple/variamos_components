/** Key under which versions before 0.4.0 kept the session token. */
export const STORED_TOKEN_KEY = "authToken";

/**
 * Removes the session token that versions before 0.4.0 kept in the browser
 * storage, where any script of the page can read it. The session lives in
 * the httpOnly cookie of the admin service alone (EV-117).
 */
export function forgetStoredSessionToken(
  storage: Pick<Storage, "removeItem"> | undefined = globalThis.localStorage,
): void {
  try {
    storage?.removeItem(STORED_TOKEN_KEY);
  } catch {
    // Storage blocked (private window, policy): nothing was kept there
  }
}
