import type React from "react";
import { type ReactNode, useEffect } from "react";

import { useRouter, useSession } from "../../Context";

// One array for every render: a new one each time would run the check again
const NO_PERMISSION_REQUIRED: string[] = [];

interface ProtectedRouteProps {
  allowedPermissions?: string[];
  notAuthorizedPath: string;
  children?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  notAuthorizedPath,
  allowedPermissions = NO_PERMISSION_REQUIRED,
  children,
}) => {
  const { isAuthenticated, isLoading, user } = useSession();
  const { navigate } = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const permissions = user?.permissions ?? [];

      const isAuthorized =
        allowedPermissions.length === 0 ||
        permissions.some((role: string) => allowedPermissions.includes(role));

      if (!isAuthorized) {
        navigate(notAuthorizedPath);
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    notAuthorizedPath,
    navigate,
    user,
    allowedPermissions,
  ]);
  if (
    allowedPermissions.length > 0 &&
    !user?.permissions?.some((role: string) =>
      allowedPermissions.includes(role),
    )
  ) {
    return null;
  }

  return <>{children}</>;
};
