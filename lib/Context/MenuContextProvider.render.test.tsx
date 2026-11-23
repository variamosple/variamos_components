import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routerOf, sessionInfoOf, userOf } from "../../test/renderWithContexts";
import { type Menu, ResponseModel } from "../Model";
import {
  MENU_RETRY_DELAYS_MS,
  MenuContextProvider,
  useMenu,
} from "./MenuContext";
import { RouterContext } from "./RouterContext";
import { SessionProvider } from "./SessionContext";

const MENU: Menu = {
  items: [
    { title: "Projects", type: "location", location: "/projects" },
    {
      title: "Users",
      type: "location",
      location: "/users",
      allowedPermissions: ["users::query"],
    },
  ],
  subMenu: [
    {
      accessibleFrom: "/admin/",
      items: [
        { title: "Roles", location: "/roles" },
        {
          title: "Metrics",
          location: "/metrics",
          allowedPermissions: ["metrics::query"],
        },
      ],
    },
    { accessibleFrom: "/lab/", items: [{ title: "Runs", location: "/runs" }] },
  ],
  options: [
    { title: "Report a bug", location: "/#report-bug" },
    {
      title: "Lab settings",
      location: "/lab-settings",
      accessibleFrom: "/lab/",
    },
  ],
};

const MenuView = () => {
  const { items, subMenu, options, isLoading } = useMenu();
  const titles = (entries?: { title: string }[]) =>
    (entries ?? []).map((entry) => entry.title).join(", ");
  return (
    <ul>
      <li>items: {titles(items)}</li>
      <li>sub-menu: {titles(subMenu)}</li>
      <li>options: {titles(options)}</li>
      <li>{isLoading ? "loading" : "loaded"}</li>
    </ul>
  );
};

const menuAnswer = () =>
  Promise.resolve(new ResponseModel<Menu>().withData(MENU));

const renderMenu = (
  permissions: string[],
  basePath = "/admin/",
  requestMenu = vi.fn(menuAnswer),
) => {
  render(
    <RouterContext.Provider value={routerOf({ basePath })}>
      <SessionProvider
        loginUrl="/login"
        getSessionInfo={sessionInfoOf(userOf({ permissions }))}
        requestLogout={vi.fn()}
      >
        <MenuContextProvider requestMenu={requestMenu}>
          <MenuView />
        </MenuContextProvider>
      </SessionProvider>
    </RouterContext.Provider>,
  );
  return requestMenu;
};

describe("MenuContextProvider", () => {
  it("keeps the entries the user may see, for the application open", async () => {
    const requestMenu = renderMenu(["users::query"]);

    expect(
      await screen.findByText("items: Projects, Users"),
    ).toBeInTheDocument();
    expect(screen.getByText("sub-menu: Roles, Metrics")).toBeInTheDocument();
    expect(screen.getByText("options: Report a bug")).toBeInTheDocument();
    expect(requestMenu).toHaveBeenCalledOnce();
  });

  it("gives the sub-menu and options of another application", async () => {
    renderMenu([], "/lab/");

    expect(await screen.findByText("items: Projects")).toBeInTheDocument();
    expect(screen.getByText("sub-menu: Runs")).toBeInTheDocument();
    expect(
      screen.getByText("options: Report a bug, Lab settings"),
    ).toBeInTheDocument();
  });

  describe("after a failure", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("asks the menu again, after a pause", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const requestMenu = vi
        .fn()
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockResolvedValueOnce(
          new ResponseModel<Menu>(undefined, 502, "Bad gateway"),
        )
        .mockImplementation(menuAnswer);
      renderMenu([], "/admin/", requestMenu);

      await act(() => vi.advanceTimersByTimeAsync(MENU_RETRY_DELAYS_MS[0]));
      await act(() => vi.advanceTimersByTimeAsync(MENU_RETRY_DELAYS_MS[1]));

      expect(await screen.findByText("items: Projects")).toBeInTheDocument();
      expect(requestMenu).toHaveBeenCalledTimes(3);
    });

    it("stops after three more tries", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const requestMenu = vi
        .fn()
        .mockRejectedValue(new TypeError("Failed to fetch"));
      renderMenu([], "/admin/", requestMenu);

      for (const delay of MENU_RETRY_DELAYS_MS) {
        await act(() => vi.advanceTimersByTimeAsync(delay));
      }
      await act(() => vi.advanceTimersByTimeAsync(60_000));

      expect(requestMenu).toHaveBeenCalledTimes(4);
      expect(screen.getByText("items:")).toBeInTheDocument();
    });
  });
});
