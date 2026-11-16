import { type FC, useMemo } from "react";
import { Container, Nav, Navbar } from "react-bootstrap";
import { isAllowedFor } from "../../Common/isAllowedFor";
import { useMenu, useRouter, useSession } from "../../Context";

export const SubHeader: FC<unknown> = () => {
  const { navigate } = useRouter();
  const { subMenu } = useMenu();
  const { user } = useSession();

  const subMenuItems = useMemo(() => {
    if (!subMenu) return [];

    return subMenu.filter((subMenuItem) => isAllowedFor(subMenuItem, user));
  }, [subMenu, user]);

  const navigateTo = (route: string) => () => {
    navigate(route);
  };

  if (subMenuItems.length === 0) return null;

  return (
    <Navbar className="py-1 shadow-sm bg-white">
      <Container>
        <Nav className="d-flex flex-wrap justify-content-center w-100 column-gap-3 row-gap-1">
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
