import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { routerOf, sessionInfoOf, userOf } from "../../test/renderWithContexts";
import { type Menu, ResponseModel } from "../Model";
import { MenuContextProvider, useMenu } from "./MenuContext";
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

const renderMenu = (permissions: string[], basePath = "/admin/") => {
  const requestMenu = vi.fn(() =>
    Promise.resolve(new ResponseModel<Menu>().withData(MENU)),
  );
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
});
