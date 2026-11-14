import { fieldOf } from "../Common/fieldOf";

export interface NotificationItem {
  id: string;
  templateKey: string;
  variables: Record<string, unknown>;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface UserNotificationPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  mutedEventTypes: string[];
}

export type NotificationFolder = "inbox" | "trash";

const recordOf = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? Object.fromEntries(Object.entries(value))
    : {};

/** A notification sent by the service, or null if a field is missing. */
export function notificationItemOf(value: unknown): NotificationItem | null {
  const id = fieldOf(value, "id");
  const templateKey = fieldOf(value, "templateKey");
  const isRead = fieldOf(value, "isRead");
  const createdAt = fieldOf(value, "createdAt");
  if (
    typeof id !== "string" ||
    typeof templateKey !== "string" ||
    typeof isRead !== "boolean" ||
    typeof createdAt !== "string"
  ) {
    return null;
  }
  return {
    id,
    templateKey,
    variables: recordOf(fieldOf(value, "variables")),
    metadata: recordOf(fieldOf(value, "metadata")),
    isRead,
    createdAt,
  };
}

/** The preferences sent by the service, or null if a field is missing. */
export function preferencesOf(
  value: unknown,
): UserNotificationPreferences | null {
  const emailEnabled = fieldOf(value, "emailEnabled");
  const inAppEnabled = fieldOf(value, "inAppEnabled");
  const muted = fieldOf(value, "mutedEventTypes");
  if (
    typeof emailEnabled !== "boolean" ||
    typeof inAppEnabled !== "boolean" ||
    !Array.isArray(muted)
  ) {
    return null;
  }
  return {
    emailEnabled,
    inAppEnabled,
    mutedEventTypes: muted.filter((type) => typeof type === "string"),
  };
}

export interface NotificationApiOptions {
  apiUrl: string;
  recipientId: string;
  getHeaders: () => Promise<Record<string, string>>;
  fetchImpl?: typeof fetch;
}

export interface NotificationPage {
  folder: NotificationFolder;
  page: number;
  limit: number;
}

/**
 * Calls to the notification service. Each one resolves to null (or false)
 * when the service refuses; a network error rejects.
 */
export function createNotificationApi({
  apiUrl,
  recipientId,
  getHeaders,
  fetchImpl = fetch,
}: NotificationApiOptions) {
  // The recipientId parameters stay during the transition: the service
  // ignores them once the access token is verified.
  const recipient = `recipientId=${recipientId}`;

  const send = async (path: string, method?: string, body?: string) => {
    const response = await fetchImpl(`${apiUrl}/notifications${path}`, {
      method,
      headers: await getHeaders(),
      body,
    });
    return response.ok ? response : null;
  };
  const readJson = async (response: Response | null): Promise<unknown> =>
    response ? response.json() : null;

  return {
    async list({
      folder,
      page,
      limit,
    }: NotificationPage): Promise<NotificationItem[] | null> {
      const data = await readJson(
        await send(
          `?${recipient}&page=${page}&limit=${limit}&folder=${folder}`,
        ),
      );
      if (!Array.isArray(data)) return null;
      return data
        .map(notificationItemOf)
        .filter((item): item is NotificationItem => item !== null);
    },
    async markAsRead(id: string): Promise<boolean> {
      return (await send(`/${id}/read`, "PATCH")) !== null;
    },
    async markAllAsRead(): Promise<boolean> {
      return (await send(`/read-all?${recipient}`, "PATCH")) !== null;
    },
    async emptyTrash(): Promise<boolean> {
      return (await send(`/trash?${recipient}`, "DELETE")) !== null;
    },
    async remove(id: string): Promise<boolean> {
      return (await send(`/${id}`, "DELETE")) !== null;
    },
    async preferences(): Promise<UserNotificationPreferences | null> {
      return preferencesOf(
        await readJson(await send(`/preferences?${recipient}`)),
      );
    },
    async updatePreferences(
      updates: Partial<UserNotificationPreferences>,
    ): Promise<UserNotificationPreferences | null> {
      return preferencesOf(
        await readJson(
          await send(
            `/preferences?${recipient}`,
            "PATCH",
            JSON.stringify(updates),
          ),
        ),
      );
    },
  };
}

export type NotificationApi = ReturnType<typeof createNotificationApi>;
