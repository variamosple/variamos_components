import React from "react";
import { Form, Card, Spinner, Alert } from "react-bootstrap";
import { useNotifications } from "../../Context/NotificationContext";

export const NotificationSettings: React.FC = () => {
  const { preferences, updatePreferences, isLoading } = useNotifications();

  const handleChannelToggle = (channel: "emailEnabled" | "inAppEnabled") => {
    if (!preferences) return;
    updatePreferences({ [channel]: !preferences[channel] });
  };

  const handleMutedToggle = (eventType: string) => {
    if (!preferences) return;
    const isMuted = preferences.mutedEventTypes.includes(eventType);
    const newMuted = isMuted
      ? preferences.mutedEventTypes.filter((t) => t !== eventType)
      : [...preferences.mutedEventTypes, eventType];
    updatePreferences({ mutedEventTypes: newMuted });
  };

  if (isLoading && !preferences) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" />
      </div>
    );
  }

  if (!preferences) {
    return <Alert variant="warning">Unable to load notification preferences.</Alert>;
  }

  // Predefined event types in VariaMos system
  const eventTypes = [
    { key: "review_assigned", label: "Review Assignments (Relectures)" },
    { key: "project_created", label: "Project Creations" },
    { key: "system_alert", label: "System Alerts" },
  ];

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-3">
        <h6 className="mb-3 text-secondary font-weight-bold">Notification Channels</h6>
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            id="channel-inapp"
            label="In-App Notifications (Real-Time)"
            checked={preferences.inAppEnabled}
            onChange={() => handleChannelToggle("inAppEnabled")}
            className="mb-2"
          />
          <Form.Check
            type="switch"
            id="channel-email"
            label="Email Alerts"
            checked={preferences.emailEnabled}
            onChange={() => handleChannelToggle("emailEnabled")}
          />
        </Form.Group>

        <hr />

        <h6 className="mb-3 text-secondary font-weight-bold">Mute Event Types</h6>
        <p className="text-muted small mb-3">Check events you do NOT want to receive notifications for.</p>
        <Form.Group>
          {eventTypes.map((event) => {
            const isMuted = preferences.mutedEventTypes.includes(event.key);
            return (
              <Form.Check
                type="checkbox"
                key={event.key}
                id={`mute-${event.key}`}
                label={event.label}
                checked={isMuted}
                onChange={() => handleMutedToggle(event.key)}
                className="mb-2 text-dark"
              />
            );
          })}
        </Form.Group>
      </Card.Body>
    </Card>
  );
};
