# Monorepo Scaffold Design — ramcar-platform

**Date:** 2026-03-16
**Status:** Approved
**Scope:** Project scaffold only — no features, no DB schemas/migrations

---

## Decisions

| Decision | Choice |
|---|---|
| Next.js apps | `create-next-app` via pnpx |
| NestJS API | `@nestjs/cli new` then adapt |
| Electron desktop | `create-electron-vite` via pnpx |
| packages/ui | shadcn/ui initialized with Button, Card, Input |
| ESLint | Flat config (`eslint.config.mjs`) |
| Node version | 22 LTS |
| Supabase | `supabase init` |
| Package scope | `@ramcar/*` |
| Approach | CLI-First, Adapt After |

---

## 1. Root Monorepo Configuration

**Files at repo root:**

| File | Purpose |
|---|---|
| `.nvmrc` | `22` — enforces Node 22 LTS |
| `.npmrc` | `strict-peer-dependencies=true` — catches dependency issues early in pnpm |
| `pnpm-workspace.yaml` | Declares `apps/*` and `packages/*` as workspaces |
| `package.json` | Root: `name: "ramcar-platform"`, `private: true`, `"packageManager": "pnpm@9.x.x"` (exact version, for Corepack enforcement), `engines: { node: ">=22" }`. Scripts: turbo commands (`dev`, `build`, `lint`, `typecheck`, `test`) + Supabase DB scripts (`db:migrate`, `db:new`, `db:types`, `db:reset`, `db:start`) |
| `turbo.json` | Pipeline: `build` (dependsOn `^build`, outputs `.next/**`, `dist/**`, `out/**`), `dev` (persistent, no cache), `lint`, `typecheck` (dependsOn `^build`), `test` (dependsOn `^build`, outputs `coverage/**`). Include `globalEnv` for `NEXT_PUBLIC_*` and `SUPABASE_*` to ensure cache invalidation when env vars change. |
| `.gitignore` | Comprehensive monorepo gitignore: `node_modules`, `.next`, `dist`, `out`, `.turbo`, `.env*`, `.DS_Store`, `*.tsbuildinfo`, `.vercel`, Electron build outputs, Supabase local files |

The existing `.gitignore` is replaced entirely (current one is Next.js-only and too narrow for the monorepo).

---

## 2. Shared Configs — `packages/config`

`@ramcar/config` — private package, no build step.

**`package.json` must include an `exports` map** so that paths like `@ramcar/config/tsconfig.base.json` resolve correctly under pnpm strict mode:

```json
{
  "name": "@ramcar/config",
  "private": true,
  "exports": {
    "./tsconfig.base.json": "./tsconfig.base.json",
    "./tsconfig.react.json": "./tsconfig.react.json",
    "./tsconfig.node.json": "./tsconfig.node.json",
    "./eslint": "./eslint.config.mjs",
    "./prettier": "./prettier.config.mjs"
  }
}
```

| File | Purpose |
|---|---|
| `tsconfig.base.json` | Base TS config: `strict: true`, `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"` |
| `tsconfig.react.json` | Extends base, adds `jsx: "react-jsx"` — for desktop renderer, packages/ui, packages/store. **Note:** Next.js apps (web, www) must override to `jsx: "preserve"` in their local tsconfig since Next.js handles JSX transformation itself. |
| `tsconfig.node.json` | Extends base, adds Node-specific settings — for api, desktop main |
| `eslint.config.mjs` | Shared flat config: typescript-eslint, prettier plugin, import rules |
| `prettier.config.mjs` | Shared Prettier config — single source of truth |

Each app/package creates its own `eslint.config.mjs` that imports and extends the shared config. Prettier is referenced via package.json or local `.prettierrc.mjs` re-export.

### Tailwind Shared Preset

A shared Tailwind preset lives in `packages/config/tailwind.preset.ts` (or in `packages/ui/tailwind.preset.ts`). It defines the product's color tokens, typography, and theme extensions. Each Tailwind consumer (`apps/web`, `apps/www`, `apps/desktop` renderer, `packages/ui`) creates its own `tailwind.config.ts` that:

1. Imports the shared preset
2. Sets `content` paths to include **both** local source files and `../../packages/ui/src/**/*.{ts,tsx}` — this prevents Tailwind from purging UI component styles

---

## 3. Apps

### 3.1 `apps/web` — Authenticated Web Portal

- **Scaffold:** `pnpx create-next-app@latest apps/web --typescript --tailwind --app --src-dir --no-eslint --no-git`
  - `--no-git` prevents nested `.git` repo
  - `--no-eslint` avoids generating legacy `.eslintrc.json` (we set up flat config manually)
- **Adapt:**
  - `tsconfig.json` extends `@ramcar/config/tsconfig.react.json`, overrides `jsx: "preserve"` for Next.js
  - ESLint flat config imports `@ramcar/config`, includes `eslint-config-next` rules
  - `tailwind.config.ts` imports shared preset + includes `packages/ui` content paths
  - Workspace deps: `@ramcar/ui`, `@ramcar/shared`, `@ramcar/store`
  - Clean boilerplate page content (keep `app/layout.tsx`, `app/page.tsx` minimal)
  - Create empty `src/features/` and `src/shared/` directories with `.gitkeep`

### 3.2 `apps/www` — Public Landing Page

- **Scaffold:** `pnpx create-next-app@latest apps/www --typescript --tailwind --app --src-dir --no-eslint --no-git`
- **Adapt:**
  - Same tsconfig/eslint/tailwind adaptation as web (including `jsx: "preserve"` override)
  - Workspace deps: `@ramcar/ui`, `@ramcar/shared` (no `@ramcar/store` — not needed for a public site)
  - Clean boilerplate, create empty `src/features/` and `src/shared/` with `.gitkeep`

### 3.3 `apps/api` — NestJS Backend

- **Scaffold:** `cd apps && pnpx @nestjs/cli new api --package-manager pnpm --strict --skip-git`
  - Run from `apps/` directory so NestJS CLI creates `apps/api/` (not `apps/api/api/`)
  - `--skip-git` prevents nested `.git` repo
- **Adapt:**
  - `tsconfig.json` extends `@ramcar/config/tsconfig.node.json` (keep NestJS `tsconfig.build.json` for its build step)
  - Replace NestJS default `.eslintrc.js` with flat config importing `@ramcar/config`
  - Workspace deps: `@ramcar/shared`, `@ramcar/db-types`
  - Create empty `src/common/`, `src/modules/`, `src/infrastructure/` directories with `.gitkeep`
  - Keep generated `app.module.ts`, `app.controller.ts`, `app.service.ts`, `main.ts`
  - `typecheck` script: `tsc --noEmit` (using the main `tsconfig.json`, not `tsconfig.build.json`)

### 3.4 `apps/desktop` — Electron + Vite + React

- **Scaffold:** `pnpx create-electron-vite apps/desktop` — select **React + TypeScript** when prompted (or use `--template react-ts` if supported non-interactively)
- **Adapt:**
  - Main process tsconfig extends `@ramcar/config/tsconfig.node.json`
  - Renderer tsconfig extends `@ramcar/config/tsconfig.react.json`
  - ESLint flat config importing `@ramcar/config`
  - Add Tailwind CSS to renderer with `tailwind.config.ts` importing shared preset + `packages/ui` content paths
  - Workspace deps: `@ramcar/ui`, `@ramcar/shared`, `@ramcar/store`
  - Create empty `src/main/services/`, `src/main/repositories/`, `src/main/ipc/` with `.gitkeep`
  - Create empty `src/renderer/features/`, `src/renderer/shared/` with `.gitkeep`
  - Set up `src/preload/index.ts` with minimal contextBridge skeleton

---

## 4. Shared Packages

### 4.1 `packages/ui` — Design System

- `@ramcar/ui`, main entry `src/index.ts`
- tsconfig extends `@ramcar/config/tsconfig.react.json`
- `tailwind.config.ts` with shared preset and local content paths
- shadcn/ui initialized: `components.json` pointing to `src/components/`
- Base components added via shadcn CLI: **Button**, **Card**, **Input**
- `src/index.ts` re-exports all components
- `src/lib/utils.ts` — `cn()` utility (shadcn standard)
- Dependencies: `tailwindcss`, `tailwind-merge`, `clsx`, `class-variance-authority`, relevant Radix primitives

### 4.2 `packages/shared` — Types, Validators, Utils

- `@ramcar/shared`, main entry `src/index.ts`
- tsconfig extends `@ramcar/config/tsconfig.base.json`
- `src/index.ts` — barrel export (empty)
- Empty directories: `src/types/`, `src/validators/`, `src/utils/` (with `.gitkeep`)
- Dependencies: `zod`

### 4.3 `packages/store` — Zustand Store

- `@ramcar/store`, main entry `src/index.ts`
- tsconfig extends `@ramcar/config/tsconfig.react.json`
- `src/index.ts` — exports `createStore` factory and `StoreProvider` (minimal SSR-safe skeleton)
- Empty `src/slices/` directory with `.gitkeep`
- Dependencies: `zustand`, `react`

### 4.4 `packages/db-types` — Generated Database Types

- `@ramcar/db-types`, main entry `src/index.ts`
- tsconfig extends `@ramcar/config/tsconfig.base.json`
- `src/index.ts` re-exports from `src/types.ts`
- `src/types.ts` — placeholder comment: "Generated by supabase gen types. Do not edit manually."
- No dependencies (pure types)

---

## 5. Architecture Per App

This section documents the architecture patterns each app and package follows. These rules should be enforced in `CLAUDE.md` and during code review.

### 5.1 `apps/web` and `apps/www` — Feature-Based + App Router

**Pattern:** Feature-Based Architecture layered on top of Next.js App Router.

**Directory roles:**

| Directory | Responsibility | Import rules |
|---|---|---|
| `src/app/` | **Routing only** — `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, route groups. No business logic, no data fetching beyond calling feature-level functions. | Imports from `features/` and `shared/`. Never imported by others. |
| `src/features/[domain]/` | **All domain logic** — components, hooks, API calls, types, constants scoped to one business domain. Each feature is a self-contained vertical slice. | Never imports from another `features/[domain]/`. If shared, promote to `shared/`. |
| `src/shared/` | **Cross-feature utilities** — generic UI components, utility hooks, HTTP client, constants used by multiple features. | Never imports from `features/`. |

**Dependency rules (strictly enforced):**
```
app/ → features/, shared/     (app imports from features and shared)
features/A/ ✗ features/B/     (features never import from each other)
shared/ ✗ features/           (shared never imports from features)
```

**State management:**
- **React Query (TanStack Query v5)** owns all server/async state (API data, caching, refetching)
- **Zustand** (from `@ramcar/store`) owns client/UI state (toasts, modals, sidebar, current user)
- React Query keys always include `tenantId`: `[resource, tenantId, modifier, filters]`
- No overlap: if data comes from the server, it lives in React Query. If it's UI-only, it's in Zustand.

**SSR-safe Zustand pattern for App Router:** Factory function (`createStore`) + React context (`StoreProvider`) to prevent state leaks between server renders.

**`apps/www` differences:** Same architecture but simpler — no auth, no `@ramcar/store`, minimal state. Form submissions go through Next.js Server Actions or API routes that call the NestJS API.

---

### 5.2 `apps/api` — Modular Monolith + Repository Pattern

**Pattern:** One NestJS module per business domain. Two module complexity levels.

**Request flow:**
```
HTTP Request → Controller → Service → Repository → Supabase/Postgres
```

**Directory roles:**

| Directory | Responsibility |
|---|---|
| `src/common/` | Guards (`JwtAuthGuard`, `RolesGuard`, `TenantGuard`), decorators (`@CurrentTenant()`, `@Roles()`), interceptors, exception filters, Zod validation pipe |
| `src/modules/[domain]/` | One NestJS module per business domain — self-contained with its own controller, service, repository, DTOs |
| `src/infrastructure/` | Cross-cutting infrastructure — Supabase client (global singleton), Storage service, BullMQ queue setup |

**Simple module structure** (CRUD domains like `tenants`, `vehicles`, `visitors`):
```
modules/[domain]/
├── [domain].module.ts
├── [domain].controller.ts
├── [domain].service.ts
├── [domain].repository.ts
└── dto/
```

**Complex module structure** (domains with multi-step logic like `blacklist`, `visits`, `users`, `sync`):
```
modules/[domain]/
├── [domain].module.ts
├── [domain].controller.ts
├── use-cases/                          # Explicit use case classes
│   ├── [action-a].use-case.ts
│   └── [action-b].use-case.ts
├── [domain].repository.interface.ts    # Domain port (interface)
├── [domain].repository.ts              # Supabase adapter (implementation)
└── dto/
```

**Tenant isolation:**
- `TenantGuard` extracts `tenant_id` from JWT once per request
- `@CurrentTenant()` decorator injects it into controllers/services
- Every query MUST be filtered by `tenant_id` — no unscoped queries allowed

**RBAC hierarchy:** `SuperAdmin > Admin (per tenant) > Guard > Resident`
- Enforced at two layers: NestJS guards (API layer) + Postgres RLS (DB layer)
- `tenant_id` + `role` extracted from JWT

**Module import rules:**
- Modules may import other modules through NestJS dependency injection (exported services)
- Direct file imports across modules are forbidden — always go through the module's public API
- `common/` is imported by all modules, never the reverse
- `infrastructure/` is imported by modules that need it, never the reverse

---

### 5.3 `apps/desktop` — Feature-Based (Renderer) + Service/Repository (Main)

**Pattern:** Two-process architecture. Renderer uses Feature-Based (same as web). Main process uses Service/Repository pattern. They communicate **only via IPC**.

**Main Process (Node.js)** — OS access, filesystem, SQLite, hardware:

| Directory | Responsibility |
|---|---|
| `src/main/services/` | Business logic + SyncEngine (outbox → cloud API, idempotent via `event_id` UUID) + auto-updater |
| `src/main/repositories/` | **Only point of contact with SQLite** — all DB reads/writes go through repositories |
| `src/main/ipc/` | IPC handlers — delegate to services/repositories. **No business logic in IPC handlers.** |

**Renderer Process (Chromium + React + Vite)** — UI only:

| Directory | Responsibility |
|---|---|
| `src/renderer/features/` | Same Feature-Based pattern as `apps/web` — one dir per domain |
| `src/renderer/shared/` | Cross-feature: generic components, `useIpc` hooks, `useSyncStatus` |
| `src/renderer/store/` | Re-export of `@ramcar/store` with SyncSlice enabled |

**Preload / Context Bridge — the ONLY contract between processes:**
```
src/preload/index.ts  (exposes via contextBridge → window.api)
```
If a function is not declared in `preload/index.ts`, the renderer cannot call it. The renderer **never** accesses SQLite, Node.js APIs, or the filesystem directly.

**Operation flow:**
```
Renderer feature → ipcRenderer.invoke('domain:action', data)
                        ↓ IPC
Main: ipc/[domain].ipc.ts → [domain].service.ts → [domain].repository.ts → SQLite
      (adds to outbox if offline/pending sync)
                        ↓ IPC response
Renderer: React Query invalidates → UI updates
          Zustand SyncSlice shows outboxCount
```

**Offline-first pattern:**
- SQLite is the source of truth locally (main process only)
- Outbox pattern: mutations are queued with a UUID `event_id` for idempotent sync
- SyncEngine runs in main process, communicates status to renderer via IPC
- Zustand SyncSlice states: `idle | syncing | error | offline`

---

### 5.4 Shared Packages Architecture

**`packages/shared`** — the cross-app contract:
- Zod schemas define DTOs once — reused by NestJS validation pipe AND frontend form validation
- TypeScript types/interfaces shared across all apps
- Utility functions (date formatting, tenant helpers)
- OpenAPI schema generated here — consumed by mobile repo as API contract

**`packages/store`** — Zustand with slice pattern:
- Slices: `auth` (user, role, tenantId), `ui` (toasts, modals, sidebar), `blacklist` (realtime alert queue), `sync` (desktop-only: status + outboxCount)
- SSR-safe: factory function `createStore()` + `StoreProvider` context
- Desktop enables SyncSlice; web does not

**`packages/ui`** — shadcn/ui component library:
- Components are **copied** into this package (shadcn's intended pattern), not installed as npm dependency
- Customized once with product color tokens and typography
- Consumed by `apps/web`, `apps/www`, `apps/desktop` (renderer)
- Built on Radix UI primitives + Tailwind CSS

**`packages/db-types`** — generated types only:
- Auto-generated via `supabase gen types typescript --local`
- Contains NO migration files — migrations live in `supabase/migrations/`
- Re-exported for consumption by `apps/api`, `apps/web`

---

## 6. Supabase Folder (unchanged)

- `supabase init` at repo root generates `supabase/config.toml`
- `supabase/migrations/` — left empty (no schemas)
- `supabase/seed.sql` — created manually with comment header

---

## 7. Verification

After scaffold is complete:

1. `pnpm install` — all workspace dependencies resolve
2. `pnpm turbo build` — all apps and packages build without errors
3. `pnpm turbo lint` — ESLint passes across all workspaces
4. `pnpm turbo typecheck` — TypeScript compiles cleanly (`tsc --noEmit` per workspace)
5. Smoke test: `apps/web` imports and renders `<Button />` from `@ramcar/ui`

---

## 8. Final Directory Tree

```
/
├── .nvmrc
├── .npmrc
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── apps/
│   ├── web/          # Next.js (create-next-app, adapted)
│   ├── www/          # Next.js (create-next-app, adapted)
│   ├── desktop/      # Electron+Vite+React (create-electron-vite, adapted)
│   └── api/          # NestJS (nest new, adapted)
├── packages/
│   ├── config/       # tsconfigs, eslint, prettier, tailwind preset
│   ├── ui/           # shadcn/ui with Button, Card, Input
│   ├── shared/       # Zod, types, utils (empty dirs)
│   ├── store/        # Zustand factory + provider skeleton
│   └── db-types/     # Placeholder for generated types
└── supabase/
    ├── config.toml
    ├── migrations/
    └── seed.sql
```

**CLAUDE.md** will be updated at the end to reflect the actual project state.
