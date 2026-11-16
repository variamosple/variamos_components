import {
  type FC,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { NavDropdown } from "react-bootstrap";
import { Events } from "../../Common";
import { isAllowedFor } from "../../Common/isAllowedFor";
import { useMenu, useRouter, useSession } from "../../Context";
import { mapToWebTarget } from "../../Model";
import { BugFormModal } from "./BugFormModal";
import { type BugReport, submitBugReport } from "./submitBugReport";

export interface HeaderOptionsProps {
  adminApiUrl?: string;
}

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
  const { user, isAuthenticated, logout } = useSession();
  const { options } = useMenu();
  const { navigate } = useRouter();
  const dropdownId = useId();

  const [showBugModal, setShowBugModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Prioritize prop, fallback to environment variable, then "/v1" as relative path in production
  const adminApiUrl =
    propAdminApiUrl || import.meta.env?.VITE_ADMIN_API_URL || "/v1";

  const openBugModal = useCallback(() => {
    setSubmitError(null);
    setShowBugModal(true);
  }, []);

  useEffect(() => {
    Events.subscribe<Record<string, never>>("openReportBugModal", openBugModal);
    return () => {
      Events.unsubscribe<Record<string, never>>(
        "openReportBugModal",
        openBugModal,
      );
    };
  }, [openBugModal]);

  const handleCreateBugSubmit = async (report: BugReport, file?: File) => {
    setIsSubmitting(true);
    setSubmitError(null);
    const error = await submitBugReport(report, file, {
      adminApiUrl,
      reporterEmail: user?.email,
    });
    setIsSubmitting(false);
    if (error) {
      setSubmitError(error);
    } else {
      setShowBugModal(false);
    }
  };

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
                openBugModal();
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
          <NavDropdown.Item onClick={logout}>Logout</NavDropdown.Item>
        ) : null}
      </NavDropdown>

      <BugFormModal
        show={showBugModal}
        onHide={() => setShowBugModal(false)}
        onSubmit={(report, file) => void handleCreateBugSubmit(report, file)}
        categories={BUG_CATEGORIES}
        isSubmitting={isSubmitting}
        errorMessage={submitError}
      />
    </>
  );
};
