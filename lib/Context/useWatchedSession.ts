import { useCallback, useEffect, useState } from "react";
import { Events } from "../Common";
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
 * Checks the session until the admin says it is over: once a minute while
 * the admin answers; after 5 s, 10 s, 20 s, 40 s, then once a minute while
 * it does not. Returns the function that stops the checks; an answer that
 * arrives after it is ignored.
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
      if (answer.kind === "signed-out") return;
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

/**
 * The session as the admin last described it. Only the admin ends a
 * session: an unavailable answer keeps the user, so that a restart of the
 * admin does not lose the work of the open pages (ADM-N09).
 */
export function useWatchedSession(
  getSessionInfo: () => Promise<ResponseModel<SessionInfoResponse>>,
  isPageActive: boolean,
) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isServerUnreachable, setIsServerUnreachable] = useState(false);

  const applyAnswer = useCallback((answer: SessionAnswer) => {
    setIsServerUnreachable(answer.kind === "unavailable");
    if (answer.kind === "signed-in") {
      setUser(answer.user);
      publishNavigation(answer.redirect);
    } else if (answer.kind === "signed-out") {
      setUser(null);
    }
  }, []);

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

  /** Forgets the session on this page, after a sign out. */
  const clearSession = useCallback(() => {
    setIsServerUnreachable(false);
    setUser(null);
  }, []);

  return {
    user,
    isLoading,
    setIsLoading,
    isServerUnreachable,
    applyAnswer,
    clearSession,
  };
}
