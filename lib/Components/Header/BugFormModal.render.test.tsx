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

  const fillIn = async () => {
    await userEvent.type(screen.getByLabelText("Title *"), "Save fails");
    await userEvent.type(
      screen.getByLabelText("Description *"),
      "Open a model, press save: nothing happens.",
    );
  };

  it("names the file chosen, and sends none once it is removed", async () => {
    const { onSubmit } = renderForm();
    const input = screen.getByLabelText("Attachment (Optional)");
    await fillIn();
    await userEvent.upload(
      input,
      new File(["trace"], "trace.txt", { type: "text/plain" }),
    );

    expect(screen.getByText("Selected file: trace.txt")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Remove the file trace.txt" }),
    );

    expect(screen.queryByText(/Selected file/)).not.toBeInTheDocument();
    expect(input).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Report Bug" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Save fails" }),
      undefined,
    );
  });

  it("sends no file once the file dialog is cancelled", async () => {
    const { onSubmit } = renderForm();
    const input = screen.getByLabelText("Attachment (Optional)");
    await fillIn();
    await userEvent.upload(
      input,
      new File(["trace"], "trace.txt", { type: "text/plain" }),
    );

    // A cancelled dialog leaves the input empty
    await userEvent.upload(input, []);

    expect(screen.queryByText(/Selected file/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Report Bug" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Save fails" }),
      undefined,
    );
  });

  it("shows why the last sending failed", () => {
    renderForm({ errorMessage: "Failed to submit bug. Please try again." });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Failed to submit bug. Please try again.",
    );
  });

  it("locks its buttons and cannot be closed while sending", () => {
    renderForm({ isSubmitting: true });

    expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });

  it("closes from its close button when not sending", async () => {
    const { onHide } = renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onHide).toHaveBeenCalledOnce();
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
