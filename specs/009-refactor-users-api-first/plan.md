# Implementation Plan: Catalog Users — API-First Refactor

**Branch**: `009-refactor-users-api-first` | **Date**: 2026-04-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-refactor-users-api-first/spec.md`

## Summary

Refactor the Catalog Users feature to enforce API-first data access (Constitution Principle VIII). Remove all 6 Server Actions that directly query Supabase from the frontend, replace them with TanStack Query hooks that call existing NestJS API endpoints. Create a missing Tenants endpoint. Update the API to accept optional passwords on user creation. Update shared Zod schemas to make address/username/phone required and add optional password fields.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 22 LTS  
**Primary Dependencies**: Next.js 16 (App Router), NestJS v11, TanStack Query v5.97.0, Supabase JS v2, @supabase/ssr, shadcn/ui, Zod, Zustand, next-intl v4  
**Storage**: PostgreSQL via Supabase (no schema changes — migration from 008 retained)  
**Testing**: Vitest (frontend + packages), Jest + ts-jest (API), Playwright (E2E)  
**Target Platform**: Web (Next.js dashboard), NestJS API server  
**Project Type**: Multi-tenant web application (pnpm monorepo + Turborepo)  
**Performance Goals**: <2s page load for users list, <500ms search response  
**Constraints**: API-first data access (Constitution VIII), tenant isolation (Constitution I), RBAC (Constitution VI), strict TypeScript (Constitution VII)  
**Scale/Scope**: Users catalog module — 7 API operations, 4 frontend hooks, 3 page routes, 1 new API module (tenants)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenant Isolation | PASS | All queries routed through API; TenantGuard enforces tenant_id from JWT |
| II. Feature-Based Architecture | PASS | Frontend: `features/users/`, Backend: `modules/users/`, `modules/user-groups/`, new `modules/tenants/` |
| III. Strict Import Boundaries | PASS | Hooks in `features/users/hooks/` import from `shared/` only; no cross-feature imports |
| IV. Offline-First Desktop | N/A | Users module is web-only |
| V. Shared Validation via Zod | PASS | Schemas in `@ramcar/shared`, reused by API validation pipe and frontend forms |
| VI. Role-Based Access Control | PASS | NestJS guards (`JwtAuthGuard`, `RolesGuard`) protect all endpoints; frontend hides UI per `canEdit`/`canDeactivate` flags |
| VII. TypeScript Strict Mode | PASS | All workspaces use `strict: true` |
| VIII. API-First Data Access | PASS | Core purpose of this feature — removing all `supabase.from()` from frontend |

**Gate result**: PASS — no violations.

### Post-Design Re-check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenant Isolation | PASS | New TenantsModule respects tenant scoping (Admin sees own, Super Admin sees all) |
| II. Feature-Based Architecture | PASS | New TenantsModule follows `modules/[domain]/` pattern; frontend hooks stay in `features/users/hooks/` |
| III. Strict Import Boundaries | PASS | `api-client.ts` lives in `shared/lib/`; hooks import only from shared — no cross-feature imports |
| V. Shared Validation via Zod | PASS | Schema changes made in `@ramcar/shared` first; API and frontend both consume updated schemas |
| VI. RBAC | PASS | TenantsController uses same guard stack (`JwtAuthGuard`, `TenantGuard`, `RolesGuard`) |
| VII. TypeScript Strict Mode | PASS | All new code (api-client, hooks, TenantsModule) will use strict TS |
| VIII. API-First Data Access | PASS | All `supabase.from()` removed from frontend; all data flows through NestJS API |

**Post-design gate result**: PASS — no violations introduced by design decisions.

## Project Structure

### Documentation (this feature)

```text
specs/009-refactor-users-api-first/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api-endpoints.md # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
# Backend (NestJS API) — apps/api/src/
apps/api/src/
├── modules/
│   ├── users/
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts        # UPDATE: add optional password field
│   │   │   ├── update-user.dto.ts         # UPDATE: make address/username/phone required
│   │   │   └── user-filters.dto.ts        # NO CHANGE
│   │   ├── __tests__/
│   │   │   └── users.service.spec.ts      # UPDATE: add password handling tests
│   │   ├── users.controller.ts            # NO CHANGE
│   │   ├── users.service.ts               # UPDATE: pass password to repository
│   │   ├── users.repository.ts            # UPDATE: conditional password vs recovery link
│   │   └── users.module.ts                # NO CHANGE
│   ├── user-groups/                       # NO CHANGE (all files)
│   └── tenants/                           # NEW MODULE
│       ├── tenants.controller.ts          # NEW: GET /tenants
│       ├── tenants.service.ts             # NEW: findAll with tenant scoping
│       ├── tenants.repository.ts          # NEW: Supabase query for tenants
│       └── tenants.module.ts              # NEW: register in AppModule
├── app.module.ts                          # UPDATE: register TenantsModule
└── infrastructure/supabase/               # NO CHANGE

# Shared packages — packages/shared/src/
packages/shared/src/
├── validators/
│   └── user.ts                            # UPDATE: required fields, optional password/confirmPassword
├── types/
│   └── user.ts                            # NO CHANGE (types already defined)
└── index.ts                               # UPDATE if new exports needed

# Frontend (Next.js web) — apps/web/src/
apps/web/src/
├── app/[locale]/(dashboard)/
│   ├── dashboard-shell.tsx                # NO CHANGE (QueryProvider already wired)
│   └── catalogs/users/
│       ├── page.tsx                        # UPDATE: use hooks instead of Server Actions
│       ├── new/page.tsx                    # UPDATE: use hooks instead of Server Actions
│       └── [id]/edit/page.tsx              # UPDATE: use hooks instead of Server Actions
├── features/users/
│   ├── actions/                            # DELETE ENTIRE DIRECTORY
│   │   ├── create-user.ts                 # DELETE (supabase.from)
│   │   ├── get-users.ts                   # DELETE (supabase.from)
│   │   ├── get-user.ts                    # DELETE (supabase.from)
│   │   ├── get-user-groups.ts             # DELETE (supabase.from)
│   │   ├── update-user.ts                 # DELETE (supabase.from)
│   │   └── toggle-user-status.ts          # DELETE (supabase.from)
│   ├── hooks/
│   │   ├── use-users.ts                   # REWRITE: fetch from API instead of Server Action
│   │   ├── use-user-groups.ts             # REWRITE: fetch from API instead of Server Action
│   │   ├── use-create-user.ts             # REWRITE: POST to API instead of Server Action
│   │   ├── use-update-user.ts             # REWRITE: PUT to API instead of Server Action
│   │   ├── use-toggle-status.ts           # NEW: PATCH to API
│   │   └── use-tenants.ts                 # NEW: GET tenants from API
│   ├── components/
│   │   ├── user-form.tsx                  # UPDATE: add password fields, update required fields, status default
│   │   ├── users-table.tsx                # UPDATE: wire to new hooks
│   │   ├── users-table-columns.tsx        # NO CHANGE
│   │   ├── user-filters.tsx               # UPDATE: wire tenant filter to API hook
│   │   ├── user-status-badge.tsx          # NO CHANGE
│   │   ├── confirm-status-dialog.tsx      # UPDATE: wire to new toggle hook
│   │   ├── create-user-page-client.tsx    # UPDATE: wire to new hooks
│   │   └── edit-user-page-client.tsx      # UPDATE: wire to new hooks
│   ├── __tests__/
│   │   ├── user-status-badge.test.tsx     # NO CHANGE
│   │   └── users-table-columns.test.tsx   # NO CHANGE
│   └── types/
│       └── index.ts                       # NO CHANGE
├── shared/lib/
│   ├── query-provider.tsx                 # NO CHANGE (already exists)
│   └── api-client.ts                      # NEW: shared fetch wrapper with JWT auth header
└── shared/lib/supabase/
    ├── client.ts                          # NO CHANGE (AUTH & REALTIME ONLY comment present)
    ├── server.ts                          # NO CHANGE (AUTH & REALTIME ONLY comment present)
    └── middleware.ts                       # NO CHANGE

# Environment files
.env                                       # UPDATE: add NEXT_PUBLIC_API_URL
.env.development                           # UPDATE: add NEXT_PUBLIC_API_URL
.env.example                               # UPDATE: add NEXT_PUBLIC_API_URL
```

**Structure Decision**: Follows existing monorepo layout. No new directories beyond `modules/tenants/` (backend) and `shared/lib/api-client.ts` (frontend). The `actions/` directory is fully removed. Hooks are rewritten in-place.

## Complexity Tracking

> No Constitution violations — this section is empty.
