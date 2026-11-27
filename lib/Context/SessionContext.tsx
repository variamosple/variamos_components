import {
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useEffect,
} from "react";
import { usePageVisibility } from "../Hooks/usePageVisibility";
import type {
  Credentials,
  ResponseModel,
  SessionInfoResponse,
  SessionUser,
  singInResponse,
  UserRegistration,
} from "../Model";
import { forgetStoredSessionToken } from "./storedSessionToken";
import { useSignIn } from "./useSignIn";
import { publishNavigation, useWatchedSession } from "./useWatchedSession";

interface SessionContextType {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * The admin did not answer the last session check (network, restart,
   * proxy error): the user is kept and the check is tried again.
   */
  isServerUnreachable: boolean;
  /**
   * Nothing can be saved: the admin has not answered for longer than a
   * session token lasts, or it said that the session is over while a form
   * holds unsaved input. The page and its input are kept (TRV-65).
   */
  isReadOnly: boolean;
  /**
   * The admin said that the session is over, and the page is kept for the
   * unsaved input of a form: the user stays shown until the input is copied
   * or dropped, or until a new sign-in.
   */
  isSessionClosed: boolean;
  /**
   * Checks the session now. Call it when a service refuses a request with
   * 401: an expired session is renewed, an ended one is said.
   */
  checkSession: () => void;
  /**
   * Signs in with a password. When the account has a second factor, the
   * answer has `data.mfaRequired`, no session is open yet, and the code goes
   * to verifySecondFactor.
   */
  signIn: (credentials: Credentials) => Promise<ResponseModel<singInResponse>>;
  /**
   * Sends the code of the second factor after signIn, then loads the
   * session as signIn does: no reload of the page is needed. With
   * `rememberDevice`, the admin may not ask this browser the code for a while.
   */
  verifySecondFactor: (
    code: string,
    rememberDevice?: boolean,
  ) => Promise<ResponseModel<singInResponse>>;
  signInAsGuest: () => Promise<ResponseModel<singInResponse>>;
  signUp: (
    registration: UserRegistration,
  ) => Promise<ResponseModel<unknown> | null>;
  /**
   * Signs out. Resolves to false when the admin could not close the
   * session: the user stays signed in, and the page can say so (ADM-N14).
   */
  logout: () => Promise<boolean>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const SESSION_OVER_CODES = new Set([401, 403]);

export interface SessionProviderProps {
  loginUrl: string;
  getSessionInfo: () => Promise<ResponseModel<SessionInfoResponse>>;
  requestLogout: () => Promise<ResponseModel<void>>;
  requestSignIn?: (
    request: Credentials,
  ) => Promise<ResponseModel<singInResponse>>;
  requestSignInAsGuest?: (
    guestId?: string | null,
  ) => Promise<ResponseModel<singInResponse>>;
  /** POST /auth/sign-in/mfa of the admin, for verifySecondFactor. */
  requestSignInMfa?: (
    code: string,
    rememberDevice: boolean,
  ) => Promise<ResponseModel<singInResponse>>;
  requestSignUp?: (
    request: UserRegistration,
  ) => Promise<ResponseModel<unknown>>;
  /**
   * How long a session token lasts (VARIAMOS_JWT_EXP_IN_SECONDS of the
   * admin), 15 minutes by default: past it without an answer of the admin,
   * the page becomes read only.
   */
  sessionLifetimeMs?: number;
  children: ReactNode;
}

export const SessionProvider: FC<SessionProviderProps> = ({
  loginUrl,
  getSessionInfo,
  requestSignUp,
  requestSignIn,
  requestSignInAsGuest,
  requestSignInMfa,
  requestLogout,
  sessionLifetimeMs,
  children,
}) => {
  const isPageActive = usePageVisibility();
  // isServerUnreachable, isReadOnly, isSessionClosed and checkSession go to
  // the page as they are
  const { user, isLoading, setIsLoading, applyAnswer, clearSession, ...state } =
    useWatchedSession(getSessionInfo, isPageActive, sessionLifetimeMs);
  const isAuthenticated = user !== null;

  // The session lives in the admin cookie: a token kept by an older
  // version is removed
  useEffect(() => {
    forgetStoredSessionToken();
  }, []);

  const { signIn, verifySecondFactor, signInAsGuest } = useSignIn(
    { getSessionInfo, requestSignIn, requestSignInAsGuest, requestSignInMfa },
    { applyAnswer, setIsLoading },
  );

  const signUp = (registration: UserRegistration) => {
    if (!requestSignUp) {
      throw new Error("requestSignUp is not defined.");
    }
    setIsLoading(true);
    return requestSignUp(registration).finally(() => setIsLoading(false));
  };

  const logout = () =>
    requestLogout().then(
      (response) => {
        // 401 or 403: the session was already over
        if (
          response?.errorCode &&
          !SESSION_OVER_CODES.has(response.errorCode)
        ) {
          return false;
        }
        forgetStoredSessionToken();
        publishNavigation(loginUrl);

        setTimeout(clearSession, 200);
        return true;
      },
      () => false,
    );

  return (
    <SessionContext.Provider
      value={{
        user,
        isAuthenticated,
        ...state,
        logout,
        signUp,
        signIn,
        verifySecondFactor,
        signInAsGuest,
        isLoading,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};
