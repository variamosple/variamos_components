import { FC } from "react";
import { Container, Nav, Navbar } from "react-bootstrap";
import { useMenu, useRouter, useSession } from "../../Context";
import { HeaderOptions } from "./HeaderOptions";
import { MenuItemComponent } from "./MenuItem";
import { SubHeader } from "./SubHeader";

export interface HeaderProps {
  logoUrl?: string;
  logoAlt?: string;
  signInUrl: string;
  adminApiUrl?: string;
}

export const Header: FC<HeaderProps> = ({
  logoUrl,
  logoAlt = "App logo",
  signInUrl,
  adminApiUrl,
}) => {
  const { items } = useMenu();
  const { navigate } = useRouter();
  const { isAuthenticated, isLoading } = useSession();

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

          <Nav className="me-5 pe-5">
            <HeaderOptions adminApiUrl={adminApiUrl} />

            {!isLoading && !isAuthenticated && (
              <MenuItemComponent
                title="Sign In"
                type="location"
                location={signInUrl}
              />
            )}
          </Nav>
        </Container>
      </Navbar>

      <SubHeader />
    </header>
  );
};
