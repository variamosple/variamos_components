import type {
  Credentials,
  ResponseModel,
  SessionInfoResponse,
  singInResponse,
} from "../Model";
import { keepGuestId, readGuestId } from "./guestId";
import { readSessionAnswer, type SessionAnswer } from "./sessionAnswer";
import { UNAVAILABLE_ANSWER } from "./useWatchedSession";

const SIGN_IN_ERROR = "Sign in error.";

type SignInAnswer = Promise<ResponseModel<singInResponse>>;

export interface SignInRequests {
  getSessionInfo: () => Promise<ResponseModel<SessionInfoResponse>>;
  requestSignIn?: (request: Credentials) => SignInAnswer;
  requestSignInAsGuest?: (guestId?: string | null) => SignInAnswer;
  requestSignInMfa?: (code: string, rememberDevice: boolean) => SignInAnswer;
}

interface SessionState {
  applyAnswer: (answer: SessionAnswer) => void;
  setIsLoading: (isLoading: boolean) => void;
}

/** The ways to open a session: password, second factor, guest. */
export function useSignIn(
  {
    getSessionInfo,
    requestSignIn,
    requestSignInAsGuest,
    requestSignInMfa,
  }: SignInRequests,
  { applyAnswer, setIsLoading }: SessionState,
) {
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

  const loading = (answer: SignInAnswer) => {
    setIsLoading(true);
    return answer.finally(() => setIsLoading(false));
  };

  const signIn = (credentials: Credentials) => {
    if (!requestSignIn) {
      throw new Error("requestSignIn is not defined.");
    }
    return loading(
      requestSignIn(credentials).then((response) =>
        // The code is still expected: there is no session to load yet
        response?.errorCode || response?.data?.mfaRequired === true
          ? response
          : completeSignIn(response),
      ),
    );
  };

  const verifySecondFactor = (code: string, rememberDevice = false) => {
    if (!requestSignInMfa) {
      throw new Error("requestSignInMfa is not defined.");
    }
    return loading(
      requestSignInMfa(code, rememberDevice).then((response) =>
        response?.errorCode ? response : completeSignIn(response),
      ),
    );
  };

  const signInAsGuest = () => {
    if (!requestSignInAsGuest) {
      throw new Error("requestSignInAsGuest is not defined.");
    }
    return loading(
      requestSignInAsGuest(readGuestId()).then((response) => {
        if (response?.errorCode) return response;
        keepGuestId(response?.data?.id);
        return completeSignIn(response);
      }),
    );
  };

  return { signIn, verifySecondFactor, signInAsGuest };
}
