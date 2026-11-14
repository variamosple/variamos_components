import type { FC } from "react";
import { Button } from "react-bootstrap";
import { CircleFill, Trash } from "react-bootstrap-icons";
import type { NotificationItem } from "../../Context/notificationApi";
import { notificationTextOf } from "./notificationText";

export interface NotificationCardProps {
  item: NotificationItem;
  inInbox: boolean;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

const ICON_STYLE = { boxShadow: "none" };

export const NotificationCard: FC<NotificationCardProps> = ({
  item,
  inInbox,
  onMarkAsRead,
  onDelete,
}) => {
  const { title, body } = notificationTextOf(item);
  const isUnread = inInbox && !item.isRead;

  return (
    <div
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
          {isUnread ? (
            <Button
              variant="link"
              className="p-1 text-primary border-0 d-flex align-items-center"
              onClick={() => onMarkAsRead(item.id)}
              title="Mark as read"
              style={ICON_STYLE}
            >
              <CircleFill size={8} className="text-primary" />
            </Button>
          ) : null}
          {inInbox ? (
            <Button
              variant="link"
              className="p-1 text-secondary border-0 d-flex align-items-center"
              onClick={() => onDelete(item.id)}
              title="Move to trash"
              style={ICON_STYLE}
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
          ) : null}
        </div>
      </div>
    </div>
  );
};
