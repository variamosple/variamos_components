/** Key under which the id of the last guest account is kept. */
export const GUEST_ID_KEY = "guestId";

type GuestStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * The id of the last guest account of this browser, so that a guest finds
 * their work again; null when the storage is blocked (private window,
 * policy) or empty (ADM-N14).
 */
export function readGuestId(
  storage: GuestStorage | undefined = globalThis.localStorage,
): string | null {
  try {
    return storage?.getItem(GUEST_ID_KEY) ?? null;
  } catch {
    return null;
  }
}

/** Keeps the id of the guest account, when the storage allows it. */
export function keepGuestId(
  id: string | undefined,
  storage: GuestStorage | undefined = globalThis.localStorage,
): void {
  if (!id) return;
  try {
    storage?.setItem(GUEST_ID_KEY, id);
  } catch {
    // Storage blocked: the next guest sign in creates another account
  }
}
