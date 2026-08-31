import React from "react";
import { Button, Badge } from "react-bootstrap";
import { Bell } from "react-bootstrap-icons";
import { useNotifications } from "../../Context/NotificationContext";

export interface NotificationBellProps {
  onClick?: () => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onClick,
  className = "",
}) => {
  const { unreadCount } = useNotifications();

  return (
    <Button
      variant="link"
      onClick={onClick}
      className={`position-relative p-2 text-light ${className}`}
      aria-label="Notifications"
      style={{ boxShadow: "none" }}
    >
      <Bell size={22} />
      {unreadCount > 0 && (
        <Badge
          pill
          bg="danger"
          className="position-absolute translate-middle-y start-50 top-0 border border-white"
          style={{ fontSize: "0.65rem", padding: "0.25em 0.5em" }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
};
