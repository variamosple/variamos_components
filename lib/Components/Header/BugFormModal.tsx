import { type ChangeEvent, type FC, useEffect, useState, FormEvent } from "react";
import { Button, Form, Modal } from "react-bootstrap";

interface BugFormModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: { title: string; description: string; category: string }, file?: File) => void;
  categories: string[];
  isSubmitting: boolean;
}

export const BugFormModal: FC<BugFormModalProps> = ({
  show,
  onHide,
  onSubmit,
  categories,
  isSubmitting,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (show) {
      setTitle("");
      setDescription("");
      setCategory(categories[0] || "Other");
      setSelectedFile(null);
      setValidated(false);
    }
  }, [show, categories]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      setValidated(true);
      return;
    }

    onSubmit({ title, description, category }, selectedFile || undefined);
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

      <Form noValidate validated={validated} onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="bugTitle">
            <Form.Label>Title *</Form.Label>
            <Form.Control
              required
              type="text"
              placeholder="e.g. Build error on auth routes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <Form.Control.Feedback type="invalid">
              Title is required (max 100 characters)
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
            />
            <Form.Control.Feedback type="invalid">
              Description is required
            </Form.Control.Feedback>
          </Form.Group>

          <div className="row">
            <div className="col-md-12">
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
