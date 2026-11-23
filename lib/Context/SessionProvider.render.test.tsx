import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sessionInfoOf, userOf } from "../../test/renderWithContexts";
import { Events } from "../Common";
import { ResponseModel, type singInResponse } from "../Model";
import { SessionProvider, useSession } from "./SessionContext";

const SessionView = () => {
  const session = useSession();
  return (
    <div>
      <p>{session.isLoading ? "loading" : "ready"}</p>
      <p>{session.user?.name ?? "nobody"}</p>
      <button type="button" onClick={session.logout}>
        Sign out
      </button>
      <button
        type="button"
        onClick={() =>
          void session.signIn({ email: "ada@example.test", password: "x" })
        }
      >
        Sign in
      </button>
      <button type="button" onClick={() => void session.signInAsGuest()}>
        Guest
      </button>
    </div>
  );
};

const signInAnswer = () => Promise.resolve(new ResponseModel<singInResponse>());

describe("SessionProvider", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("gives the user of the session to the page", async () => {
    render(
      <SessionProvider
        loginUrl="/login"
        getSessionInfo={sessionInfoOf(userOf())}
        requestLogout={vi.fn()}
      >
        <SessionView />
      </SessionProvider>,
    );

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ready")).toBeInTheDocument();
  });

  it("signs out, then sends the page to the sign-in address", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const navigation = vi.fn();
    const onNavigate = (event: CustomEvent<string>) => navigation(event.detail);
    Events.subscribe("variamosNavigate", onNavigate);
    const requestLogout = vi.fn(() =>
      Promise.resolve(new ResponseModel<void>()),
    );
    render(
      <SessionProvider
        loginUrl="/login"
        getSessionInfo={sessionInfoOf(userOf())}
        requestLogout={requestLogout}
      >
        <SessionView />
      </SessionProvider>,
    );
    await screen.findByText("Ada Lovelace");

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(requestLogout).toHaveBeenCalledWith();
    expect(navigation).toHaveBeenCalledWith("/login");
    expect(screen.getByText("nobody")).toBeInTheDocument();
    Events.unsubscribe("variamosNavigate", onNavigate);
    vi.useRealTimers();
  });

  it("reads the session again after a sign in", async () => {
    const user = userOf();
    let signedIn = false;
    const getSessionInfo = vi.fn(() => sessionInfoOf(signedIn ? user : null)());
    const requestSignIn = vi.fn(() => {
      signedIn = true;
      return signInAnswer();
    });
    render(
      <SessionProvider
        loginUrl="/login"
        getSessionInfo={getSessionInfo}
        requestLogout={vi.fn()}
        requestSignIn={requestSignIn}
      >
        <SessionView />
      </SessionProvider>,
    );
    await screen.findByText("nobody");

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText(user.name)).toBeInTheDocument();
    expect(requestSignIn).toHaveBeenCalledWith({
      email: "ada@example.test",
      password: "x",
    });
  });

  it("keeps the guest id from one guest sign in to the next", async () => {
    const guest = userOf({ id: "guest-7", name: "Guest" });
    const requestSignInAsGuest = vi.fn(() =>
      Promise.resolve(
        new ResponseModel<singInResponse>().withData({
          id: "guest-7",
          redirect: "",
        }),
      ),
    );
    localStorage.setItem("guestId", "guest-7");
    render(
      <SessionProvider
        loginUrl="/login"
        getSessionInfo={sessionInfoOf(guest)}
        requestLogout={vi.fn()}
        requestSignInAsGuest={requestSignInAsGuest}
      >
        <SessionView />
      </SessionProvider>,
    );
    await screen.findByText("Guest");

    await userEvent.click(screen.getByRole("button", { name: "Guest" }));

    await waitFor(() =>
      expect(requestSignInAsGuest).toHaveBeenCalledWith("guest-7"),
    );
    expect(localStorage.getItem("guestId")).toBe("guest-7");
  });
});
