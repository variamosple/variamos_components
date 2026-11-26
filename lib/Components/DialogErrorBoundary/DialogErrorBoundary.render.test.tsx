import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Events } from "../../Common";
import { DIALOG_ERROR_TEXTS, DialogErrorBoundary } from "./index";

const Broken = () => {
  throw new Error("Cannot read the role");
};

const page = (show: boolean, onClose: () => void, canReport?: boolean) => (
  <>
    <input aria-label="Page input" defaultValue="Kept" />
    <DialogErrorBoundary show={show} onClose={onClose} canReport={canReport}>
      {show ? <Broken /> : <p>Dialog closed</p>}
    </DialogErrorBoundary>
  </>
);

describe("DialogErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("says that the dialog stopped, keeps the page, and closes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onClose = vi.fn();
    const { rerender } = render(page(true, onClose));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      DIALOG_ERROR_TEXTS.failed.en,
    );
    expect(screen.getByLabelText("Page input")).toHaveValue("Kept");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();

    // Closed, the error is cleared
    rerender(page(false, onClose));
    expect(screen.getByText("Dialog closed")).toBeInTheDocument();
  });

  it("opens the global bug form with the error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const opened = vi.fn();
    Events.subscribe("openReportBugModal", opened);
    const onClose = vi.fn();
    render(page(true, onClose));

    await userEvent.click(
      await screen.findByRole("button", { name: "Report this problem" }),
    );
    expect(onClose).toHaveBeenCalledOnce();
    expect(opened).toHaveBeenCalledOnce();
    expect(opened.mock.calls[0]?.[0].detail.description).toContain(
      "Error: Cannot read the role",
    );
    Events.unsubscribe("openReportBugModal", opened);
  });

  it("offers no report when asked not to", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(page(true, vi.fn(), false));
    await screen.findByRole("alert");
    expect(
      screen.queryByRole("button", { name: "Report this problem" }),
    ).not.toBeInTheDocument();
  });
});
