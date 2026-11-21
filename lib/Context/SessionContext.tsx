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
import { readSessionAnswer } from "./sessionAnswer";
import { forgetStoredSessionToken } from "./storedSessionToken";
import {
  publishNavigation,
  UNAVAILABLE_ANSWER,
  useWatchedSession,
} from "./useWatchedSession";

interface SessionContextType {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * The admin did not answer the last session check (network, restart,
   * proxy error): the user is kept and the check is tried again.
   */
  isServerUnreachable: boolean;
  signIn: (credentials: Credentials) => Promise<ResponseModel<singInResponse>>;
  signInAsGuest: () => Promise<ResponseModel<singInResponse>>;
  signUp: (
    registration: UserRegistration,
  ) => Promise<ResponseModel<unknown> | null>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const guestIdKey = "guestId";

const SIGN_IN_ERROR = "Sign in error.";

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
  requestSignUp?: (
    request: UserRegistration,
  ) => Promise<ResponseModel<unknown>>;
  children: ReactNode;
}

export const SessionProvider: FC<SessionProviderProps> = ({
  loginUrl,
  getSessionInfo,
  requestSignUp,
  requestSignIn,
  requestSignInAsGuest,
  requestLogout,
  children,
}) => {
  const isPageActive = usePageVisibility();
  const {
    user,
    isLoading,
    setIsLoading,
    isServerUnreachable,
    applyAnswer,
    clearSession,
  } = useWatchedSession(getSessionInfo, isPageActive);
  const isAuthenticated = user !== null;

  // The session lives in the admin cookie: a token kept by an older
  // version is removed
  useEffect(() => {
    forgetStoredSessionToken();
  }, []);

  // After a sign in, the session is loaded; its error goes on the answer
  const completeSignIn = (response: ResponseModel<singInResponse>) =>
    getSessionInfo()
      .then((result) => {
        const answer = readSessionAnswer(result);
        applyAnswer(answer);
        if (answer.kind !== "signed-in") {
          response.withError(
            result?.errorCode || 500,
            result?.message ?? SIGN_IN_ERROR,
          );
        }
        return response;
      })
      .catch(() => {
        applyAnswer(UNAVAILABLE_ANSWER);
        return response.withError(500, SIGN_IN_ERROR);
      });

  const signUp = (registration: UserRegistration) => {
    if (!requestSignUp) {
      throw new Error("requestSignUp is not defined.");
    }
    setIsLoading(true);
    return requestSignUp(registration).finally(() => setIsLoading(false));
  };

  const signIn = (credentials: Credentials) => {
    if (!requestSignIn) {
      throw new Error("requestSignIn is not defined.");
    }
    setIsLoading(true);
    return requestSignIn(credentials)
      .then((response) =>
        response?.errorCode ? response : completeSignIn(response),
      )
      .finally(() => setIsLoading(false));
  };

  const signInAsGuest = () => {
    if (!requestSignInAsGuest) {
      throw new Error("requestSignInAsGuest is not defined.");
    }
    setIsLoading(true);
    return requestSignInAsGuest(localStorage.getItem(guestIdKey))
      .then((response) => {
        if (response?.errorCode) return response;
        localStorage.setItem(guestIdKey, response?.data?.id || "");
        return completeSignIn(response);
      })
      .finally(() => setIsLoading(false));
  };

  const logout = () => {
    void requestLogout().then(() => {
      forgetStoredSessionToken();
      publishNavigation(loginUrl);

      setTimeout(clearSession, 200);
    });
  };

  return (
    <SessionContext.Provider
      value={{
        user,
        isAuthenticated,
        isServerUnreachable,
        logout,
        signUp,
        signIn,
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
