import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  renderWithContexts,
  routerOf,
  userOf,
} from "../../../test/renderWithContexts";
import { ProtectedRoute } from "../ProtectedRoute";
import { AuthWrapper, SERVER_UNREACHABLE_FIRST_LOAD } from "./index";

describe("AuthWrapper", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the page of a signed-in user", async () => {
    renderWithContexts(
      <AuthWrapper redirectPath="/login">
        <p>Private page</p>
      </AuthWrapper>,
      { user: userOf() },
    );

    expect(await screen.findByText("Private page")).toBeInTheDocument();
  });

  it("sends a signed-out visitor to sign in, with the way back", async () => {
    const router = routerOf();
    renderWithContexts(
      <AuthWrapper redirectPath="/login">
        <p>Private page</p>
      </AuthWrapper>,
      { router },
    );

    // The address is encoded, then encoded again as a parameter
    const redirectTo = encodeURIComponent(
      encodeURIComponent(window.location.href),
    );
    await vi.waitFor(() =>
      expect(router.navigate).toHaveBeenCalledWith(
        `/login?redirectTo=${redirectTo}`,
      ),
    );
    expect(screen.queryByText("Private page")).not.toBeInTheDocument();
    // Never signed in on this page: no ended session to tell
    expect(router.navigate).not.toHaveBeenCalledWith(
      expect.stringContaining("reason="),
    );
  });

  it("waits, without sending anywhere, when the admin does not answer", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const router = routerOf();
    renderWithContexts(
      <AuthWrapper redirectPath="/login">
        <p>Private page</p>
      </AuthWrapper>,
      { router, sessionInfo: () => Promise.reject(new Error("offline")) },
    );

    expect(
      await screen.findByText(SERVER_UNREACHABLE_FIRST_LOAD),
    ).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

describe("ProtectedRoute", () => {
  it("shows the page to a user with one of the permissions", async () => {
    renderWithContexts(
      <ProtectedRoute
        allowedPermissions={["users::query"]}
        notAuthorizedPath="/403"
      >
        <p>Users</p>
      </ProtectedRoute>,
      { user: userOf({ permissions: ["users::query"] }) },
    );

    expect(await screen.findByText("Users")).toBeInTheDocument();
  });

  it("sends a user without the permission to the refusal page", async () => {
    const router = routerOf();
    renderWithContexts(
      <ProtectedRoute
        allowedPermissions={["users::query"]}
        notAuthorizedPath="/403"
      >
        <p>Users</p>
      </ProtectedRoute>,
      { user: userOf({ permissions: ["projects::query"] }), router },
    );

    await vi.waitFor(() =>
      expect(router.navigate).toHaveBeenCalledWith("/403"),
    );
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });

  it("shows a page that asks no permission", async () => {
    renderWithContexts(
      <ProtectedRoute notAuthorizedPath="/403">
        <p>Home</p>
      </ProtectedRoute>,
      { user: userOf() },
    );

    expect(await screen.findByText("Home")).toBeInTheDocument();
  });
});
