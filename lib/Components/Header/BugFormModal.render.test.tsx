import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axeViolations } from "../../../test/renderWithContexts";
import { BugFormModal } from "./BugFormModal";

const CATEGORIES = ["Editor", "Model", "Other"];

const renderForm = (
  props: Partial<Parameters<typeof BugFormModal>[0]> = {},
) => {
  const onSubmit = vi.fn();
  const onHide = vi.fn();
  render(
    <BugFormModal
      show
      onHide={onHide}
      onSubmit={onSubmit}
      categories={CATEGORIES}
      isSubmitting={false}
      {...props}
    />,
  );
  return { onSubmit, onHide };
};

describe("BugFormModal", () => {
  it("names the empty required fields once sent, and sends nothing", async () => {
    const { onSubmit } = renderForm();

    expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Report Bug" }));

    expect(screen.getByLabelText("Title *")).toBeInvalid();
    expect(screen.getByLabelText("Description *")).toBeInvalid();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends the report with its category, component and file", async () => {
    const { onSubmit } = renderForm();
    const file = new File(["trace"], "trace.txt", { type: "text/plain" });

    await userEvent.type(screen.getByLabelText("Title *"), "Save fails");
    await userEvent.type(
      screen.getByLabelText("Description *"),
      "Open a model, press save: nothing happens.",
    );
    await userEvent.selectOptions(screen.getByLabelText("Category *"), "Model");
    await userEvent.upload(
      screen.getByLabelText("Attachment (Optional)"),
      file,
    );
    await userEvent.click(screen.getByRole("button", { name: "Report Bug" }));

    expect(onSubmit).toHaveBeenCalledWith(
      {
        title: "Save fails",
        description: "Open a model, press save: nothing happens.",
        category: "Model",
        component: "",
      },
      file,
    );
  });

  it("shows why the last sending failed", () => {
    renderForm({ errorMessage: "Failed to submit bug. Please try again." });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Failed to submit bug. Please try again.",
    );
  });

  it("locks its buttons while sending", () => {
    renderForm({ isSubmitting: true });

    expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("closes on Cancel", async () => {
    const { onHide } = renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onHide).toHaveBeenCalledWith(expect.anything());
  });

  it("has no accessibility violation", async () => {
    renderForm();

    const dialog = screen.getByRole("dialog", { name: "Report a New Bug" });
    expect(await axeViolations(dialog)).toEqual([]);
  });
});
