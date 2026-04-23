---
description: "Task list for feature 020 — Tenants Catalog and Multi-Tenant Access for Admin/Guard"
---

# Tasks: Tenants Catalog and Multi-Tenant Access for Admin/Guard

**Input**: Design documents from `/specs/020-tenants-catalog/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included. plan.md §Technical Context → Testing explicitly requires API Jest unit + e2e, DB pgTAP/SQL for the auth hook and RLS rewrites, frontend Vitest + RTL + Playwright, and shared Zod tests.

**Organization**: Tasks are grouped by user story (US1–US8). The Foundational phase contains the breaking `@CurrentTenant` cutover and the single migration that blocks every downstream story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different file, no dependency on incomplete tasks)
- **[Story]**: user-story label (US1–US8); absent on Setup/Foundational/Polish tasks
- File paths are absolute within the repo

## Path Conventions (per plan.md §Project Structure)

- Migration: `supabase/migrations/20260423000000_tenants_catalog_multitenant.sql`
- API: `apps/api/src/modules/tenants/`, `apps/api/src/common/{decorators,guards,utils}/`
- Web app: `apps/web/src/features/tenants/`, `apps/web/src/app/[locale]/(dashboard)/catalogs/tenants/`
- Desktop: `apps/desktop/src/features/navigation/`
- Shared: `packages/shared/src/{validators,types}/`, `packages/ui/src/components/`, `packages/store/src/slices/`, `packages/features/src/tenant-selector/`, `packages/i18n/src/messages/{en,es}/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Placeholder files and directories that multiple stories will populate. The monorepo scaffold already exists.

- [X] T001 Create migration file `supabase/migrations/20260423000000_tenants_catalog_multitenant.sql` with header comment `-- Feature 020: tenants extensions + user_tenants + RLS rewrites + storage bucket + auth hook` (body filled by T009–T021)
- [X] T002 [P] Create empty directories `apps/api/src/modules/tenants/{dto,use-cases}/` (keep module.ts/controller.ts/service.ts/repository.ts stubs in place)
- [X] T003 [P] Create empty directory `apps/web/src/features/tenants/{components,hooks,types}/`
- [X] T004 [P] Create stub page `apps/web/src/app/[locale]/(dashboard)/catalogs/tenants/page.tsx` returning `null` (populated by T082)
- [X] T005 [P] Create directory `packages/features/src/tenant-selector/{components,hooks,__tests__}/` with empty `index.ts`
- [X] T006 [P] Create empty message catalogs `packages/i18n/src/messages/en/tenants.json` (`{}`) and `packages/i18n/src/messages/es/tenants.json` (`{}`); re-export them from `packages/i18n/src/index.ts`
- [X] T007 [P] Register `@ramcar/features/tenant-selector` in `shared-features.json` manifest so `pnpm check:shared-features` accepts it
- [X] T008 [P] Add a branch-scoped `.env.local` note to `specs/020-tenants-catalog/quickstart.md` troubleshooting if `NEXT_PUBLIC_SUPABASE_URL` is missing on the web app (no code change, doc-only)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. Contains the DB migration, the storage bucket, the auth hook, the `@CurrentTenant` contract cutover across every existing module, the shared Zod DTOs, the Zustand slice extension, and the `TenantAvatar` primitive.

### Database migration (single file, sequential within T009–T021)

- [X] T009 Extend `public.tenants` in `supabase/migrations/20260423000000_tenants_catalog_multitenant.sql` — add `address text not null default ''`, `status text not null check (status in ('active','inactive')) default 'active'`, `config jsonb not null default '{}'::jsonb`, `image_path text null`; add indexes `tenants_status_idx (status)` and `tenants_created_at_desc_idx (created_at desc)` per data-model.md §1.1
- [X] T010 Create `public.user_tenants` table (id pk, user_id fk auth.users cascade, tenant_id fk tenants cascade, assigned_by fk auth.users, created_at, unique(user_id, tenant_id)) with `user_tenants_user_id_idx` and `user_tenants_tenant_id_idx`; enable RLS in `supabase/migrations/20260423000000_tenants_catalog_multitenant.sql` per data-model.md §1.3
- [X] T011 Backfill `user_tenants` from existing admin/guard profiles with `INSERT ... SELECT p.user_id, p.tenant_id, p.user_id FROM profiles p WHERE p.role IN ('admin','guard') AND p.tenant_id IS NOT NULL ON CONFLICT DO NOTHING` with SQL comment documenting `assigned_by = user_id` as the legacy-row sentinel; in `supabase/migrations/20260423000000_tenants_catalog_multitenant.sql`
- [X] T012 Add `user_tenants` RLS policies (super_admin FOR ALL; admin SELECT scoped to own+assigned-tenant rows; admin INSERT/DELETE scoped to assigned tenants; guard/resident deny-by-default) per data-model.md §1.3 in `supabase/migrations/20260423000000_tenants_catalog_multitenant.sql`
- [X] T013 Rewrite `tenants` RLS — drop existing "Users can read own tenant"; add three-branch SELECT (super_admin all / admin+guard IN user_tenants / resident = profiles.tenant_id); add INSERT policy (super_admin+admin); add UPDATE policy (super_admin all / admin IN user_tenants); per data-model.md §1.1, in `supabase/migrations/20260423000000_tenants_catalog_multitenant.sql`
- [X] T014 Rewrite `profiles` RLS — drop legacy policies "Users can read profiles in own tenant", "Users can read profiles in scope", "Admins can insert profiles in own tenant", "Admins can update profiles in scope"; add three-branch SELECT/INSERT/UPDATE; keep "Users can update own profile" unchanged; per data-model.md §1.2 in `supabase/migrations/20260423000000_tenants_catalog_multitenant.sql`
- [X] T015 Rewrite `vehicles` RLS (three-branch SELECT/INSERT/UPDATE) per research.md §R-16 in `supabase/migrations/20260423000000_tenants_catalog_multitenant.sql`
- [X] T016 Rewrite `access_events` RLS (three-branch SELECT/INSERT/UPDATE) per research.md §R-16 in `supabase/migrations/20260423000000_tenants_catalog_multitenant.sql`
- [X] T017 Rewrite `visit_persons` RLS (three-branch SELECT/INSERT/UPDATE) per research.md §R-16 in `supabase/migrations/20260423000000_tenants_catalog_multitenant.sql`
- [X] T018 Rewrite `visit_person_images` RLS (three-branch SELECT/INSERT/DELETE) per research.md §R-16 in `supabase/migrations/20260423000000_tenants_catalog_multitenant.sql`
- [X] T019 Create `tenant-images` Supabase Storage bucket (`public = true`, `file_size_limit = 2097152`, `allowed_mime_types = ['image/jpeg','image/png','image/webp']`) with storage.objects policies: public SELECT on bucket; INSERT/UPDATE/DELETE by super_admin on any path; INSERT/UPDATE/DELETE by admin when `(storage.foldername(name))[2]::uuid IN (select tenant_id from user_tenants where user_id = auth.uid())`; per data-model.md §6 / research.md §R-5; in `supabase/migrations/20260423000000_tenants_catalog_multitenant.sql`
- [X] T020 Create SECURITY DEFINER function `public.custom_access_token_hook(event jsonb) returns jsonb` — dispatch on `profiles.role`: super_admin → `tenant_ids = '"*"'::jsonb`; resident → `jsonb_build_array(profiles.tenant_id)`; admin/guard → `jsonb_agg(ut.tenant_id order by ut.created_at)` from `user_tenants`; merge `{ role, tenant_ids }` into `event.claims.app_metadata` preserving legacy `tenant_id`; per research.md §R-3 in `supabase/migrations/20260423000000_tenants_catalog_multitenant.sql`
- [X] T021 Register the auth hook in `supabase/config.toml` — add `[auth.hook.custom_access_token]` section with `enabled = true` and `uri = "pg-functions://postgres/public/custom_access_token_hook"`; restart local Supabase (`pnpm db:start --restart`) to activate
- [X] T022 Apply migration (`pnpm db:reset && pnpm db:migrate:dev`) and regenerate types (`pnpm db:types`) so `packages/db-types/src/types.ts` includes `user_tenants` and the new `tenants` columns; commit regenerated file

### Shared Zod DTOs and types (@ramcar/shared)

- [X] T023 [P] Create `packages/shared/src/validators/tenant.ts` with all schemas per contracts/tenant-dtos.md §1 (`tenantStatusSchema`, `tenantNameSchema`, `tenantAddressSchema`, `tenantConfigSchema`, `createTenantSchema`, `updateTenantSchema`, `tenantListQuerySchema`, `tenantImageFileSchema`, `tenantSchema`, `tenantSelectorProjectionSchema`, `paginatedTenantResponseSchema`, `paginatedTenantSelectorResponseSchema`, constants `TENANT_IMAGE_MAX_BYTES` and `TENANT_IMAGE_ALLOWED_MIME`)
- [X] T024 [P] Create `packages/shared/src/types/tenant.ts` re-exporting `Tenant`, `TenantStatus`, `TenantSelectorProjection`, `CreateTenantDto`, `UpdateTenantDto`, `TenantListQuery` from the validators file
- [X] T025 [P] Create `packages/shared/src/types/user-tenant.ts` with the `UserTenant` TypeScript interface (id, user_id, tenant_id, assigned_by, created_at) per data-model.md §1.3
- [X] T026 Update `packages/shared/src/index.ts` to re-export `./validators/tenant`, `./types/tenant`, `./types/user-tenant`
- [X] T027 Extend `packages/shared/src/validators/user.ts` with `tenantIdsArray` (min 1, max 50 per FR-060), `adminGuardTenantFields` (`tenant_ids`, `primary_tenant_id` with `.refine(v => v.tenant_ids.includes(v.primary_tenant_id), ...)`), `residentTenantField`; convert `createUserSchema` to `z.discriminatedUnion("role", [...])` with branches for resident/admin/guard/super_admin; do the same for `updateUserSchema` (partial-aware); per contracts/tenant-dtos.md §2 and contracts/users-api.patch.md
- [ ] T028 [P] Add Vitest tests for tenant Zod schemas (create name trim+min+max, address min, updateTenant `.refine(atLeastOneField)`, tenantListQuerySchema coercions + defaults, tenantImageFileSchema MIME+size enforcement) in `packages/shared/src/validators/__tests__/tenant.test.ts`
- [ ] T029 [P] Add Vitest tests for extended user schemas (discriminated union branches by role, adminGuard primary-in-tenant-ids refinement, resident keeps single tenant_id, super_admin has no tenant fields) in `packages/shared/src/validators/__tests__/user.test.ts`

### @CurrentTenant decorator + TenantGuard cutover (breaking change)

- [X] T030 Rewrite `apps/api/src/common/decorators/current-tenant.decorator.ts` to return the `TenantScope` discriminated union from data-model.md §3 by reading `request.tenantScope` (populated by the guard in T031)
- [X] T031 Rewrite `apps/api/src/common/guards/tenant.guard.ts` to: parse JWT claims (`role`, `tenant_ids`, legacy `tenant_id`); build `TenantScope` via `toScope()`; populate `request.tenantScope`; extract any incoming `tenant_id` / `tenantId` / `tenant_ids` from route params, query, and body; call `assertTargetAllowed` and return 403 on mismatch; emit a `logger.warn` once per user for legacy-only JWTs per research.md §R-12
- [X] T032 Create `apps/api/src/common/utils/tenant-scope.ts` exporting `toScope(role, tenantIds, legacyTenantId?)`, `applyTenantScope<Q>(q, scope, column = "tenant_id")`, `assertTargetAllowed(scope, targetId)` per data-model.md §3
- [ ] T033 [P] Add Jest unit tests for `TenantGuard` covering super_admin pass-through, admin/guard IN-check pass+fail, resident single-id pass+fail, legacy JWT fallback, and body-vs-param-vs-query target extraction in `apps/api/src/common/guards/tenant.guard.spec.ts`
- [ ] T034 [P] Add Jest unit tests for `applyTenantScope`, `assertTargetAllowed`, and `toScope` in `apps/api/src/common/utils/tenant-scope.spec.ts`
- [X] T035 Migrate `apps/api/src/modules/users/users.repository.ts` — replace any `eq("tenant_id", tenantId)` with `applyTenantScope(query, scope)`; update method signatures to accept `TenantScope`
- [X] T036 Migrate `apps/api/src/modules/users/users.service.ts` and `users.controller.ts` to consume `TenantScope` from `@CurrentTenant()`; pass through to repository
- [X] T037 Migrate `apps/api/src/modules/residents/` (repository + service + controller) to `TenantScope`
- [X] T038 Migrate `apps/api/src/modules/vehicles/` (repository + service + controller) to `TenantScope`
- [X] T039 Migrate `apps/api/src/modules/visit-persons/` (repository + service + controller + use-cases) to `TenantScope`
- [X] T040 Migrate `apps/api/src/modules/access-events/` (repository + service + controller; the `search_access_events` RPC already accepts `p_tenant_ids uuid[]` — pass the scope's `tenantIds` or the single id wrapped in an array) to `TenantScope`
- [X] T041 Grep `@CurrentTenant` across `apps/api/src` and migrate any remaining call sites (e.g., `user-groups`, `auth` modules) until `pnpm --filter @ramcar/api typecheck` passes with zero `TS2345`/`TS2322` errors
- [X] T042 Run `pnpm --filter @ramcar/api test` and fix any unit-test failures that break from the decorator contract change (test fixtures must provide a `tenantScope` request attribute)

### Frontend Zustand auth slice

- [X] T043 Extend `packages/store/src/slices/auth-slice.ts` — add state `tenantIds: string[]`, `activeTenantId: string`, `activeTenantName: string`; add actions `setTenantIds(ids)`, `setActiveTenant(id, name)` (writes `localStorage["ramcar.auth.activeTenantId"]`), `hydrateActiveTenant(fallbackPrimary)` (read localStorage → validate ∈ tenantIds → fallback primary → `tenantIds[0]` → `""`); per data-model.md §4 and research.md §R-14
- [X] T044 Update `clearAuth` in `packages/store/src/slices/auth-slice.ts` to also reset `tenantIds`, `activeTenantId`, `activeTenantName` and remove `localStorage["ramcar.auth.activeTenantId"]`
- [X] T045 Grep `tenantId` + `tenantName` usage across `apps/web/src` and `apps/desktop/src`; replace single-field consumers with `activeTenantId` / `activeTenantName` where the intent is the currently-selected tenant
- [X] T046 Wire `apps/web/src/shared/providers/auth-provider.tsx` (or equivalent web bootstrap) to: on login, compute `tenantIds` (super_admin → fetch `GET /api/tenants?scope=selector&include_inactive=true` and map to ids; admin/guard → from JWT `tenant_ids`; resident → `[profile.tenant_id]`), call `setTenantIds`, then `hydrateActiveTenant(profile.tenant_id)`
- [ ] T047 Wire `apps/desktop/src/features/auth/providers/auth-provider.tsx` (or renderer equivalent) to the same flow as T046; fall back to cached JWT claims when offline
- [ ] T048 [P] Add Vitest tests for the auth slice (setTenantIds, hydrateActiveTenant with valid/invalid stored id, setActiveTenant persists to localStorage, clearAuth clears persistence) in `packages/store/src/slices/__tests__/auth-slice.test.ts`

### App metadata writeback helper (FR-028a)

- [X] T048a Create `apps/api/src/modules/users/utils/sync-user-app-metadata.ts` exporting `syncUserAppMetadata(supabase, userId, patch: { tenant_ids?: string[] | "*"; tenant_id?: string | null; role?: Role })` — reads current `auth.users.raw_app_meta_data` via `supabase.auth.admin.getUserById(userId)`, merges the `patch` on top (does NOT drop unrelated fields), and writes back via `supabase.auth.admin.updateUserById(userId, { app_metadata: merged })`. Throws on any admin-API failure so callers surface it as 5xx per FR-028a. This helper is the single choke point used by `CreateTenantUseCase` (T092a), `UsersService.syncUserTenants` (T113), and the resident branch of `UsersRepository.create/update` to prevent silent drift between `user_tenants` and `raw_app_meta_data`.
- [X] T048b [P] Add Jest unit tests for `syncUserAppMetadata` (merge preserves `role` when only `tenant_ids` is patched; failure from `getUserById` or `updateUserById` throws; empty-array and wildcard `"*"` both accepted for `tenant_ids`) in `apps/api/src/modules/users/utils/sync-user-app-metadata.spec.ts`

### TenantAvatar primitive (@ramcar/ui)

- [X] T049 Create `packages/ui/src/components/tenant-avatar.tsx` — props `{ name, slug, imagePath?, size?: "sm" | "md" | "lg", className? }`; inline `hashToHsl(slug)` FNV-1a per research.md §R-8; render shadcn `<Avatar>` + `<AvatarImage src={composedPublicUrl} style={{ objectFit: "cover" }}>` + `<AvatarFallback style={{ backgroundColor: hashToHsl(slug) }}>{initials}</AvatarFallback>`; compose URL as `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tenant-images/${imagePath}` (framework-agnostic — env var available in both web and desktop via build-time injection)
- [X] T050 [P] Re-export `TenantAvatar` from `packages/ui/src/index.ts`
- [ ] T051 [P] Add Vitest tests for TenantAvatar (imagePath → img src composed; null → initials + deterministic color; same slug → same backgroundColor across renders; empty name → "?" fallback) in `packages/ui/src/components/__tests__/tenant-avatar.test.tsx`

**Checkpoint**: Foundation ready. `pnpm typecheck`, `pnpm test`, `pnpm --filter @ramcar/api test`, and `pnpm db:migrate:dev` all succeed. The `syncUserAppMetadata` helper (T048a) is available so US4 and US6 can call it from their mutation paths per FR-028a. User story work can now begin in parallel.

---

## Phase 3: User Story 1 — SuperAdmin creates a new tenant from the catalog (Priority: P1) 🎯 MVP

**Goal**: Ship the `/catalogs/tenants` page for SuperAdmin with list + Create sheet. The tenant appears in the table immediately on save. No `user_tenants` row is auto-inserted for SuperAdmin.

**Independent Test**: Sign in as SuperAdmin → navigate to `/catalogs/tenants` → Create Tenant → enter name + address → submit → verify row appears without page reload, persists across fresh load, and no `user_tenants` row is inserted for the SuperAdmin.

### Backend for User Story 1

- [X] T052 [US1] Create DTO re-exports: `apps/api/src/modules/tenants/dto/create-tenant.dto.ts`, `update-tenant.dto.ts`, `tenant-list-query.dto.ts`, `tenant-image.dto.ts` — each re-exports the corresponding schema + type from `@ramcar/shared`
- [X] T053 [US1] Rewrite `apps/api/src/modules/tenants/tenants.repository.ts` with scope-aware methods: `list(scope, query)` (applies `applyTenantScope`, search ILIKE on `name|address`, status filter, pagination), `findById(id, scope)`, `create(dto, actorId, slug)` (returns row), `update(id, dto, scope, actorRole)` (rejects Admin status change), `setImagePath(id, path | null)`; uses the service-role Supabase client from `apps/api/src/infrastructure/supabase/supabase.service.ts`
- [X] T054 [US1] Implement `apps/api/src/modules/tenants/tenants.service.ts` `list` and `create` methods: `list(scope, query)` delegates to repo; `create(dto, scope, actorId)` generates slug via new `apps/api/src/modules/tenants/utils/to-slug.ts` helper (FNV-based retry loop up to 5 attempts per research.md §R-17), delegates to `CreateTenantUseCase` (scaffolded in T075 for US4); `findById(id, scope)` delegates to repo
- [X] T055 [US1] Create `apps/api/src/modules/tenants/utils/to-slug.ts` with `toSlug(name)` (lowercase + NFKD + strip combining marks + non-alnum→`-` + collapse + trim) and `generateUniqueSlug(name, existsFn, attempts=5)` appending `-<4-hex>` on collision per research.md §R-17
- [X] T056 [US1] Implement `apps/api/src/modules/tenants/tenants.controller.ts` — add `@Get()` list endpoint (`@Roles("super_admin","admin")`, `@UsePipes(new ZodValidationPipe(tenantListQuerySchema))` on query, returns paginated response; for `scope=selector` returns the projection with `include_inactive` honored only for super_admin) and `@Get(":id")` single fetch; ensure `JwtAuthGuard`, `RolesGuard`, `TenantGuard` are registered at module level
- [X] T057 [US1] Register the controller providers in `apps/api/src/modules/tenants/tenants.module.ts`: controller, service, repository, `CreateTenantUseCase`; confirm module is imported by `AppModule`
- [ ] T058 [US1] [P] Add Jest unit tests for `TenantsService.list` (super_admin sees all; admin filters by scope; search trims; status filter honored) and `TenantsService.findById` (404 when out of scope) in `apps/api/src/modules/tenants/tenants.service.spec.ts`
- [ ] T059 [US1] [P] Add Jest unit tests for `to-slug.ts` (NFKD stripping, collapse, empty → `"tenant"`, unique retry with mocked exists) in `apps/api/src/modules/tenants/utils/to-slug.spec.ts`
- [ ] T060 [US1] [P] Add NestJS e2e test covering `GET /api/tenants` access matrix (super_admin 200 all, admin 200 scoped, guard 403, resident 403) in `apps/api/test/e2e/tenants.e2e-spec.ts`

### i18n for User Story 1

- [X] T061 [US1] Add keys to `packages/i18n/src/messages/en/tenants.json`: `nav.label`, `table.columns.{name,address,status,createdAt,actions}`, `table.emptyState`, `filters.{searchPlaceholder,statusAll,statusActive,statusInactive}`, `status.{active,inactive}`, `actions.create`, `toast.createSuccess`, `toast.loadFailed`, `sidebar.{createTitle,editTitle,description}`, `form.{name,nameRequired,address,addressRequired,status,statusLabel,submit,cancel}`, `validation.{nameRequired,nameTooLong,addressRequired,atLeastOneField}`
- [X] T062 [US1] Mirror all T061 keys in `packages/i18n/src/messages/es/tenants.json` with Spanish translations
- [X] T063 [US1] Add a "Tenants" nav entry in `apps/web/src/features/navigation/config/nav-items.ts` (or equivalent) under the Catalogs group with `roles: ["super_admin","admin"]` and `i18nKey: "tenants.nav.label"`; verify the sidebar renders it

### Frontend (web) for User Story 1

- [X] T064 [US1] Create `apps/web/src/features/tenants/types/index.ts` re-exporting `Tenant`, `TenantStatus`, `CreateTenantInput`, `UpdateTenantInput`, `TenantListQuery` from `@ramcar/shared`
- [X] T065 [US1] Create React Query hook `apps/web/src/features/tenants/hooks/use-tenants.ts` calling `GET /api/tenants` via the shared HTTP client; key `["tenants", activeTenantId, { search, status, page, pageSize }]`; uses `useAppStore((s) => s.activeTenantId)` so tenant switches invalidate correctly per research.md §R-13
- [X] T066 [US1] Create `apps/web/src/features/tenants/hooks/use-tenant.ts` — `GET /api/tenants/:id`; `enabled: Boolean(open && mode === "edit" && tenantId)` per FR-016
- [X] T067 [US1] Create `apps/web/src/features/tenants/hooks/use-create-tenant.ts` — mutation `POST /api/tenants`, on success invalidates `["tenants"]` query key
- [X] T068 [US1] Create `apps/web/src/features/tenants/components/tenants-table-columns.tsx` defining column configs (TenantAvatar + name, address, translated status badge via `tenant-status-badge.tsx`, localized created date, Actions with Edit button)
- [X] T069 [US1] Create `apps/web/src/features/tenants/components/tenant-status-badge.tsx` rendering a shadcn `Badge` with active/inactive translation
- [X] T070 [US1] Create `apps/web/src/features/tenants/components/tenants-table.tsx` — owns sidebarOpen/mode/selectedId state; uses `useTenants`; renders the existing shared DataTable component with the columns from T068; passes `useKeyboardNavigation({ disabled: sidebarOpen })`; wires the "Create Tenant" button to open the sidebar in create mode; wires row Edit action to open in edit mode with the tenant id
- [X] T071 [US1] Create `apps/web/src/features/tenants/components/tenant-form.tsx` — plain `useState` + per-field error object pattern matching the repo convention; fields `name`, `address`, `status` (toggle; defaults active; hidden/disabled for Admin per FR-015); validates via `createTenantSchema` / `updateTenantSchema` on submit; emits the parsed values
- [X] T072 [US1] Create `apps/web/src/features/tenants/components/tenant-sidebar.tsx` — wraps `TenantForm` inside a shadcn `Sheet` at `w-[400px] sm:w-[800px] sm:max-w-[800px] overflow-y-auto`; props `{ open, mode, tenantId?, onClose }`; uses `useTenant` gated by the FR-016 pattern; on success closes the sheet, invalidates `["tenants"]`, fires translated success toast
- [X] T073 [US1] Create `apps/web/src/app/[locale]/(dashboard)/catalogs/tenants/page.tsx` — server component that reads the locale, renders a client `<TenantsTable />`; no business logic per the App Router rule
- [ ] T074 [US1] [P] Add Vitest + RTL tests for `TenantsTable` (renders columns, opens sidebar, disables keyboard nav when open) and `TenantForm` (validation errors surface, submit calls onSubmit with parsed values) in `apps/web/src/features/tenants/components/__tests__/`

**Checkpoint**: SuperAdmin can sign in, open `/catalogs/tenants`, see the list, open Create, submit with valid values, and see the new row without reload. Scenario 1 in quickstart.md passes.

---

## Phase 4: User Story 2 — Admin and Guard users can be assigned to multiple tenants (Priority: P1)

**Goal**: Multi-tenant JWT claim + array-aware API scoping + the breaking RLS rewrites are live end-to-end. Verified via JWT inspection and cross-tenant 403 checks.

**Independent Test**: Apply migration → link a guard to two tenants via `user_tenants` → sign them in → decode JWT → assert `tenant_ids` is a two-UUID array; call list endpoints without `tenant_id` → receive merged rows from both tenants only; call with explicit unassigned `tenant_id = C` → 403.

> Most of US2's code lands in Phase 2 (auth hook, RLS rewrites, `@CurrentTenant` cutover). This phase verifies the end-to-end behavior via tests and a lightweight migration-diff check.

- [ ] T075 [US2] [P] Add NestJS e2e test covering cross-tenant 403 on representative tenant-scoped endpoints (`/api/residents`, `/api/access-events`, `/api/visit-persons`, `/api/vehicles`) when the caller sends `tenant_id = <unassigned>`; validates the generic `TenantGuard` enforcement in `apps/api/test/e2e/tenant-scope.e2e-spec.ts`
- [ ] T076 [US2] [P] Add a Jest integration test that signs in as each seeded role (super_admin, admin-with-2-tenants, guard-with-2-tenants, resident) and asserts decoded JWT `app_metadata.tenant_ids` shape matches data-model.md §2 in `apps/api/test/integration/auth-token-claims.e2e-spec.ts`
- [ ] T077 [US2] [P] Add a pgTAP / Supabase-SQL integration script `apps/api/test/integration/rls-tenants.sql` that, for each rewritten table (`tenants`, `profiles`, `vehicles`, `access_events`, `visit_persons`, `visit_person_images`, `user_tenants`), signs in as a multi-tenant admin and asserts the visible row set is the union of their assigned tenants with zero leak from a third tenant (SC-003)
- [ ] T078 [US2] Add migration-parity assertion to the migration test plan from research.md §R-19: update `supabase/seed.sql` with one super_admin, one admin (2 tenants), one guard (2 tenants), one resident, and 3 tenants (`los-robles`, `san-pedro`, `valle-verde`) so all downstream tests use a known fixture
- [ ] T079 [US2] Document the 24h legacy-JWT fallback window in `specs/020-tenants-catalog/quickstart.md` Troubleshooting (add a row: "`tenant_ids` absent → sign out/in or wait for TTL; fallback is logged once per user id") — this has already been implemented in T031; tests confirm it

**Checkpoint**: Migration passes integrity checks. Guard with two tenants signs in; their JWT carries `tenant_ids = [uuid, uuid]`. Cross-tenant calls are denied. Scenario 2 in quickstart.md passes.

---

## Phase 5: User Story 3 — Tenant selector in the TopBar for multi-tenant users (Priority: P1)

**Goal**: A multi-tenant user sees a TopBar selector listing their tenants. Picking a tenant updates the Zustand `activeTenantId`, invalidates React Query, and re-renders the visible page without a URL change. `activeTenantId` persists across reloads.

**Independent Test**: Sign in as a 3-tenant user → confirm selector renders with active tenant → open dropdown, search, pick a tenant → verify Zustand + React Query invalidation + no URL change; reload and confirm selection persists.

### Shared feature module (`packages/features/src/tenant-selector/`)

- [ ] T080 [US3] Create `packages/features/src/tenant-selector/hooks/use-tenant-list.ts` — calls the injected transport adapter (spec 014 pattern) for `GET /api/tenants?scope=selector&include_inactive=${role === "super_admin"}&page_size=100`; returns `TenantSelectorProjection[]`; react-query key `["tenants","selector",role]`
- [ ] T081 [US3] Create `packages/features/src/tenant-selector/components/tenant-selector-trigger.tsx` — renders `TenantAvatar` (from `@ramcar/ui`) + `activeTenantName` + `ChevronsUpDown` icon; consumes `useAppStore` via an injected selector adapter to read `activeTenantId`/`activeTenantName`
- [ ] T082 [US3] Create `packages/features/src/tenant-selector/components/tenant-selector.tsx` — shadcn `Popover` + `Command` combobox; uses `useTenantList`; shows each tenant as `TenantAvatar` + name + (optional "Inactive" badge for super_admin); marks active with a checkmark; on select: calls `setActiveTenant(id, name)` (from injected Zustand actions), then `queryClient.invalidateQueries()` (no predicate per research.md §R-13), then closes the popover; renders `null` when `tenantIds.length < 2` per FR-043
- [ ] T083 [US3] Create `packages/features/src/tenant-selector/index.ts` exporting `TenantSelector`, `TenantSelectorTrigger`, and any adapter-type interfaces; ensure no `next/*` imports and no `"use client";` directives (per spec 014 shared-feature rules)
- [ ] T084 [US3] Add an adapter interface definition `packages/features/src/adapters/tenant-selector-adapters.ts` (transport + i18n + auth-store ports); ensures the shared module doesn't import concrete `next-intl` or `react-i18next` packages
- [ ] T085 [US3] [P] Add Vitest + RTL tests for `TenantSelector` (renders null with 1 tenant; filters by search; selection commits to adapter; active tenant has checkmark) in `packages/features/src/tenant-selector/__tests__/tenant-selector.test.tsx`

### Web host wiring (`apps/web`)

- [ ] T086 [US3] Inject the tenant-selector adapter set in `apps/web/src/shared/lib/features/tenant-selector/index.ts` — transport (HTTP via existing `apiClient`), auth store (Zustand), i18n (next-intl `useTranslations("tenants")`); re-export `<TenantSelector />` with adapters pre-wired for `apps/web`
- [ ] T087 [US3] Render `<TenantSelector />` in `apps/web/src/features/navigation/components/top-bar.tsx` between the tenant name display and the theme toggle per FR-042
- [ ] T088 [US3] Wire `setActiveTenant` to also invalidate the TanStack Query client in the same callback via a `queryClient` reference provided by the web adapter (since Zustand actions can't access the query client directly)

### Desktop host wiring (`apps/desktop`)

- [ ] T089 [US3] Inject the tenant-selector adapter set in `apps/desktop/src/shared/lib/features/tenant-selector/index.ts` — transport (online HTTP only per plan — desktop doesn't use outbox for reads), auth store (Zustand), i18n (react-i18next `useTranslation("tenants")`); re-export `<TenantSelector />` with adapters pre-wired
- [ ] T090 [US3] Render `<TenantSelector />` in `apps/desktop/src/features/navigation/components/top-bar.tsx` between the tenant name display and the theme toggle
- [ ] T091 [US3] [P] Add a desktop-specific Vitest test confirming the adapter wiring compiles and the component renders against a mocked Zustand store in `apps/desktop/src/shared/lib/features/tenant-selector/__tests__/adapter.test.tsx`

**Checkpoint**: Multi-tenant user sees the selector on both web and desktop; picking a tenant updates state + invalidates queries; single-tenant users and residents see no selector. Scenario 3 + Scenario 9 in quickstart.md pass.

---

## Phase 6: User Story 4 — Admin creates a tenant and is auto-assigned to it (Priority: P1)

**Goal**: Admin creates a tenant via the catalog and is immediately linked via a `user_tenants` row. After token refresh the TopBar selector includes the new tenant. SuperAdmin creates remain un-linked.

**Independent Test**: Sign in as Admin (1 tenant) → navigate to `/catalogs/tenants` (list shows only their 1 tenant) → Create Tenant → verify tenant row + `user_tenants` row with `assigned_by = admin id` + selector visible after token refresh.

### Backend for User Story 4

- [X] T092 [US4] Create `apps/api/src/modules/tenants/use-cases/create-tenant.use-case.ts` wrapping `TenantsService` — accepts `(dto, scope, actorId, actorRole)`; generates unique slug; calls repo `create` inside a Supabase transaction (or a two-step with rollback on failure) that also inserts a `user_tenants` row iff `actorRole === "admin"`, using `assigned_by = actorId`; adds the literal code comment `// TODO: enforce tenant limit per admin based on subscription tier` above the admin branch per FR-013
- [X] T092a [US4] Extend `CreateTenantUseCase.execute` (`apps/api/src/modules/tenants/use-cases/create-tenant.use-case.ts`) to satisfy FR-028a: after inserting the admin's `user_tenants` row, re-read the admin's full assigned set from `user_tenants` (or compute `[...previous, tenant.id]` from the known prior set), then call `supabase.auth.admin.updateUserById(actorId, { app_metadata: { tenant_ids: <new-array> } })` via `SupabaseService.getClient().auth.admin`. Preserve any other existing `app_metadata` fields (`role`, `tenant_id`) — use a read-merge-write pattern. If the `updateUserById` call fails after the `user_tenants` insert succeeds, surface the failure (throw/5xx) so the caller retries; do not swallow the error. Super_admin branch is a no-op (no `user_tenants` row, no writeback). Applies to FR-028a paths (a).
- [X] T093 [US4] Wire `TenantsService.create` to delegate to `CreateTenantUseCase`; controller `@Post()` handler calls the service (no business logic in the controller) — registered roles `super_admin`, `admin`
- [X] T094 [US4] [P] Add Jest unit test for `CreateTenantUseCase` — super_admin branch creates no `user_tenants` row AND does not call `auth.admin.updateUserById`; admin branch creates exactly one `user_tenants` row AND calls `auth.admin.updateUserById` with `{ app_metadata: { tenant_ids: [...previous, newId] } }` (assert mock was called with the merged array, not a replacement that drops prior fields); writeback failure after row insert surfaces the error (no silent drift per FR-028a); slug-collision retry; failure rolls back tenant insert in `apps/api/src/modules/tenants/use-cases/create-tenant.use-case.spec.ts`
- [ ] T095 [US4] [P] Extend the NestJS e2e from T060 to cover `POST /api/tenants` admin auto-assignment: admin creates → 201 + assert `user_tenants` row exists with `assigned_by` + assert the admin's `auth.users.raw_app_meta_data.tenant_ids` (read via `supabase.auth.admin.getUserById`) now includes the new tenant id per FR-028a; in `apps/api/test/e2e/tenants.e2e-spec.ts`

### Frontend for User Story 4

- [X] T096 [US4] Update `apps/web/src/features/tenants/components/tenant-sidebar.tsx` on-success handler to show a translated info toast `tenants.toast.adminCreateInfo` ("This tenant will appear in your selector after the next token refresh") when `user.role === "admin"` per Assumption "Token refresh after Admin creates a new tenant" and the optional UX hint
- [X] T097 [US4] Add the `tenants.toast.adminCreateInfo` key to `packages/i18n/src/messages/{en,es}/tenants.json`

**Checkpoint**: Admin creates a tenant; DB shows tenant + `user_tenants` row; selector shows the new tenant after next token refresh. Scenario 4 in quickstart.md passes.

---

## Phase 7: User Story 5 — Edit a tenant (Priority: P2)

**Goal**: SuperAdmin and assigned Admin can edit name/address; only SuperAdmin may change `status`. The image upload/remove/replace flow lands here. The same Sheet handles create and edit.

**Independent Test**: Sign in as SuperAdmin → Edit an existing tenant → change address → save → verify update persists and table reflects the change without reload. Repeat for image upload/remove/replace; verify frontend + API + bucket MIME/size enforcement.

### Backend for User Story 5

- [X] T098 [US5] Implement `TenantsService.update(id, dto, scope, actorRole)` — delegates to repo; if `actorRole === "admin"` and `dto.status` is present, throws `ForbiddenException` per FR-015; if `actorRole === "super_admin"`, passes through; `apps/api/src/modules/tenants/tenants.service.ts`
- [X] T099 [US5] Add `@Patch(":id")` endpoint to `apps/api/src/modules/tenants/tenants.controller.ts` — `@Roles("super_admin","admin")`, `TenantGuard` validates `:id` against scope, `@UsePipes(new ZodValidationPipe(updateTenantSchema))`
- [X] T100 [US5] Create `apps/api/src/modules/tenants/use-cases/upload-tenant-image.use-case.ts` — receives `(tenantId, file: Express.Multer.File, scope, actorId)`; validates MIME (jpeg/png/webp) and size (≤ 2 MiB) defensively (FR-035c/d); generates object path `tenants/${tenantId}/${iso-ts}-${6-hex}.${ext}`; deletes previous image best-effort (orphans ok per R-20); uploads via service-role `supabaseService.storage.from("tenant-images").upload(...)`; updates `tenants.image_path`; returns refreshed row
- [X] T101 [US5] Create `apps/api/src/modules/tenants/use-cases/delete-tenant-image.use-case.ts` — receives `(tenantId, scope)`; best-effort removes the current object; sets `image_path = null`; returns refreshed row
- [X] T102 [US5] Add `@Post(":id/image")` with `@UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: acceptImageMimes }))` and `@Delete(":id/image")` to `apps/api/src/modules/tenants/tenants.controller.ts`; both gated by `TenantGuard` against `:id` per FR-015a
- [X] T103 [US5] Add a reusable `acceptImageMimes(req, file, cb)` helper in `apps/api/src/modules/tenants/utils/accept-image-mimes.ts` matching `TENANT_IMAGE_ALLOWED_MIME`; reject with `UnsupportedMediaTypeException` (415)
- [X] T104 [US5] Register the new use cases in `apps/api/src/modules/tenants/tenants.module.ts`
- [ ] T105 [US5] [P] Add Jest unit tests for `UploadTenantImageUseCase` (happy path; oversize rejected; wrong MIME rejected; previous object removed best-effort) and `DeleteTenantImageUseCase` in `apps/api/src/modules/tenants/use-cases/`
- [ ] T106 [US5] [P] Extend the NestJS e2e from T060 with PATCH (admin-in-scope 200, admin-out-of-scope 403, admin-status-change 403, super_admin status change 200) and image upload/delete matrices in `apps/api/test/e2e/tenants.e2e-spec.ts`

### Frontend for User Story 5

- [X] T107 [US5] Create `apps/web/src/features/tenants/hooks/use-update-tenant.ts`, `use-upload-tenant-image.ts`, `use-delete-tenant-image.ts` React Query mutations, each invalidating `["tenants"]` and the single-tenant cache on success
- [X] T108 [US5] Create `apps/web/src/features/tenants/components/tenant-image-upload.tsx` — file input (`accept="image/jpeg,image/png,image/webp"`); inline live preview via `URL.createObjectURL`; pre-check MIME + size via `tenantImageFileSchema` with translated toasts on failure; Remove / Replace actions; does not perform the network request directly — emits events the sidebar plumbs to `useUploadTenantImage` / `useDeleteTenantImage` on save per FR-011b (no uploads until parent form saves)
- [X] T109 [US5] Extend `apps/web/src/features/tenants/components/tenant-form.tsx` to include the `TenantImageUpload` control and thread the pending image state (new File | "remove" | "unchanged") up to the sidebar; expose Status toggle only when `user.role === "super_admin"`
- [X] T110 [US5] Extend `apps/web/src/features/tenants/components/tenant-sidebar.tsx` edit-mode save flow: first PATCH tenant JSON; then POST image or DELETE image if the user staged an image change; invalidate list + single-tenant queries; close on success
- [X] T111 [US5] Add image-related i18n keys to `packages/i18n/src/messages/{en,es}/tenants.json`: `form.image.{label,upload,replace,remove,currentLabel}`, `validation.{imageTooLarge,imageWrongType}`, `toast.{imageUpdateSuccess,imageRemoveSuccess,imageUploadFailed}`
- [ ] T112 [US5] [P] Add Vitest + RTL tests for `TenantImageUpload` (preview updates on select; oversize file shows translated error and no upload; wrong MIME rejected; Remove clears pending state) in `apps/web/src/features/tenants/components/__tests__/tenant-image-upload.test.tsx`

**Checkpoint**: Edit flow works end-to-end for SuperAdmin and assigned Admin. Image upload/remove/replace behaves per FR-011. Scenario 5 in quickstart.md passes.

---

## Phase 8: User Story 6 — Creating an Admin or Guard user with multi-tenant assignment (Priority: P2)

**Goal**: Users form's tenant field is a multi-select combobox for admin/guard roles with a primary marker; single dropdown remains for residents. On submit the API syncs `user_tenants` rows and sets `profiles.tenant_id = primary`.

**Independent Test**: Sign in as SuperAdmin → Users catalog → Create guard → pick three tenants → mark one as primary → save → verify 3 `user_tenants` rows and `profiles.tenant_id = primary`; edit the same user, remove a tenant, save → verify the row is gone.

### Backend for User Story 6

- [ ] T113 [US6] Add `UsersService.syncUserTenants(userId, tenantIds, primaryTenantId, actorScope, actorId)` — asserts `role !== "resident"` (throws); if `actorScope.scope === "list"` asserts every `tenantIds[i]` is in `actorScope.tenantIds` (403 per FR-055); in a transaction: `UPDATE profiles SET tenant_id = $primary WHERE user_id = $userId`, `DELETE FROM user_tenants WHERE user_id = $userId AND tenant_id NOT IN ($tenantIds)`, `INSERT INTO user_tenants (user_id, tenant_id, assigned_by = $actorId) VALUES ... ON CONFLICT DO NOTHING`; **then per FR-028a** call `supabase.auth.admin.updateUserById(userId, { app_metadata: { tenant_ids: <finalSet>, tenant_id: $primary } })` merged with existing `app_metadata` (read-merge-write to preserve `role`); failure of `updateUserById` after DB writes MUST surface (no silent drift); in `apps/api/src/modules/users/users.service.ts`. Applies to FR-028a paths (c).
- [ ] T114 [US6] Update `UsersService.create` and `update` to call `syncUserTenants` on the admin/guard branches of the `createUserSchema`/`updateUserSchema` discriminated union; reject `role='admin'` creation when `actor.role !== 'super_admin'` per FR-056. On `create`, `syncUserTenants` is invoked AFTER `UsersRepository.create` (which already calls `auth.admin.createUser` with `app_metadata.tenant_ids`); verify the post-create sync writes the final set a second time if `user_tenants` inserts succeeded — this guarantees FR-028a path (b) even when the repo-level write and the service-level sync diverge. Resident branch is unchanged (single tenant via `profiles.tenant_id`, no `user_tenants`); FR-028a writeback for residents (path: `tenant_ids = [profile.tenant_id]` one-element array) MUST be applied inside the existing `auth.admin.createUser` / `updateUserById` calls in `UsersRepository.create/update`.
- [ ] T115 [US6] Update `UsersController` POST/PATCH handlers to apply the new discriminated Zod schemas via `ZodValidationPipe` and forward actor info to the service
- [ ] T116 [US6] [P] Add Jest unit tests for `UsersService.syncUserTenants` (admin out-of-scope → 403; residents refused; diff insert+delete; primary sets profile tenant_id; actor-not-super_admin-creating-admin rejected; **FR-028a: `auth.admin.updateUserById` mock called with the full final `tenant_ids` array after each mutation, merging not replacing other app_metadata fields; `updateUserById` failure after DB write propagates as 5xx**) in `apps/api/src/modules/users/users.service.spec.ts`
- [ ] T117 [US6] [P] Extend NestJS e2e with multi-tenant user create/update scenarios (super_admin 3-tenant create; admin constrained to own tenants; primary-must-be-in-set 422; admin-creating-admin 403). For each successful create/update, assert via `supabase.auth.admin.getUserById(createdUserId)` that `raw_app_meta_data.tenant_ids` matches the final `user_tenants` set per FR-028a — including on edits that remove a tenant (the array shrinks). In `apps/api/test/e2e/users.e2e-spec.ts`

### Frontend for User Story 6

- [ ] T118 [US6] Extend `apps/web/src/features/users/components/user-form.tsx` — when the selected role is `admin` or `guard`, render a multi-select combobox reusing the resident-selector pattern from spec 018 (searchable combobox, chips for selected, radio per chip for primary); when role is `resident`, keep the single dropdown
- [ ] T119 [US6] Create `apps/web/src/features/users/components/tenant-multi-select.tsx` — props `{ value: string[], primary: string, onChange, options: Tenant[], disabled? }`; renders chips with a "primary" radio; filters options by actor scope at render (Admin sees only their own tenants per FR-055)
- [ ] T120 [US6] Update `apps/web/src/features/users/hooks/use-create-user.ts` and `use-update-user.ts` to send `tenant_ids` + `primary_tenant_id` for admin/guard payloads (discriminated by role)
- [ ] T121 [US6] Remove the legacy `apps/web/src/features/users/hooks/use-tenants.ts` (if present per plan.md §Project Structure) and point the form to `@/features/tenants/hooks/use-tenants` — the one tenant-list source for the whole app
- [ ] T122 [US6] Hide the `admin` role option for non-super_admin users in `apps/web/src/features/users/components/user-form.tsx` per FR-056
- [ ] T123 [US6] Add i18n keys to `packages/i18n/src/messages/{en,es}/users.json`: `form.tenant.multiLabel`, `form.tenant.primaryLabel`, `form.tenant.setPrimary`, `validation.atLeastOneTenant`, `validation.primaryMustBeSelected`, `validation.tooManyTenants`
- [ ] T124 [US6] [P] Add Vitest + RTL tests for `TenantMultiSelect` (chips render selected; primary radio changes primary; Admin-scoped options filtered; zero selected shows error) in `apps/web/src/features/users/components/__tests__/tenant-multi-select.test.tsx`

**Checkpoint**: User form supports multi-tenant admin/guard creation with primary designation. All validations (zero-tenants, primary-not-in-set, admin-by-admin) enforced at UI + API. Scenario 2 setup step in quickstart.md passes.

---

## Phase 9: User Story 7 — Role-based access control for the catalog (Priority: P2)

**Goal**: Guard and Resident never see the Tenants menu entry, are redirected away from `/catalogs/tenants`, and receive 403 on direct API calls. SuperAdmin sees all tenants; Admin sees only their assigned tenants.

**Independent Test**: Sign in as Guard → no "Tenants" nav entry → navigate to `/catalogs/tenants` → redirect/403 → `curl /api/tenants` with their token → 403. Repeat for Resident.

- [ ] T125 [US7] Verify the Tenants nav entry added in T063 has `roles: ["super_admin","admin"]` and the nav registry filters by role before render; if the registry doesn't already role-filter, add that filter in `apps/web/src/features/navigation/components/sidebar-nav.tsx` (or equivalent)
- [ ] T126 [US7] Create a route guard for `apps/web/src/app/[locale]/(dashboard)/catalogs/tenants/page.tsx` — when `user.role` is `guard` or `resident`, redirect server-side to the user's default landing (`/es/dashboard` or `/en/dashboard`) per FR-001; return a translated 403 page if a redirect target cannot be resolved
- [ ] T127 [US7] Confirm `apps/api/src/modules/tenants/tenants.controller.ts` `@Roles("super_admin","admin")` is present on every handler (list, get, create, update, image upload/delete) so Guard/Resident direct calls return 403; confirmed by T060/T106 access-matrix e2e tests
- [ ] T128 [US7] [P] Add a Playwright test `e2e/tenants-role-gating.spec.ts` in `apps/web/e2e/` (if Playwright project is configured there) validating Guard and Resident redirect flows

**Checkpoint**: Role gating works at nav, route, and API layers. Scenario 6 in quickstart.md passes.

---

## Phase 10: User Story 8 — Search and filter tenants in the catalog (Priority: P3)

**Goal**: The catalog table supports server-side search (name + address substring, 300 ms debounce) and status filter (Active / Inactive / All, default Active). Filter change resets pagination to page 1.

**Independent Test**: Type partial name into the search input → after 300 ms the table re-queries and shows only matching rows. Change status filter to Inactive → only inactive rows visible.

- [X] T129 [US8] Create `apps/web/src/features/tenants/components/tenant-filters.tsx` — debounced search input (300 ms) + status select (Active / Inactive / All, default Active); emits `{ search, status }` to the table; reuses the debounce hook already in `apps/web/src/shared/hooks/` if present, else add a local one
- [X] T130 [US8] Wire `TenantFilters` into `apps/web/src/features/tenants/components/tenants-table.tsx` — filter state owned by the table; on change reset `page = 1`; pass into `useTenants`
- [X] T131 [US8] Confirm `apps/api/src/modules/tenants/tenants.repository.ts` already handles `search` (ILIKE on `name` and `address`) and `status` (in / != / no-op) from `tenantListQuerySchema`; add missing behavior if the T053 implementation skipped it
- [ ] T132 [US8] [P] Add Vitest test for `TenantFilters` (debounce fires after 300 ms only; clearing search removes filter; status change resets page) in `apps/web/src/features/tenants/components/__tests__/tenant-filters.test.tsx`
- [ ] T133 [US8] [P] Extend `TenantsService.spec.ts` (T058) with search/status coverage assertions to lock the API behavior

**Checkpoint**: Search and filter behave per FR-007/FR-008. Scenario 7 in quickstart.md passes.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story hardening: translation audit, performance smoke, Playwright happy-path, and cleanup.

- [ ] T134 [P] Playwright e2e `apps/web/e2e/tenants-happy-path.spec.ts` covering Scenario 1 → Scenario 4 (SuperAdmin create → Admin create + auto-assign → selector switch → verify scope change)
- [ ] T135 [P] Performance smoke: record a console.time around the catalog default-view render and the tenant switch; assert p95 < 1s over 10 repetitions per FR-058/FR-059; script in `apps/web/e2e/tenants-perf-smoke.spec.ts`
- [ ] T136 [P] Run the pgTAP/Supabase-SQL RLS isolation script from T077 against a reset local DB and record output in `specs/020-tenants-catalog/quickstart.md` Scenario 8 troubleshooting
- [ ] T137 [P] Translation audit — toggle `/es` ↔ `/en` for every new surface (catalog list, sidebar, form, filters, selector, user form multi-select, toast messages, error messages) and log any untranslated strings; fix in `packages/i18n/src/messages/{en,es}/{tenants,users}.json` until SC-006 holds
- [ ] T138 [P] Run `pnpm check:shared-features` to confirm the new `packages/features/src/tenant-selector/` module complies with the shared-feature-module rules (no `next/*`, no `"use client";`, no `window.electron`, locale strings routed through `@ramcar/i18n`)
- [ ] T139 [P] Regression audit for existing tenant-scoped features (Logbook, Access Log, Users catalog, Visitors/Providers, Vehicles) on a seeded resident account; verify row counts are unchanged vs. a pre-migration baseline per SC-008
- [ ] T139a [P] FR-028a parity audit — script iterates every non-resident profile and asserts `auth.users.raw_app_meta_data.tenant_ids` matches the `user_tenants` set (for super_admin: literal `"*"`; for admin/guard: the sorted UUID array). Runs against the seeded DB from T078 and also as a repeatable diagnostic in `apps/api/test/integration/app-metadata-parity.sql` (or a TS equivalent that uses the admin API). Fails if any drift is observed between the two sources, proving FR-028a's no-silent-drift guarantee.
- [ ] T140 Update `CLAUDE.md` Active Technologies + Recent Changes sections with a new entry `- 020-tenants-catalog: tenants catalog + user_tenants + TenantSelector + tenant-images public-read bucket + @CurrentTenant scope union + RLS rewrites across 7 tables`
- [ ] T141 Run `pnpm build && pnpm lint && pnpm typecheck && pnpm test` across the monorepo; fix any residual type/lint/test errors
- [ ] T142 Walk the quickstart.md scenarios end-to-end in a local environment; check off each acceptance scenario and success criterion (SC-001 through SC-009)
- [ ] T143 Write the `CHANGELOG` / release notes entry highlighting the breaking `@CurrentTenant` contract change, the 24h legacy-JWT fallback window, and the new endpoints

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 Setup** → no dependencies, start immediately
- **Phase 2 Foundational** → depends on Phase 1; BLOCKS every user-story phase
- **Phase 3 US1** → depends on Phase 2; delivers the MVP (SuperAdmin create + list)
- **Phase 4 US2** → depends on Phase 2 (all functional code lands in Phase 2; this phase is verification)
- **Phase 5 US3** → depends on Phase 2; independent of Phase 3/4 code
- **Phase 6 US4** → depends on Phase 3 (shares `TenantsService.create`), Phase 2 foundation, and T048a (`syncUserAppMetadata` helper for FR-028a writeback in `CreateTenantUseCase`)
- **Phase 7 US5** → depends on Phase 3 (shares the controller/sidebar/hook shells)
- **Phase 8 US6** → depends on Phase 2 (users module migrated to scope, `syncUserAppMetadata` helper for FR-028a), and Phase 3 (`useTenants` hook for combobox options)
- **Phase 9 US7** → depends on Phase 3 (catalog page must exist before redirect guard is meaningful)
- **Phase 10 US8** → depends on Phase 3 (extends the catalog filters)
- **Phase 11 Polish** → depends on all desired user-story phases

### Within the Foundational phase (Phase 2)

- T009–T021 are sequential (all touch the same migration file)
- T022 depends on T009–T021 (runs migration and regenerates types)
- T023–T026 (shared Zod) can run in parallel, then T027 extends user Zod
- T028–T029 (schema tests) can run in parallel with T023–T026
- T030–T032 (decorator + guard + utils) are sequential (same three files, co-dependent)
- T033–T042 (API module migrations + call-site cleanup) depend on T030–T032 — within this group T035/T036, T037, T038, T039, T040 touch different modules and CAN parallelize
- T043–T048 (auth slice + wiring + tests) depend on T022 (types) — T046 and T047 touch different apps and can parallelize
- T048a–T048b (app-metadata writeback helper for FR-028a) depend on T042 (API cutover compiles); consumed by T092a, T113, and the resident branch of T114
- T049–T051 (TenantAvatar) depend on T022 (types only); fully parallelizable with the API work

### Within each user-story phase

- Tests written alongside implementation (plan mandates tests, not strict TDD — write them "before or concurrently" at author's discretion)
- Repository → Service → Use-Case → Controller on the API side
- Hooks → Form → Sidebar → Page on the Web side
- Shared feature module authored before host-app wiring (Phase 5)

### Parallel opportunities

- All Setup tasks T002–T008 marked [P]
- Within Phase 2: T023–T027 (shared Zod), T033/T037/T038/T039/T040 (module migrations), T046/T047 (per-app auth wiring), T049/T050/T051 (TenantAvatar) — all [P]
- Within US1: T058, T059, T060 tests [P]; frontend hooks T065/T066/T067 [P]; components T068/T069 [P]
- Within US3: T080/T081/T082 can parallelize across files; T086/T089 (adapter wiring) parallelize per-app; T085/T091 tests [P]
- Polish Phase 11: T134–T139 all [P] (different files/surfaces)
- Different user-story phases (US1–US8) can be staffed to different engineers after Phase 2 completes

---

## Parallel Example: Foundational Phase

```bash
# After T022 (types regenerated), launch these in parallel:
Task: "Create @ramcar/shared/validators/tenant.ts (T023)"
Task: "Create @ramcar/shared/types/tenant.ts (T024)"
Task: "Create @ramcar/shared/types/user-tenant.ts (T025)"
Task: "Add Zod tests (T028)"
Task: "Create TenantAvatar primitive (T049)"

# After T030–T032 (scope utils), launch in parallel across modules:
Task: "Migrate users module to TenantScope (T035+T036)"
Task: "Migrate residents module to TenantScope (T037)"
Task: "Migrate vehicles module to TenantScope (T038)"
Task: "Migrate visit-persons module to TenantScope (T039)"
Task: "Migrate access-events module to TenantScope (T040)"
```

## Parallel Example: User Story 1

```bash
# After T054 (service) lands, launch tests in parallel:
Task: "Jest tests for TenantsService (T058)"
Task: "Jest tests for to-slug utility (T059)"
Task: "NestJS e2e for /api/tenants (T060)"

# Launch i18n files in parallel:
Task: "Add en/tenants.json keys (T061)"
Task: "Add es/tenants.json keys (T062)"

# Launch form/table components in parallel:
Task: "TenantStatusBadge (T069)"
Task: "TenantsTableColumns (T068)"
Task: "Vitest tests for TenantsTable + TenantForm (T074)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete **Phase 1 Setup**
2. Complete **Phase 2 Foundational** (the single biggest chunk — migration + `@CurrentTenant` cutover + Zustand slice + TenantAvatar)
3. Complete **Phase 3 US1** — SuperAdmin can create and list tenants
4. **STOP and VALIDATE**: Run Scenario 1 of quickstart.md end-to-end
5. Deploy/demo if acceptable; defer US2–US8 to incremental releases

### Incremental delivery

1. Setup + Foundational → foundation in place (the hardest step; all RLS + JWT + decorator breakage resolved)
2. US1 → MVP (SuperAdmin create + list) → deploy
3. US2 + US3 → multi-tenant scoping + TopBar selector → deploy (unlocks the core value prop)
4. US4 → Admin self-service create → deploy
5. US5 → Edit + image → deploy
6. US6 → Users form multi-tenant → deploy
7. US7 → Role gating polish → deploy
8. US8 → Search/filter → deploy
9. Phase 11 polish → final pass, docs, regression audit

### Parallel team strategy

With 3 engineers after Phase 2 completes:

- Engineer A: US1 (MVP catalog) → US5 (Edit + image) → US8 (Search/filter)
- Engineer B: US3 (TopBar selector — both host apps) → US6 (Users multi-select)
- Engineer C: US2 verification + US4 (Admin auto-assignment) + US7 (Role gating + Playwright) + Phase 11 polish

US1 blocks US5, US7, US8 (shared page/components). US3 and US6 are independent once the shared Zod + auth slice foundations are in place.

---

## Notes

- Tests are included per plan.md — Jest unit + NestJS e2e for the API, pgTAP/SQL for RLS, Vitest + RTL for the frontend, Playwright for the happy path, and Zod tests in shared. The spec's SC-003/SC-004 specifically require the RLS and migration-parity checks.
- The `@CurrentTenant()` contract change is a **breaking cutover**. Every call site must be migrated in the same PR (see T041). No shim is planned.
- The 24h legacy-JWT fallback (T031) is a rollout-window safety net; a follow-up PR (not in this feature's scope) removes it per R-12.
- The `tenant-images` bucket is public-read. Writes go through the NestJS API only (Constitution Principle VIII). The bucket's MIME + size policy is defense in depth, not the primary enforcement.
- FR-028a requires every `user_tenants` mutation to also mirror the updated set into `auth.users.raw_app_meta_data.tenant_ids` via `supabase.auth.admin.updateUserById`. The `custom_access_token_hook` remains authoritative at token issue — the writeback is a lockstep guarantee (defense in depth + observability), not a replacement for the hook. Any `updateUserById` failure after a successful DB write MUST propagate as 5xx so no silent drift is possible. The single choke point is the `syncUserAppMetadata` helper (T048a).
- The catalog itself lives only in `apps/web` — it's explicitly single-app per plan.md §Structure Decision. Only the `TenantSelector` is shared via `@ramcar/features`.
- The `// TODO: enforce tenant limit per admin based on subscription tier` comment is non-negotiable per FR-013 — it must be present in source, not a runtime check.
- Commit cadence: commit after each logical group (e.g., after T022 types regenerated; after T042 API cutover passes; after T051 primitive + tests). Per CLAUDE.md, do not commit or push unless the user explicitly asks.
