import { type FC, useMemo } from "react";
import { Nav, NavDropdown } from "react-bootstrap";
import { isAllowedFor } from "../../Common/isAllowedFor";
import { useRouter, useSession } from "../../Context";
import { type MenuItem, mapToWebTarget } from "../../Model";

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
    if (!children) {
      return [];
    }

    return children.filter((subMenuItem) => isAllowedFor(subMenuItem, user));
  }, [children, user]);

  if (type === "location" && location) {
    return (
      <Nav.Link
        as="button"
        className="btn btn-link"
        onClick={() => navigate(location, { target: mapToWebTarget(target) })}
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
