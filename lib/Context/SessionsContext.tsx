import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePageVisibility } from "../Hooks/usePageVisibility";
import {
  Credentials,
  ResponseModel,
  SessionUser,
  singInResponse,
  UserRegistration,
} from "../Model";

interface SessionContextType {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: Credentials) => Promise<ResponseModel<singInResponse>>;
  signInAsGuest: () => Promise<ResponseModel<singInResponse>>;
  signUp: (
    registration: UserRegistration
  ) => Promise<ResponseModel<unknown> | null>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const guestIdKey = "guestId";

export interface SessionProviderProps {
  getSessionInfo: () => Promise<ResponseModel<SessionUser>>;
  requestLogout: () => Promise<ResponseModel<void>>;
  requestSignIn?: (
    request: Credentials
  ) => Promise<ResponseModel<singInResponse>>;
  requestSignInAsGuest?: (
    guestId?: string | null
  ) => Promise<ResponseModel<singInResponse>>;
  requestSignUp?: (
    request: UserRegistration
  ) => Promise<ResponseModel<unknown>>;
  children: ReactNode;
}

export const SessionProvider: FC<SessionProviderProps> = ({
  getSessionInfo,
  requestSignUp,
  requestSignIn,
  requestSignInAsGuest,
  requestLogout,
  children,
}) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isAuthenticated = !!user;
  const isPageActive = usePageVisibility();

  useEffect(() => {
    setIsLoading(true);
    getSessionInfo()
      .then((result) => {
        if (!result?.errorCode) {
          setUser(result?.data ?? null);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [getSessionInfo]);

  useEffect(() => {
    if (isAuthenticated && isPageActive) {
      const requestSessionInfo = () => {
        getSessionInfo()
          .then((result) => {
            if (!result?.errorCode) {
              setUser(result?.data ?? null);
            } else {
              setUser(null);
            }
          })
          .catch(() => {
            setUser(null);
          });
      };

      requestSessionInfo();

      const interval = setInterval(() => {
        requestSessionInfo();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isPageActive, getSessionInfo]);

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
      .then((response) => {
        if (response?.errorCode) {
          return response;
        }

        return getSessionInfo()
          .then((result) => {
            if (!result?.errorCode) {
              setUser(result?.data ?? null);
            } else {
              setUser(null);
              response.withError(result.errorCode, result.message!);
            }
            return response;
          })
          .catch(() => {
            setUser(null);
            return response.withError(500, "Sign in error.");
          });
      })
      .finally(() => setIsLoading(false));
  };

  const signInAsGuest = () => {
    if (!requestSignInAsGuest) {
      throw new Error("requestSignInAsGuest is not defined.");
    }

    setIsLoading(true);

    const guestId = localStorage.getItem(guestIdKey);

    return requestSignInAsGuest(guestId)
      .then((response) => {
        if (response?.errorCode) {
          return response;
        }

        localStorage.setItem(guestIdKey, response?.data?.id || "");

        return getSessionInfo()
          .then((result) => {
            if (!result?.errorCode) {
              setUser(result?.data ?? null);
            } else {
              setUser(null);
              response.withError(result.errorCode, result.message!);
            }
            return response;
          })
          .catch(() => {
            setUser(null);
            return response.withError(500, "Sign in error.");
          });
      })
      .finally(() => setIsLoading(false));
  };

  const logout = () => {
    requestLogout().then(() => {
      setUser(null);
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
