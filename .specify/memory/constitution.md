<!--
  Sync Impact Report
  ==================
  Version change: 0.0.0 → 1.0.0 (MAJOR — initial ratification)

  Modified principles: N/A (first version)

  Added sections:
    - 7 Core Principles (I–VII)
    - Technology Constraints
    - Development Workflow & Quality Gates
    - Governance

  Removed sections: N/A

  Templates requiring updates:
    - .specify/templates/plan-template.md        ✅ compatible (Constitution Check section is generic)
    - .specify/templates/spec-template.md         ✅ compatible (no constitution-specific refs)
    - .specify/templates/tasks-template.md        ✅ compatible (phase structure aligns)

  Follow-up TODOs: None
-->

# Ramcar Platform Constitution

## Core Principles

### I. Multi-Tenant Isolation (NON-NEGOTIABLE)

- Every database query MUST be scoped by `tenant_id`. No unscoped queries are permitted.
- PostgreSQL Row-Level Security (RLS) policies MUST enforce tenant boundaries at the database layer.
- The NestJS `TenantGuard` extracts `tenant_id` from the JWT once per request; the `@CurrentTenant()` decorator injects it into controllers and services.
- Supabase service-role keys MUST NOT be used in client-facing code paths.
- Integration tests MUST verify that data from Tenant A is never accessible to Tenant B.

### II. Feature-Based Architecture

- **Frontend (web, www, desktop renderer):** Domain logic lives in `src/features/[domain]/` as self-contained vertical slices. `src/app/` contains routing only — no business logic.
- **Backend (api):** Each business domain is a NestJS module under `src/modules/[domain]/` following the modular-monolith pattern with controller → service → repository layers.
- **Desktop main process:** Business logic in `electron/services/`, data access in `electron/repositories/`, IPC handlers in `electron/ipc/` (delegation only, no business logic).

### III. Strict Import Boundaries (NON-NEGOTIABLE)

- `features/A/` MUST NOT import from `features/B/`. Features communicate only through shared packages or parent orchestration.
- `shared/` MUST NOT import from `features/`.
- `app/` MAY import from `features/` and `shared/`.
- Backend modules communicate through NestJS dependency injection (exported services), never direct file imports across module boundaries.
- `common/` is imported by all modules; modules MUST NOT import `common/` in reverse.
- The desktop renderer MUST NOT access Node.js APIs directly; all communication goes through `electron/preload.ts` (Context Bridge).

### IV. Offline-First Desktop (NON-NEGOTIABLE)

- The guard booth desktop app MUST function without network connectivity.
- SQLite (main process only) is the local data store; the renderer MUST NOT access SQLite directly.
- Sync uses the Outbox pattern with UUID `event_id` for idempotent server reconciliation.
- `SyncSlice` states: `idle | syncing | error | offline`. The UI MUST reflect the current sync state.
- Conflict resolution strategy MUST be defined per entity before implementation.

### V. Shared Validation via Zod

- Zod schemas in `@ramcar/shared` define DTOs once. The same schema MUST be reused for NestJS request validation (via Zod validation pipe) and frontend form validation.
- Schema changes MUST be made in `@ramcar/shared` first; duplicating validation logic in app code is prohibited.
- All external input (API requests, form submissions, IPC messages) MUST be validated through Zod schemas.

### VI. Role-Based Access Control

- Four roles in strict hierarchy: `SuperAdmin > Admin > Guard > Resident`.
- API endpoints MUST be protected by NestJS guards (`JwtAuthGuard` + `RolesGuard`).
- Database-level RLS policies MUST mirror API-level role restrictions as a defense-in-depth measure.
- Role checks MUST NOT be hardcoded in business logic; use the `@Roles()` decorator and guard infrastructure.
- Frontend MUST hide UI elements the current role cannot access, but MUST NOT rely on UI hiding as the sole authorization mechanism.

### VII. TypeScript Strict Mode

- `strict: true` MUST be enabled in every `tsconfig.json` across the monorepo.
- `any` type is prohibited except when interfacing with untyped third-party libraries, and MUST be accompanied by a `// eslint-disable-next-line` comment with justification.
- Auto-generated types (`@ramcar/db-types`) MUST NOT be manually edited; regenerate with `pnpm db:types`.
- All workspace packages use the `@ramcar/` scope and extend shared tsconfigs from `@ramcar/config`.

### VIII. API-First Data Access (NON-NEGOTIABLE)

- All database operations (`supabase.from()`, `.rpc()`, `.storage`) MUST go through the NestJS API (`apps/api`). Frontend apps (`apps/web`, `apps/www`, `apps/desktop`) MUST NOT query or mutate database tables directly.
- **Allowed frontend Supabase usage:** Authentication (`supabase.auth.*`) and Realtime subscriptions (`supabase.channel()`, `.on()`). Nothing else.
- Next.js Server Actions (`"use server"`) MUST NOT contain database queries or mutations. Frontend data operations use `fetch` or TanStack Query to call NestJS REST endpoints.
- The Supabase client in frontend apps MUST be restricted to auth and realtime. Client files MUST include a header comment: `// AUTH & REALTIME ONLY — no .from(), .rpc(), .storage`.
- The NestJS API is the single source of truth for business logic, validation, tenant isolation, and RBAC enforcement. Duplicating these concerns in frontend code is prohibited.
- Desktop app data sync: Supabase Realtime for receiving live updates; all write operations go through NestJS API endpoints.

## Technology Constraints

- **Runtime:** Node.js 22 LTS (enforced via `.nvmrc` and `engines` field).
- **Package manager:** pnpm with workspaces. No npm or yarn.
- **Build orchestration:** Turborepo. All cross-workspace commands run through Turbo pipelines.
- **Frontend framework:** Next.js 14+ with App Router. Pages Router is not permitted.
- **UI components:** shadcn/ui (copied into `@ramcar/ui`, not installed as a dependency). Built on Radix + Tailwind CSS.
- **State:** React Query (TanStack Query v5) for server state; Zustand (from `@ramcar/store`) for client/UI state. No overlap between the two.
- **React Query keys** MUST include `tenantId`: `[resource, tenantId, modifier, filters]`.
- **Backend framework:** NestJS (modular monolith). No Express-only endpoints outside NestJS.
- **Database:** PostgreSQL via Supabase (Auth, Storage, Realtime, RLS).
- **Desktop:** Electron + Vite + React. Two-process architecture; preload is the only bridge.

## Development Workflow & Quality Gates

- **Linting:** ESLint flat config (`eslint.config.mjs`) extending `@ramcar/config/eslint`. `pnpm lint` MUST pass before merge.
- **Type checking:** `pnpm typecheck` MUST pass before merge. No `// @ts-ignore` without justification.
- **Formatting:** Prettier with shared config from `@ramcar/config/prettier`.
- **Tailwind:** Shared preset from `@ramcar/config/tailwind`; each consumer sets content paths including `packages/ui`.
- **Database changes:** New migration via `pnpm db:new [name]` → write SQL → `pnpm db:migrate` → `pnpm db:types`. Never edit existing migration files.
- **Commits:** Conventional Commits format (`feat:`, `fix:`, `chore:`, `docs:`, etc.).
- **New features:** Follow the Adding New Features checklist in `CLAUDE.md` for the appropriate app layer.

## Governance

- This constitution is the highest-authority document for architectural and coding decisions in the Ramcar Platform. It supersedes informal conventions or ad-hoc practices.
- Amendments require: (1) a written proposal describing the change and rationale, (2) updating this file with the new version, and (3) verifying that dependent templates (plan, spec, tasks) remain consistent.
- Versioning follows SemVer: MAJOR for principle removals or redefinitions, MINOR for new principles or material expansions, PATCH for clarifications and wording fixes.
- All code reviews MUST verify compliance with these principles. Non-compliance MUST be flagged and resolved before merge.
- Use `CLAUDE.md` for runtime development guidance and day-to-day commands.

**Version**: 1.1.0 | **Ratified**: 2026-03-16 | **Last Amended**: 2026-04-09
