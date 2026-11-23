# @variamosple/variamos-components

React components and contexts shared by the VariaMos front ends: the session, the menu, the header with its user menu and bug report form, the notification bell and drawer, and a few page helpers (paginator, protected route, confirmation modal).

## Install

```bash
npm install @variamosple/variamos-components
```

Peer dependencies: `react` and `react-dom` 18 or 19, `react-bootstrap` 2, `react-bootstrap-icons` 1.

```tsx
import { Header, SessionProvider } from "@variamosple/variamos-components";
```

The user menu of the header has the class `variamos-header-options`; its id is generated, so tests and styles should use the class.

Since 0.8.0 the header starts with a "Skip to main content" link, hidden until it has the focus, and the logo is a link to the home of the app (`basePath`). The skip link moves the focus to the element whose id is `mainContentId` (`"main-content"` by default, exported as `DEFAULT_MAIN_CONTENT_ID`) instead of jumping to an anchor, which a hash router would read as a route. Give the main content of each page that id and `tabIndex={-1}`, for example `<main id="main-content" tabIndex={-1}>`.

The session lives in the httpOnly `authToken` cookie of the admin service: requests must send it (`credentials: "include"`, or `withCredentials` with axios). Since 0.4.0 the library never keeps the token in `localStorage`, and `SessionProvider` removes the copy that older versions kept there; a front end should not add an `Authorization` header from that storage.

Only the admin ends a session. `SessionProvider` checks `GET /auth/session-info` once a minute and clears the user only when the admin answers 401 or 403. Since 0.7.0, any other failure (no network, a 5xx while the admin restarts, a proxy error page, an error code that is not a number) keeps the user and the open page: `useSession().isServerUnreachable` becomes `true`, the check is tried again after 5 s, 10 s, 20 s, 40 s, then once a minute, and `AuthWrapper` shows a banner instead of sending the user to the sign-in page. `getSessionInfo` should therefore resolve with the status code of the admin as `errorCode` on 401 and 403; whatever it returns otherwise is read as "the admin did not answer".

Since 0.9.0 the bug report form, the notification drawer and `ConfirmationModal` are named by their title (or question) for screen readers, and a page wrapped in `withPageVisit` is recorded even when it is rendered together with `AnalyticsProvider`.

Also since 0.9.0:

- `useQuery` and `usePaginatedQuery` fill `error` (the message of a failed answer, or a generic one when no answer came; `null` after a success), show only the answer of the last request, and change page on a copy of the filter.
- `MenuContextProvider` asks the menu again 2 s, 5 s and 15 s after a failure, instead of keeping an empty menu until the page is reloaded.
- `useSession().logout()` resolves to `false` when the admin could not close the session (other than 401 or 403): the user stays signed in and the header says so. It resolves to `true` once signed out.
- The guest id is read and kept in `localStorage` only when the browser allows it.
- `adminApiUrl` of `Header` has no hidden fallback any more: without it, bug reports go to `/bugs` on the origin of the page (`DEFAULT_ADMIN_API_URL` is `"/v1"`). The library never read `VITE_ADMIN_API_URL` of the application.
- The notification socket falls back to long polling when WebSocket is blocked, and loads the folder shown again after each reconnection; `useNotifications().isOffline` is `true` while the live updates are down, and the drawer says so.

## Development

Requires Node 26 (`.nvmrc`, `.mise.toml`). `npm install` sets up the Git hooks: Biome and cspell on the staged files before a commit, the conventional commit format, and typecheck, lint and tests before a push.

| Command | What it does |
| --- | --- |
| `npm run dev` | Demo page (`src/`), built from the library sources |
| `npm run typecheck` | Types of the library, the demo and the Vite configuration |
| `npm run lint` | Biome (shared configuration of the VariaMos admin module) and the check that no rule is silenced in a comment |
| `npm run format` | Formats the code with Biome |
| `npm run spell` | Spelling (cspell) |
| `npm run find-deadcode` | Unused files, exports and dependencies (knip) |
| `npm test` | Unit and render tests (Vitest, jsdom, Testing Library, axe), with coverage thresholds |
| `npm run build` | Builds `dist/` |
| `npm run check-package` | What `npm pack` would publish, then publint |

The CI runs the same commands on every pull request, and the tests once more with React 18, which the package also accepts (versions locked in `ci/react-18/package-lock.json`). The package is published to npm by hand.

Render tests use `test/renderWithContexts.tsx`: the real session and notification providers over a fake session-info and a fake notification service, and the router and menu given by the test. `axeViolations` lists what axe finds in an element (color contrast aside: jsdom computes no style).
