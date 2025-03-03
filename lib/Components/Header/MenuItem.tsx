import { FC, useMemo } from "react";
import { Nav, NavDropdown } from "react-bootstrap";
import { useRouter, useSession } from "../../Context";
import { mapToWebTarget, MenuItem } from "../../Model";

export const MenuItemComponent: FC<MenuItem> = ({
  title,
  type,
  location,
  target,
  children,
}) => {
  const { user } = useSession();
  const { navigate } = useRouter();
  const menuSubItems = useMemo(() => {
    const permissions = user?.permissions || [];
    const roles = user?.roles || [];

    if (!children) {
      return [];
    }

    return children.filter((subMenuItem) => {
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
  }, [children, user]);

  if (type === "location") {
    return (
      <Nav.Link
        as="button"
        className="btn btn-link"
        onClick={() => navigate(location!, { target: mapToWebTarget(target) })}
      >
        {title}
      </Nav.Link>
    );
  }

  return (
    <NavDropdown title={title}>
      {menuSubItems?.map((subMenuItem) => (
        <NavDropdown.Item
          as="button"
          key={subMenuItem.title}
          onClick={() =>
            navigate(subMenuItem.location, {
              target: mapToWebTarget(subMenuItem.target),
            })
          }
        >
          {subMenuItem.title}
        </NavDropdown.Item>
      ))}
    </NavDropdown>
  );
};
