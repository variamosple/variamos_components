import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeaderBrand } from "./HeaderBrand";
import { SkipLink } from "./SkipLink";

/** What a keyboard and a screen reader find in the header (ADM-N15). */
describe("header keyboard access", () => {
  it("renders the logo as a link to the home of the app", () => {
    const html = renderToStaticMarkup(
      <HeaderBrand
        logoUrl="./images/logo.webp"
        logoAlt="VariaMos logo"
        href="/variamos_admin/"
        onNavigate={() => undefined}
      />,
    );

    // React 19 puts a preload of the image first
    expect(html).toContain('<a href="/variamos_admin/" class="navbar-brand">');
    expect(html).not.toContain("<span");
    expect(html).toContain('alt="VariaMos logo"');
  });

  it("renders a skip link to the main content, hidden until focused", () => {
    const html = renderToStaticMarkup(<SkipLink targetId="main-content" />);

    expect(html).toMatch(
      /^<a href="#main-content" class="visually-hidden-focusable [^"]+">Skip to main content<\/a>$/,
    );
  });
});
