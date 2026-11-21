import type React from "react";
import { type ReactNode, useEffect, useState } from "react";
import { Alert, Spinner } from "react-bootstrap";
import { useRouter, useSession } from "../../Context";
import { addressWithoutToken } from "./addressWithoutToken";

interface AuthWrapperProps {
  redirectPath: string;
  children?: ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({
  redirectPath,
  children,
}) => {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { isAuthenticated, isLoading, isServerUnreachable } = useSession();
  const { navigate } = useRouter();

  // Sent to the sign-in page only when the admin says the session is over,
  // never because the admin did not answer (ADM-N09)
  useEffect(() => {
    if (
      !isLoading &&
      !isAuthenticated &&
      !isServerUnreachable &&
      !isRedirecting
    ) {
      const redirectTo = window.location.href;

      const searchParams = new URLSearchParams();
      searchParams.set("redirectTo", encodeURIComponent(redirectTo));

      setIsRedirecting(true);
      setTimeout(
        () => navigate(`${redirectPath}?${searchParams.toString()}`),
        300,
      );
    }
  }, [
    isAuthenticated,
    isLoading,
    isServerUnreachable,
    redirectPath,
    navigate,
    isRedirecting,
  ]);

  useEffect(() => {
    // Removed from the address, never stored (EV-75)
    const address = addressWithoutToken(window.location.href);
    if (address) {
      window.history.replaceState({}, "", address);
    }
  }, []);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center gap-3 w-100 h-100">
        <Spinner
          animation="border"
          variant="primary"
          style={{ width: "3rem", height: "3rem", borderWidth: "0.5rem" }}
        />
        {!isLoading && isServerUnreachable ? (
          <p role="status">{SERVER_UNREACHABLE_FIRST_LOAD}</p>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {isServerUnreachable ? (
        <Alert
          variant="warning"
          role="status"
          className="m-0 rounded-0 py-2 text-center"
        >
          {SERVER_UNREACHABLE_SIGNED_IN}
        </Alert>
      ) : null}
      {children}
    </>
  );
};

/** Shown above the page: the session and the page are kept. */
export const SERVER_UNREACHABLE_SIGNED_IN =
  "The server cannot be reached. Your session and this page are kept; trying again…";

/** Shown instead of the page when no session could be read yet. */
export const SERVER_UNREACHABLE_FIRST_LOAD =
  "The server cannot be reached. Trying again…";
