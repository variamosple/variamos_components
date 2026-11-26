import {
  type ChangeEvent,
  type FC,
  type SubmitEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Alert, Button, Form, Modal } from "react-bootstrap";
import { isUnsavedInput } from "../../Hooks/unsavedInput";
import { DiscardInputPrompt, useDiscardConfirmation } from "../DiscardInput";
import { BUG_COMPONENTS } from "./bugComponents";
import { bugFormErrors, TITLE_MAX_LENGTH } from "./bugFormErrors";
import type { BugReport } from "./submitBugReport";
import type { BugReportPrefill } from "./useBugReport";

interface BugFormModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: BugReport, file?: File) => void;
  categories: string[];
  isSubmitting: boolean;
  /** Nothing can be saved (lost connection, ended session): no sending. */
  isReadOnly?: boolean;
  /** Why the last submission failed, shown above the form. */
  errorMessage?: string | null;
  /** What the form opens with (openBugReport). */
  prefill?: BugReportPrefill;
}

const NO_PREFILL: BugReportPrefill = Object.freeze({});

interface AttachmentFieldProps {
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  disabled: boolean;
}

/** The file input, with the name of the file chosen and a way to remove it. */
const AttachmentField: FC<AttachmentFieldProps> = ({
  selectedFile,
  setSelectedFile,
  disabled,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      {/* A cancelled file dialog empties the input: the form follows
          it, so that no file is sent that the reporter no longer sees
          (UX-34, EV-84) */}
      <Form.Control
        type="file"
        ref={fileInputRef}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setSelectedFile(e.target.files?.[0] ?? null);
        }}
      />
      {selectedFile ? (
        <div className="d-flex align-items-center gap-2 mt-2 small">
          <span className="text-truncate">
            Selected file: {selectedFile.name}
          </span>
          <Button
            variant="link"
            size="sm"
            className="p-0"
            onClick={removeSelectedFile}
            disabled={disabled}
            aria-label={`Remove the file ${selectedFile.name}`}
          >
            Remove
          </Button>
        </div>
      ) : null}
    </>
  );
};

interface BugFormFooterProps {
  closing: ReturnType<typeof useDiscardConfirmation>;
  isSubmitting: boolean;
  isReadOnly: boolean;
}

/** Cancel and send, or the question asked before the input is dropped. */
const BugFormFooter: FC<BugFormFooterProps> = ({
  closing,
  isSubmitting,
  isReadOnly,
}) => (
  <Modal.Footer>
    {closing.isConfirming ? (
      <DiscardInputPrompt
        onKeepEditing={closing.keepEditing}
        onDiscard={closing.discard}
      />
    ) : (
      <>
        <Button
          variant="secondary"
          onClick={closing.requestClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={isSubmitting || isReadOnly}
        >
          {isSubmitting ? "Creating..." : "Report Bug"}
        </Button>
      </>
    )}
  </Modal.Footer>
);

/** The fields of the form, set again each time it opens. */
function useBugFields(
  show: boolean,
  defaultCategory: string,
  prefill: BugReportPrefill,
) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [component, setComponent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Messages appear after the first submission attempt only
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (show) {
      setTitle(prefill.title ?? "");
      setDescription(prefill.description ?? "");
      setCategory(defaultCategory);
      setComponent("");
      setSelectedFile(null);
      setSubmitted(false);
    }
  }, [show, defaultCategory, prefill]);

  // A report with input asks before it is closed (UX-08), and the session
  // keeps the page while it holds input (TRV-65). What it opened with is
  // not input: a filled form left as it is closes at once.
  const holdsInput =
    show &&
    isUnsavedInput(
      {
        title: prefill.title,
        description: prefill.description,
        category: defaultCategory,
      },
      { title, description, category, component, file: selectedFile },
    );

  return {
    holdsInput,
    title,
    setTitle,
    description,
    setDescription,
    category,
    setCategory,
    component,
    setComponent,
    selectedFile,
    setSelectedFile,
    submitted,
    setSubmitted,
  };
}

export const BugFormModal: FC<BugFormModalProps> = ({
  show,
  onHide,
  onSubmit,
  categories,
  isSubmitting,
  isReadOnly = false,
  errorMessage,
  prefill = NO_PREFILL,
}) => {
  const defaultCategory = categories[0] || "Other";
  const {
    title,
    setTitle,
    description,
    setDescription,
    category,
    setCategory,
    component,
    setComponent,
    selectedFile,
    setSelectedFile,
    submitted,
    setSubmitted,
    holdsInput,
  } = useBugFields(show, defaultCategory, prefill);
  // The dialog is announced by its title
  const titleId = useId();
  const errors = submitted ? bugFormErrors({ title, description }) : {};
  // The form lives in the header: a change of page keeps it, and so does
  // not ask for it
  const closing = useDiscardConfirmation({
    holdsInput,
    onClose: onHide,
    keptOnNavigation: true,
  });
  // No way to close while sending, as Cancel is locked (EV-84)
  const requestClose = isSubmitting ? undefined : closing.requestClose;

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const invalid = bugFormErrors({ title, description });
    if (invalid.title || invalid.description) {
      event.stopPropagation();
      return;
    }

    onSubmit(
      { title, description, category, component },
      selectedFile ?? undefined,
    );
  };

  return (
    <Modal
      show={show}
      onHide={requestClose}
      backdrop={isSubmitting ? "static" : true}
      keyboard={!isSubmitting}
      centered
      aria-labelledby={titleId}
    >
      <Modal.Header closeButton={!isSubmitting}>
        <Modal.Title id={titleId}>Report a New Bug</Modal.Title>
      </Modal.Header>

      <Form noValidate onSubmit={handleSubmit}>
        <Modal.Body>
          {errorMessage ? (
            <Alert variant="danger" role="alert">
              {errorMessage}
            </Alert>
          ) : null}
          <Form.Group className="mb-3" controlId="bugTitle">
            <Form.Label>Title *</Form.Label>
            <Form.Control
              required
              type="text"
              placeholder="e.g. Build error on auth routes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX_LENGTH}
              isInvalid={Boolean(errors.title)}
            />
            <Form.Control.Feedback type="invalid">
              {errors.title}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="bugDescription">
            <Form.Label>Description *</Form.Label>
            <Form.Control
              required
              as="textarea"
              rows={4}
              placeholder="Describe step-by-step how to reproduce the bug..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              isInvalid={Boolean(errors.description)}
            />
            <Form.Control.Feedback type="invalid">
              {errors.description}
            </Form.Control.Feedback>
          </Form.Group>

          <div className="row">
            <div className="col-md-6">
              <Form.Group className="mb-3" controlId="bugCategory">
                <Form.Label>Category *</Form.Label>
                <Form.Select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-3" controlId="bugComponent">
                <Form.Label>Component (Optional)</Form.Label>
                <Form.Select
                  value={component}
                  onChange={(e) => setComponent(e.target.value)}
                >
                  <option value="">Not specified</option>
                  {BUG_COMPONENTS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>
          </div>

          <Form.Group className="mb-3" controlId="bugFile">
            <Form.Label>Attachment (Optional)</Form.Label>
            <AttachmentField
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              disabled={isSubmitting}
            />
          </Form.Group>
        </Modal.Body>

        <BugFormFooter
          closing={closing}
          isSubmitting={isSubmitting}
          isReadOnly={isReadOnly}
        />
      </Form>
    </Modal>
  );
};
