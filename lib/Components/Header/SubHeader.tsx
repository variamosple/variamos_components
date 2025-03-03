import { FC, useMemo } from "react";
import { Container, Nav, Navbar } from "react-bootstrap";
import { useMenu, useRouter, useSession } from "../../Context";

export const SubHeader: FC<unknown> = () => {
  const { navigate } = useRouter();
  const { subMenu } = useMenu();
  const { user } = useSession();

  const subMenuItems = useMemo(() => {
    const roles = user?.roles || [];
    const permissions = user?.permissions || [];

    if (!subMenu) return [];

    return subMenu.filter((subMenuItem) => {
      if (
        !subMenuItem?.allowedRoles?.length &&
        !subMenuItem?.allowedPermissions?.length
      ) {
        return true;
      }

      let allowed = true;

      if (subMenuItem.allowedRoles) {
        allowed =
          allowed &&
          subMenuItem.allowedRoles.some((permission) =>
            roles.includes(permission)
          );
      }

      if (subMenuItem.allowedPermissions) {
        allowed =
          allowed &&
          subMenuItem.allowedPermissions.some((role) =>
            permissions.includes(role)
          );
      }

      return allowed;
    });
  }, [subMenu, user]);

  const navigateTo = (route: string) => () => {
    navigate(route);
  };

  if (!subMenuItems.length) return null;

  return (
    <Navbar className="py-1 shadow-sm bg-white">
      <Container>
        <Nav className="d-flex justify-content-center w-100 gap-3">
          {subMenuItems.map((item) => (
            <Nav.Link
              as="button"
              key={item.location}
              className="btn btn-link p-0"
              onClick={navigateTo(item.location)}
            >
              {item.title}
            </Nav.Link>
          ))}
        </Nav>
      </Container>
    </Navbar>
  );
};
