# @ramcar/store

Shared **Zustand store** for the Ramcar platform. Owns client/UI state and feature-scoped slices used by `apps/web`, `apps/desktop`, and `@ramcar/features`. SSR-safe via a `createStore()` factory + `<StoreProvider>` context.

## Why this package exists

Both the web portal and the desktop booth need the same shape of client state — auth session, sidebar open/collapsed, theme, sync status for offline/online, and feature-scoped UI state (e.g., visitors sidebar open/close, selected row, active tab). Centralizing the store here guarantees both apps consume the same slice definitions and the same selector patterns, and it keeps `@ramcar/features` free of store ownership.

## Division of responsibilities

- **Server/async state** — owned by TanStack Query, NOT this store. Query keys include `tenantId`: `[resource, tenantId, modifier, filters]`.
- **Client/UI state** — owned by this package (toasts, modals, sidebar open/collapsed, theme, sync status, per-feature UI slices).

There is no overlap between React Query and Zustand.

## Slices

Each slice is a self-contained module under `src/slices/` with its own state, actions, and selectors. The root store is composed of slice factories; `AppState` is their union.

Current slices:

- **`auth-slice`** — Supabase session, role, tenant id; read by guards and role-gated UI.
- **`sidebar-slice`** — app-shell sidebar collapsed/expanded state (spec 003). Persisted to `localStorage`.
- **`sync-slice`** — desktop offline/online/syncing/error state consumed by the desktop host's offline badge (principle IV).
- **`theme-slice`** — desktop theme preference (light/dark). Persisted to `localStorage`. Web uses `next-themes` directly at the layout level.
- **`visitors-slice`** — feature-scoped client state for the shared visitors feature (sidebar open/close, selected row, active tab). Added by spec 014 to keep feature UI state out of `@ramcar/features`.

New bi-app features that migrate into `@ramcar/features` add their feature-scoped slice here (e.g., `residents-slice`, `providers-slice`) rather than creating state inside the shared feature package.

## Usage

Each host app renders exactly one `<StoreProvider>` at its root. Consumers read state via the canonical selector hook pattern:

```ts
import { useAppStore } from "@ramcar/store";

const selectedVisitor = useAppStore((s) => s.visitors.selectedId);
const setSelectedVisitor = useAppStore((s) => s.visitors.setSelected);
```

Slices MUST be read with a selector — never destructure the full store, or re-renders will thrash.

## What does NOT belong here

- No domain schemas (those live in `@ramcar/shared` as Zod validators).
- No TanStack Query keys, fetchers, or cache logic — server state is TanStack Query's job.
- No UI primitives (those live in `@ramcar/ui`) and no feature components (those live in `@ramcar/features`).
- No i18n strings (those live in `@ramcar/i18n`).
- No direct Supabase database calls — writes go through the NestJS API.

## SSR safety

The store is created per-request on the server and per-session on the client via a factory:

```
createStore()  →  <StoreProvider store={...}>  →  useAppStore(selector)
```

This avoids module-singleton state leaking between requests on the Next.js server.

## Dependencies

- `zustand` ^5
- `@ramcar/shared` — types used by slices (e.g., `Role`, `TenantId`)

## Position in the package graph

```
apps/web ─────────┐
apps/desktop ─────┤──→ @ramcar/store ──→ zustand
@ramcar/features ─┘                       @ramcar/shared
```

`@ramcar/features` depends on `@ramcar/store` for slice definitions only; it does NOT create its own store.

## Scripts

```bash
pnpm --filter @ramcar/store typecheck
pnpm --filter @ramcar/store test
pnpm --filter @ramcar/store test:cov
```

## See also

- Feature-scoped slice policy: spec [`014-cross-app-code-sharing`](../../specs/014-cross-app-code-sharing/spec.md) — clarification Q (slices, not a second store).
- App-shell sidebar slice: spec [`003-app-navigation-shell`](../../specs/003-app-navigation-shell/).
