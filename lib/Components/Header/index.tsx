import { type FC, useId, useState } from "react";
import { Container, Nav, Navbar } from "react-bootstrap";
import { useMenu, useRouter, useSession } from "../../Context";
import { NotificationBell } from "../Notifications/NotificationBell";
import { NotificationDrawer } from "../Notifications/NotificationDrawer";
import { HeaderBrand } from "./HeaderBrand";
import { HeaderOptions } from "./HeaderOptions";
import { DEFAULT_MAIN_CONTENT_ID } from "./keyboardAccess";
import { MenuItemComponent } from "./MenuItem";
import { SkipLink } from "./SkipLink";
import { SubHeader } from "./SubHeader";
import styles from "./styles.module.css";

export { DEFAULT_MAIN_CONTENT_ID } from "./keyboardAccess";

export interface HeaderProps {
  logoUrl?: string;
  logoAlt?: string;
  signInUrl: string;
  adminApiUrl?: string;
  /**
   * The id of the main content, which the skip link focuses; the element
   * needs tabIndex={-1}. "main-content" by default.
   */
  mainContentId?: string;
}

export const Header: FC<HeaderProps> = ({
  logoUrl,
  logoAlt = "App logo",
  signInUrl,
  adminApiUrl,
  mainContentId = DEFAULT_MAIN_CONTENT_ID,
}) => {
  const { items } = useMenu();
  const { navigate, basePath } = useRouter();
  const { isAuthenticated, isLoading } = useSession();
  const [showDrawer, setShowDrawer] = useState(false);
  const menuId = useId();

  return (
    <header className="sticky-top">
      <SkipLink targetId={mainContentId} />
      {/* Below 768 px the menu folds under a toggle; the account stays shown */}
      <Navbar bg="dark" variant="dark" expand="md">
        <Container fluid>
          <HeaderBrand
            logoUrl={logoUrl}
            logoAlt={logoAlt}
            href={basePath}
            onNavigate={() => navigate("/")}
          />

          <Nav
            className={`flex-row align-items-center ms-auto order-md-last ${styles.accountNav}`}
          >
            {isAuthenticated ? (
              <>
                <NotificationBell
                  onClick={() => setShowDrawer(true)}
                  className="me-2"
                />
                <NotificationDrawer
                  show={showDrawer}
                  onClose={() => setShowDrawer(false)}
                />
              </>
            ) : null}
            <HeaderOptions adminApiUrl={adminApiUrl} />

            {!isLoading && !isAuthenticated && (
              <MenuItemComponent
                title="Sign In"
                type="location"
                location={signInUrl}
              />
            )}
          </Nav>

          {items.length > 0 ? (
            <>
              <Navbar.Toggle aria-controls={menuId} className="ms-2" />
              <Navbar.Collapse id={menuId}>
                <Nav className="me-auto">
                  {items.map((item) => (
                    <MenuItemComponent key={item.title} {...item} />
                  ))}
                </Nav>
              </Navbar.Collapse>
            </>
          ) : null}
        </Container>
      </Navbar>

      <SubHeader />
    </header>
  );
};
