# @ramcar/features

Shared **bi-app feature modules** for the Ramcar platform. Vertical feature slices (visitors, residents, providers, …) that are authored **once** here and consumed by both `apps/web` (Next.js portal) and `apps/desktop` (Electron guard booth).

Introduced by spec [`014-cross-app-code-sharing`](../../specs/014-cross-app-code-sharing/spec.md) to eliminate the per-app duplication of feature-level components and hooks and the silent drift that came with it.

## Why this package exists

Every feature that lives in both the web portal and the desktop booth used to be authored twice — the same sidebar form, the same table, the same image grid, the same TanStack Query hooks, copied into `apps/web/src/features/<X>/` and `apps/desktop/src/features/<X>/`. Every change had to be landed twice; when it wasn't, the two apps silently drifted.

`@ramcar/features` is the single home for the common body of a bi-app feature: components, interaction logic, and data-fetching hooks. Each host app provides routing, layout shell, auth bootstrap, provider wiring, and injects platform-specific concerns through documented extension points.

## Policy: shared core with platform extensions

The shared module owns the common body. Each host app owns:

- Routing, shell/layout, auth bootstrap, Zustand provider wiring.
- **Deliberate** platform-specific behavior, injected through extension points:
  - **Web-only** — `useFormPersistence` draft recovery (browser-reload protection; not relevant to the desktop renderer), admin-only actions.
  - **Desktop-only** — offline/sync status badge, outbox-backed mutation transport (the shared mutation hook accepts a transport; desktop wires it to the SyncEngine outbox, web wires it to direct HTTP).

Deliberate divergence is expressed via extension points, **never** by forking the feature.

## Non-negotiable rules (the package is policed by ESLint)

A shared feature module MUST NOT:

- Use `"use client";` directive, or import from `next/*` (e.g., `next/navigation`, `next/link`).
- Access `window.electron`, Electron IPC, SQLite, or any Node-in-renderer API.
- Import a concrete i18n library (`next-intl`, `react-i18next`) directly.
- Call `fetch` against a hardcoded URL, or issue `supabase.from()` / `.rpc()` / `.storage`.
- Cross-slice imports — `features/src/visitors/*` must not import from `features/src/residents/*`.
- Own routing, layout shell, auth bootstrap, or create its own Zustand store.

The package runs on both a Next.js App Router client tree and a Vite + Electron renderer tree with no per-host branching.

## How the host wires it up

Each host app provides adapters at its root:

| Concern | Port | Web wires to | Desktop wires to |
|---|---|---|---|
| Data transport | `TransportAdapter` | online HTTP (`apiClient`) | outbox-aware transport (SyncEngine) |
| i18n | `I18nAdapter` | `next-intl` (`useTranslations`) | `react-i18next` (`useTranslation`) |
| Role/tenant context | `RoleAdapter` | Supabase session → role | Supabase session → role |

Adapters are React context providers. Inside the shared module, components/hooks read them through `useTransport()`, `useI18n()`, `useRole()`. No concrete library leaks in.

## Package structure

```
src/
├── adapters/             # Port contracts + context providers (transport, i18n, role)
├── shared/               # Migrated cross-feature primitives shared between domain slices
│   ├── image-capture/
│   ├── vehicle-form/
│   ├── visit-person-status-select/
│   └── resident-select/
├── visitors/             # Pilot feature slice (spec 014)
│   ├── components/
│   ├── hooks/
│   ├── types.ts
│   └── index.ts          # Public surface: <VisitorsView />, etc.
├── test/                 # Test harness: stubs for transport/i18n/role
└── index.ts
```

## Dependencies (unidirectional)

```
@ramcar/features → { @ramcar/ui, @ramcar/shared, @ramcar/store, @ramcar/i18n }
```

No back-edges. Host apps import **from** `@ramcar/features`; `@ramcar/features` never imports from an app.

- `@ramcar/ui` — primitives (buttons, sheets, tables)
- `@ramcar/shared` — Zod schemas + types (validation reused verbatim)
- `@ramcar/store` — Zustand slice definitions for feature-scoped client state (e.g., `visitorsSlice`)
- `@ramcar/i18n` — the single source of truth for user-facing strings

## Extension points (slot props)

Shared components expose **typed slot props** at documented positions for platform-specific UI:

- `topRightSlot?: ReactNode`
- `trailingAction?: ReactNode`
- `afterFields?: ReactNode`
- `emptyState?: ReactNode`

Each shared component documents its allowed slots in TSDoc. Slot props are for UI injection only — cross-cutting concerns (i18n, transport, role) flow through the adapter context, not slots.

## Migration status

Tracked in [`shared-features.json`](../../shared-features.json) at the workspace root. CI fails the PR build if components/hooks are added under `apps/web/src/features/<X>/` or `apps/desktop/src/features/<X>/` for any feature `X` listed in the manifest.

- `visitors` — migrated 2026-04-17 (pilot).
- Cross-feature primitives (`vehicle-form`, `image-capture`, `visit-person-status-select`, `resident-select`) — migrated 2026-04-17.
- `residents`, `providers` — pending.

## Scripts

```bash
pnpm --filter @ramcar/features typecheck
pnpm --filter @ramcar/features test
pnpm --filter @ramcar/features test:watch
pnpm --filter @ramcar/features test:cov
```

Tests run under Vitest + jsdom with stub adapters. A passing test here is evidence the contract holds for **both** apps — not just one.

## See also

- Spec: [`specs/014-cross-app-code-sharing/spec.md`](../../specs/014-cross-app-code-sharing/spec.md)
- Plan: [`specs/014-cross-app-code-sharing/plan.md`](../../specs/014-cross-app-code-sharing/plan.md)
- Quickstart (engineer how-to): [`specs/014-cross-app-code-sharing/quickstart.md`](../../specs/014-cross-app-code-sharing/quickstart.md)
- Port contracts: [`specs/014-cross-app-code-sharing/contracts/`](../../specs/014-cross-app-code-sharing/contracts/)
- Manifest schema: [`specs/014-cross-app-code-sharing/contracts/shared-features-manifest.schema.json`](../../specs/014-cross-app-code-sharing/contracts/shared-features-manifest.schema.json)
- Cross-app policy section in [`CLAUDE.md`](../../CLAUDE.md)
