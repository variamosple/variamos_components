import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { sessionInfoOf, userOf } from "../../test/renderWithContexts";
import { ResponseModel, type singInResponse } from "../Model";
import { SessionProvider, useSession } from "./SessionContext";

// The sign-in page of the admin: password first, then the code
const SignInView = () => {
  const session = useSession();
  const [answer, setAnswer] = useState("none");
  const show = (response: ResponseModel<singInResponse>) =>
    setAnswer(
      response.errorCode
        ? `error ${response.errorCode}`
        : `mfa ${String(response.data?.mfaRequired ?? false)}`,
    );
  return (
    <div>
      <p>{session.user?.name ?? "nobody"}</p>
      <p>answer: {answer}</p>
      <button
        type="button"
        onClick={() =>
          void session
            .signIn({ email: "ada@example.test", password: "x" })
            .then(show)
        }
      >
        Sign in
      </button>
      <button
        type="button"
        onClick={() =>
          void session.verifySecondFactor("123456", true).then(show)
        }
      >
        Send code
      </button>
    </div>
  );
};

const codeExpected = () =>
  Promise.resolve(
    new ResponseModel<singInResponse>().withData({
      redirect: "",
      mfaRequired: true,
      trustedDeviceDays: 14,
    }),
  );

const setUp = (
  requestSignInMfa: (
    code: string,
    rememberDevice: boolean,
  ) => Promise<ResponseModel<singInResponse>>,
) => {
  const user = userOf();
  let signedIn = false;
  const getSessionInfo = vi.fn(() => sessionInfoOf(signedIn ? user : null)());
  const requestMfa = vi.fn((code: string, rememberDevice: boolean) =>
    requestSignInMfa(code, rememberDevice).then((response) => {
      signedIn = !response.errorCode;
      return response;
    }),
  );
  render(
    <SessionProvider
      loginUrl="/login"
      getSessionInfo={getSessionInfo}
      requestLogout={vi.fn()}
      requestSignIn={codeExpected}
      requestSignInMfa={requestMfa}
    >
      <SignInView />
    </SessionProvider>,
  );
  return { user, getSessionInfo, requestMfa };
};

describe("SessionProvider, second factor", () => {
  it("gives back the answer that waits for the code, without loading a session", async () => {
    const { getSessionInfo } = setUp(() =>
      Promise.resolve(new ResponseModel<singInResponse>()),
    );
    await screen.findByText("nobody");
    const checks = getSessionInfo.mock.calls.length;

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("answer: mfa true")).toBeInTheDocument();
    expect(getSessionInfo).toHaveBeenCalledTimes(checks);
    expect(screen.getByText("nobody")).toBeInTheDocument();
  });

  it("opens the session once the code is right", async () => {
    const { user, requestMfa } = setUp(() =>
      Promise.resolve(
        new ResponseModel<singInResponse>().withData({ redirect: "/home" }),
      ),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Sign in" }),
    );
    await screen.findByText("answer: mfa true");

    await userEvent.click(screen.getByRole("button", { name: "Send code" }));

    expect(await screen.findByText(user.name)).toBeInTheDocument();
    expect(screen.getByText("answer: mfa false")).toBeInTheDocument();
    expect(requestMfa).toHaveBeenCalledWith("123456", true);
  });

  it("gives back a refused code without loading a session", async () => {
    const { getSessionInfo } = setUp(() =>
      Promise.resolve(
        new ResponseModel<singInResponse>(undefined, 400, "Wrong code"),
      ),
    );
    await screen.findByText("nobody");
    const checks = getSessionInfo.mock.calls.length;

    await userEvent.click(screen.getByRole("button", { name: "Send code" }));

    expect(await screen.findByText("answer: error 400")).toBeInTheDocument();
    expect(getSessionInfo).toHaveBeenCalledTimes(checks);
    expect(screen.getByText("nobody")).toBeInTheDocument();
  });

  it("does not remember the browser unless asked", async () => {
    const requestSignInMfa = vi.fn(() =>
      Promise.resolve(new ResponseModel<singInResponse>(undefined, 400)),
    );
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SessionProvider
        loginUrl="/login"
        getSessionInfo={sessionInfoOf(null)}
        requestLogout={vi.fn()}
        requestSignInMfa={requestSignInMfa}
      >
        {children}
      </SessionProvider>
    );
    const { result } = renderHook(() => useSession(), { wrapper });

    await result.current.verifySecondFactor("123456");

    expect(requestSignInMfa).toHaveBeenCalledWith("123456", false);
  });

  it("says that the request is missing, as for the other sign-ins", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SessionProvider
        loginUrl="/login"
        getSessionInfo={sessionInfoOf(null)}
        requestLogout={vi.fn()}
      >
        {children}
      </SessionProvider>
    );
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(() => result.current.verifySecondFactor("123456")).toThrow(
      "requestSignInMfa is not defined.",
    );
  });
});
