import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  axeViolations,
  renderWithContexts,
  routerOf,
  sessionInfoOf,
  userOf,
} from "../../../test/renderWithContexts";
import { Events } from "../../Common";
import { useUnsavedInput } from "../../Hooks/unsavedInput";
import { ResponseModel } from "../../Model";
import { Header, openBugReport } from "./index";
import { LOGOUT_FAILED } from "./signOut";

// The notification provider opens a socket once signed in
vi.mock("socket.io-client", () => ({
  io: () => ({ on: vi.fn(), disconnect: vi.fn() }),
}));

// A form of the page that holds unsaved input
const PageForm = () => {
  useUnsavedInput(true);
  return null;
};

const emptyAnswer = () => Promise.resolve(Response.json({ data: [] }));

describe("Header", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(emptyAnswer));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("offers to sign in when no one is signed in", async () => {
    const router = routerOf();
    renderWithContexts(<Header signInUrl="/login" />, { router });

    const signIn = await screen.findByRole("button", { name: "Sign In" });
    expect(
      screen.queryByRole("button", { name: "Notifications" }),
    ).not.toBeInTheDocument();

    await userEvent.click(signIn);
    expect(router.navigate).toHaveBeenCalledWith("/login", {
      target: "_self",
    });
  });

  it("shows the menu, the bell and the account of a signed-in user", async () => {
    const user = userOf();
    renderWithContexts(<Header signInUrl="/login" />, {
      user,
      notificationsUrl: "https://notifications.example.test",
      menu: {
        items: [
          { title: "Projects", type: "location", location: "/projects" },
          {
            title: "Admin",
            type: "dropdown",
            children: [{ title: "Users", location: "/users" }],
          },
        ],
      },
    });

    expect(await screen.findByText(user.name)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Projects" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Admin" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign In" }),
    ).not.toBeInTheDocument();
  });

  it("signs out from the account menu", async () => {
    const user = userOf();
    const requestLogout = vi.fn(() =>
      Promise.resolve(new ResponseModel<void>()),
    );
    renderWithContexts(<Header signInUrl="/login" />, {
      user,
      requestLogout,
      notificationsUrl: "https://notifications.example.test",
    });

    await userEvent.click(await screen.findByText(user.name));
    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(requestLogout).toHaveBeenCalledWith();
  });

  it("asks before signing out drops unsaved input, and keeps it on demand", async () => {
    const user = userOf();
    const requestLogout = vi.fn(() =>
      Promise.resolve(new ResponseModel<void>()),
    );
    renderWithContexts(
      <>
        <Header signInUrl="/login" />
        <PageForm />
      </>,
      {
        user,
        requestLogout,
        notificationsUrl: "https://notifications.example.test",
      },
    );

    await userEvent.click(await screen.findByText(user.name));
    await userEvent.click(screen.getByRole("button", { name: "Logout" }));
    const question = await screen.findByRole("dialog", {
      name: "Sign out? What you typed on this page will be lost.",
    });
    // The answer that loses nothing has the focus
    const keep = within(question).getByRole("button", {
      name: "Keep editing",
    });
    await waitFor(() => expect(keep).toHaveFocus());
    await userEvent.click(keep);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(requestLogout).not.toHaveBeenCalled();

    // Escape keeps editing too
    await userEvent.click(screen.getByText(user.name));
    await userEvent.click(screen.getByRole("button", { name: "Logout" }));
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(requestLogout).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText(user.name));
    await userEvent.click(screen.getByRole("button", { name: "Logout" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Sign out",
      }),
    );
    expect(requestLogout).toHaveBeenCalledWith();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  // cspell:disable -- texts in Spanish
  it("asks before signing out in the language of the page", async () => {
    document.documentElement.lang = "es";
    try {
      const user = userOf();
      renderWithContexts(
        <>
          <Header signInUrl="/login" />
          <PageForm />
        </>,
        { user, notificationsUrl: "https://notifications.example.test" },
      );
      await userEvent.click(await screen.findByText(user.name));
      await userEvent.click(screen.getByRole("button", { name: "Logout" }));
      const question = await screen.findByRole("dialog");
      expect(question).toHaveTextContent(
        "¿Cerrar sesión? Lo que escribió en esta página se perderá.",
      );
      expect(
        within(question).getByRole("button", { name: "Seguir editando" }),
      ).toBeInTheDocument();
      expect(
        within(question).getByRole("button", { name: "Cerrar sesión" }),
      ).toBeInTheDocument();
    } finally {
      document.documentElement.lang = "";
    }
  });
  // cspell:enable

  it("says when the sign out failed", async () => {
    const user = userOf();
    renderWithContexts(<Header signInUrl="/login" />, {
      user,
      requestLogout: () =>
        Promise.resolve(new ResponseModel<void>(undefined, 500, "Down")),
      notificationsUrl: "https://notifications.example.test",
    });

    await userEvent.click(await screen.findByText(user.name));
    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(LOGOUT_FAILED);
    await userEvent.click(screen.getByRole("button", { name: "Close alert" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("opens the bug form from its menu option and from the event", async () => {
    const user = userOf();
    renderWithContexts(<Header signInUrl="/login" />, {
      user,
      notificationsUrl: "https://notifications.example.test",
      menu: {
        options: [{ title: "Report a bug", location: "/#report-bug" }],
      },
    });

    await userEvent.click(await screen.findByText(user.name));
    await userEvent.click(screen.getByRole("button", { name: "Report a bug" }));
    const form = await screen.findByRole("dialog");
    expect(within(form).getByText("Report a New Bug")).toBeInTheDocument();

    await userEvent.click(within(form).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    Events.publish("openReportBugModal", {});
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("opens the bug form filled, and closes it at once while untouched", async () => {
    const user = userOf();
    renderWithContexts(<Header signInUrl="/login" />, {
      user,
      notificationsUrl: "https://notifications.example.test",
    });
    await screen.findByText(user.name);

    openBugReport({ title: "Error on /roles", description: "Cannot read x" });
    const form = await screen.findByRole("dialog", {
      name: "Report a New Bug",
    });
    expect(within(form).getByLabelText("Title *")).toHaveValue(
      "Error on /roles",
    );
    expect(within(form).getByLabelText("Description *")).toHaveValue(
      "Cannot read x",
    );
    await userEvent.click(within(form).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    // Opened again from the menu, it is empty; a published text that is not
    // a string is not taken
    Events.publish("openReportBugModal", { title: 42 });
    const again = await screen.findByRole("dialog");
    expect(within(again).getByLabelText("Title *")).toHaveValue("");
  });

  it.each([
    [undefined, "/bugs"],
    [
      "https://app.example.test/variamos_ms_admin/v1",
      "https://app.example.test/variamos_ms_admin/bugs",
    ],
  ])(
    "sends a bug report next to the admin API %s",
    async (adminApiUrl, address) => {
      const user = userOf();
      renderWithContexts(
        <Header signInUrl="/login" adminApiUrl={adminApiUrl} />,
        {
          user,
          notificationsUrl: "https://notifications.example.test",
        },
      );
      await screen.findByText(user.name);

      Events.publish("openReportBugModal", {});
      const form = await screen.findByRole("dialog", {
        name: "Report a New Bug",
      });
      await userEvent.type(
        within(form).getByLabelText("Title *"),
        "Save fails",
      );
      await userEvent.type(
        within(form).getByLabelText("Description *"),
        "Nothing happens on save.",
      );
      await userEvent.click(
        within(form).getByRole("button", { name: "Report Bug" }),
      );

      await waitFor(() =>
        expect(fetch).toHaveBeenCalledWith(
          address,
          expect.objectContaining({ method: "POST" }),
        ),
      );
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    },
  );

  it("keeps the form, its text and its file when the report is refused", async () => {
    const refused = (input: RequestInfo | URL) =>
      String(input) === "/bugs"
        ? Promise.resolve(
            Response.json(
              { errorCode: 400, message: "Title too long" },
              { status: 400 },
            ),
          )
        : emptyAnswer();
    vi.stubGlobal("fetch", vi.fn(refused));
    const user = userOf();
    renderWithContexts(<Header signInUrl="/login" />, {
      user,
      notificationsUrl: "https://notifications.example.test",
    });
    await screen.findByText(user.name);

    Events.publish("openReportBugModal", {});
    const form = await screen.findByRole("dialog", {
      name: "Report a New Bug",
    });
    await userEvent.type(within(form).getByLabelText("Title *"), "Save fails");
    await userEvent.type(
      within(form).getByLabelText("Description *"),
      "Nothing happens on save.",
    );
    await userEvent.upload(
      within(form).getByLabelText("Attachment (Optional)"),
      new File(["trace"], "trace.txt", { type: "text/plain" }),
    );
    await userEvent.click(
      within(form).getByRole("button", { name: "Report Bug" }),
    );

    expect(await within(form).findByRole("alert")).toHaveTextContent(
      "Title too long",
    );
    expect(screen.getByRole("dialog")).toBe(form);
    expect(within(form).getByLabelText("Title *")).toHaveValue("Save fails");
    expect(within(form).getByLabelText("Description *")).toHaveValue(
      "Nothing happens on save.",
    );
    expect(within(form).getByText("Selected file: trace.txt")).toBeVisible();
  });

  it("checks the session after a refused report, and keeps the report when it is over", async () => {
    const refused = (input: RequestInfo | URL) =>
      String(input) === "/bugs"
        ? Promise.resolve(
            Response.json(
              { errorCode: 401, message: "Unauthorized" },
              { status: 401 },
            ),
          )
        : emptyAnswer();
    vi.stubGlobal("fetch", vi.fn(refused));
    const user = userOf();
    let sessionOpen = true;
    const sessionInfo = vi.fn(() => sessionInfoOf(sessionOpen ? user : null)());
    renderWithContexts(<Header signInUrl="/login" />, {
      user,
      sessionInfo,
      notificationsUrl: "https://notifications.example.test",
    });
    await screen.findByText(user.name);

    Events.publish("openReportBugModal", {});
    const form = await screen.findByRole("dialog", {
      name: "Report a New Bug",
    });
    await userEvent.type(within(form).getByLabelText("Title *"), "Save fails");
    await userEvent.type(
      within(form).getByLabelText("Description *"),
      "Nothing happens on save.",
    );
    const checks = sessionInfo.mock.calls.length;
    sessionOpen = false;
    await userEvent.click(
      within(form).getByRole("button", { name: "Report Bug" }),
    );

    expect(await within(form).findByRole("alert")).toHaveTextContent(
      "Unauthorized",
    );
    await vi.waitFor(() =>
      expect(sessionInfo).toHaveBeenCalledTimes(checks + 1),
    );
    await vi.waitFor(() =>
      expect(
        within(form).getByRole("button", { name: "Report Bug" }),
      ).toBeDisabled(),
    );
    expect(screen.getByText(user.name)).toBeInTheDocument();
    expect(within(form).getByLabelText("Title *")).toHaveValue("Save fails");
  });

  it("goes home from the logo and to the content from the skip link", async () => {
    const router = routerOf();
    renderWithContexts(
      <>
        <Header signInUrl="/login" logoUrl="/logo.svg" logoAlt="VariaMos" />
        <main id="main-content" tabIndex={-1}>
          Page
        </main>
      </>,
      { router },
    );
    await screen.findByRole("button", { name: "Sign In" });

    await userEvent.click(screen.getByRole("link", { name: "VariaMos" }));
    expect(router.navigate).toHaveBeenCalledWith("/");

    await userEvent.click(
      screen.getByRole("link", { name: "Skip to main content" }),
    );
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("shows the sub-menu entries the user may open", async () => {
    const router = routerOf();
    const user = userOf({ permissions: ["roles::query"] });
    renderWithContexts(<Header signInUrl="/login" />, {
      user,
      router,
      notificationsUrl: "https://notifications.example.test",
      menu: {
        subMenu: [
          { title: "Roles", location: "/roles" },
          {
            title: "Metrics",
            location: "/metrics",
            allowedPermissions: ["metrics::query"],
          },
        ],
      },
    });
    await screen.findByText(user.name);

    expect(
      screen.queryByRole("button", { name: "Metrics" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Roles" }));
    expect(router.navigate).toHaveBeenCalledWith("/roles");
  });

  it("has no accessibility violation, signed out or signed in", async () => {
    const signedOut = renderWithContexts(<Header signInUrl="/login" />);
    await screen.findByRole("button", { name: "Sign In" });
    expect(await axeViolations(signedOut.container)).toEqual([]);
    signedOut.unmount();

    const user = userOf();
    const signedIn = renderWithContexts(<Header signInUrl="/login" />, {
      user,
      notificationsUrl: "https://notifications.example.test",
      menu: {
        items: [{ title: "Projects", type: "location", location: "/p" }],
      },
    });
    await screen.findByText(user.name);
    expect(await axeViolations(signedIn.container)).toEqual([]);
  });
});
