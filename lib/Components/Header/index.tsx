import { FC } from "react";
import { Container, Nav, Navbar } from "react-bootstrap";
import { useMenu, useRouter } from "../../Context";
import { HeaderOptions } from "./HeaderOptions";
import { MenuItemComponent } from "./MenuItem";
import { SubHeader } from "./SubHeader";

export interface HeaderProps {
  logoUrl?: string;
  logoAlt?: string;
}

export const Header: FC<HeaderProps> = ({ logoUrl, logoAlt = "App logo" }) => {
  const { items } = useMenu();
  const { navigate } = useRouter();

  return (
    <header className="sticky-top">
      <Navbar bg="dark" variant="dark">
        <Container fluid>
          <Navbar.Brand onClick={() => navigate("/")}>
            <img
              src={logoUrl}
              height="30"
              className="d-inline-block align-top"
              alt={logoAlt}
            />
          </Navbar.Brand>

          <Nav className="me-auto">
            {items.map((item) => (
              <MenuItemComponent key={item.title} {...item} />
            ))}
          </Nav>

          <HeaderOptions />
        </Container>
      </Navbar>

      <SubHeader />
    </header>
  );
};
