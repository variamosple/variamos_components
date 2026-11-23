import type { FC } from "react";
import { Navbar } from "react-bootstrap";
import { isPlainClick } from "./keyboardAccess";

export interface HeaderBrandProps {
  logoUrl?: string;
  logoAlt: string;
  /** The home of the app, as a real address. */
  href: string;
  /** Goes home inside the app, without reloading the page. */
  onNavigate: () => void;
}

/**
 * The logo, a link to the home page: reachable with the keyboard, opened in
 * a new tab with a modifier, followed inside the app on a plain click.
 */
export const HeaderBrand: FC<HeaderBrandProps> = ({
  logoUrl,
  logoAlt,
  href,
  onNavigate,
}) => (
  <Navbar.Brand
    href={href}
    onClick={(event) => {
      if (!isPlainClick(event)) return;
      event.preventDefault();
      onNavigate();
    }}
  >
    <img
      src={logoUrl}
      height="30"
      className="d-inline-block align-top"
      alt={logoAlt}
    />
  </Navbar.Brand>
);
