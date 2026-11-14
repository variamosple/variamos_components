import type { NotificationItem } from "../../Context/notificationApi";

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

// Interpolates template variables (e.g. {{name}} -> Nathan)
export function renderTemplateText(
  template: string,
  variables: Record<string, unknown>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.split(`{{${key}}}`).join(String(value));
  }
  return result;
}

/** The title and body shown for a notification. */
export function notificationTextOf(item: NotificationItem) {
  const template = CLIENT_TEMPLATES[item.templateKey] ?? {
    title: "New Alert",
    body: `Notification template: ${item.templateKey}`,
  };
  return {
    title: renderTemplateText(template.title, item.variables),
    body: renderTemplateText(template.body, item.variables),
  };
}
