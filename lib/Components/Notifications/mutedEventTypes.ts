/**
 * The event types a user can mute, by the template key the services send.
 * The security alerts of the administration are mandatory: the
 * notification service delivers them whatever is muted here (EV-99).
 */
export const MUTABLE_EVENT_TYPES = [
  { key: "review_assigned", label: "Review Assignments (Relectures)" },
  { key: "project_created", label: "Project Creations" },
  {
    key: "admin_alert",
    label: "System Alerts (security alerts are always delivered)",
  },
];

// Keys saved by the earlier versions of this screen: "System Alerts" was
// saved as system_alert, which matched no notification
const FORMER_KEYS: Readonly<Record<string, readonly string[]>> = {
  admin_alert: ["system_alert"],
};

const keysOf = (key: string) => [key, ...(FORMER_KEYS[key] ?? [])];

/** True when the event type is muted, under its key or a former one. */
export function isEventMuted(muted: readonly string[], key: string): boolean {
  return keysOf(key).some((k) => muted.includes(k));
}

/**
 * The muted list once the event type is toggled. Its former keys are
 * dropped either way, so that the list keeps the current key only.
 */
export function toggleMuted(muted: readonly string[], key: string): string[] {
  const keys = keysOf(key);
  const others = muted.filter((k) => !keys.includes(k));
  return isEventMuted(muted, key) ? others : [...others, key];
}
