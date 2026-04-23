# Implementation Plan: Tenants Catalog and Multi-Tenant Access for Admin/Guard

**Branch**: `020-tenants-catalog` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-tenants-catalog/spec.md`

## Summary

Ship a `/catalogs/tenants` portal page where SuperAdmin and Admin can create, edit, and browse residential communities (tenants), alongside the structural breaking change that allows Admin and Guard users to be assigned to **multiple** tenants. The change spans five layers:

1. **Database** — extend `public.tenants` with `address`, `status`, `config`, `image_path`; add a `public.user_tenants` join table; configure a public-read Supabase Storage bucket (`tenant-images`) with policies that mirror PATCH authorization; seed the join table from pre-existing admin/guard `profiles.tenant_id`; replace every RLS policy that filters by `tenant_id` with a three-branch policy keyed on `role + user_tenants + profiles.tenant_id`.
2. **Auth** — install a Postgres custom access token hook so every issued JWT carries two claims: `role` (string) and `tenant_ids` (JSON — `"*"` for super_admin, `[uuid]` for resident, `uuid[]` from `user_tenants` for admin/guard).
3. **API** — change `@CurrentTenant()` to a tenant-scope object (`{ role, scope }` with `scope ∈ { all | list | single }`), update `TenantGuard` to validate any incoming `tenant_id` target against the scope (`all` = pass through, `list` = must be `IN`, `single` = must equal), migrate every repository predicate to accept the new scope, introduce a full `TenantsModule` with list/create/update/image-upload/image-delete endpoints, and teach the Users module to sync `user_tenants` rows on create/update for admin/guard roles.
4. **Frontend state** — replace the single `tenantId/tenantName` auth-slice fields with `tenantIds: string[]`, `activeTenantId`, `activeTenantName`; persist `activeTenantId` per session via localStorage; add a helper for tenant-aware React Query key invalidation on switch.
5. **Frontend UI** — build a tenant catalog page (table + Sheet create/edit with image upload) in `apps/web` under `src/app/[locale]/(dashboard)/catalogs/tenants/`; add a `TenantAvatar` primitive to `@ramcar/ui` (image + deterministic initials/color fallback) reused by the catalog and the selector; add a `TenantSelector` (Popover + Command combobox) inside a new `packages/features/src/tenant-selector/` shared feature module consumed by both `apps/web` and `apps/desktop` TopBars; upgrade the Users form's tenant field to a multi-select combobox with a primary marker for admin/guard roles.

Out of scope (per spec): hard delete of tenants, subscription-tier limit enforcement, bulk import, `config` UI, force-logout on revocation, and Realtime updates to the selector.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode across the monorepo), Node.js 22 LTS.

**Primary Dependencies**:
- Backend — NestJS v11, `@nestjs/platform-express`, `@supabase/supabase-js` v2 (service-role client in API only), `multer` (multipart file upload on the new `POST /api/tenants/:id/image` endpoint), Zod (via `@ramcar/shared`), slug generation via `slugify` or an in-house `toSlug` helper.
- Web — Next.js 16 (App Router), `@ramcar/ui` (shadcn/ui: Sheet, Popover, Command, Button, Input, Select, Switch, Badge, Avatar, Table, Skeleton), TanStack Query v5, Zustand via `@ramcar/store`, `next-intl` v4, `lucide-react`, `tw-animate-css` (already present).
- Desktop — Electron 30 + Vite + React 18, `react-i18next`, TanStack Query v5 (render-only — mutations flow through the outbox transport), `@ramcar/ui`.
- Shared packages — `@ramcar/shared` (Zod DTOs + TypeScript types), `@ramcar/store` (auth-slice extension), `@ramcar/ui` (TenantAvatar primitive), `@ramcar/features` (new `tenant-selector/` shared feature module), `@ramcar/i18n` (new message keys).

**Storage**:
- PostgreSQL via Supabase. New/modified tables: `public.tenants` (+ `address`, `status`, `config`, `image_path`), `public.user_tenants` (new join). RLS updates on `tenants`, `profiles`, `user_groups`, `vehicles`, `access_events`, `visit_persons`, `visit_person_images`.
- Supabase Storage — new **public-read** bucket `tenant-images` with write policies mirroring `PATCH /api/tenants/:id` authorization and a 2 MiB file-size limit enforced at the bucket level (defense in depth against API bypass).
- Browser `localStorage` — session-persistent `activeTenantId` (key: `ramcar.auth.activeTenantId`); selector search is transient.
- Desktop SQLite — **not touched** by this feature. Tenant mutation endpoints are portal-only (admin/super_admin reach the portal; no booth paths). Selector reads are online-only; if the desktop is offline the cached claim continues to drive scoping.

**Testing**:
- API — Jest + ts-jest unit tests on `TenantsService`, `UsersService.syncUserTenants`, the updated `TenantGuard`, and the new scope-aware repository helpers; NestJS e2e tests covering access-control matrix (SuperAdmin/Admin/Guard/Resident × `/api/tenants`, `/api/users` create/update with multi-tenant selection, PATCH cross-tenant denial).
- Database — pgTAP or Supabase-SQL integration checks for the custom access token hook and the rewritten RLS policies (assert A-tenant rows are invisible to B-tenant-only users).
- Web — Vitest + React Testing Library for `TenantsTable`, `TenantSidebar`, the multi-select in `UserForm`, and the `TenantSelector` interaction surface; Playwright e2e for the end-to-end happy path (create tenant → switch via selector → visible scope change).
- Shared — Vitest unit tests on new Zod schemas in `@ramcar/shared` (`createTenantSchema`, `updateTenantSchema`, `tenantListQuerySchema`, user-form schema extension for `tenant_ids` + `primary_tenant_id`).
- Smoke — pgBench-less local perf check (FR-058/FR-059) via a lightweight repeat-render script in the quickstart.

**Target Platform**: Supabase-hosted Postgres; NestJS on Node 22 LTS; Next.js portal deployed to Vercel-like environments; Electron desktop on macOS/Windows. Browsers: evergreen (matches existing apps).

**Project Type**: Turborepo monorepo with web + desktop + api + shared packages. No new top-level workspace — this feature slots into existing apps and extends two existing packages (`@ramcar/features`, `@ramcar/ui`).

**Performance Goals**:
- Catalog default view (page size 25, status=active, no search) renders < 1 s under normal load (FR-058, SC-007).
- Tenant switch commit-to-render < 1 s excluding network (FR-059).
- Custom access token hook < 30 ms p95 per sign-in (budget: one indexed read from `user_tenants` per admin/guard sign-in; SuperAdmin + Resident take branches with no lookup).

**Constraints**:
- **Constitution Principle I (Multi-Tenant Isolation)** — every tenant-scoped query must match the caller's `tenant_ids` at BOTH the API layer and the RLS layer. The breaking change from single `tenant_id` to `tenant_ids` array propagates through every repository helper, every RLS policy, and the `@CurrentTenant()` decorator in one cutover PR (no shim — see Assumptions in the spec).
- **Constitution Principle VIII (API-First Data Access)** — the tenant-images bucket is public-read, BUT the frontend never writes to Supabase Storage directly; it uploads via `POST /api/tenants/:id/image` which the API forwards to the bucket. Read URLs are composed client-side from the bucket's public URL + `image_path`.
- JWT size ceiling — `tenant_ids` claim capped at ~50 tenants per admin/guard (FR-060). Above that the spec requests a monitoring signal, not a live fallback.
- Token refresh latency — a newly created `user_tenants` row is not visible in the caller's JWT until the next refresh. Admin UX after create-own-tenant shows an inline toast hint; no forced re-auth in v1.
- Backwards compatibility with existing sessions — users with active JWTs predating the migration carry `app_metadata.tenant_id` but not `tenant_ids`. The API must tolerate this during the rollout window (compute `tenant_ids = [tenant_id]` as a fallback for admin/guard), then log a deprecation warning; new sign-ins issue the new claims. The migration seeds `user_tenants` rows for every pre-existing admin/guard so the fallback and the authoritative claim agree.

**Scale/Scope**:
- Tens of tenants in year 1; spec targets ≤ 50 tenants per admin/guard (FR-060) and therefore a `tenant_ids` claim of ≤ 50 UUIDs. Catalog row count bound is a few thousand at most; page size 25/50/100 with server-side pagination is sufficient.
- Number of RLS policies modified: approximately 12 across 7 tables (`tenants` x 1 read, `profiles` x 3, `user_groups` x 1 read, `vehicles` x 3, `access_events` x 2, `visit_persons` x 3, `visit_person_images` x 3). Exact count finalized in Phase 1 data-model enumeration.
- Number of `@CurrentTenant()` call sites to migrate: 23 annotated decorator usages across 8 controllers (spec 019's `search_access_events` RPC is already array-aware — `p_tenant_ids uuid[]` — and needs no change beyond ensuring the caller passes the new scope shape).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|------------|-------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | ✅ PASS (with structural change) | The feature strengthens Principle I by moving from a single `app_metadata.tenant_id` to a `tenant_ids` claim that is authoritative at the JWT level AND mirrored at the RLS level. Every tenant-scoped query is updated to use `WHERE tenant_id = ANY($1)` (or the single-value branch for residents). No query is left unscoped. RLS is enabled on the new `user_tenants` table. SuperAdmin's `"*"` wildcard lives only at the JWT and API layers — RLS still enforces per-table policies by reading the role from the JWT. The custom access token hook is the single source of truth for claim generation. |
| **II. Feature-Based Architecture** | ✅ PASS | Frontend: new `apps/web/src/features/tenants/` for catalog-specific code (table, sidebar, hooks); shared `packages/features/src/tenant-selector/` for the bi-app selector. Backend: new `apps/api/src/modules/tenants/` expands the existing stub module into a full modular-monolith module (controller → service → repository → dto/). No business logic leaks into `src/app/` routes. |
| **III. Strict Import Boundaries (NON-NEGOTIABLE)** | ✅ PASS | The catalog feature imports only from `src/shared/` and `@ramcar/*` packages. The tenant-selector shared module does not import from `next/*`, does not include `"use client";`, and receives i18n + transport + role ports via adapter injection (same pattern as `@ramcar/features/visitors` from spec 014). `@ramcar/ui/TenantAvatar` is framework-agnostic (Tailwind + Radix primitives). Backend modules communicate through exported services only; cross-module data access (e.g., users creating a tenant) uses the existing `TenantsService` — no direct file imports. |
| **IV. Offline-First Desktop (NON-NEGOTIABLE)** | ✅ PASS (no impact) | Tenant CRUD is portal-only. The booth desktop app consumes the TenantSelector for switching the operator's active community, but write paths do not exist on desktop. The selector reads from `GET /api/tenants` via the existing HTTP transport when online; when offline, the cached tenant list and cached JWT claim continue to drive scoping. No SQLite schema changes; no new outbox event kinds. |
| **V. Shared Validation via Zod** | ✅ PASS | All new DTOs land in `@ramcar/shared/validators/tenant.ts` (`createTenantSchema`, `updateTenantSchema`, `tenantListQuerySchema`, `tenantImageUploadSchema`). The Users form's multi-tenant extension adds `tenantIdsSchema` + `primaryTenantIdSchema` to the existing `createUserSchema`/`updateUserSchema`. Both NestJS `ZodValidationPipe` and the frontend forms import the same schema; no duplicated validation. |
| **VI. Role-Based Access Control** | ✅ PASS | `/api/tenants` is protected by `JwtAuthGuard + RolesGuard` with `@Roles("super_admin", "admin")`. PATCH additionally goes through the new scope-aware `TenantGuard` which validates the `:id` param against the caller's `tenant_ids`. The frontend hides the "Tenants" nav entry for guard/resident roles, but the API is the authoritative check. The Users form's role picker hides `admin` for non-SuperAdmins, AND the API rejects a constructed request with `role=admin` from a non-SuperAdmin (defense in depth). |
| **VII. TypeScript Strict Mode** | ✅ PASS | No new `any` usages planned. The `@CurrentTenant()` return-type widening produces a discriminated union `{ role: Role; scope: "all" } \| { role: Role; scope: "list"; tenantIds: string[] } \| { role: Role; scope: "single"; tenantId: string }` that every caller must destructure — compile errors at migration points surface every unmigrated call site. `@ramcar/db-types` will be regenerated after the migration. |
| **VIII. API-First Data Access (NON-NEGOTIABLE)** | ✅ PASS | New frontend code does not call `supabase.from()`, `.rpc()`, or `.storage.from()`. Tenant list, create, update, image upload, and image delete all go through the NestJS API. The public-read tenant-images bucket is accessed by the browser via `<img src="…">` composed from the bucket's public URL and the `image_path` returned by the API — this is read-only and mirrors how signed URLs work for other buckets, just without the signing step. Write access to the bucket is blocked by policy for anon and authenticated roles; only the service-role key (API) can write. |

**Gate result (pre-research)**: PASS. No violations; no Complexity Tracking entries needed.

**Gate result (post-design re-check, after research.md / data-model.md / contracts/)**: PASS.

- The Phase-0 decisions reinforce Principle I: the RLS rewrites enumerated in research R-16 and codified in data-model.md §1 cover every tenant-scoped table including `tenants` itself; the `public.custom_access_token_hook` function is the single source of truth for the `tenant_ids` claim; RLS expressions re-derive membership from `public.user_tenants` rather than trusting the claim (defense in depth — see contracts/auth-hook-claims.md §4.3).
- Principle VIII (API-First): the `tenant-images` bucket is public-READ only for browsers assembling `<img src>` URLs; all writes route through `POST /api/tenants/:id/image` → NestJS → service-role Supabase client. Bucket write policies (data-model.md §6) mirror API authorization so a bypass attempt via service-role leak is still policy-gated.
- Principle V (Shared Zod): `contracts/tenant-dtos.md` expresses every request/response DTO as `@ramcar/shared/validators/tenant.ts` Zod schemas, consumed by NestJS `ZodValidationPipe` (existing) and the frontend forms — no duplicated validation.
- Principle III (Imports): `packages/features/src/tenant-selector/` follows the spec-014 shared-feature-module pattern with transport + i18n adapter injection (no `next/*`, no `"use client";` in the shared module). `@ramcar/ui/TenantAvatar` (research R-7) is a pure Tailwind + Radix primitive with no fetching or i18n — same constraints.
- Principle VII (Strict TS): the discriminated `TenantScope` union (data-model.md §3) forces every existing `@CurrentTenant()` call site to destructure; compile errors surface missed migrations. No `any` is introduced; the Zod `.refine`-based schemas produce fully-inferred types for forms.

No new violations surfaced during Phase 1 design. No Complexity Tracking entries to add.

## Project Structure

### Documentation (this feature)

```text
specs/020-tenants-catalog/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── tenants-api.openapi.yaml
│   ├── users-api.patch.md
│   ├── tenant-dtos.md
│   └── auth-hook-claims.md
├── checklists/
│   └── requirements.md  # already present
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
supabase/migrations/
└── 20260423000000_tenants_catalog_multitenant.sql   # (new) tenants extensions + user_tenants + RLS rewrites + storage bucket + auth hook

apps/api/src/
├── modules/
│   ├── tenants/                                     # expanded (controller, service, repository, dto/, use-cases/)
│   │   ├── tenants.module.ts                        # existing — register new providers
│   │   ├── tenants.controller.ts                    # existing — add POST/PATCH/image endpoints
│   │   ├── tenants.service.ts                       # existing — rewrite with create/update/paginate
│   │   ├── tenants.repository.ts                    # existing — rewrite for pagination/status filters
│   │   ├── dto/
│   │   │   ├── create-tenant.dto.ts                 # (new) re-exports CreateTenantSchema from @ramcar/shared
│   │   │   ├── update-tenant.dto.ts                 # (new)
│   │   │   ├── tenant-list-query.dto.ts             # (new)
│   │   │   └── tenant-image.dto.ts                  # (new)
│   │   └── use-cases/
│   │       ├── create-tenant.use-case.ts            # (new) wraps service + auto-assign for admin
│   │       ├── upload-tenant-image.use-case.ts      # (new)
│   │       └── delete-tenant-image.use-case.ts      # (new)
│   └── users/                                       # modified — sync user_tenants on create/update for admin/guard
│       ├── users.service.ts                         # add syncUserTenants()
│       └── dto/
│           └── create-user.dto.ts                   # extend with tenantIds + primaryTenantId
├── common/
│   ├── decorators/
│   │   └── current-tenant.decorator.ts              # rewrite return shape → TenantScope discriminated union
│   └── guards/
│       └── tenant.guard.ts                          # rewrite: extract claim + validate body/param tenant_id against scope
└── infrastructure/
    └── supabase/
        └── supabase.service.ts                      # (existing) adds helper: storage.from('tenant-images').upload(…)

apps/web/src/
├── app/[locale]/(dashboard)/catalogs/tenants/
│   └── page.tsx                                     # (new) renders TenantsPage (server component → client TenantsTable)
├── features/tenants/                                # (new) catalog feature
│   ├── components/
│   │   ├── tenants-table.tsx
│   │   ├── tenants-table-columns.tsx
│   │   ├── tenant-sidebar.tsx                       # Sheet for create/edit
│   │   ├── tenant-form.tsx
│   │   ├── tenant-image-upload.tsx                  # file picker + preview
│   │   ├── tenant-filters.tsx                       # search + status filter
│   │   └── tenant-status-badge.tsx
│   ├── hooks/
│   │   ├── use-tenants.ts                           # (replaces apps/web/src/features/users/hooks/use-tenants.ts after migration)
│   │   ├── use-tenant.ts
│   │   ├── use-create-tenant.ts
│   │   ├── use-update-tenant.ts
│   │   ├── use-upload-tenant-image.ts
│   │   └── use-delete-tenant-image.ts
│   └── types/
│       └── index.ts
└── features/navigation/
    └── components/
        └── top-bar.tsx                              # inject TenantSelector from @ramcar/features

apps/desktop/src/
└── features/navigation/components/
    └── top-bar.tsx                                  # inject TenantSelector from @ramcar/features

packages/features/src/
└── tenant-selector/                                 # (new) shared bi-app feature module
    ├── components/
    │   ├── tenant-selector.tsx                      # Popover + Command combobox
    │   └── tenant-selector-trigger.tsx
    ├── hooks/
    │   └── use-tenant-list.ts                       # calls injected transport
    ├── index.ts
    └── __tests__/
        └── tenant-selector.test.tsx

packages/ui/src/components/
└── tenant-avatar.tsx                                # (new) image + initials fallback primitive

packages/store/src/slices/
└── auth-slice.ts                                    # (modified) add tenantIds / activeTenantId / activeTenantName + actions

packages/shared/src/
├── types/
│   ├── tenant.ts                                    # (new) Tenant, TenantImageRef, TenantStatus
│   └── user-tenant.ts                               # (new) UserTenant
├── validators/
│   └── tenant.ts                                    # (new) Zod schemas
└── index.ts                                         # re-export new entries

packages/i18n/src/messages/
├── en/tenants.json                                  # (new)
├── en/users.json                                    # (modified — tenant-multi-select strings)
├── es/tenants.json                                  # (new)
└── es/users.json                                    # (modified)
```

**Structure Decision**: The feature uses the existing Turborepo layout. Three shared packages are touched: `@ramcar/shared` (types + Zod), `@ramcar/store` (auth-slice), `@ramcar/ui` (TenantAvatar). One shared feature module is added at `packages/features/src/tenant-selector/` consumed by both `apps/web` and `apps/desktop` TopBars. The catalog itself is web-only (Admin/SuperAdmin do not operate from the booth), so no `packages/features/src/tenants/` — the catalog lives under `apps/web/src/features/tenants/` and is explicitly marked single-app in the shared-features manifest.

## Complexity Tracking

*No violations. This section is intentionally empty.*
