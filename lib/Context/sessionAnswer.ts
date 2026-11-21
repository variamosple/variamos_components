import type { SessionUser } from "../Model";

/**
 * What an answer of GET /auth/session-info says about the session.
 *
 * Only the admin can say that the session is over, with 401 or 403. Any other
 * failure (no network, a proxy error page, an error code that is not a
 * number, a 5xx while the admin restarts) says nothing about the session:
 * it is "unavailable", and the signed-in user is kept (ADM-N09).
 */
export type SessionAnswer =
  | { kind: "signed-in"; user: SessionUser; redirect?: string }
  | { kind: "signed-out" }
  | { kind: "unavailable" };

const SIGNED_OUT_CODES = new Set([401, 403]);

const UNAVAILABLE: SessionAnswer = { kind: "unavailable" };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Reads an answer as each application gives it: a ResponseModel, the raw
 * body of an error, or anything else when the server could not answer.
 */
export function readSessionAnswer(result: unknown): SessionAnswer {
  if (!isObject(result)) return UNAVAILABLE;

  const { errorCode, data } = result;
  if (errorCode !== undefined && errorCode !== null) {
    return typeof errorCode === "number" && SIGNED_OUT_CODES.has(errorCode)
      ? { kind: "signed-out" }
      : UNAVAILABLE;
  }

  // A success always holds a data object: without it, the body did not come
  // from the admin
  if (!isObject(data)) return UNAVAILABLE;
  if (data.user === null || data.user === undefined) {
    return { kind: "signed-out" };
  }

  const user = toSessionUser(data.user);
  if (!user) return UNAVAILABLE;
  const redirect =
    typeof data.redirect === "string" ? data.redirect : undefined;
  return { kind: "signed-in", user, redirect };
}

const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

const texts = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

/**
 * The user of a session, as the admin sends it (sessionInfoToSessionUser of
 * variamos-security). A guest may lack some fields: only the id is required.
 */
function toSessionUser(value: unknown): SessionUser | null {
  if (!isObject(value) || typeof value.id !== "string" || !value.id) {
    return null;
  }
  return {
    id: value.id,
    user: text(value.user),
    name: text(value.name),
    email: text(value.email),
    roles: texts(value.roles),
    permissions: texts(value.permissions),
  };
}

/** Time between two session checks while the admin answers. */
export const SESSION_CHECK_INTERVAL_MS = 60_000;

const FIRST_RETRY_MS = 5_000;

/**
 * Time before the next try after `failures` unavailable answers in a row:
 * 5 s, 10 s, 20 s, 40 s, then once a minute.
 */
export function retryDelay(failures: number): number {
  const exponent = Math.max(0, failures - 1);
  return Math.min(FIRST_RETRY_MS * 2 ** exponent, SESSION_CHECK_INTERVAL_MS);
}
