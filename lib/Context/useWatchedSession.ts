import { useCallback, useEffect, useRef, useState } from "react";
import { Events } from "../Common";
import { hasUnsavedInput, useHasUnsavedInput } from "../Hooks/unsavedInput";
import type { ResponseModel, SessionInfoResponse, SessionUser } from "../Model";
import {
  readSessionAnswer,
  retryDelay,
  SESSION_CHECK_INTERVAL_MS,
  type SessionAnswer,
} from "./sessionAnswer";

export const UNAVAILABLE_ANSWER: SessionAnswer = { kind: "unavailable" };

/** Asks the application to go to an address (sign-in page, redirection). */
export const publishNavigation = (location?: string) => {
  if (!location) {
    return;
  }

  Events.publish("variamosNavigate", location);
};

/**
 * Checks the session until it is stopped: once a minute while the admin
 * answers, even to say that the session is over (a page kept for its input
 * sees a new sign-in made in another tab); after 5 s, 10 s, 20 s, 40 s, then
 * once a minute while it does not answer. Returns the function that stops
 * the checks; an answer that arrives after it is ignored.
 */
export function watchSession(
  loadAnswer: () => Promise<SessionAnswer>,
  applyAnswer: (answer: SessionAnswer) => void,
): () => void {
  let failures = 0;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const check = () => {
    void loadAnswer().then((answer) => {
      if (stopped) return;
      applyAnswer(answer);
      failures = answer.kind === "unavailable" ? failures + 1 : 0;
      const delay =
        failures > 0 ? retryDelay(failures) : SESSION_CHECK_INTERVAL_MS;
      timer = setTimeout(check, delay);
    });
  };

  check();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}

/** How long a session token lasts when the application does not say. */
export const DEFAULT_SESSION_LIFETIME_MS = 15 * 60_000;

/**
 * The session as the admin last described it. Only the admin ends a
 * session: an unavailable answer keeps the user, so that a restart of the
 * admin does not lose the work of the open pages (ADM-N09).
 *
 * Past `lifetimeMs` without an answer, the token is dead on the services:
 * the page becomes read only, and keeps its input (TRV-65). When the admin
 * says that the session is over while a form holds unsaved input, the user
 * is kept and the session is marked closed, so that the page stays until
 * the input is copied or dropped; a new sign-in, in another tab, opens it
 * again.
 */
export function useWatchedSession(
  getSessionInfo: () => Promise<ResponseModel<SessionInfoResponse>>,
  isPageActive: boolean,
  lifetimeMs: number = DEFAULT_SESSION_LIFETIME_MS,
) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isServerUnreachable, setIsServerUnreachable] = useState(false);
  const [isPastLifetime, setIsPastLifetime] = useState(false);
  const [isSessionClosed, setIsSessionClosed] = useState(false);
  const holdsInput = useHasUnsavedInput();
  // When the admin last said that the session was open
  const confirmedAtRef = useRef(Date.now());
  const userRef = useRef<SessionUser | null>(null);

  const keepUser = useCallback((next: SessionUser | null) => {
    userRef.current = next;
    setUser(next);
  }, []);

  const applyAnswer = useCallback(
    (answer: SessionAnswer) => {
      setIsServerUnreachable(answer.kind === "unavailable");
      if (answer.kind === "signed-in") {
        confirmedAtRef.current = Date.now();
        setIsPastLifetime(false);
        setIsSessionClosed(false);
        keepUser(answer.user);
        publishNavigation(answer.redirect);
      } else if (answer.kind === "signed-out") {
        setIsPastLifetime(false);
        if (userRef.current && hasUnsavedInput()) {
          setIsSessionClosed(true);
        } else {
          setIsSessionClosed(false);
          keepUser(null);
        }
      } else if (Date.now() - confirmedAtRef.current >= lifetimeMs) {
        setIsPastLifetime(true);
      }
    },
    [keepUser, lifetimeMs],
  );

  // The input copied or dropped, the closed session ends as any other
  useEffect(() => {
    if (isSessionClosed && !holdsInput) {
      setIsSessionClosed(false);
      keepUser(null);
    }
  }, [isSessionClosed, holdsInput, keepUser]);

  const loadAnswer = useCallback(
    (): Promise<SessionAnswer> =>
      getSessionInfo().then(readSessionAnswer, () => UNAVAILABLE_ANSWER),
    [getSessionInfo],
  );

  useEffect(() => {
    setIsLoading(true);
    void loadAnswer()
      .then(applyAnswer)
      .finally(() => setIsLoading(false));
  }, [loadAnswer, applyAnswer]);

  const isWatching = user !== null || isServerUnreachable;
  useEffect(() => {
    if (!(isWatching && isPageActive)) return;
    return watchSession(loadAnswer, applyAnswer);
  }, [isWatching, isPageActive, loadAnswer, applyAnswer]);

  /** Checks the session now, after a refusal of a service (401). */
  const checkSession = useCallback(() => {
    void loadAnswer().then(applyAnswer);
  }, [loadAnswer, applyAnswer]);

  /** Forgets the session on this page, after a sign out. */
  const clearSession = useCallback(() => {
    setIsServerUnreachable(false);
    setIsPastLifetime(false);
    setIsSessionClosed(false);
    keepUser(null);
  }, [keepUser]);

  return {
    user,
    isLoading,
    setIsLoading,
    isServerUnreachable,
    isReadOnly: isSessionClosed || (isServerUnreachable && isPastLifetime),
    isSessionClosed,
    applyAnswer,
    checkSession,
    clearSession,
  };
}
