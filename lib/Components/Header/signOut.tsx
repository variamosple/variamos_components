import { type FC, useCallback, useState } from "react";
import { Alert, Modal } from "react-bootstrap";
import { type PageTexts, pageText } from "../../Common/pageText";
import { hasUnsavedInput } from "../../Hooks/unsavedInput";
import { DiscardInputPrompt } from "../DiscardInput";

/** Shown when the admin could not close the session. */
export const LOGOUT_FAILED =
  "Sign out failed: you are still signed in. Please try again.";

// cspell:disable -- texts in Spanish and French
/** The question asked before signing out drops unsaved input. */
export const SIGN_OUT_TEXTS = Object.freeze({
  question: {
    en: "Sign out? What you typed on this page will be lost.",
    es: "¿Cerrar sesión? Lo que escribió en esta página se perderá.",
    fr: "Se déconnecter ? Ce que vous avez saisi sur cette page sera perdu.",
  },
  signOut: {
    en: "Sign out",
    es: "Cerrar sesión",
    fr: "Se déconnecter",
  },
} satisfies Record<string, PageTexts>);
// cspell:enable

/**
 * Signing out from the menu. It leaves the page for the sign-in page,
 * which drops the input of its forms: with unsaved input, it asks first,
 * as leaving the page does (ADR-0076). A failed sign out is said: before,
 * nothing happened (ADM-N14).
 */
export function useSignOut(logout: () => Promise<boolean>) {
  const [failed, setFailed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const signOut = useCallback(() => {
    setFailed(false);
    void logout().then((done) => setFailed(!done));
  }, [logout]);

  const request = useCallback(() => {
    if (hasUnsavedInput()) {
      setIsConfirming(true);
    } else {
      signOut();
    }
  }, [signOut]);

  const keepEditing = useCallback(() => setIsConfirming(false), []);

  const confirm = useCallback(() => {
    setIsConfirming(false);
    signOut();
  }, [signOut]);

  const dismissFailure = useCallback(() => setFailed(false), []);

  return {
    request,
    isConfirming,
    keepEditing,
    confirm,
    failed,
    dismissFailure,
  };
}

/** The question before the input is dropped, and the failure, if any. */
export const SignOutQuestion: FC<{
  signOut: ReturnType<typeof useSignOut>;
}> = ({ signOut }) => (
  <>
    {signOut.isConfirming ? (
      <Modal
        show
        onHide={signOut.keepEditing}
        centered
        aria-label={pageText(SIGN_OUT_TEXTS.question)}
      >
        <Modal.Body>
          <DiscardInputPrompt
            question={pageText(SIGN_OUT_TEXTS.question)}
            discardLabel={pageText(SIGN_OUT_TEXTS.signOut)}
            onKeepEditing={signOut.keepEditing}
            onDiscard={signOut.confirm}
          />
        </Modal.Body>
      </Modal>
    ) : null}

    {signOut.failed ? (
      <Alert
        variant="danger"
        dismissible
        onClose={signOut.dismissFailure}
        className="position-fixed top-0 end-0 m-3"
        style={{ zIndex: 1080 }}
      >
        {LOGOUT_FAILED}
      </Alert>
    ) : null}
  </>
);
