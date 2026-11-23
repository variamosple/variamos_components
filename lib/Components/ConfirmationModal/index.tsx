import { useId } from "react";
import { Button, Modal } from "react-bootstrap";

export interface ConfirmationModalProps {
  show: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  message: string;
  confirmLabel?: string;
  confirmButtonVariant?: string;
  cancelLabel?: string;
  cancelButtonVariant?: string;
}

export const confirmationModalDefaultProps: ConfirmationModalProps =
  Object.freeze({
    message: "",
    show: false,
    onCancel: () => undefined,
    onConfirm: () => undefined,
  });

export default function ConfirmationModal({
  show,
  onCancel,
  onConfirm,
  message,
  confirmLabel = "Accept",
  confirmButtonVariant = "primary",
  cancelButtonVariant = "secondary",
  cancelLabel = "Cancel",
}: ConfirmationModalProps) {
  // The question names the dialog, which has no title
  const messageId = useId();
  return (
    <Modal show={show} onHide={onCancel} aria-labelledby={messageId}>
      <Modal.Body id={messageId}>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant={cancelButtonVariant} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={confirmButtonVariant} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
