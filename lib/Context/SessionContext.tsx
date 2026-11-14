import {
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Events } from "../Common";
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

interface SessionContextType {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: Credentials) => Promise<ResponseModel<singInResponse>>;
  signInAsGuest: () => Promise<ResponseModel<singInResponse>>;
  signUp: (
    registration: UserRegistration,
  ) => Promise<ResponseModel<unknown> | null>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const guestIdKey = "guestId";

const redirect = (location?: string) => {
  if (!location) {
    return;
  }

  Events.publish("variamosNavigate", location);
};

/**
 * Applies a session-info answer: the user and the redirection.
 * Returns false when the answer is an error, after clearing the user.
 */
function applySessionInfo(
  result: ResponseModel<SessionInfoResponse>,
  setUser: (user: SessionUser | null) => void,
): boolean {
  if (result?.errorCode) {
    setUser(null);
    return false;
  }
  setUser(result?.data?.user ?? null);
  redirect(result?.data?.redirect);
  return true;
}

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
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isAuthenticated = user !== null;
  const isPageActive = usePageVisibility();

  // The session lives in the admin cookie: a token kept by an older
  // version is removed
  useEffect(() => {
    forgetStoredSessionToken();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    void getSessionInfo()
      .then((result) => applySessionInfo(result, setUser))
      .catch(() => {
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [getSessionInfo]);

  useEffect(() => {
    if (!(isAuthenticated && isPageActive)) return;
    const requestSessionInfo = () => {
      void getSessionInfo()
        .then((result) => applySessionInfo(result, setUser))
        .catch(() => {
          setUser(null);
        });
    };
    requestSessionInfo();
    const interval = setInterval(requestSessionInfo, 60_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isPageActive, getSessionInfo]);

  // After a sign in, the session is loaded; its error goes on the answer
  const completeSignIn = (response: ResponseModel<singInResponse>) =>
    getSessionInfo()
      .then((result) => {
        if (!applySessionInfo(result, setUser)) {
          response.withError(
            result.errorCode ?? 500,
            result.message ?? SIGN_IN_ERROR,
          );
        }
        return response;
      })
      .catch(() => {
        setUser(null);
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
      redirect(loginUrl);

      setTimeout(() => {
        setUser(null);
      }, 200);
    });
  };

  return (
    <SessionContext.Provider
      value={{
        user,
        isAuthenticated,
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
