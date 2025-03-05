import React, { ReactNode, useEffect } from "react";
import { Spinner } from "react-bootstrap";
import { useRouter, useSession } from "../../Context";

interface AuthWrapperProps {
  redirectPath: string;
  children?: ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({
  redirectPath,
  children,
}) => {
  const [isRedirecting, setIsRegirecting] = React.useState(false);
  const { isAuthenticated, isLoading } = useSession();
  const { navigate } = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isRedirecting) {
      const redirectTo = window.location.href;

      const searchParams = new URLSearchParams();
      searchParams.set("redirectTo", encodeURIComponent(redirectTo));

      setIsRegirecting(true);
      setTimeout(
        () => navigate(`${redirectPath}?${searchParams.toString()}`),
        300
      );
    }
  }, [isAuthenticated, isLoading, redirectPath, navigate, isRedirecting]);

  useEffect(() => {
    const url = new URL(window.location.href);

    if (url.searchParams.has("authToken")) {
      localStorage.setItem("authToken", url.searchParams.get("authToken")!);
      url.searchParams.delete("authToken");
      window.history.replaceState({}, "", url);
    }
  }, []);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="d-flex justify-content-center align-items-center w-100 h-100">
        <Spinner
          animation="border"
          variant="primary"
          style={{ width: "3rem", height: "3rem", borderWidth: "0.5rem" }}
        />
      </div>
    );
  }

  return <>{children}</>;
};
