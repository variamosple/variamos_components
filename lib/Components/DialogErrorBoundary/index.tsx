import { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert, Button, Modal } from "react-bootstrap";
import { type PageTexts, pageText } from "../../Common/pageText";
import { openBugReport } from "../Header/useBugReport";

interface DialogErrorBoundaryProps {
  children?: ReactNode;
  /** The dialog is open: once closed, the error is cleared. */
  show: boolean;
  /** Closes the dialog, as its own close button does. */
  onClose: () => void;
  /** Offers to report the error with the global bug form (true). */
  canReport?: boolean;
}

interface DialogErrorBoundaryState {
  error: Error | null;
}

/** What the global bug form opens with: where it happened and the error. */
export const dialogErrorReport = (error: Error) => ({
  title: "A window stopped because of an error",
  description: [
    `Page: ${window.location.hash || window.location.pathname}`,
    `Error: ${error.message}`,
    "",
    "What I was doing: ",
  ].join("\n"),
});

/**
 * Put around a dialog that a page opens: an error thrown while the dialog
 * renders stays in it, which says so and closes, and the page keeps its
 * own input. Without it, the error reaches the boundary of the page, which
 * replaces the page and drops all of its input. The input of the dialog
 * itself is lost: it was in the part that failed.
 */
export class DialogErrorBoundary extends Component<
  DialogErrorBoundaryProps,
  DialogErrorBoundaryState
> {
  public override state: DialogErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(
    error: Error,
  ): DialogErrorBoundaryState {
    return { error };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Dialog error:", error, info.componentStack);
  }

  public override componentDidUpdate(previous: DialogErrorBoundaryProps): void {
    if (this.state.error && previous.show && !this.props.show) {
      this.setState({ error: null });
    }
  }

  public override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { show, onClose, canReport = true } = this.props;
    return (
      <Modal show={show} onHide={onClose} centered>
        <Modal.Body>
          <Alert variant="danger" role="alert" className="mb-0">
            {pageText(TEXTS.failed)}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          {canReport ? (
            <Button
              variant="outline-danger"
              onClick={() => {
                onClose();
                openBugReport(dialogErrorReport(error));
              }}
            >
              {pageText(TEXTS.report)}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            {pageText(TEXTS.close)}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

// cspell:disable -- texts in Spanish and French
/** The texts of a dialog that failed, in each language of the components. */
export const DIALOG_ERROR_TEXTS = Object.freeze({
  failed: {
    en: "This window stopped because of an unexpected error. The page and its input are kept; close this window and try again.",
    es: "Esta ventana se detuvo por un error inesperado. La página y lo que escribió en ella se conservan; cierre esta ventana e inténtelo de nuevo.",
    fr: "Cette fenêtre s'est arrêtée sur une erreur inattendue. La page et sa saisie sont gardées ; fermez cette fenêtre et réessayez.",
  },
  report: {
    en: "Report this problem",
    es: "Informar del problema",
    fr: "Signaler le problème",
  },
  close: { en: "Close", es: "Cerrar", fr: "Fermer" },
} satisfies Record<string, PageTexts>);
// cspell:enable

const TEXTS = DIALOG_ERROR_TEXTS;
