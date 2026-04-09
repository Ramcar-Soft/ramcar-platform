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
- **@ramcar/db-types** — Auto-generated from Supabase schema. Never edit manually.

## Git Rules

- Do NOT commit or push unless explicitly asked by the user

## Coding Conventions

- All workspace packages use `@ramcar/` scope
- ESLint: flat config (`eslint.config.mjs`), extends `@ramcar/config/eslint`
- Prettier: shared config from `@ramcar/config/prettier`
- Tailwind: shared preset from `@ramcar/config/tailwind`, each consumer sets content paths including `packages/ui`
- TypeScript: strict mode, extends shared tsconfigs from `@ramcar/config`
- Next.js apps override `jsx: "preserve"` (Next.js handles JSX transformation)

## Adding New Features

1. **Frontend (web/www):** Create `src/features/[domain]/` with components, hooks, types. Data fetching via TanStack Query against NestJS API endpoints — no direct Supabase DB access. Wire into `src/app/` routes.
2. **Backend (api):** Create `src/modules/[domain]/` with module, controller, service, repository, dto/. Register in AppModule.
3. **Desktop:** Main process: `electron/` (service + repository + IPC handler). Renderer: `src/features/[domain]/`. Bridge: add to `electron/preload.ts`.
4. **Shared types/validators:** Add to `packages/shared/src/types/` or `packages/shared/src/validators/`.
5. **UI components:** `cd packages/ui && pnpx shadcn@latest add [component]`, then re-export from `src/index.ts`.
6. **Database migrations:** `pnpm db:new [name]`, write SQL, `pnpm db:migrate:dev`, `pnpm db:types`.

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

## Recent Changes
- 001-auth-login: Added TypeScript (strict mode across all workspaces) + Next.js 16 (App Router), Electron 30 + Vite + React, NestJS v11, Supabase JS v2, @supabase/ssr
