# RamcarSoftPlatform

A multi-tenant residential security platform for managing residential communities — access control, visits, blacklist, amenities, and patrols.

## Tech Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Language:** TypeScript (all apps and packages)
- **Node:** 22 LTS
- **Frontend:** Next.js 14+ (App Router), shadcn/ui, Tailwind CSS, Zustand, TanStack Query v5
- **Backend:** NestJS (modular monolith)
- **Desktop:** Electron + Vite + React (offline-first, SQLite)
- **Database:** PostgreSQL via Supabase (RLS, Auth, Storage, Realtime)
- **Auth:** Supabase Auth (JWT, 2FA TOTP)

## Monorepo Structure

```
apps/
  web/          Next.js authenticated portal (Admin + Resident)
  www/          Next.js public landing page (marketing, no auth)
  desktop/      Electron + Vite + React guard booth app (offline-first)
  api/          NestJS backend REST API

packages/
  config/       Shared tsconfigs, ESLint flat config, Prettier, Tailwind preset
  ui/           shadcn/ui design system (shared React components)
  shared/       TypeScript types, Zod validators, utilities
  store/        Zustand store (shared between web and desktop)
  db-types/     TypeScript types generated from Supabase schema

supabase/       Supabase CLI root (migrations, seed, config)
```

## Getting Started

### Prerequisites

- Node.js 22 LTS (see `.nvmrc`)
- pnpm 10+

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev          # Start all apps in development
pnpm build        # Build all apps and packages
pnpm lint         # ESLint across all workspaces
pnpm typecheck    # TypeScript check across all workspaces
pnpm test         # Run tests across all workspaces
```

> More development details: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

### Database

```bash
pnpm db:start     # Start local Supabase
pnpm db:migrate   # Push migrations to remote
pnpm db:new       # Create new migration file
pnpm db:types     # Regenerate TypeScript types from schema
pnpm db:reset     # Reset local database with seed data
```

## Architecture

### `apps/web` and `apps/www` — Feature-Based + App Router

- **`src/app/`** — Routing only (page.tsx, layout.tsx, route groups). No business logic.
- **`src/features/[domain]/`** — All domain logic (components, hooks, API calls, types). Self-contained vertical slices.
- **`src/shared/`** — Cross-feature utilities, generic components, HTTP client.

**Import rules:**
- `app/` imports from `features/` and `shared/` — never the reverse
- `features/A/` never imports from `features/B/` — promote to `shared/` if needed
- `shared/` never imports from `features/`

**State management:** React Query owns server/async state. Zustand owns client/UI state. No overlap between the two. React Query keys always include `tenantId`.

`apps/www` follows the same architecture but simpler — no auth, minimal state.

### `apps/api` — Modular Monolith + Repository Pattern

**Request flow:** `HTTP Request → Controller → Service → Repository → Supabase/Postgres`

- **`src/common/`** — Guards (JwtAuth, Roles, Tenant), decorators, interceptors, exception filters, Zod validation pipe
- **`src/modules/[domain]/`** — One NestJS module per business domain
- **`src/infrastructure/`** — Supabase client singleton, Storage service, BullMQ queue

**Simple module:** module + controller + service + repository + dto/

**Complex module** (blacklist, visits, users, sync): adds `use-cases/` and repository interface (domain port).

**Multi-tenancy:** `TenantGuard` extracts `tenant_id` from JWT. `@CurrentTenant()` decorator injects it. Every query must be tenant-scoped.

**RBAC:** `SuperAdmin > Admin (per tenant) > Guard > Resident` — enforced at NestJS guards + Postgres RLS.

### `apps/desktop` — Feature-Based (Renderer) + Service/Repository (Main)

Two-process architecture communicating only via IPC.

| Process | Location | Role |
|---|---|---|
| Main (Node.js) | `electron/` | Services, repositories (SQLite), IPC handlers |
| Renderer (React) | `src/` | Features, shared components, Zustand store |
| Preload | `electron/preload.ts` | Context Bridge — the only contract between processes |

**Offline-first:** SQLite (main process) + Outbox pattern with UUID `event_id` for idempotent sync.

### Shared Packages

| Package | Purpose |
|---|---|
| `@ramcar/config` | Shared tsconfigs, ESLint flat config, Prettier, Tailwind preset |
| `@ramcar/ui` | shadcn/ui components (copied, not installed as dep). Built on Radix + Tailwind. |
| `@ramcar/shared` | Zod schemas define DTOs once — reused by API validation and frontend forms |
| `@ramcar/store` | Zustand with slice pattern. SSR-safe via `createStore()` factory + `StoreProvider` context |
| `@ramcar/db-types` | Auto-generated from Supabase schema. Never edit manually. |

## Coding Conventions

- All workspace packages use `@ramcar/` scope
- ESLint flat config (`eslint.config.mjs`), extends `@ramcar/config/eslint`
- Prettier shared config from `@ramcar/config/prettier`
- Tailwind shared preset from `@ramcar/config/tailwind`
- TypeScript strict mode, extends shared tsconfigs from `@ramcar/config`

## Adding New Features

1. **Frontend (web/www):** Create `src/features/[domain]/` with components, hooks, types. Wire into `src/app/` routes.
2. **Backend (api):** Create `src/modules/[domain]/` with module, controller, service, repository, dto/. Register in AppModule.
3. **Desktop:** Main process: `electron/` (service + repository + IPC handler). Renderer: `src/features/[domain]/`. Bridge: add to `electron/preload.ts`.
4. **Shared types/validators:** Add to `packages/shared/src/types/` or `packages/shared/src/validators/`.
5. **UI components:** `cd packages/ui && pnpx shadcn@latest add [component]`, then re-export from `src/index.ts`.
6. **Database migrations:** `pnpm db:new [name]`, write SQL, `pnpm db:migrate`, `pnpm db:types`.

## Related Repositories

- **ramcar-mobile** — Kotlin Multiplatform mobile app (separate repo due to Gradle/pnpm incompatibility). Shares API contract via OpenAPI schema from `@ramcar/shared`.
