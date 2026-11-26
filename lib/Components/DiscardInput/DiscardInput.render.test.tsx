import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { axeViolations } from "../../../test/renderWithContexts";
import { hasUnsavedInput } from "../../Hooks/unsavedInput";
import {
  DISCARD_TEXTS,
  DiscardInputPrompt,
  useDiscardConfirmation,
} from "./index";

const NoteForm = ({ onClose }: { onClose: () => void }) => {
  const [note, setNote] = useState("");
  const closing = useDiscardConfirmation({
    holdsInput: note.trim() !== "",
    onClose,
  });
  return (
    <div>
      <label>
        Note
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button type="button" onClick={closing.requestClose}>
        Cancel
      </button>
      {closing.isConfirming ? (
        <DiscardInputPrompt
          onKeepEditing={closing.keepEditing}
          onDiscard={closing.discard}
        />
      ) : null}
    </div>
  );
};

describe("useDiscardConfirmation", () => {
  it("closes at once without input, and asks with input", async () => {
    const onClose = vi.fn();
    render(<NoteForm onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();

    await userEvent.type(screen.getByLabelText("Note"), "Draft");
    expect(hasUnsavedInput()).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toHaveTextContent(
      DISCARD_TEXTS.question.en,
    );
  });

  it("stops asking once the input is gone", async () => {
    render(<NoteForm onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Note"), "Draft");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await userEvent.clear(screen.getByLabelText("Note"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(hasUnsavedInput()).toBe(false);
  });

  it("asks a question of the form's own, when given", () => {
    render(
      <DiscardInputPrompt
        question="Discard this comment?"
        onKeepEditing={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Discard this comment?",
    );
  });

  it("has no accessibility violation", async () => {
    const { container } = render(
      <DiscardInputPrompt onKeepEditing={vi.fn()} onDiscard={vi.fn()} />,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
