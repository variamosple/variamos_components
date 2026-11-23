import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  axeViolations,
  fakeNotificationService,
  notificationOf,
  renderWithContexts,
  userOf,
} from "../../../test/renderWithContexts";
import { NotificationBell } from "./NotificationBell";
import { NotificationDrawer } from "./NotificationDrawer";

vi.mock("socket.io-client", () => ({
  io: () => ({ on: vi.fn(), disconnect: vi.fn() }),
}));

const SERVICE = "https://notifications.example.test";

const openDrawer = async (
  inbox = [
    notificationOf("n-1", "Smart home"),
    notificationOf("n-2", "Robots", true),
  ],
  trash = [notificationOf("n-3", "Old project", true)],
) => {
  const service = fakeNotificationService(inbox, trash);
  vi.stubGlobal("fetch", service.fetchImpl);
  const user = userOf();
  renderWithContexts(
    <>
      <NotificationBell />
      <NotificationDrawer show onClose={vi.fn()} />
    </>,
    { user, notificationsUrl: SERVICE },
  );
  const drawer = await screen.findByRole("dialog");
  // The inbox is shown once the service answered
  await waitFor(() =>
    expect(service.calls).toContain("GET ?page=1&limit=10&folder=inbox"),
  );
  if (inbox.length > 0) {
    await within(drawer).findAllByText(/has been created/);
  } else {
    await within(drawer).findByText("Your inbox is empty!");
  }
  return { drawer, calls: service.calls };
};

describe("NotificationDrawer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists the inbox and counts the unread notifications on the bell", async () => {
    const { drawer } = await openDrawer();

    expect(
      within(drawer).getByText(
        "The project 'Smart home' has been created successfully.",
      ),
    ).toBeInTheDocument();
    expect(within(drawer).getByText(/'Robots'/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toHaveTextContent("1");
  });

  it("marks one, then all notifications as read", async () => {
    const { drawer, calls } = await openDrawer([
      notificationOf("n-1", "Smart home"),
      notificationOf("n-2", "Robots"),
    ]);

    const [first] = within(drawer).getAllByTitle("Mark as read");
    await userEvent.click(first);
    await waitFor(() => expect(calls).toContain("PATCH /n-1/read"));
    expect(within(drawer).getAllByTitle("Mark as read")).toHaveLength(1);

    await userEvent.click(
      within(drawer).getByRole("button", { name: "Mark all as read" }),
    );
    await waitFor(() => expect(calls).toContain("PATCH /read-all"));
    expect(within(drawer).queryByTitle("Mark as read")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).not.toHaveTextContent(/\d/);
  });

  it("moves a notification to the trash", async () => {
    const { drawer, calls } = await openDrawer();

    const [first] = within(drawer).getAllByTitle("Move to trash");
    await userEvent.click(first);

    await waitFor(() => expect(calls).toContain("DELETE /n-1"));
    expect(within(drawer).queryByText(/Smart home/)).not.toBeInTheDocument();
  });

  it("shows the trash and empties it", async () => {
    const { drawer, calls } = await openDrawer();

    await userEvent.click(
      within(drawer).getByRole("button", { name: "Trash" }),
    );
    expect(await within(drawer).findByText(/Old project/)).toBeInTheDocument();
    expect(calls).toContain("GET ?page=1&limit=10&folder=trash");

    await userEvent.click(
      within(drawer).getByRole("button", { name: "Empty Trash" }),
    );
    await waitFor(() => expect(calls).toContain("DELETE /trash"));
    expect(
      await within(drawer).findByText("No deleted notifications."),
    ).toBeInTheDocument();
  });

  it("says when the inbox is empty", async () => {
    const { drawer } = await openDrawer([], []);

    expect(
      within(drawer).getByText("Your inbox is empty!"),
    ).toBeInTheDocument();
  });

  it("changes the preferences from the settings", async () => {
    const { drawer, calls } = await openDrawer();

    await userEvent.click(
      within(drawer).getByRole("button", { name: "Notification Settings" }),
    );
    const email = await within(drawer).findByRole("checkbox", {
      name: "Email Alerts",
    });
    expect(email).toBeChecked();

    await userEvent.click(email);
    await waitFor(() => expect(email).not.toBeChecked());
    expect(calls).toContain("PATCH /preferences");

    await userEvent.click(within(drawer).getByRole("button", { name: "Back" }));
    expect(
      within(drawer).getByRole("button", { name: "Inbox" }),
    ).toBeInTheDocument();
  });

  it("has no accessibility violation", async () => {
    const { drawer } = await openDrawer();

    expect(drawer).toHaveAccessibleName("Notifications");
    expect(await axeViolations(drawer)).toEqual([]);
  });
});
