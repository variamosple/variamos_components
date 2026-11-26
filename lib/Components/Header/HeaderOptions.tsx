import { type FC, useCallback, useId, useMemo, useState } from "react";
import { Alert, NavDropdown } from "react-bootstrap";
import { isAllowedFor } from "../../Common/isAllowedFor";
import { useMenu, useRouter, useSession } from "../../Context";
import { mapToWebTarget } from "../../Model";
import { BugFormModal } from "./BugFormModal";
import { useBugReport } from "./useBugReport";

export interface HeaderOptionsProps {
  adminApiUrl?: string;
}

/**
 * The admin API when the header gets no adminApiUrl: "/v1" on the origin of
 * the page, so that bug reports go to "/bugs" there.
 */
export const DEFAULT_ADMIN_API_URL = "/v1";

/** Shown when the admin could not close the session. */
export const LOGOUT_FAILED =
  "Sign out failed: you are still signed in. Please try again.";

const BUG_CATEGORIES = [
  "Editor",
  "Model",
  "Language",
  "Project",
  "Simulation",
  "Account/Security",
  "Other",
];

export const HeaderOptions: FC<HeaderOptionsProps> = ({
  adminApiUrl: propAdminApiUrl,
}) => {
  const { user, isAuthenticated, isReadOnly, logout } = useSession();
  const { options } = useMenu();
  const { navigate } = useRouter();
  const dropdownId = useId();

  const [logoutFailed, setLogoutFailed] = useState(false);

  // A failed sign out is said: before, nothing happened (ADM-N14)
  const signOut = useCallback(() => {
    setLogoutFailed(false);
    void logout().then((done) => setLogoutFailed(!done));
  }, [logout]);

  // The address given by the application. The library cannot read the
  // environment of the application: Vite replaced import.meta.env when the
  // library was built, so that the fallback never worked (ADM-N12).
  const adminApiUrl = propAdminApiUrl || DEFAULT_ADMIN_API_URL;

  const bugReport = useBugReport(adminApiUrl);

  const menuOptions = useMemo(
    () => (options ?? []).filter((option) => isAllowedFor(option, user)),
    [options, user],
  );

  if (menuOptions.length === 0 && !isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* The class is the stable hook to find the menu: the id is generated */}
      {/* Opens towards the left, so that it stays in a narrow window */}
      <NavDropdown
        title={
          <span
            className="d-inline-block text-truncate align-bottom"
            style={{ maxWidth: "10rem" }}
            title={user?.name}
          >
            {user?.name || "Options"}
          </span>
        }
        id={dropdownId}
        className="variamos-header-options"
        align="end"
      >
        {menuOptions.map((option) => (
          <NavDropdown.Item
            key={option.title}
            onClick={() => {
              if (option.location.endsWith("#report-bug")) {
                bugReport.open();
                return;
              }
              navigate(option.location, {
                target: mapToWebTarget(option.target),
              });
            }}
          >
            {option.title}
          </NavDropdown.Item>
        ))}

        {isAuthenticated && menuOptions.length > 0 ? (
          <NavDropdown.Divider />
        ) : null}

        {isAuthenticated ? (
          <NavDropdown.Item onClick={signOut}>Logout</NavDropdown.Item>
        ) : null}
      </NavDropdown>

      {logoutFailed ? (
        <Alert
          variant="danger"
          dismissible
          onClose={() => setLogoutFailed(false)}
          className="position-fixed top-0 end-0 m-3"
          style={{ zIndex: 1080 }}
        >
          {LOGOUT_FAILED}
        </Alert>
      ) : null}

      <BugFormModal
        show={bugReport.show}
        onHide={bugReport.close}
        onSubmit={(report, file) => void bugReport.submit(report, file)}
        categories={BUG_CATEGORIES}
        isSubmitting={bugReport.isSubmitting}
        isReadOnly={isReadOnly}
        errorMessage={bugReport.error}
      />
    </>
  );
};
