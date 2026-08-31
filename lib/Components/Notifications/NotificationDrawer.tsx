import React, { useState, useEffect } from "react";
import { Offcanvas, Nav, Button, Spinner } from "react-bootstrap";
import { Gear, ArrowLeft, CheckAll, Trash, Inbox, CircleFill } from "react-bootstrap-icons";
import { useNotifications, NotificationItem } from "../../Context/NotificationContext";
import { NotificationSettings } from "./NotificationSettings";

export interface NotificationDrawerProps {
  show: boolean;
  onClose: () => void;
}

// Client-side template catalog matching backend template keys for fallbacks
const CLIENT_TEMPLATES: Record<string, { title: string; body: string }> = {
  review_assigned: {
    title: "Language Review Assigned",
    body: "You have been assigned to review the translation for {{languageName}}.",
  },
  project_created: {
    title: "Project Created",
    body: "The project '{{projectName}}' has been created successfully.",
  },
  test_template: {
    title: "Notification Test",
    body: "Hello {{name}}, this is a real-time notification test.",
  },
  admin_alert: {
    title: "{{title}}",
    body: "{{body}}",
  },
};

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  show,
  onClose,
}) => {
  const {
    notifications,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    emptyTrash,
    deleteNotification,
  } = useNotifications();

  const [activeFolder, setActiveFolder] = useState<"inbox" | "trash">("inbox");
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Reload notifications whenever the active folder or drawer visibility changes
  useEffect(() => {
    if (show) {
      fetchNotifications(activeFolder);
    }
  }, [show, activeFolder]);

  // Interpolates template variables (e.g. {{name}} -> Nathan)
  const renderTemplateText = (templateStr: string, variables: Record<string, any>) => {
    let result = templateStr;
    for (const key of Object.keys(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), String(variables[key]));
    }
    return result;
  };

  const getNotificationText = (item: NotificationItem) => {
    const template = CLIENT_TEMPLATES[item.templateKey] || {
      title: "New Alert",
      body: `Notification template: ${item.templateKey}`,
    };

    return {
      title: renderTemplateText(template.title, item.variables),
      body: renderTemplateText(template.body, item.variables),
    };
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Offcanvas show={show} onHide={onClose} placement="end" className="text-dark">
      <Offcanvas.Header closeButton className="border-bottom">
        <Offcanvas.Title className="d-flex align-items-center w-100">
          {showSettings ? (
            <>
              <Button
                variant="link"
                className="p-0 me-2 text-dark"
                onClick={() => setShowSettings(false)}
                aria-label="Back"
              >
                <ArrowLeft size={20} />
              </Button>
              <span>Settings</span>
            </>
          ) : (
            <div className="d-flex justify-content-between align-items-center w-100 me-3">
              <span>Notifications</span>
              <Button
                variant="link"
                className="p-0 text-secondary"
                onClick={() => setShowSettings(true)}
                aria-label="Notification Settings"
                style={{ boxShadow: "none" }}
              >
                <Gear size={20} />
              </Button>
            </div>
          )}
        </Offcanvas.Title>
      </Offcanvas.Header>

      <Offcanvas.Body className="p-0 d-flex flex-column h-100">
        {showSettings ? (
          <div className="p-3">
            <NotificationSettings />
          </div>
        ) : (
          <>
            {/* Nav tabs for Inbox vs Trash */}
            <Nav
              variant="tabs"
              activeKey={activeFolder}
              onSelect={(k) => setActiveFolder(k as "inbox" | "trash")}
              className="px-3 pt-2 bg-light border-bottom"
            >
              <Nav.Item>
                <Nav.Link eventKey="inbox" className="d-flex align-items-center">
                  <Inbox className="me-2" />
                  Inbox
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="trash" className="d-flex align-items-center">
                  <Trash className="me-2" />
                  Trash
                </Nav.Link>
              </Nav.Item>
            </Nav>

            {/* Quick Actions Header */}
            {notifications.length > 0 && (
              <div className="d-flex justify-content-end align-items-center p-2 bg-light border-bottom px-3">
                {activeFolder === "inbox" ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-primary text-decoration-none d-flex align-items-center"
                    onClick={markAllAsRead}
                  >
                    <CheckAll className="me-1" size={18} />
                    Mark all as read
                  </Button>
                ) : (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-danger text-decoration-none d-flex align-items-center"
                    onClick={emptyTrash}
                  >
                    <Trash className="me-1" size={16} />
                    Empty Trash
                  </Button>
                )}
              </div>
            )}

            {/* Notifications List */}
            <div className="flex-grow-1 overflow-auto bg-light pt-3">
              {isLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p className="mb-0">
                    {activeFolder === "inbox"
                      ? "Your inbox is empty!"
                      : "No deleted notifications."}
                  </p>
                </div>
              ) : (
                <div className="px-3">
                  {notifications.map((item) => {
                    const { title, body } = getNotificationText(item);
                    const isUnread = activeFolder === "inbox" && !item.isRead;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 mb-2 rounded border shadow-sm ${
                          isUnread ? "bg-white border-primary-subtle" : "bg-white border-light"
                        }`}
                        style={{
                          transition: "all 0.2s ease-in-out",
                          borderLeft: isUnread ? "4px solid #0d6efd" : "1px solid #dee2e6",
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="pe-2 flex-grow-1">
                            <h6
                              className={`mb-1 ${
                                isUnread ? "fw-bold text-dark" : "text-secondary fw-semibold"
                              }`}
                              style={{ fontSize: "0.9rem", lineHeight: "1.25" }}
                            >
                              {title}
                            </h6>
                            <p
                              className="mb-2 text-muted"
                              style={{ fontSize: "0.8rem", color: "#6c757d", lineHeight: "1.3" }}
                            >
                              {body}
                            </p>
                            <span className="text-muted d-block" style={{ fontSize: "0.7rem" }}>
                              {formatTime(item.createdAt)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center gap-2">
                            {isUnread && (
                              <Button
                                variant="link"
                                className="p-1 text-primary border-0 d-flex align-items-center"
                                onClick={() => markAsRead(item.id)}
                                title="Mark as read"
                                style={{ boxShadow: "none" }}
                              >
                                <CircleFill size={8} className="text-primary" />
                              </Button>
                            )}
                            {activeFolder === "inbox" && (
                              <Button
                                variant="link"
                                className="p-1 text-secondary border-0 d-flex align-items-center"
                                onClick={() => deleteNotification(item.id)}
                                title="Move to trash"
                                style={{ boxShadow: "none" }}
                                onMouseEnter={(e) => {
                                  const icon = e.currentTarget.querySelector("svg");
                                  if (icon) icon.style.fill = "#dc3545";
                                }}
                                onMouseLeave={(e) => {
                                  const icon = e.currentTarget.querySelector("svg");
                                  if (icon) icon.style.fill = "currentColor";
                                }}
                              >
                                <Trash size={14} style={{ transition: "fill 0.2s" }} />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
};
