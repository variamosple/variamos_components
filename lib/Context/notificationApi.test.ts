import { describe, expect, it, vi } from "vitest";
import {
  createNotificationApi,
  notificationItemOf,
  preferencesOf,
} from "./notificationApi";

const item = {
  id: "n-1",
  recipientId: "u-1",
  templateKey: "project_created",
  variables: { projectName: "Demo" },
  metadata: {},
  isRead: false,
  createdAt: "2026-11-14T10:00:00.000Z",
};

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const apiWith = (fetchImpl: typeof fetch) =>
  createNotificationApi({
    apiUrl: "https://notifications.test",
    recipientId: "u-1",
    getHeaders: () => Promise.resolve({ Authorization: "Bearer t" }),
    fetchImpl,
  });

describe("notificationItemOf", () => {
  it("keeps the fields the drawer shows", () => {
    expect(notificationItemOf(item)).toEqual({
      id: "n-1",
      templateKey: "project_created",
      variables: { projectName: "Demo" },
      metadata: {},
      isRead: false,
      createdAt: "2026-11-14T10:00:00.000Z",
    });
  });

  it("gives empty variables when the service sends none", () => {
    expect(notificationItemOf({ ...item, variables: null })?.variables).toEqual(
      {},
    );
  });

  it.each([
    ["no id", { ...item, id: undefined }],
    ["a number as read flag", { ...item, isRead: 0 }],
    ["not an object", "n-1"],
  ])("refuses a notification with %s", (_label, value) => {
    expect(notificationItemOf(value)).toBeNull();
  });
});

describe("preferencesOf", () => {
  it("keeps only the muted types written as text", () => {
    expect(
      preferencesOf({
        userId: "u-1",
        emailEnabled: true,
        inAppEnabled: false,
        mutedEventTypes: ["a", 3],
      }),
    ).toEqual({
      emailEnabled: true,
      inAppEnabled: false,
      mutedEventTypes: ["a"],
    });
  });

  it("refuses preferences without the flags", () => {
    expect(preferencesOf({ mutedEventTypes: [] })).toBeNull();
  });
});

describe("createNotificationApi", () => {
  it("lists a folder page with the headers given", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => json([item, { id: 2 }]));

    const items = await apiWith(fetchImpl).list({
      folder: "trash",
      page: 2,
      limit: 10,
    });

    expect(items?.map(({ id }) => id)).toEqual(["n-1"]);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://notifications.test/notifications?recipientId=u-1&page=2&limit=10&folder=trash",
    );
    expect(init?.headers).toEqual({ Authorization: "Bearer t" });
  });

  it("gives null when the service refuses the list", async () => {
    const api = apiWith(vi.fn<typeof fetch>(() => json({}, 401)));
    await expect(
      api.list({ folder: "inbox", page: 1, limit: 10 }),
    ).resolves.toBeNull();
  });

  it.each([
    ["markAsRead", "/notifications/n-1/read", "PATCH"],
    ["remove", "/notifications/n-1", "DELETE"],
  ] as const)("%s calls %s with %s", async (action, path, method) => {
    const fetchImpl = vi.fn<typeof fetch>(() => json({}));

    await expect(apiWith(fetchImpl)[action]("n-1")).resolves.toBe(true);

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(`https://notifications.test${path}`);
    expect(init?.method).toBe(method);
  });

  it.each([
    ["markAllAsRead", "/notifications/read-all?recipientId=u-1", "PATCH"],
    ["emptyTrash", "/notifications/trash?recipientId=u-1", "DELETE"],
  ] as const)("%s calls %s with %s", async (action, path, method) => {
    const fetchImpl = vi.fn<typeof fetch>(() => json({}, 500));

    await expect(apiWith(fetchImpl)[action]()).resolves.toBe(false);

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(`https://notifications.test${path}`);
    expect(init?.method).toBe(method);
  });

  it("sends the preference changes as JSON", async () => {
    const saved = {
      emailEnabled: false,
      inAppEnabled: true,
      mutedEventTypes: [],
    };
    const fetchImpl = vi.fn<typeof fetch>(() => json(saved));

    await expect(
      apiWith(fetchImpl).updatePreferences({ emailEnabled: false }),
    ).resolves.toEqual(saved);
    expect(fetchImpl.mock.calls[0]?.[1]?.body).toBe('{"emailEnabled":false}');
  });
});
