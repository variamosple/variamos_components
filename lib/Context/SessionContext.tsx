import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Events } from "../Common";
import { usePageVisibility } from "../Hooks/usePageVisibility";
import {
  Credentials,
  ResponseModel,
  SessionInfoResponse,
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

const redirect = (location?: string) => {
  if (!location) {
    return;
  }

  Events.publish("variamosNavigate", location);
};

const setToken = (token?: string) => {
  if (!token) {
    return;
  }

  localStorage.setItem("authToken", token);
};

export interface SessionProviderProps {
  loginUrl: string;
  getSessionInfo: () => Promise<ResponseModel<SessionInfoResponse>>;
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
  const isAuthenticated = !!user;
  const isPageActive = usePageVisibility();

  useEffect(() => {
    setIsLoading(true);
    getSessionInfo()
      .then((result) => {
        if (!result?.errorCode) {
          setToken(result?.data?.authToken);
          setUser(result?.data?.user ?? null);
          redirect(result?.data?.redirect);
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
              setToken(result?.data?.authToken);
              setUser(result?.data?.user ?? null);
              redirect(result?.data?.redirect);
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
              setToken(result?.data?.authToken);
              setUser(result?.data?.user ?? null);
              redirect(result?.data?.redirect);
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
              setToken(result?.data?.authToken);
              setUser(result?.data?.user ?? null);
              redirect(result?.data?.redirect);
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
      localStorage.removeItem("authToken");
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
