# Implementation Plan: Cross-App Shared Feature Modules

**Branch**: `014-cross-app-code-sharing` | **Date**: 2026-04-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-cross-app-code-sharing/spec.md`

## Summary

Eliminate the web/desktop duplication of bi-app features (today: `visitors`, `residents`, `providers` plus the duplicated `src/shared/components/` set) by authoring the shared core once in a new dedicated workspace package `@ramcar/features`, consumed by `apps/web` and `apps/desktop`. The shared package owns the common body of each feature (components, hooks, TanStack Query data access). The host apps own routing, layout shell, auth bootstrap, and store provider wiring, and inject platform-specific concerns through (a) a typed transport adapter, (b) a typed i18n adapter, (c) typed React context for role/tenant, and (d) typed slot props for UI divergence. Deliberate divergences — `useFormPersistence` on web, offline/outbox writes on desktop, admin-only actions on web — are expressed through these extension points rather than by forking the feature. The pilot migration moves `visitors` (all three layers: primitives, feature-level components, and hooks) to `@ramcar/features` in one pass; `residents` and `providers` follow incrementally. A CI check driven by a `shared-features.json` manifest at the workspace root prevents re-duplication under `apps/*/src/features/<migrated-feature>/` after each feature lands.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode across the monorepo), Node.js 22 LTS
**Primary Dependencies**:
- New package `@ramcar/features` (pnpm workspace, sibling to `@ramcar/ui`, `@ramcar/shared`, `@ramcar/store`, `@ramcar/i18n`) — React 19, TanStack Query v5, Zod (via `@ramcar/shared`), Zustand slice consumers (via `@ramcar/store`), `@ramcar/ui` primitives, `@ramcar/i18n` message catalogs
- `apps/web` host adapters — Next.js 16 (App Router), `next-intl` v4, existing `apiClient` (online HTTP), existing `useFormPersistence`
- `apps/desktop` host adapters — Electron 30 + Vite + React 19, `react-i18next`, existing `apiClient` today with forward-looking outbox path via `window.electron` + SyncEngine
- CI duplication check — Node.js script (lives under `scripts/check-shared-features.ts`) invoked from Turbo pipeline and GitHub Actions

**Storage**:
- Unchanged at the data layer. Existing API endpoints, Postgres tables, Supabase Storage bucket, SQLite outbox (desktop) are reused verbatim.
- Feature-scoped client state (sidebar open/close, selected row, active tab for a shared feature) lives in `@ramcar/store` as new slices (e.g., `visitorsSlice`) — NOT inside `@ramcar/features`.

**Testing**:
- `@ramcar/features`: Vitest + jsdom. Components tested with a test harness that stubs the transport adapter, the i18n adapter, and the role adapter. A single test suite validates a shared component once; passing proves both apps' contract, not one.
- `apps/web`: Vitest/Playwright as today. E2E tests continue to cover the integrated web shell (routing, auth, adapters, provider wiring).
- `apps/desktop`: Vitest + jsdom as today. E2E/integration tests cover the Electron-side outbox wiring for the desktop transport adapter.
- CI duplication check: Vitest unit tests over the script + a GitHub Actions smoke assertion.

**Target Platform**:
- `@ramcar/features`: platform-neutral React (no `"use client";`, no `next/*`, no `window.electron`, no Node APIs in renderer). Must render under both Next.js App Router (web client components) and Vite + Electron renderer (React 19 in a browser window).
- `apps/web`: Next.js 16 (App Router) on Node.js 22 server + modern browsers.
- `apps/desktop`: Electron 30 renderer (Chromium) on macOS, Windows, Linux guard booth.

**Project Type**: Monorepo (pnpm workspaces + Turborepo). Adds one new workspace package and two host-app integration layers; does not change bundler, framework, or runtime of either host app (FR-015).

**Performance Goals**:
- No runtime regression versus current per-app implementations. A shared `VisitPersonForm` render and a shared `useVisitPersons` query round-trip must be within ±5% of the current per-app equivalents (measured on the existing web Playwright and desktop Vitest benchmarks).
- Bundle cost on web: `@ramcar/features` is tree-shakeable; only the entry points a given page imports land in that page's chunk.
- Bundle cost on desktop: one-time cost added to the Electron renderer bundle; acceptable because desktop already pulls in equivalent code from its own `features/` — expected net size ≤ current desktop bundle.

**Constraints**:
- NON-NEGOTIABLE: Principles III, IV, V, VIII from the constitution — enforced by the shared-package boundaries described below.
- `@ramcar/features` MUST NOT import `next/*`, `"use client";` directive, `window.electron`, Node APIs, a concrete i18n library, or issue `fetch` against a hardcoded URL. These constraints are enforced by ESLint `no-restricted-imports` / `no-restricted-syntax` rules in the package's `eslint.config.mjs`.
- `@ramcar/features` MUST NOT own Zustand stores; it consumes slice types from `@ramcar/store` via the canonical `useAppStore(selector)` hook (already exported by `@ramcar/store`).
- Each host app renders exactly one `<StoreProvider>` at its root (unchanged from today).
- No new data entities, no API changes, no DB migrations, no i18n library changes (FR-014, FR-015, spec "Data Access Architecture" table).

**Scale/Scope**:
- Pilot: `visitors` feature — 10 components + 10 hooks migrated out of each app's `features/` into `@ramcar/features/src/visitors/`, plus 4 primitives migrated out of each app's `src/shared/components/` (`vehicle-form`, `image-capture`, `visit-person-status-select`, `resident-select`) into `@ramcar/features/src/shared/` (or `@ramcar/ui` where genuinely primitive — research decides).
- Follow-on: `residents` (6 + 7), `providers` (6 + 10) in subsequent PRs, same pattern.
- Net LOC reduction target: ≥40% across the pilot feature (SC-003). Measured over `apps/web/src/features/visitors/**`, `apps/desktop/src/features/visitors/**`, and the corresponding slice in `@ramcar/features/src/visitors/**` pre- and post-migration.
- Ongoing: once migrated, `apps/*/src/features/visitors/` is empty (or holds only page-level wiring that is explicitly app-local). The CI check fails if anyone reintroduces components/hooks there.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan complies |
|---|---|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | No new queries. All shared hooks call the existing NestJS endpoints, which continue to enforce `TenantGuard` + `@CurrentTenant()`. TanStack Query keys continue to include `tenantId` (`[resource, tenantId, modifier, filters]`) — the key composition is part of the shared hook and is not changed by the relocation. Tenant/role context flows into `@ramcar/features` through a typed React context adapter supplied by each host. |
| **II. Feature-Based Architecture** | `@ramcar/features` is a library of **vertical feature slices**, not primitives. Each slice (e.g., `visitors/`) owns its components and hooks as a self-contained unit. `@ramcar/ui` stays primitives-only (explicit rejection in spec clarification Q1). Each host app's `src/app/` (web) and `page-router.tsx` (desktop) continues to own routing — shared modules are imported, not route-aware. |
| **III. Strict Import Boundaries (NON-NEGOTIABLE)** | Package graph is unidirectional: `@ramcar/features` → `{@ramcar/ui, @ramcar/shared, @ramcar/store, @ramcar/i18n}`. No back-edges. Within `@ramcar/features`, each feature slice is its own directory; cross-slice imports are disallowed by an internal ESLint boundary rule mirroring the per-app `features/A ↛ features/B` rule. Host apps import FROM `@ramcar/features`, not the reverse. |
| **IV. Offline-First Desktop (NON-NEGOTIABLE)** | Shared mutation hooks accept an injected **transport adapter** (FR-006). The web host wires the adapter to the existing online `apiClient`; the desktop host wires the adapter to an outbox-aware transport (today: passthrough `apiClient`; forward-looking: routed through `window.electron.sync.enqueue()` for offline writes per the existing desktop SyncEngine). The shared module itself is transport-agnostic and never assumes network availability. `SyncSlice` continues to live in `@ramcar/store` and is consumed by the desktop host (offline badge slot), not by the shared module. |
| **V. Shared Validation via Zod (NON-NEGOTIABLE)** | Validation schemas remain in `@ramcar/shared` and are reused verbatim by shared forms. `@ramcar/features` does NOT duplicate or re-define schemas; it imports from `@ramcar/shared`. The NestJS API continues to validate incoming requests with the same schemas via the Zod validation pipe. |
| **VI. Role-Based Access Control** | Role context is injected into `@ramcar/features` via a typed React context adapter (`useRole()` hook contract). Shared components expose slot props for role-gated UI (e.g., `trailingAction?: ReactNode`); the web host injects admin-only actions, the desktop host injects nothing, and the shared module stays role-unaware. API-side RBAC is unchanged. |
| **VII. TypeScript Strict Mode** | `@ramcar/features/tsconfig.json` extends `@ramcar/config`'s strict base. No new `any`. ESLint runs the same `@ramcar/config/eslint` + package-specific restricted-import rules. |
| **VIII. API-First Data Access (NON-NEGOTIABLE)** | Shared hooks call the existing NestJS endpoints. No `supabase.from()`, `.rpc()`, or `.storage` in `@ramcar/features` (enforced by ESLint `no-restricted-imports` of `@supabase/supabase-js` except for `supabase.auth.*` / `supabase.channel()` — and no direct `supabase` import is required because the shared module does not touch auth or realtime; those remain host-app responsibilities). The transport adapter's contract returns typed DTOs but is implemented in each host against `apiClient`. |

**Gate result**: **PASS** (pre-Phase-0). Re-checked post-Phase-1 — see "Constitution Check (post-design)" at the end of this file.

No violations. The Complexity Tracking table below is intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/014-cross-app-code-sharing/
├── plan.md              # This file
├── spec.md              # Feature specification (already complete)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (contract types + slot conventions)
├── quickstart.md        # Phase 1 output (engineer how-to)
├── contracts/           # Phase 1 output (TypeScript contract files + manifest schema)
│   ├── feature-transport-port.ts
│   ├── feature-i18n-port.ts
│   ├── feature-role-port.ts
│   ├── slot-prop-conventions.md
│   └── shared-features-manifest.schema.json
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/
├── config/                           # (existing) shared tsconfig, eslint, prettier, tailwind — unchanged
├── db-types/                         # (existing) generated Supabase types — unchanged
├── i18n/                             # (existing) JSON message catalogs — extended with shared-feature keys
│   └── src/messages/
│       ├── en.json                   # adds visitors.* keys sourced from both apps' current catalogs
│       └── es.json
├── shared/                           # (existing) Zod schemas + types — unchanged
├── store/                            # (existing) Zustand store — EXTENDED with feature slices
│   └── src/
│       ├── index.tsx                 # adds new slices to AppState
│       └── slices/
│           ├── auth-slice.ts         # (existing)
│           ├── sidebar-slice.ts      # (existing)
│           ├── sync-slice.ts         # (existing)
│           ├── theme-slice.ts        # (existing)
│           └── visitors-slice.ts     # (new — sidebar open/close, selected row, active tab for visitors)
├── ui/                               # (existing) shadcn primitives — unchanged, stays domain-agnostic
└── features/                         # (NEW) @ramcar/features — shared feature-level slices
    ├── package.json                  # name: @ramcar/features; deps: @ramcar/ui, @ramcar/shared, @ramcar/store, @ramcar/i18n
    ├── tsconfig.json                 # extends @ramcar/config base; strict
    ├── eslint.config.mjs             # restricts next/*, "use client", window.electron, supabase.from, fetch-without-adapter
    ├── vitest.config.ts
    └── src/
        ├── index.ts                  # re-exports visitors/*, shared/*, adapters/*
        ├── adapters/                 # contract types + provider primitives consumed by shared slices
        │   ├── transport.ts          # TransportPort interface + useTransport() hook contract + <TransportProvider>
        │   ├── i18n.ts               # I18nPort interface + useI18n() hook contract + <I18nProvider>
        │   ├── role.ts               # RolePort interface + useRole() hook contract + <RoleProvider>
        │   └── index.ts
        ├── shared/                   # primitives that were duplicated across both apps' src/shared/components/
        │   ├── vehicle-form/         # moved from apps/*/src/shared/components/vehicle-form/
        │   ├── image-capture/        # moved from apps/*/src/shared/components/image-capture/
        │   ├── visit-person-status-select/
        │   └── resident-select/      # moved from apps/web/src/shared/components/resident-select/ (web-only today → now cross-app)
        └── visitors/                 # PILOT — moved from apps/*/src/features/visitors/
            ├── components/           # 10 components; no "use client", no next/*, no electron
            │   ├── visit-person-form.tsx
            │   ├── visit-person-edit-form.tsx
            │   ├── visit-person-sidebar.tsx
            │   ├── visit-person-status-badge.tsx
            │   ├── visit-person-access-event-form.tsx
            │   ├── visitors-table.tsx
            │   ├── visitors-table-columns.tsx
            │   ├── visitors-page-client.tsx    # renamed to visitors-view.tsx (no Next.js-specific naming)
            │   ├── image-section.tsx
            │   └── recent-events-list.tsx
            ├── hooks/                # 10 hooks; use injected transport, not apiClient directly
            │   ├── use-visit-persons.ts
            │   ├── use-create-visit-person.ts
            │   ├── use-update-visit-person.ts
            │   ├── use-upload-visit-person-image.ts
            │   ├── use-visit-person-images.ts
            │   ├── use-visit-person-vehicles.ts
            │   ├── use-recent-visit-person-events.ts
            │   ├── use-create-access-event.ts
            │   ├── use-update-access-event.ts
            │   └── use-keyboard-navigation.ts
            ├── types.ts
            └── index.ts              # public surface of the visitors slice

apps/
├── web/                              # Next.js App Router
│   └── src/
│       ├── app/                      # (existing) routing and page wiring — unchanged
│       │   └── [locale]/(authenticated)/visitors/page.tsx  # imports <VisitorsView/> from @ramcar/features/visitors
│       ├── shared/
│       │   ├── lib/
│       │   │   ├── api-client.ts     # (existing) unchanged
│       │   │   └── features/         # (NEW) adapter implementations for web
│       │   │       ├── transport.tsx # <WebTransportProvider> → wraps apiClient
│       │   │       ├── i18n.tsx      # <WebI18nProvider> → wraps next-intl useTranslations
│       │   │       └── role.tsx      # <WebRoleProvider> → wraps session.user.role
│       │   └── hooks/
│       │       └── use-form-persistence.ts  # (existing) stays here; web-only; passed to shared form as slot/adapter
│       └── features/
│           └── visitors/             # DELETED after pilot — empty
├── desktop/                          # Electron + Vite
│   └── src/
│       ├── page-router.tsx           # (existing) unchanged
│       ├── shared/
│       │   └── lib/
│       │       ├── api-client.ts     # (existing) unchanged
│       │       └── features/         # (NEW) adapter implementations for desktop
│       │           ├── transport.tsx # <DesktopTransportProvider> → wraps apiClient today; outbox-aware path pluggable
│       │           ├── i18n.tsx      # <DesktopI18nProvider> → wraps react-i18next useTranslation
│       │           └── role.tsx      # <DesktopRoleProvider> → wraps session.user.role
│       ├── features/
│       │   └── visitors/             # DELETED after pilot — empty
│       └── features/visitors/pages/visitors-page.tsx  # imports <VisitorsView/> from @ramcar/features/visitors
└── api/                              # (existing) NestJS — UNCHANGED

scripts/
└── check-shared-features.ts          # (NEW) CI duplication check; driven by shared-features.json

shared-features.json                  # (NEW) workspace-root manifest of migrated features
turbo.json                            # extend with a "check:shared-features" task that runs the script
```

**Structure Decision**: Monorepo extension. Add one new workspace package (`packages/features` → `@ramcar/features`). Extend `packages/store` with feature-scoped slices. Extend `packages/i18n` JSON catalogs with keys that were previously duplicated across both apps' locale files. Add one workspace-root manifest (`shared-features.json`) and one CI script (`scripts/check-shared-features.ts`). Each host app adds a thin `src/shared/lib/features/` directory with adapter providers. No changes to `apps/api`, `apps/www`, database schema, bundler, or framework. This is a package-graph addition, not a re-architecture.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*None.* The plan passes all constitution gates without exceptions.

## Phase 0 — Outline & Research

See [research.md](./research.md). Research resolved the following open questions:

1. **Package name and boundary** (→ `@ramcar/features`, sibling to `@ramcar/ui`; confirmed by spec clarification Q1).
2. **Transport adapter shape** (verb-based TS interface; host supplies online/outbox implementation).
3. **i18n adapter shape** (single `t(key, values?)` function + `useI18n()` hook contract; host wraps `next-intl` or `react-i18next`).
4. **Role adapter shape** (single `useRole()` hook returning `{ role: Role }` + predicate helpers; host wires from session).
5. **Store extension pattern** (new slices in `@ramcar/store` per the existing `StateCreator` pattern; shared hooks read via `useAppStore(selector)`).
6. **Slot prop pattern** (typed `ReactNode` slot props at documented positions: `topRightSlot`, `trailingAction`, `afterFields`, `emptyState`; documented in TSDoc; greppable; FR-007).
7. **CI duplication check** (Node script driven by `shared-features.json`; fails CI when `apps/<web|desktop>/src/features/<X>/` contains `.tsx|.ts` for any migrated feature `X`).
8. **Test harness** (Vitest + jsdom in `@ramcar/features` with stubbed adapters; host apps keep integration tests).
9. **Migration sequencing** (pilot = `visitors` all-three-layers in one PR; residents + providers follow in separate PRs; per-app `src/shared/components/*` migrated alongside the visitors pilot).
10. **Bundler/TS compatibility** (`@ramcar/features` emits ESM via TS sources pointed to by `main`/`exports`, consumed directly by Next.js `transpilePackages` and by Vite; mirrors how `@ramcar/ui` and `@ramcar/store` ship today).

**Output**: `research.md` with decisions, rationales, and rejected alternatives.

## Phase 1 — Design & Contracts

See:
- [data-model.md](./data-model.md) — package surface (adapter interfaces, slot prop types, store slice shape, manifest schema).
- [contracts/](./contracts/) — TypeScript contract files and the JSON Schema for `shared-features.json`.
- [quickstart.md](./quickstart.md) — engineer-facing how-to: add a field to the shared visitors form, verify both apps, migrate a new feature.

Phase 1 also updates the agent context file by appending the new technologies (package `@ramcar/features`, adapter pattern, shared-features manifest) via `.specify/scripts/bash/update-agent-context.sh claude`.

### Constitution Check (post-design)

Re-checked after Phase 1 artifacts landed. Nothing in `data-model.md`, `contracts/`, or `quickstart.md` introduces a constitution violation:

| Principle | Post-design status |
|---|---|
| I. Multi-Tenant Isolation | PASS — query keys still `[resource, tenantId, ...]`; transport contract types accept typed DTOs, tenant scoping happens at the API layer. |
| II. Feature-Based Architecture | PASS — `@ramcar/features` slices are vertical; `@ramcar/ui` remains primitives-only. |
| III. Strict Import Boundaries | PASS — dependency graph is one-way; package-internal `no-cross-feature-imports` lint rule specified in contracts. |
| IV. Offline-First Desktop | PASS — transport port is the only write/read boundary; desktop adapter is free to route through the outbox. |
| V. Shared Validation via Zod | PASS — shared forms import schemas from `@ramcar/shared`; no duplication. |
| VI. RBAC | PASS — role port + slot props keep role decisions at the host. |
| VII. Strict TS | PASS — strict tsconfig and ESLint extend the existing `@ramcar/config` bases. |
| VIII. API-First Data Access | PASS — shared hooks depend only on the transport port, never on Supabase DB/RPC/storage. |

**Gate result**: **PASS** (post-Phase-1). The plan is ready for `/speckit.tasks`.
