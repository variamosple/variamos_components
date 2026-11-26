import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button } from "react-bootstrap";
import { type PageTexts, pageText } from "../../Common/pageText";
import { useUnsavedInput } from "../../Hooks/unsavedInput";

interface DiscardConfirmationOptions {
  /** The form holds unsaved input, in the sense of isUnsavedInput. */
  holdsInput: boolean;
  /** Closes the form, input dropped. */
  onClose: () => void;
}

/**
 * Closing a form that holds unsaved input asks first (UX-08): give
 * `requestClose` to every way of closing (close button, Cancel, Escape, a
 * click outside), and show `DiscardInputPrompt` while `isConfirming`. A
 * form without input closes at once. The form is also said to hold input
 * (useUnsavedInput), so that a lost session keeps it.
 */
export function useDiscardConfirmation({
  holdsInput,
  onClose,
}: DiscardConfirmationOptions) {
  const [isConfirming, setIsConfirming] = useState(false);
  useUnsavedInput(holdsInput);

  // Nothing left to lose: no question
  useEffect(() => {
    if (!holdsInput) setIsConfirming(false);
  }, [holdsInput]);

  const requestClose = useCallback(() => {
    if (holdsInput) {
      setIsConfirming(true);
    } else {
      onClose();
    }
  }, [holdsInput, onClose]);

  const keepEditing = useCallback(() => setIsConfirming(false), []);

  const discard = useCallback(() => {
    setIsConfirming(false);
    onClose();
  }, [onClose]);

  return { isConfirming, requestClose, keepEditing, discard };
}

interface DiscardInputPromptProps {
  onKeepEditing: () => void;
  onDiscard: () => void;
  /** What closing drops, when the default question is not enough. */
  question?: string;
}

/**
 * The question asked before a form with unsaved input is closed, in the
 * form itself: a second dialog over the first would lose the focus. The
 * focus goes to "Keep editing", the answer that loses nothing.
 */
export const DiscardInputPrompt: FC<DiscardInputPromptProps> = ({
  onKeepEditing,
  onDiscard,
  question,
}) => {
  const keepRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keepRef.current?.focus();
  }, []);

  return (
    <Alert
      variant="warning"
      role="alert"
      className="d-flex flex-wrap align-items-center gap-2 w-100 m-0"
    >
      <span className="me-auto">
        {question ?? pageText(DISCARD_TEXTS.question)}
      </span>
      <Button ref={keepRef} variant="secondary" onClick={onKeepEditing}>
        {pageText(DISCARD_TEXTS.keepEditing)}
      </Button>
      <Button variant="danger" onClick={onDiscard}>
        {pageText(DISCARD_TEXTS.discard)}
      </Button>
    </Alert>
  );
};

// cspell:disable -- texts in Spanish and French
/** The texts of the question, in each language of the components. */
export const DISCARD_TEXTS = Object.freeze({
  question: {
    en: "Discard your input? What you typed in this form will be lost.",
    es: "¿Descartar lo escrito? Lo que escribió en este formulario se perderá.",
    fr: "Abandonner votre saisie ? Ce que vous avez saisi dans ce formulaire sera perdu.",
  },
  keepEditing: {
    en: "Keep editing",
    es: "Seguir editando",
    fr: "Continuer la saisie",
  },
  discard: {
    en: "Discard",
    es: "Descartar",
    fr: "Abandonner",
  },
} satisfies Record<string, PageTexts>);
// cspell:enable
