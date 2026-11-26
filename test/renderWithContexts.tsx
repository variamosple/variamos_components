import { render } from "@testing-library/react";
import axe from "axe-core";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";
import {
  MenuContext,
  NotificationProvider,
  RouterContext,
  type RouterContextProps,
  SessionProvider,
} from "../lib/Context";
import {
  type Menu,
  type MenuSubItem,
  ResponseModel,
  type SessionInfoResponse,
  type SessionUser,
} from "../lib/Model";

/** A signed-in user; the tests change only what they look at. */
export const userOf = (fields: Partial<SessionUser> = {}): SessionUser => ({
  id: "user-1",
  user: "ada",
  name: "Ada Lovelace",
  email: "ada@example.test",
  roles: [],
  permissions: [],
  ...fields,
});

/** GET /auth/session-info answering with this user, or signed out. */
export const sessionInfoOf =
  (user: SessionUser | null) =>
  (): Promise<ResponseModel<SessionInfoResponse>> =>
    Promise.resolve(
      user
        ? new ResponseModel<SessionInfoResponse>().withData({ user })
        : new ResponseModel<SessionInfoResponse>(undefined, 401),
    );

export const routerOf = (
  fields: Partial<RouterContextProps> = {},
): RouterContextProps => ({
  navigate: vi.fn(),
  params: {},
  queryParams: new URLSearchParams(),
  pathname: "/",
  basePath: "/app/",
  ...fields,
});

export interface Contexts {
  user?: SessionUser | null;
  router?: RouterContextProps;
  menu?: {
    items?: Menu["items"];
    subMenu?: MenuSubItem[];
    options?: MenuSubItem[];
  };
  requestLogout?: () => Promise<ResponseModel<void>>;
  /** Replaces the session-info built from the user. */
  sessionInfo?: () => Promise<ResponseModel<SessionInfoResponse>>;
  /** Address of the notification service; no provider without it. */
  notificationsUrl?: string;
  /** How long a session token lasts, for the session provider. */
  sessionLifetimeMs?: number;
}

/**
 * Renders a component inside the providers of an application: the real
 * session provider over a fake session-info, the router and the menu given,
 * and the real notification provider when an address is given.
 */
export function renderWithContexts(ui: ReactElement, contexts: Contexts = {}) {
  const {
    user = null,
    router = routerOf(),
    menu = {},
    requestLogout = () => Promise.resolve(new ResponseModel<void>()),
    notificationsUrl,
    sessionInfo = sessionInfoOf(user),
    sessionLifetimeMs,
  } = contexts;
  const withNotifications = (children: ReactNode) =>
    notificationsUrl ? (
      <NotificationProvider apiUrl={notificationsUrl}>
        {children}
      </NotificationProvider>
    ) : (
      children
    );

  const view = render(
    <RouterContext.Provider value={router}>
      <SessionProvider
        loginUrl="/login"
        getSessionInfo={sessionInfo}
        requestLogout={requestLogout}
        sessionLifetimeMs={sessionLifetimeMs}
      >
        <MenuContext.Provider
          value={{
            items: menu.items ?? [],
            subMenu: menu.subMenu,
            options: menu.options,
            isLoading: false,
          }}
        >
          {withNotifications(ui)}
        </MenuContext.Provider>
      </SessionProvider>
    </RouterContext.Provider>,
  );
  return { ...view, router };
}

/**
 * The accessibility violations axe finds in an element. Color contrast is
 * left out: jsdom computes no style.
 */
export async function axeViolations(element: Element) {
  const results = await axe.run(element, {
    rules: { "color-contrast": { enabled: false } },
  });
  return results.violations.map(
    ({ id, nodes }) => `${id}: ${nodes.map((node) => node.html).join(" | ")}`,
  );
}

/** A notification as the service sends it. */
export const notificationOf = (
  id: string,
  projectName: string,
  isRead = false,
) => ({
  id,
  templateKey: "project_created",
  variables: { projectName },
  metadata: {},
  isRead,
  createdAt: "2026-11-23T10:00:00.000Z",
});

type ServiceNotification = ReturnType<typeof notificationOf>;

/**
 * A notification service in memory, behind fetch: the folders, the
 * preferences, and the calls received ("PATCH /n-1/read"...).
 */
export function fakeNotificationService(
  inbox: ServiceNotification[],
  trash: ServiceNotification[] = [],
) {
  const calls: string[] = [];
  let preferences = {
    emailEnabled: true,
    inAppEnabled: true,
    mutedEventTypes: [] as string[],
  };
  const json = (body: unknown) => Promise.resolve(Response.json(body));

  const fetchImpl = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/notifications/, "");
    const method = init?.method ?? "GET";
    calls.push(`${method} ${path}${url.search}`);
    if (method === "GET" && path === "") {
      return json(url.searchParams.get("folder") === "trash" ? trash : inbox);
    }
    if (path === "/preferences") {
      if (method === "PATCH") {
        preferences = { ...preferences, ...JSON.parse(String(init?.body)) };
      }
      return json(preferences);
    }
    return Promise.resolve(new Response(null, { status: 204 }));
  });
  return { fetchImpl, calls };
}
