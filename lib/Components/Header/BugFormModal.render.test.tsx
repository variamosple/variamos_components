import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axeViolations } from "../../../test/renderWithContexts";
import { hasUnsavedInput } from "../../Hooks/unsavedInput";
import { DISCARD_TEXTS } from "../DiscardInput";
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

  it("closes on Cancel, on Escape and outside, at once when nothing was typed", async () => {
    const { onHide } = renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("dialog"));

    expect(onHide).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    [
      "the close button",
      () => userEvent.click(screen.getByRole("button", { name: "Close" })),
    ],
    [
      "Cancel",
      () => userEvent.click(screen.getByRole("button", { name: "Cancel" })),
    ],
    ["Escape", () => userEvent.keyboard("{Escape}")],
    ["a click outside", () => userEvent.click(screen.getByRole("dialog"))],
  ])("asks before %s drops the input", async (_way, close) => {
    const { onHide } = renderForm();
    await userEvent.type(screen.getByLabelText("Title *"), "Crash on save");

    await close();

    expect(onHide).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      DISCARD_TEXTS.question.en,
    );
    expect(
      screen.getByRole("button", { name: DISCARD_TEXTS.keepEditing.en }),
    ).toHaveFocus();
  });

  it("keeps the input, or drops it, as answered", async () => {
    const { onHide } = renderForm();
    await userEvent.type(screen.getByLabelText("Title *"), "Crash on save");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(
      screen.getByRole("button", { name: DISCARD_TEXTS.keepEditing.en }),
    );
    expect(onHide).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Title *")).toHaveValue("Crash on save");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(
      screen.getByRole("button", { name: DISCARD_TEXTS.discard.en }),
    );
    expect(onHide).toHaveBeenCalledOnce();
  });

  it("asks in the language of the page", async () => {
    document.documentElement.lang = "es";
    renderForm();
    await userEvent.type(screen.getByLabelText("Title *"), "Crash");

    await userEvent.keyboard("{Escape}");

    expect(screen.getByRole("alert")).toHaveTextContent(
      DISCARD_TEXTS.question.es,
    );
    document.documentElement.lang = "";
  });

  it("cannot be closed while sending", async () => {
    const { onHide } = renderForm({ isSubmitting: true });

    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("dialog"));

    expect(onHide).not.toHaveBeenCalled();
  });

  it("says that it holds input once something is typed, not before", async () => {
    renderForm();
    expect(hasUnsavedInput()).toBe(false);

    await userEvent.type(screen.getByLabelText("Title *"), "  ");
    expect(hasUnsavedInput()).toBe(false);
    await userEvent.type(screen.getByLabelText("Description *"), "Crash");
    expect(hasUnsavedInput()).toBe(true);
    // It lives in the header: leaving the page drops nothing of it
    expect(hasUnsavedInput({ leavingPage: true })).toBe(false);

    await userEvent.clear(screen.getByLabelText("Description *"));
    expect(hasUnsavedInput()).toBe(false);
    await userEvent.selectOptions(screen.getByLabelText("Category *"), "Model");
    expect(hasUnsavedInput()).toBe(true);
  });

  it("sends nothing while nothing can be saved, and keeps the input", async () => {
    const { onSubmit } = renderForm({ isReadOnly: true });

    await userEvent.type(screen.getByLabelText("Title *"), "Crash");
    expect(screen.getByRole("button", { name: "Report Bug" })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Title *")).toHaveValue("Crash");
  });

  describe("when the list of categories changes while it is open (EV-41)", () => {
    const renderWith = (categories: readonly string[]) => {
      const onSubmit = vi.fn();
      const form = (list: readonly string[]) => (
        <BugFormModal
          show
          onHide={vi.fn()}
          onSubmit={onSubmit}
          categories={list}
          isSubmitting={false}
        />
      );
      const { rerender } = render(form(categories));
      return {
        onSubmit,
        change: (list: readonly string[]) => rerender(form(list)),
      };
    };

    it("keeps the text typed and takes the first category of the new list", async () => {
      const { change } = renderWith(CATEGORIES);
      await fillIn();

      change(["Language", "Editor"]);

      expect(screen.getByLabelText("Title *")).toHaveValue("Save fails");
      expect(screen.getByLabelText("Description *")).toHaveValue(
        "Open a model, press save: nothing happens.",
      );
      expect(screen.getByLabelText("Category *")).toHaveValue("Language");
      expect(
        within(screen.getByLabelText("Category *"))
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(["Language", "Editor"]);
      expect(hasUnsavedInput()).toBe(true);
    });

    it("keeps the category chosen while the new list holds it", async () => {
      const { onSubmit, change } = renderWith(CATEGORIES);
      await fillIn();
      await userEvent.selectOptions(
        screen.getByLabelText("Category *"),
        "Model",
      );

      change(["Language", "Model"]);
      await userEvent.click(screen.getByRole("button", { name: "Report Bug" }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ category: "Model" }),
        undefined,
      );
    });

    it("sends a category of the new list when the one chosen left it", async () => {
      const { onSubmit, change } = renderWith(CATEGORIES);
      await fillIn();
      await userEvent.selectOptions(
        screen.getByLabelText("Category *"),
        "Model",
      );

      change(["Language", "Editor"]);
      expect(screen.getByLabelText("Category *")).toHaveValue("Language");
      await userEvent.click(screen.getByRole("button", { name: "Report Bug" }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ category: "Language" }),
        undefined,
      );
    });

    it("still closes at once when nothing was typed", () => {
      const { change } = renderWith(CATEGORIES);

      change(["Language", "Editor"]);

      expect(hasUnsavedInput()).toBe(false);
    });
  });

  it("has no accessibility violation", async () => {
    renderForm();

    const dialog = screen.getByRole("dialog", { name: "Report a New Bug" });
    expect(await axeViolations(dialog)).toEqual([]);
  });
});
