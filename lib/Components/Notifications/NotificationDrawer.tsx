import type React from "react";
import { useEffect, useState } from "react";
import { Button, Nav, Offcanvas, Spinner } from "react-bootstrap";
import { ArrowLeft, CheckAll, Gear, Inbox, Trash } from "react-bootstrap-icons";
import {
  type NotificationItem,
  useNotifications,
} from "../../Context/NotificationContext";
import { NotificationCard } from "./NotificationCard";
import { NotificationSettings } from "./NotificationSettings";

export interface NotificationDrawerProps {
  show: boolean;
  onClose: () => void;
}

type Folder = "inbox" | "trash";

const isFolder = (key: string | null): key is Folder =>
  key === "inbox" || key === "trash";

interface NotificationListProps {
  folder: Folder;
  isLoading: boolean;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationList: React.FC<NotificationListProps> = ({
  folder,
  isLoading,
  notifications,
  onMarkAsRead,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }
  if (notifications.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <p className="mb-0">
          {folder === "inbox"
            ? "Your inbox is empty!"
            : "No deleted notifications."}
        </p>
      </div>
    );
  }
  return (
    <div className="px-3">
      {notifications.map((item) => (
        <NotificationCard
          key={item.id}
          item={item}
          inInbox={folder === "inbox"}
          onMarkAsRead={onMarkAsRead}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
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

  const [activeFolder, setActiveFolder] = useState<Folder>("inbox");
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Reload notifications whenever the active folder or drawer visibility changes
  useEffect(() => {
    if (show) {
      void fetchNotifications(activeFolder);
    }
  }, [show, activeFolder, fetchNotifications]);

  return (
    <Offcanvas
      show={show}
      onHide={onClose}
      placement="end"
      className="text-dark"
    >
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
              onSelect={(key) => {
                if (isFolder(key)) setActiveFolder(key);
              }}
              className="px-3 pt-2 bg-light border-bottom"
            >
              <Nav.Item>
                <Nav.Link
                  eventKey="inbox"
                  className="d-flex align-items-center"
                >
                  <Inbox className="me-2" />
                  Inbox
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  eventKey="trash"
                  className="d-flex align-items-center"
                >
                  <Trash className="me-2" />
                  Trash
                </Nav.Link>
              </Nav.Item>
            </Nav>

            {/* Quick Actions Header */}
            {notifications.length > 0 ? (
              <div className="d-flex justify-content-end align-items-center p-2 bg-light border-bottom px-3">
                {activeFolder === "inbox" ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-primary text-decoration-none d-flex align-items-center"
                    onClick={() => void markAllAsRead()}
                  >
                    <CheckAll className="me-1" size={18} />
                    Mark all as read
                  </Button>
                ) : (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-danger text-decoration-none d-flex align-items-center"
                    onClick={() => void emptyTrash()}
                  >
                    <Trash className="me-1" size={16} />
                    Empty Trash
                  </Button>
                )}
              </div>
            ) : null}

            {/* Notifications List */}
            <div className="flex-grow-1 overflow-auto bg-light pt-3">
              <NotificationList
                folder={activeFolder}
                isLoading={isLoading}
                notifications={notifications}
                onMarkAsRead={(id) => void markAsRead(id)}
                onDelete={(id) => void deleteNotification(id)}
              />
            </div>
          </>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
};
