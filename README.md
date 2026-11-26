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
- The drawer asks before emptying the trash, offers to restore each notification of the trash (`useNotifications().restoreNotification`, `PATCH /notifications/:id/restore`), and says that the trash keeps them 30 days. The restore route needs variamos_ms_notifications with ADM-N16; older versions answer 404 and the notification stays in the trash.

Since 0.9.1 the bug report form names the file chosen and can remove it; a cancelled file dialog no longer keeps, and sends, the file chosen before. The form cannot be closed while it is sending, and it keeps its text and file when the report is refused.

Since 0.10.0 no unsaved input is lost when the connection or the session is lost:

- A form says whether it holds unsaved input with `useUnsavedInput(holdsInput)`. `isUnsavedInput(initial, current)` gives the rule used everywhere: a field differs from the value the form opened with, blanks aside, or a file was chosen. While a form holds input, the browser asks before the tab is closed or reloaded; `hasUnsavedInput()` and `useHasUnsavedInput()` tell the page.
- Past the lifetime of a session token without an answer of the admin (`sessionLifetimeMs` of `SessionProvider`, 15 minutes by default, as `VARIAMOS_JWT_EXP_IN_SECONDS`), the page becomes read only: `useSession().isReadOnly` is `true`, `AuthWrapper` says that the input is kept and sends no form of the page, and the fields stay editable and can be copied. When the admin answers again, the session is renewed and the page goes on.
- When the admin says that the session is over (401, 403) while a form holds input, the page is not left: the user stays shown, `isSessionClosed` and `isReadOnly` are `true`, and `AuthWrapper` offers to sign in again in a new tab (the page goes on once the session is back) or here, after saying that the input would be lost. Once the input is dropped, the page goes to the sign-in page as before. Without input, nothing changes.
- `useSession().checkSession()` checks the session at once: call it when a service answers 401, so that an expired session is renewed, or an ended one said, instead of leaving the page. The bug report form does so after a refusal.
- The texts of the components are in English, Spanish or French, after `<html lang>` (English for any other language).
- Closing a form that holds unsaved input asks first (UX-08), and only then: `useDiscardConfirmation({ holdsInput, onClose })` gives `requestClose` for every way of closing (close button, Cancel, Escape, a click outside), and `DiscardInputPrompt` asks "Discard your input?" in the form itself, the focus on "Keep editing". The bug report form does so; it now also closes on Escape and outside when it holds nothing, and still not while it is sending.

Since 0.11.0:

- While a dialog is open, the banner of `AuthWrapper` (lost connection, ended session) goes into the dialog on top, first: the dialog keeps the focus inside it and hides the rest of the page from screen readers, so that the banner is reached from the keyboard and announced. It goes back above the page once the dialog is closed.
- A session that ends on a page sends it to the sign-in page with `reason=session-expired` before `redirectTo`, so that the sign-in page says why; a visitor never signed in on the page is sent without it. A 401 of a service should only call `checkSession()`: the admin then renews the session or says it is over.
- `openBugReport({ title, description })` opens the global bug form of the header filled with these texts (the `openReportBugModal` event with this detail; texts only are taken). A filled form left as it is closes at once; what the reporter changes is input as above.
- `DialogErrorBoundary` goes around a dialog that a page opens (`show`, `onClose`): an error thrown while the dialog renders stays in it, which says so, offers to report it with the global bug form (`canReport`, true by default) and closes; the page keeps its own input instead of being replaced by its error page. The global bug form has one: before, an error in it unmounted the whole application and the input of the page.

Since 0.12.0:

- "Logout" in the account menu asks first while a form of the page holds unsaved input (`hasUnsavedInput()`), as leaving the page does: "Keep editing" (focused, also Escape) keeps the page and its input, "Sign out" goes on. Without input it signs out at once, as before. The texts follow `<html lang>` (en, es, fr).
- `useUnsavedInput(holdsInput, { keptOnNavigation: true })` (also an option of `useDiscardConfirmation`) says that a form stays when the page changes, as the global bug form of the header does. `hasUnsavedInput({ leavingPage: true })` leaves such forms out: a guard of the routes of an application uses it, so that the back button no longer asks while only the global bug form holds input. The session and the closing of the tab still count every form.
- `DiscardInputPrompt` takes `discardLabel`, the name of the answer that drops the input ("Discard" by default).

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
