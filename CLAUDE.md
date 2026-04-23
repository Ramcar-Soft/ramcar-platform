# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Ramcar Platform — a multi-tenant residential security platform. This Turborepo monorepo contains the web portal, landing page, Electron desktop app for guard booths, and NestJS backend API. The mobile app lives in a separate repository (`ramcar-mobile`).

## Tech Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Language:** TypeScript (all apps and packages)
- **Node:** 22 LTS (enforced via `.nvmrc` and `engines`)
- **Frontend:** Next.js 14+ (App Router), shadcn/ui, Tailwind CSS, Zustand, TanStack Query v5
- **Backend:** NestJS (modular monolith)
- **Desktop:** Electron + Vite + React (offline-first, SQLite)
- **Database:** PostgreSQL via Supabase (RLS, Auth, Storage, Realtime)
- **Auth:** Supabase Auth (JWT, 2FA TOTP)

## Monorepo Structure

```
apps/web       — Next.js authenticated portal (Admin + Resident)
apps/www       — Next.js public landing page (marketing, no auth)
apps/desktop   — Electron + Vite + React guard booth app (offline-first)
apps/api       — NestJS backend REST API

packages/config    — Shared tsconfigs, ESLint flat config, Prettier, Tailwind preset
packages/ui        — shadcn/ui design system (shared React components)
packages/shared    — TypeScript types, Zod validators, utilities
packages/store     — Zustand store (shared between web and desktop)
packages/db-types  — TypeScript types generated from Supabase schema

supabase/          — Supabase CLI root (migrations, seed, config)
```

## Commands

```bash
pnpm dev          # Start all apps in development
pnpm build        # Build all apps and packages
pnpm lint         # ESLint across all workspaces
pnpm typecheck    # TypeScript check across all workspaces
pnpm test         # Run unit tests across all workspaces
pnpm test:cov     # Run tests with coverage reports
pnpm test:e2e     # Run Playwright E2E tests (apps/web)

# Database (run from repo root)
pnpm db:start     # Start local Supabase
pnpm db:migrate:dev   # Push migrations to remote dev
pnpm db:migrate:prod  # Push migrations to remote production
pnpm db:new       # Create new migration file
pnpm db:types     # Regenerate TypeScript types from schema
pnpm db:reset     # Reset local database with seed data
```

## Architecture

### `apps/web` and `apps/www` — Feature-Based + App Router

**Directory roles:**
- `src/app/` — Routing ONLY (page.tsx, layout.tsx, route groups). No business logic.
- `src/features/[domain]/` — All domain logic (components, hooks, API calls, types). Self-contained vertical slice.
- `src/shared/` — Cross-feature utilities, generic components, HTTP client.

**Import rules (strictly enforced):**
```
app/ → features/, shared/       (app imports from features and shared)
features/A/ ✗ features/B/       (features NEVER import from each other)
shared/ ✗ features/             (shared NEVER imports from features)
```

**State management:**
- React Query (TanStack Query v5) owns all server/async state
- Zustand (from @ramcar/store) owns client/UI state (toasts, modals, sidebar)
- React Query keys always include tenantId: `[resource, tenantId, modifier, filters]`
- No overlap between React Query and Zustand

**Data access (NON-NEGOTIABLE):**
- All database operations (`supabase.from()`, `.rpc()`, `.storage`) go through the NestJS API — never called directly from frontend code
- Allowed frontend Supabase usage: Authentication (`supabase.auth.*`) and Realtime (`supabase.channel()`, `.on()`) only
- No Server Actions (`"use server"`) for data queries or mutations — use `fetch`/TanStack Query to call NestJS REST endpoints
- Frontend Supabase client files must include: `// AUTH & REALTIME ONLY — no .from(), .rpc(), .storage`
- Data fetching: TanStack Query v5 calls NestJS API endpoints — never direct Supabase DB queries
- Desktop sync: Supabase Realtime for receiving live updates; all writes through NestJS API

`apps/www` is the same architecture but simpler — no auth, no store.

### `apps/api` — Modular Monolith + Repository Pattern

**Request flow:** `HTTP Request → Controller → Service → Repository → Supabase/Postgres`

**Directory roles:**
- `src/common/` — Guards (JwtAuth, Roles, Tenant), decorators (@CurrentTenant, @Roles), interceptors, exception filters, Zod validation pipe
- `src/modules/[domain]/` — One NestJS module per business domain
- `src/infrastructure/` — Supabase client singleton, Storage service, BullMQ queue

**Simple module:** `module + controller + service + repository + dto/`

**Complex module (blacklist, visits, users, sync):** adds `use-cases/` directory and repository interface (domain port).

**Tenant isolation:**
- TenantGuard extracts tenant_id from JWT once per request
- @CurrentTenant() decorator injects it into controllers/services
- Every query MUST be filtered by tenant_id — no unscoped queries allowed

**RBAC:** `SuperAdmin > Admin (per tenant) > Guard > Resident`
Enforced at NestJS guards (API) + Postgres RLS (DB).

**Module import rules:**
- Cross-module communication goes through NestJS DI (exported services), never direct file imports
- common/ is imported by all modules, never the reverse
- infrastructure/ is imported by modules that need it, never the reverse

### `apps/desktop` — Feature-Based (Renderer) + Service/Repository (Main)

Two-process architecture communicating ONLY via IPC.

**Main process (Node.js):**
- `electron/services/` — Business logic, SyncEngine, auto-updater
- `electron/repositories/` — ONLY point of contact with SQLite
- `electron/ipc/` — IPC handlers (delegate to services/repos, NO business logic)

**Renderer process (React + Vite):**
- `src/features/` — Same Feature-Based pattern as apps/web
- `src/shared/` — Generic components, useIpc hooks, useSyncStatus

**Preload (Context Bridge):** `electron/preload.ts` is the ONLY contract between processes. If a function is not declared there, the renderer cannot call it.

**Offline-first:** SQLite (main process only) + Outbox pattern with UUID event_id for idempotent sync. SyncSlice states: `idle | syncing | error | offline`.

### Shared Packages

- **@ramcar/shared** — Zod schemas define DTOs once, reused by API validation AND frontend forms
- **@ramcar/store** — Zustand with slice pattern. SSR-safe via createStore() factory + StoreProvider context
- **@ramcar/ui** — shadcn/ui components copied (not installed as dep). Built on Radix + Tailwind.
- **@ramcar/i18n** — Shared locale messages (single source of truth for strings used by both web and desktop)
- **@ramcar/features** — Shared feature slices for bi-app features. Layout: `src/adapters/` (transport/i18n/role ports), `src/shared/` (migrated primitives), `src/visitors/` (pilot). Each host app provides adapter implementations in `src/shared/lib/features/`. CI check: `pnpm check:shared-features` (driven by `shared-features.json`).
- **@ramcar/db-types** — Auto-generated from Supabase schema. Never edit manually.

### Cross-App Shared Feature Modules (spec 014 — NON-NEGOTIABLE for bi-app features)

Features that exist in BOTH `apps/web` and `apps/desktop` (today: `visitors`, `residents`, `providers`; tomorrow: any new feature that must appear in portal and booth) are authored **once** in a shared workspace package and consumed by both apps. Per-app duplication of these features is explicitly prohibited.

**Policy — shared core with platform extensions:**
- The shared module owns the common body: layout, forms, tables, sidebars, data-fetching hooks, user-facing strings, validation wiring.
- Each app owns: routing, shell/layout, auth bootstrap, Zustand provider wiring, and any **deliberate** platform-specific behavior injected through documented extension points (props, slots, adapter hooks).
- Deliberate divergence is expressed via extension points, never by forking the feature.
- Canonical deliberate divergences:
  - **Web-only**: `useFormPersistence` draft recovery (guards against browser reloads; not relevant to the desktop renderer).
  - **Desktop-only**: offline/sync status badge, outbox-backed mutation transport (the shared mutation hook accepts a transport; the desktop host wires it to the SyncEngine outbox, the web host wires it to direct HTTP).
  - **Web-only**: admin-only actions not present in the guard booth UI.

**Rules for the shared feature module:**
- No `"use client";` directive. No `next/*` imports. No `window.electron`, IPC, or Node-in-renderer APIs.
- i18n strings MUST be obtained through an abstraction injected by the host app (web wires `next-intl`, desktop wires `react-i18next`). Message catalogs live in `@ramcar/i18n`, not per-app.
- Data fetching MUST go through an injected transport. Shared hooks call the NestJS API (Principle VIII); they do NOT hardcode `fetch` + URL assumptions that break desktop's outbox path.
- Zod schemas continue to live in `@ramcar/shared` and are reused verbatim (Principle V).
- Role-gated UI (Principle VI) is injectable by the host app.
- The shared module MUST NOT own routing, layout shell, auth bootstrap, or store provider wiring.

**Rules for each host app:**
- Import the shared feature module; do not reimplement its components or hooks in `apps/[web|desktop]/src/features/[same-domain]/`.
- Wire the transport adapter, the i18n adapter, and any platform-specific extensions at the app level.
- Keep app-local `src/features/[domain]/` for features that are intentionally single-app (e.g., desktop: `dashboard`, `account`, `patrols`, `access-log`, `auth`; web: `users`). Do not force unification where none is intended.

**Migration status (track here as features migrate):**
- `visitors` — **migrated 2026-04-17** (spec 014). Components + hooks + shared primitives live in `packages/features/src/visitors/`. Both apps render via `<VisitorsView />` from `@ramcar/features/visitors`.
- `residents` — pending post-pilot migration.
- `providers` — pending post-pilot migration.
- Per-app `src/shared/` duplicates (`vehicle-form`, `image-capture`, `visit-person-status-select`, `resident-select`) — **migrated 2026-04-17** to `packages/features/src/shared/`.

**Red-flag checklist (reject at review):**
- New `.tsx` / `.ts` component or hook added under both `apps/web/src/features/X/` and `apps/desktop/src/features/X/` for a feature listed above.
- Shared feature module importing `next/*`, `"use client";`, `window.electron`, or a concrete i18n library.
- Locale strings for a shared feature duplicated in both apps' message files instead of `@ramcar/i18n`.
- Shared mutation hook assuming online HTTP and bypassing the injected transport.

## Git Rules

- Do NOT commit or push unless explicitly asked by the user

## Coding Conventions

- All workspace packages use `@ramcar/` scope
- ESLint: flat config (`eslint.config.mjs`), extends `@ramcar/config/eslint`
- Prettier: shared config from `@ramcar/config/prettier`
- Tailwind: shared preset from `@ramcar/config/tailwind`, each consumer sets content paths including `packages/ui`
- TypeScript: strict mode, extends shared tsconfigs from `@ramcar/config`
- Next.js apps override `jsx: "preserve"` (Next.js handles JSX transformation)

## UI Patterns (NON-NEGOTIABLE)

### Create / Edit forms — right-side Sheet, never a dedicated page

All catalog create and edit flows MUST use a right-side `Sheet` (`@ramcar/ui`) — **never** a dedicated `/new` or `/[id]/edit` route.

**Rules:**
- No `app/[locale]/(dashboard)/[catalog]/new/page.tsx` or `[id]/edit/page.tsx` files. Dedicated page routes for create/edit are prohibited.
- Every catalog feature exposes a `[Domain]Sidebar` component in `features/[domain]/components/[domain]-sidebar.tsx` that wraps the form in a `Sheet`.
- The parent list/table component owns the sidebar state: `sidebarOpen: boolean`, `sidebarMode: "create" | "edit"`, `selectedId: string | undefined`.
- `useKeyboardNavigation` must receive `disabled: sidebarOpen` so arrow-key table navigation pauses while the Sheet is open.
- i18n keys for Sheet titles follow `[domain].sidebar.createTitle` / `[domain].sidebar.editTitle` in `@ramcar/i18n`.
- The `[Domain]Sidebar` component prop contract: `{ open: boolean; mode: "create" | "edit"; [entityId]?: string; onClose: () => void }`.
- `useGetUser` / equivalent fetch hooks inside the sidebar must gate on `enabled: Boolean(open && mode === "edit" && entityId)` — no fetch when `open === false`.
- Sheet width: `w-[400px] sm:w-[800px] sm:max-w-[800px] overflow-y-auto`.
- `tw-animate-css` must be installed so Sheet slide/fade animations work (already present in the repo).

**Reference implementations:** `apps/web/src/features/users/components/user-sidebar.tsx` (spec 015), `packages/features/src/visitors/components/visit-person-sidebar.tsx` (spec 011/014).

**Red-flag checklist (reject at review):**
- A new `/new/page.tsx` or `/[id]/edit/page.tsx` added under any catalog route.
- A `[Domain]PageClient` wrapper component that navigates to a standalone form page.
- `router.push(…/new)` or `router.push(…/[id]/edit)` calls inside a catalog table/list component.
- A `[Domain]Sidebar` that does NOT pass `disabled: sidebarOpen` to `useKeyboardNavigation`.

## Adding New Features

**First decide: is this a bi-app feature (portal AND booth) or single-app?**
- Bi-app → author once in the shared feature-modules package (see "Cross-App Shared Feature Modules" above). Do NOT create parallel directories under `apps/web/src/features/` and `apps/desktop/src/features/`.
- Single-app (e.g., desktop `dashboard`, web `users`) → use the per-app path below.

1. **Bi-app frontend (web + desktop renderer):** Author UI, interaction logic, and TanStack Query hooks in the shared feature-modules package. Each host app imports from the shared package and wires the transport adapter (web: online HTTP; desktop: outbox-backed), the i18n adapter (web: `next-intl`; desktop: `react-i18next`), and any platform-specific extensions (web: `useFormPersistence`; desktop: offline/sync badge). Wire into each app's routing (`src/app/` on web, `page-router.tsx` on desktop).
2. **Single-app frontend (web only, or desktop renderer only):** Create `src/features/[domain]/` in the target app with components, hooks, types. Data fetching via TanStack Query against NestJS API endpoints — no direct Supabase DB access. Wire into `src/app/` (web) or `page-router.tsx` (desktop).
3. **Backend (api):** Create `src/modules/[domain]/` with module, controller, service, repository, dto/. Register in AppModule.
4. **Desktop main process (offline/sync concerns):** `electron/services/` (service + SyncEngine wiring), `electron/repositories/` (SQLite), `electron/ipc/` (IPC handlers, delegation only). Bridge: add to `electron/preload.ts`.
5. **Shared types/validators:** Add to `packages/shared/src/types/` or `packages/shared/src/validators/`.
6. **Shared i18n messages:** Add to `@ramcar/i18n` message catalogs (single source of truth for strings used in both apps).
7. **UI primitives:** `cd packages/ui && pnpx shadcn@latest add [component]`, then re-export from `src/index.ts`.
8. **Database migrations:** `pnpm db:new [name]`, write SQL, `pnpm db:migrate:dev`, `pnpm db:types`.

## Active Technologies
- TypeScript (strict mode across all workspaces) + Next.js 16 (App Router), Electron 30 + Vite + React, NestJS v11, Supabase JS v2, @supabase/ssr (001-auth-login)
- PostgreSQL via Supabase (local dev on port 54322), localStorage (desktop session) (001-auth-login)
- TypeScript 5.x (strict mode), Node.js 22 LTS + next-intl v4 (web — aligns with existing apps/www), react-i18next + i18next (desktop — lightweight, works with Vite/React without Next.js), shared JSON message files (002-app-translations)
- localStorage (desktop language preference), URL path segment (web language context) (002-app-translations)
- TypeScript 5.x (strict mode across all workspaces) + Next.js 16 + next-intl v4 (web), Electron 30 + Vite + React 18 + react-i18next (desktop), shadcn/ui (Radix + Tailwind), Zustand, lucide-react, next-themes (web, new) (003-app-navigation-shell)
- localStorage (sidebar collapse preference — web & desktop), localStorage (theme preference — desktop) (003-app-navigation-shell)
- TypeScript 5.x (strict mode) + Next.js 16 (App Router), next-intl v4, shadcn/ui, Zustand, Supabase Auth (004-fix-web-nav-layout)
- PostgreSQL via Supabase (auth only — no schema changes needed) (004-fix-web-nav-layout)
- TypeScript 5.x (strict mode) + Next.js 16 (App Router), Electron 30 + Vite + React 18, Zustand, @supabase/ssr, @supabase/supabase-js, next-intl v4, Tailwind CSS (005-role-based-navigation)
- PostgreSQL via Supabase (auth metadata only — no schema changes) (005-role-based-navigation)
- TypeScript 5.x (strict mode) + React 18.3.1 → 19.2.3 (upgrade), radix-ui 1.4.3, Electron 30, Vite 5, Tailwind CSS 4.2.1 (006-fix-desktop-dropdown)
- N/A (no data changes) (006-fix-desktop-dropdown)
- TypeScript 5.x (strict mode), Node.js 22 LTS + Vitest (frontend + packages), Jest + ts-jest (api), Playwright, Husky v9, lint-staged (007-testing-coverage-husky)
- N/A (no data persistence — development tooling only) (007-testing-coverage-husky)
- TypeScript 5.x (strict mode), Node.js 22 LTS + Next.js 16 (App Router), NestJS v11, Supabase JS v2, @supabase/ssr, shadcn/ui, TanStack Query v5, Zustand, next-intl v4, Zod (008-catalog-users)
- PostgreSQL via Supabase (profiles table extension, new user_groups table) (008-catalog-users)
- TypeScript 5.x (strict mode), Node.js 22 LTS + Next.js 16 (App Router), NestJS v11, TanStack Query v5.97.0, Supabase JS v2, @supabase/ssr, shadcn/ui, Zod, Zustand, next-intl v4 (009-refactor-users-api-first)
- PostgreSQL via Supabase (no schema changes — migration from 008 retained) (009-refactor-users-api-first)
- TypeScript 5.x (strict mode), Node.js 22 LTS + Next.js 16 (App Router), NestJS v11, Electron 30 + Vite + React 18, shadcn/ui (Sheet, Table, Select, Button, Input, Badge, Skeleton), TanStack Query v5, Zustand, Supabase JS v2, @supabase/ssr, Zod, next-intl v4, react-i18next, lucide-reac (010-resident-access-log)
- PostgreSQL via Supabase (`vehicles`, `access_events` tables — new), SQLite (desktop offline cache) (010-resident-access-log)
- TypeScript 5.x (strict mode), Node.js 22 LTS + Next.js 16 (web), Electron 30 + Vite + React 18 (desktop), NestJS v11 (API), TanStack Query v5, Zustand, shadcn/ui (Radix + Tailwind), Zod, Supabase JS v2, next-intl v4 (web), react-i18next (desktop), better-sqlite3 (desktop offline) (011-visitor-provider-access)
- PostgreSQL via Supabase (visit_persons, visit_person_images, vehicles, access_events), Supabase Storage private bucket (image files), SQLite (desktop offline cache) (011-visitor-provider-access)
- TypeScript 5.x (strict mode across all workspaces), Node.js 22 LTS + Next.js 16 (App Router), NestJS v11, TanStack Query v5, @ramcar/ui (shadcn/ui: Sheet, Button, Input, Select, Textarea, Dialog), Zod, next-intl v4 (web), react-i18next (desktop), Electron 30 + Vite + React 18 (desktop), better-sqlite3 (desktop offline cache) (012-visit-person-edit)
- PostgreSQL via Supabase — `visit_persons` and `visit_person_images` tables already exist; no schema changes. Desktop SQLite outbox — add `visit_person.update` operation kind. (012-visit-person-edit)
- TypeScript 5.x (strict mode across the monorepo) + Next.js 16 (App Router) + next-intl v4 (web); Electron 30 + Vite + React 18 + react-i18next (desktop); NestJS v11 (API — unchanged); TanStack Query v5; shadcn/ui (Sheet, Button, Input, Select, Label, Skeleton) from `@ramcar/ui`; Zod via `@ramcar/shared` (unchanged schemas) (013-visitor-form-images)
- PostgreSQL via Supabase — no schema changes. Supabase Storage private bucket — no bucket changes. SQLite/outbox (desktop) — not touched; creation remains online-only, matching current behavior. (013-visitor-form-images)
- TypeScript 5.x (strict mode across the monorepo), Node.js 22 LTS (014-cross-app-code-sharing)
- TypeScript 5.x (strict mode), Node.js 22 LTS + Next.js 16 (App Router, web), `@ramcar/ui` (shadcn/ui `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`), TanStack Query v5, Zustand (via `@ramcar/store`), next-intl v4, `@ramcar/shared` (Zod DTOs for `CreateUserInput` / `UpdateUserInput` / `ExtendedUserProfile`), Tailwind CSS 4, `tw-animate-css` (already installed on the current branch to restore Sheet slide/fade — a prerequisite for this work) (015-users-form-sidebar)
- N/A — no schema changes, no new queries. Existing `/api/users` endpoints are reused verbatim. (015-users-form-sidebar)
- TypeScript 5.x (strict mode across the monorepo), React 18, Node 22 LTS + `@ramcar/features` (shared cross-app module), `@ramcar/ui` (shadcn primitives: `Select`, `SelectItem`), `@ramcar/i18n` (existing `vehicles.color.options.*` message catalog), `next-intl` v4 (web host), `react-i18next` (desktop host), both adapted through `useI18n()` inside the shared module (017-vehicle-select-color-swatch)
- N/A — presentation-only change. Vehicles continue to persist `color` as hex or legacy text through the existing API/DB path; nothing on the data layer moves. (017-vehicle-select-color-swatch)
- TypeScript 5.x (strict mode, repo-wide) (018-resident-select-combobox)
- PostgreSQL via Supabase — **no schema changes**. Reuses existing `profiles` table via `ResidentsService.list` → `UsersRepository.list` (list) and `UsersRepository.getById` (resolver). (018-resident-select-combobox)
- PostgreSQL via Supabase. **No new tables** for this feature. Read-only query over `access_events` joined to `profiles` (for guard name and the resident-being-visited name), `visit_persons` (for visitor/provider name, code, company, status, resident_id), and `vehicles` (for plate/brand). Two potential schema adjustments require planning-phase decisions and are handled in Phase 0 (tenant time zone column, resident unit column). (019-logbook-bitacora)

- TypeScript 5.x (strict mode across the monorepo), Node.js 22 LTS + Next.js 16 (App Router), NestJS v11, TanStack Query v5, Supabase JS v2, @ramcar/ui (TenantAvatar), @ramcar/store (authSlice: tenantIds/activeTenantId/activeTenantName), @ramcar/shared (tenant Zod schemas), @ramcar/features (tenant-selector shared module) (020-tenants-catalog)
- PostgreSQL via Supabase: `public.tenants` extended (address, status, config, image_path); `public.user_tenants` NEW join table; RLS rewrites on 7 tables; custom access token hook; `tenant-images` public-read Storage bucket. (020-tenants-catalog)

## Recent Changes
- 001-auth-login: Added TypeScript (strict mode across all workspaces) + Next.js 16 (App Router), Electron 30 + Vite + React, NestJS v11, Supabase JS v2, @supabase/ssr
