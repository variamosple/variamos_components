import React from "react";
import { Button, Container } from "react-bootstrap";
import { useRouter } from "../../Context";

export interface NotAuthorizedProps {
  homePath: string;
}

export const NotAuthorized: React.FC<NotAuthorizedProps> = ({ homePath }) => {
  const { navigate } = useRouter();

  return (
    <Container className="d-flex flex-column justify-content-center align-items-center vh-100 text-center">
      <h1 className="display-1 fw-bold text-danger">403</h1>

      <p className="fs-4 text-muted">
        You are not authorized to access this page.
      </p>

      <Button variant="primary" onClick={() => navigate(homePath)}>
        Go Home
      </Button>
    </Container>
  );
};
