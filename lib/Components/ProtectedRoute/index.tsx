import React, { ReactNode, useEffect } from "react";

import { useRouter, useSession } from "../../Context";

interface ProtectedRouteProps {
  allowedPermissions?: string[];
  notAuthorizedPath: string;
  children?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  notAuthorizedPath,
  allowedPermissions = [],
  children,
}) => {
  const { isAuthenticated, isLoading, user } = useSession();
  const { navigate } = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const permissions = user?.permissions || [];

      const isAuthorized =
        !allowedPermissions.length ||
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
      allowedPermissions.includes(role)
    )
  ) {
    return null;
  }

  return <>{children}</>;
};
