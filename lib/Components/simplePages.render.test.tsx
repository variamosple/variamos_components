import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  axeViolations,
  renderWithContexts,
  routerOf,
} from "../../test/renderWithContexts";
import ConfirmationModal from "./ConfirmationModal";
import { Footer } from "./Footer";
import { NotAuthorized } from "./NotAuthorized";

describe("NotAuthorized", () => {
  it("says the page is refused and goes home", async () => {
    const router = routerOf();
    renderWithContexts(<NotAuthorized homePath="/home" />, { router });

    expect(
      screen.getByText("You are not authorized to access this page."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Go Home" }));
    expect(router.navigate).toHaveBeenCalledWith("/home");
  });
});

describe("Footer", () => {
  it("shows the version when given", () => {
    render(<Footer version="v4.2" />);

    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "Copyright 2023 VariaMos. v4.2",
    );
  });
});

describe("ConfirmationModal", () => {
  it("asks, then confirms or cancels", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmationModal
        show
        message="Delete this role?"
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Delete this role?" });
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).toHaveBeenCalledWith(expect.anything());
    expect(onCancel).toHaveBeenCalledWith(expect.anything());
    expect(await axeViolations(dialog)).toEqual([]);
  });
});
