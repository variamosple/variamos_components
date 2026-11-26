import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Modal } from "react-bootstrap";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderWithContexts,
  routerOf,
  sessionInfoOf,
  userOf,
} from "../../../test/renderWithContexts";
import { useSession } from "../../Context";
import { useUnsavedInput } from "../../Hooks/unsavedInput";
import { AuthWrapper, SERVER_UNREACHABLE_SIGNED_IN, SESSION_TEXTS } from ".";

/** What the admin answers to GET /auth/session-info. */
type AdminState = "signed-in" | "down" | "signed-out";

const adminOf = () => {
  const admin = { state: "signed-in" as AdminState };
  const signedIn = sessionInfoOf(userOf());
  const signedOut = sessionInfoOf(null);
  const sessionInfo = vi.fn(() => {
    if (admin.state === "down") return Promise.reject(new Error("offline"));
    return admin.state === "signed-in" ? signedIn() : signedOut();
  });
  return { admin, sessionInfo };
};

/** A form that says when it holds input, and what it sends. */
const NoteForm = ({ onSave }: { onSave: (note: string) => void }) => {
  const [note, setNote] = useState("");
  useUnsavedInput(note.trim() !== "");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(note);
      }}
    >
      <label>
        Note
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button type="submit">Save</button>
    </form>
  );
};

const CheckButton = () => {
  const { checkSession } = useSession();
  return (
    <button type="button" onClick={checkSession}>
      Check
    </button>
  );
};

const minutes = (count: number) =>
  act(() => vi.advanceTimersByTimeAsync(count * 60_000));

function renderPage(sessionLifetimeMs?: number) {
  const { admin, sessionInfo } = adminOf();
  const router = routerOf();
  const onSave = vi.fn();
  renderWithContexts(
    <AuthWrapper redirectPath="/login">
      <NoteForm onSave={onSave} />
      <CheckButton />
    </AuthWrapper>,
    { router, sessionInfo, sessionLifetimeMs },
  );
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  return { admin, sessionInfo, router, onSave, user };
}

/** A page with input, and a dialog it opens. */
const DialogPage = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <NoteForm onSave={vi.fn()} />
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <Modal show={open} onHide={() => setOpen(false)} aria-label="Comment">
        <Modal.Body>
          <label>
            Comment
            <input />
          </label>
          <button type="button" onClick={() => setOpen(false)}>
            Done
          </button>
        </Modal.Body>
      </Modal>
    </>
  );
};

function renderDialogPage() {
  const { admin, sessionInfo } = adminOf();
  renderWithContexts(
    <AuthWrapper redirectPath="/login">
      <DialogPage />
    </AuthWrapper>,
    { router: routerOf(), sessionInfo },
  );
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  return { admin, user };
}

const typeNote = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(await screen.findByLabelText("Note"), "Half a report");
};

describe("AuthWrapper keeps the input of the page", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.lang = "";
    vi.restoreAllMocks();
  });

  it("becomes read only past the token lifetime, then saves again when the admin answers", async () => {
    const { admin, onSave, user } = renderPage(2 * 60_000);
    await typeNote(user);

    admin.state = "down";
    await minutes(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      SERVER_UNREACHABLE_SIGNED_IN,
    );
    await minutes(2);
    expect(screen.getByRole("status")).toHaveTextContent(
      SESSION_TEXTS.connectionLost.en,
    );

    // Nothing is sent, and nothing is lost
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Note")).toHaveValue("Half a report");

    admin.state = "signed-in";
    await minutes(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith("Half a report");
  });

  it("keeps a page with input when the session ends, without sending it to sign in", async () => {
    const { admin, router, onSave, user } = renderPage();
    await typeNote(user);

    admin.state = "signed-out";
    await minutes(1);
    expect(screen.getByRole("alert")).toHaveTextContent(
      SESSION_TEXTS.sessionClosed.en,
    );
    // Above the backdrop of an open dialog, so that its buttons stay usable
    expect(screen.getByRole("alert")).toHaveStyle({
      position: "sticky",
      zIndex: "1060",
    });
    expect(screen.getByLabelText("Note")).toHaveValue("Half a report");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(router.navigate).not.toHaveBeenCalled();

    // The input dropped, the page goes to sign in as before
    await user.clear(screen.getByLabelText("Note"));
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(router.navigate).toHaveBeenCalledWith(
      expect.stringMatching(/^\/login\?reason=session-expired&redirectTo=/),
    );
  });

  it("puts the banner into an open dialog, reached from the keyboard", async () => {
    const page = renderDialogPage();
    await typeNote(page.user);
    await page.user.click(screen.getByRole("button", { name: "Open dialog" }));
    const dialog = await screen.findByRole("dialog");

    page.admin.state = "signed-out";
    await minutes(1);
    const banner = within(dialog).getByRole("alert");
    expect(banner).toHaveTextContent(SESSION_TEXTS.sessionClosed.en);
    // Only one banner: the one of the page went into the dialog
    expect(screen.getAllByRole("alert")).toHaveLength(1);

    // The dialog keeps the focus inside it: the banner comes before its form
    within(dialog).getByLabelText("Comment").focus();
    await page.user.tab({ shift: true });
    expect(
      within(banner).getByRole("button", { name: SESSION_TEXTS.signInHere.en }),
    ).toHaveFocus();
    await page.user.tab({ shift: true });
    expect(
      within(banner).getByRole("button", {
        name: SESSION_TEXTS.signInNewTab.en,
      }),
    ).toHaveFocus();

    // The dialog closed, the banner is back above the page
    await page.user.click(within(dialog).getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      SESSION_TEXTS.sessionClosed.en,
    );
  });

  it("opens the session again after a sign-in in another tab", async () => {
    const { admin, onSave, user } = renderPage();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    await typeNote(user);
    admin.state = "signed-out";
    await minutes(1);

    await user.click(
      screen.getByRole("button", { name: SESSION_TEXTS.signInNewTab.en }),
    );
    expect(open).toHaveBeenCalledWith(
      window.location.href,
      "_blank",
      "noopener",
    );

    admin.state = "signed-in";
    await minutes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith("Half a report");
  });

  it("asks before signing in here, which drops the input", async () => {
    const { admin, router, user } = renderPage();
    await typeNote(user);
    admin.state = "signed-out";
    await minutes(1);

    await user.click(
      screen.getByRole("button", { name: SESSION_TEXTS.signInHere.en }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      SESSION_TEXTS.signInHereLoses.en,
    );
    await user.click(
      screen.getByRole("button", { name: SESSION_TEXTS.keepInput.en }),
    );
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(router.navigate).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: SESSION_TEXTS.signInHere.en }),
    );
    await user.click(
      screen.getByRole("button", { name: SESSION_TEXTS.dropInputAndSignIn.en }),
    );
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(router.navigate).toHaveBeenCalledWith(
      expect.stringMatching(/^\/login\?reason=session-expired&redirectTo=/),
    );
  });

  it("sends a page without input to sign in when the session ends", async () => {
    const { admin, router } = renderPage();
    await screen.findByLabelText("Note");

    admin.state = "signed-out";
    await minutes(1);
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(router.navigate).toHaveBeenCalledWith(
      expect.stringMatching(/^\/login\?reason=session-expired&redirectTo=/),
    );
    expect(screen.queryByLabelText("Note")).not.toBeInTheDocument();
  });

  it("checks the session when asked, after a refusal", async () => {
    const { sessionInfo, admin, user } = renderPage();
    await typeNote(user);
    const calls = sessionInfo.mock.calls.length;

    admin.state = "signed-out";
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(sessionInfo).toHaveBeenCalledTimes(calls + 1);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      SESSION_TEXTS.sessionClosed.en,
    );
  });

  it("speaks the language of the page", async () => {
    document.documentElement.lang = "fr";
    const { admin, user } = renderPage();
    await typeNote(user);
    admin.state = "signed-out";
    await minutes(1);
    expect(screen.getByRole("alert")).toHaveTextContent(
      SESSION_TEXTS.sessionClosed.fr,
    );
  });
});
