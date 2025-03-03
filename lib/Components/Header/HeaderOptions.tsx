import { FC, useMemo } from "react";
import { NavDropdown } from "react-bootstrap";
import { useMenu, useRouter, useSession } from "../../Context";
import { mapToWebTarget } from "../../Model";

export const HeaderOptions: FC<unknown> = () => {
  const { user, isAuthenticated, logout } = useSession();
  const { options } = useMenu();
  const { navigate } = useRouter();

  const menuOptions = useMemo(() => {
    const permissions = user?.permissions || [];
    const roles = user?.roles || [];

    if (!options?.length) {
      return [];
    }

    return options.filter((subMenuItem) => {
      if (
        !subMenuItem?.allowedPermissions?.length &&
        !subMenuItem?.allowedRoles?.length
      ) {
        return true;
      }

      let allowed = true;

      if (subMenuItem.allowedRoles) {
        allowed =
          allowed &&
          subMenuItem.allowedRoles.some((role) => roles.includes(role));
      }

      if (subMenuItem.allowedPermissions) {
        allowed =
          allowed &&
          subMenuItem.allowedPermissions.some((permission) =>
            permissions.includes(permission)
          );
      }

      return allowed;
    });
  }, [options, user]);

  if (!menuOptions?.length && !isAuthenticated) {
    return null;
  }

  return (
    <NavDropdown title={user?.name || "Options"} id="nav-dropdown">
      {menuOptions?.map((option) => (
        <NavDropdown.Item
          key={option.title}
          onClick={() =>
            navigate(option.location, {
              target: mapToWebTarget(option.target),
            })
          }
        >
          {option.title}
        </NavDropdown.Item>
      ))}

      {isAuthenticated && !!menuOptions?.length && <NavDropdown.Divider />}

      {isAuthenticated && (
        <NavDropdown.Item onClick={logout}>Logout</NavDropdown.Item>
      )}
    </NavDropdown>
  );
};
