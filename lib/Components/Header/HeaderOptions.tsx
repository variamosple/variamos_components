import { type FC, useId, useMemo } from "react";
import { NavDropdown } from "react-bootstrap";
import { isAllowedFor } from "../../Common/isAllowedFor";
import { useMenu, useRouter, useSession } from "../../Context";
import { mapToWebTarget } from "../../Model";
import { DialogErrorBoundary } from "../DialogErrorBoundary";
import { BugFormModal } from "./BugFormModal";
import { useBugCategories } from "./bugCategories";
import { SignOutQuestion, useSignOut } from "./signOut";
import { useBugReport } from "./useBugReport";

export interface HeaderOptionsProps {
  adminApiUrl?: string;
}

/**
 * The admin API when the header gets no adminApiUrl: "/v1" on the origin of
 * the page, so that bug reports go to "/bugs" there.
 */
export const DEFAULT_ADMIN_API_URL = "/v1";

export const HeaderOptions: FC<HeaderOptionsProps> = ({
  adminApiUrl: propAdminApiUrl,
}) => {
  const { user, isAuthenticated, isReadOnly, logout } = useSession();
  const { options } = useMenu();
  const { navigate } = useRouter();
  const dropdownId = useId();

  const signOut = useSignOut(logout);

  // The address given by the application. The library cannot read the
  // environment of the application: Vite replaced import.meta.env when the
  // library was built, so that the fallback never worked (ADM-N12).
  const adminApiUrl = propAdminApiUrl || DEFAULT_ADMIN_API_URL;

  const bugReport = useBugReport(adminApiUrl);
  // The list of the admin, read when the form opens; the fixed list until
  // then, and when it cannot be read (EV-41)
  const bugCategories = useBugCategories(adminApiUrl, bugReport.show);

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
          <NavDropdown.Item onClick={signOut.request}>Logout</NavDropdown.Item>
        ) : null}
      </NavDropdown>

      <SignOutQuestion signOut={signOut} />

      {/* The form sits in the header, above every page: an error in it
          would otherwise unmount the whole application. Reporting it with
          the same form would fail again. */}
      <DialogErrorBoundary
        show={bugReport.show}
        onClose={bugReport.close}
        canReport={false}
      >
        <BugFormModal
          show={bugReport.show}
          onHide={bugReport.close}
          onSubmit={(report, file) => void bugReport.submit(report, file)}
          categories={bugCategories}
          isSubmitting={bugReport.isSubmitting}
          isReadOnly={isReadOnly}
          errorMessage={bugReport.error}
          prefill={bugReport.prefill}
        />
      </DialogErrorBoundary>
    </>
  );
};
