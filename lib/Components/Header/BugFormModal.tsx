import {
  type ChangeEvent,
  type FC,
  type SubmitEvent,
  useEffect,
  useState,
} from "react";
import { Alert, Button, Form, Modal } from "react-bootstrap";
import { BUG_COMPONENTS } from "./bugComponents";
import { bugFormErrors, TITLE_MAX_LENGTH } from "./bugFormErrors";
import type { BugReport } from "./submitBugReport";

interface BugFormModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: BugReport, file?: File) => void;
  categories: string[];
  isSubmitting: boolean;
  /** Why the last submission failed, shown above the form. */
  errorMessage?: string | null;
}

export const BugFormModal: FC<BugFormModalProps> = ({
  show,
  onHide,
  onSubmit,
  categories,
  isSubmitting,
  errorMessage,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [component, setComponent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Messages appear after the first submission attempt only
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? bugFormErrors({ title, description }) : {};

  useEffect(() => {
    if (show) {
      setTitle("");
      setDescription("");
      setCategory(categories[0] || "Other");
      setComponent("");
      setSelectedFile(null);
      setSubmitted(false);
    }
  }, [show, categories]);

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
      onHide={onHide}
      backdrop="static"
      keyboard={false}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>Report a New Bug</Modal.Title>
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
            <Form.Control
              type="file"
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                if (e.target.files && e.target.files.length > 0) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Report Bug"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};
