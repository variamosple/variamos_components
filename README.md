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

## Development

Requires Node 26.

| Command | What it does |
| --- | --- |
| `npm run dev` | Demo page (`src/`), built from the library sources |
| `npm run typecheck` | Types of the library, the demo and the Vite configuration |
| `npm run lint` | Biome (shared configuration of the VariaMos admin module) and the check that no rule is silenced in a comment |
| `npm run format` | Formats the code with Biome |
| `npm run find-deadcode` | Unused files, exports and dependencies (knip) |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Builds `dist/` |
| `npm run check-package` | What `npm pack` would publish, then publint |

The CI runs the same commands on every pull request. The package is published to npm by hand.
