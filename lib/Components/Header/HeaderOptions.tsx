import { FC, useMemo, useState, useEffect } from "react";
import { NavDropdown } from "react-bootstrap";
import { useMenu, useRouter, useSession } from "../../Context";
import { mapToWebTarget } from "../../Model";
import { Events } from "../../Common";
import { BugFormModal } from "./BugFormModal";

export interface HeaderOptionsProps {
  adminApiUrl?: string;
}

export const HeaderOptions: FC<HeaderOptionsProps> = ({ adminApiUrl: propAdminApiUrl }) => {
  const { user, isAuthenticated, logout } = useSession();
  const { options } = useMenu();
  const { navigate } = useRouter();

  const [showBugModal, setShowBugModal] = useState(false);
  const [categories] = useState<string[]>([
    "Editor",
    "Model",
    "Language",
    "Project",
    "Simulation",
    "Account/Security",
    "Other",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prioritize prop, fallback to environment variable, then "/v1" as relative path in production
  const adminApiUrl = propAdminApiUrl || (import.meta.env?.VITE_ADMIN_API_URL) || "/v1";

  useEffect(() => {
    const handleOpenModal = () => {
      setShowBugModal(true);
    };
    Events.subscribe<Record<string, never>>("openReportBugModal", handleOpenModal);
    return () => {
      Events.unsubscribe<Record<string, never>>("openReportBugModal", handleOpenModal);
    };
  }, []);

  const handleCreateBugSubmit = async (
    data: { title: string; description: string; category: string },
    file?: File,
  ) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("priority", "medium");
      formData.append("category", data.category);
      if (user?.email) {
        formData.append("reporterEmail", user.email);
      }
      if (file) {
        formData.append("file", file);
      }

      const apiBase = adminApiUrl.replace(/\/v1$/, "");

      const headers: Record<string, string> = {};
      const token = localStorage.getItem("authToken");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBase}/bugs`, {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      });

      const res = await response.json();
      setIsSubmitting(false);

      if (response.ok && !res.errorCode) {
        setShowBugModal(false);
      } else {
        alert(res.message || "Failed to submit bug. Please try again.");
      }
    } catch (err) {
      setIsSubmitting(false);
      alert("Failed to submit bug. Please try again.");
      console.error(err);
    }
  };

  const menuOptions = useMemo(() => {
    const permissions = user?.permissions || [];
    const roles = user?.roles || [];

    if (!options?.length) {
      return [];
    }

    return options.filter((subMenuItem) => {
      if (
        !subMenuItem?.allowedPermissions?.length &&
        !subMenuItem?.allowedRoles?.length
      ) {
        return true;
      }

      let allowed = true;

      if (subMenuItem.allowedRoles) {
        allowed =
          allowed &&
          subMenuItem.allowedRoles.some((role) => roles.includes(role));
      }

      if (subMenuItem.allowedPermissions) {
        allowed =
          allowed &&
          subMenuItem.allowedPermissions.some((permission) =>
            permissions.includes(permission)
          );
      }

      return allowed;
    });
  }, [options, user]);

  if (!menuOptions?.length && !isAuthenticated) {
    return null;
  }

  return (
    <>
      <NavDropdown title={user?.name || "Options"} id="nav-dropdown">
        {menuOptions?.map((option) => (
          <NavDropdown.Item
            key={option.title}
            onClick={() => {
              if (option.location.endsWith("#report-bug")) {
                setShowBugModal(true);
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

        {isAuthenticated && !!menuOptions?.length && <NavDropdown.Divider />}

        {isAuthenticated && (
          <NavDropdown.Item onClick={logout}>Logout</NavDropdown.Item>
        )}
      </NavDropdown>

      <BugFormModal
        show={showBugModal}
        onHide={() => setShowBugModal(false)}
        onSubmit={handleCreateBugSubmit}
        categories={categories}
        isSubmitting={isSubmitting}
      />
    </>
  );
};
