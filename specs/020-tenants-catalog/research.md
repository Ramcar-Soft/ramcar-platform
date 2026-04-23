# Phase 0 Research — 020-tenants-catalog

**Purpose**: Resolve every open decision flagged in `spec.md` (Assumptions and Clarifications sections) and pre-select the libraries, package placements, and migration shapes needed to unblock Phase 1 design.

All spec-level NEEDS CLARIFICATION markers were addressed during the clarify session on 2026-04-22 (see `spec.md §Clarifications`). The remaining decisions below are **plan-phase choices** that the spec deferred to implementation.

---

## R-1 — `@CurrentTenant()` new return shape

**Decision**: The decorator returns a discriminated union:

```ts
type TenantScope =
  | { readonly role: "super_admin"; readonly scope: "all" }
  | { readonly role: "admin" | "guard"; readonly scope: "list"; readonly tenantIds: readonly string[] }
  | { readonly role: "resident"; readonly scope: "single"; readonly tenantId: string };
```

The `TenantGuard` populates `request.tenantScope` on every authenticated request (from the JWT claims `role` + `tenant_ids`) and `@CurrentTenant()` reads that. The decorator no longer returns a bare string — this is a **breaking change** to the decorator's TS contract, matching spec Assumption "`@CurrentTenant()` return shape changes".

**Rationale**: A discriminated union forces every existing call site to destructure on `scope` (compile error if not handled). This is the safest fence against an accidentally-unscoped query surviving the migration. Returning a single type that always carries an array (e.g., `string[]`) would type-check for residents but hide the "resident is single-tenant" rule; a shared bare `string` would break the Admin/Guard multi-tenant semantics outright. The union is the narrowest type that captures the three-branch reality.

**Alternatives considered**:
- Shim with dual `@CurrentTenant()` (single) and `@CurrentTenantScope()` (union). Rejected — spec Assumptions explicitly forbid a shim.
- Always return `{ tenantIds: string[] }` where residents get a one-element array and super_admins get a sentinel `["*"]`. Rejected — the wildcard-as-string-in-array is a bug magnet (`array.includes("*")` is not the same as role-check), and the spec says SuperAdmin scope comes from role, not the join.
- Use NestJS request-scoped providers instead of a decorator. Rejected — request-scoped DI has known performance cost and doesn't provide the same compile-time destructuring.

---

## R-2 — `TenantGuard` enforcement model

**Decision**: A single guard populates `request.tenantScope` from the JWT AND validates any incoming tenant target (query string `tenant_id`, route param `:tenantId`, request body `tenant_id` or `tenant_ids`) against the scope:

- `scope = "all"` — pass through (SuperAdmin can target any tenant).
- `scope = "list"` — every tenant target must be `IN scope.tenantIds`. Deny (HTTP 403) if any is not.
- `scope = "single"` — the target must equal `scope.tenantId`. Deny if different.

Controllers that need a specific tenant (e.g., `PATCH /api/tenants/:id`) expect the route param to be validated by the guard — no per-controller re-check needed. Controllers that do NOT accept a tenant target simply read `@CurrentTenant()` to scope their queries.

**Rationale**: Puts the validation at one gate (the request boundary) and keeps the controller/service layers focused on business logic. Mirrors the existing `JwtAuthGuard` + `RolesGuard` composition pattern.

**Alternatives considered**:
- A separate decorator `@ValidateTenantTarget()` applied selectively. Rejected — easy to forget on a new endpoint; defense-in-depth favors an always-on guard.
- Validate in the repository. Rejected — repositories should trust their inputs (Constitution's layered architecture).

---

## R-3 — Supabase custom access token hook implementation

**Decision**: Implement the hook as a Postgres SECURITY DEFINER function `public.custom_access_token_hook(event jsonb) returns jsonb`, registered via `[auth.hook.custom_access_token]` in `supabase/config.toml`. The function:

1. Reads `event->'user_id'`.
2. Looks up `profiles.role` and `profiles.tenant_id` by `user_id`.
3. Dispatches on `role`:
   - `super_admin` → `tenant_ids := '"*"'::jsonb`.
   - `resident` → `tenant_ids := jsonb_build_array(profiles.tenant_id)`.
   - `admin | guard` → `tenant_ids := coalesce((select jsonb_agg(ut.tenant_id order by ut.created_at) from public.user_tenants ut where ut.user_id = event->>'user_id'), '[]'::jsonb)`.
4. Merges `{ role, tenant_ids }` into `event->'claims'->'app_metadata'` and returns the patched `event`.

The existing `app_metadata.tenant_id` is preserved alongside the new `tenant_ids` claim for the rollout window (see R-12).

**Rationale**: Supabase's documented extension point for JWT customization. Running in Postgres keeps the auth path fully within Supabase infra and avoids a separate edge function. The hook is idempotent and stateless per call — the claim is recomputed at every token issuance, so revoked assignments propagate on the natural token TTL.

**Alternatives considered**:
- JWT generated by the NestJS API (custom sign). Rejected — breaks Supabase Auth integration and loses the RLS-in-jwt() guarantee.
- Edge function hook. Rejected — Postgres hook is colocated with the data, no extra cold-start latency.
- Denormalize `tenant_ids` onto `profiles`. Rejected — duplicates the source of truth; a `user_tenants` insert would require an app-side `UPDATE profiles` that could drift.

---

## R-4 — `user_tenants` schema and migration shape

**Decision**: A single migration `20260423000000_tenants_catalog_multitenant.sql` (or similar) creates:

```sql
create table public.user_tenants (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  assigned_by uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  unique (user_id, tenant_id)
);

create index user_tenants_user_id_idx on public.user_tenants(user_id);
create index user_tenants_tenant_id_idx on public.user_tenants(tenant_id);

alter table public.user_tenants enable row level security;
-- policies defined in data-model.md §UserTenant RLS
```

Data backfill (executed in the same migration, in a DO block after table creation):

```sql
insert into public.user_tenants (user_id, tenant_id, assigned_by)
select p.user_id, p.tenant_id, p.user_id
from public.profiles p
where p.role in ('admin', 'guard')
  and p.tenant_id is not null
on conflict (user_id, tenant_id) do nothing;
```

Comment in the migration: `-- assigned_by = user_id for legacy rows (user is their own assigner; disambiguates from post-migration rows).`

**Rationale**: Matches FR-019 through FR-022 verbatim. Cascading on both FKs ensures cleanup when an auth.user or a tenant is deleted. The unique constraint prevents double-assignment. Two indexes cover the two common access patterns (look up a user's tenants, look up a tenant's users).

**Alternatives considered**:
- Composite primary key `(user_id, tenant_id)` instead of a synthetic `id` + unique constraint. Rejected — the synthetic id lets us PATCH/DELETE individual rows by id from an admin UI in the future without constructing a composite path.
- Store `assigned_by` as nullable. Rejected — spec requires it; known-unknown rows (legacy) use `user_id` as the sentinel, clearly documented.

---

## R-5 — Tenant image storage bucket

**Decision**: Create a **public-read** Supabase Storage bucket named `tenant-images` with:

- `public: true` — anyone with the public URL can GET the object.
- `file_size_limit: 2097152` (2 MiB) — hard bucket-level cap.
- `allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp']` — bucket refuses other formats even if the API is bypassed.
- Write policies (INSERT/UPDATE/DELETE on `storage.objects`):
  - SuperAdmin: allow on any object in the bucket.
  - Admin: allow only when `storage.foldername(name)[1]::uuid` is IN `user_tenants.tenant_id` for the caller.
  - All other roles, anon: deny.
- Read policy on `storage.objects`: allow public SELECT (so the bucket's `public_url` is the source for `<img src>`).

Object path convention: `tenants/{tenant_id}/{timestamp}-{random}.{ext}`. The API generates the path; the tenant row stores only the path (`image_path`), never the full URL (so that renaming the bucket or changing the Supabase project doesn't break stored data).

**Rationale**: Public-read is safe for tenant logos (non-sensitive visual identity, spec Assumption "Tenant image storage"). Public URLs let the TopBar selector and catalog list render `<img>` tags without the signed-URL dance — critical for the selector trigger which re-mounts on every page. Write restrictions mirror `PATCH /api/tenants/:id` authorization (FR-015a), enforced by storage policies so even a leaked service-role token scoped by RLS can't cross tenants.

**Alternatives considered**:
- Signed URLs from a private bucket. Rejected — adds refresh/expiry complexity to every render, penalizes the always-mounted selector.
- Hot-link proxy endpoint on NestJS (`GET /api/tenants/:id/image`). Rejected — duplicates bandwidth, adds unnecessary API load for a CDN-cached asset. Kept as a contingency if we later need per-tenant privacy.
- Embed image bytes in the `tenants.config` JSONB. Rejected — bloats the catalog list query and cannot be CDN-cached.

---

## R-6 — Public URL composition for `image_path`

**Decision**: The API returns `image_path` (bucket-relative path, e.g., `tenants/abc.../2026-04-23T10:12:44Z-7f2a.webp`) unchanged. The frontend composes the public URL via `SupabaseClient.storage.from("tenant-images").getPublicUrl(image_path).data.publicUrl` OR constructs `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tenant-images/{image_path}` directly. Both are pure functions with no network cost.

The `TenantAvatar` primitive takes `imagePath: string | null` and composes the URL internally so consumers never re-derive the rule.

**Rationale**: Keeps the API response compact (path only, no URL) and immune to bucket-name changes. The SDK's `getPublicUrl` is zero-cost and already in use for other buckets.

**Alternatives considered**:
- API returns a ready-to-render full URL. Rejected — couples the API response to environment variables.
- Frontend stores and reads the full URL. Rejected — same coupling; worse, the DB would carry env-specific strings.

---

## R-7 — `TenantAvatar` primitive placement

**Decision**: Ship `TenantAvatar` in `@ramcar/ui` as `packages/ui/src/components/tenant-avatar.tsx`. The primitive is:

- Stateless: `{ name: string; slug: string; imagePath?: string | null; size?: "sm" | "md" | "lg"; className?: string }`.
- Renders an `<img>` with `object-fit: cover` when `imagePath` is set, else renders initials (first 1–2 chars of `name`, uppercased) on a background color deterministically hashed from `slug` via a tiny in-file `hashToHsl(slug: string): string` helper. The same hash is used by the catalog list, the selector options, and the selector trigger, so a given tenant's fallback is visually stable.
- Framework-agnostic — Tailwind classes only, no `next/*`, no `"use client";` directive required (pure component). Works in both `apps/web` (RSC-compatible) and `apps/desktop` (pure React) and inside `@ramcar/features/tenant-selector`.

**Rationale**: The primitive has **no business logic** (no auth, no fetching, no i18n) and is reused by three surfaces. `@ramcar/ui` is the right shelf because it already hosts shadcn-style primitives (Button, Input, Sheet, Avatar). Putting it in `@ramcar/features` would force feature-module consumers to take a heavier package dependency for what is visually a badge.

**Alternatives considered**:
- Colocate the avatar inside `@ramcar/features/tenant-selector`. Rejected — the catalog list also needs it; duplicating it in `apps/web/src/features/tenants/` would violate DRY and miss the "single-source reusable primitive" requirement (FR-018d).
- Use shadcn's `Avatar` as-is. Considered — the new `TenantAvatar` composes shadcn `Avatar` + `AvatarImage` + `AvatarFallback` internally for consistency (so keyboard/aria behavior matches the rest of the UI).

---

## R-8 — Initials / deterministic-color hash algorithm

**Decision**: Use a stable 32-bit FNV-1a hash of the lowercased `slug` and map the hash to an HSL color with fixed saturation and lightness chosen for contrast against white text:

```ts
function hashToHsl(slug: string): string {
  let hash = 2166136261;
  for (const ch of slug.toLowerCase()) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`; // WCAG-acceptable contrast with #fff text at this L
}
```

Initials = the first two Unicode code-point letters of `name` after trimming, uppercased. If the name is a single word with one character, fall back to that character. If empty, use "?".

**Rationale**: FNV-1a is a few lines of code, deterministic, and distributes short strings well. HSL at fixed S=65/L=45 guarantees a consistent color density across the palette without accidentally producing yellow-on-white (which fails WCAG AA for the initials text).

**Alternatives considered**:
- Pick from a finite palette (e.g., 12 curated Tailwind-brand colors). Kept as a future refinement; current choice favors being able to include unlimited tenants without palette collisions.
- Use the tenant's UUID. Rejected — UUIDs are not stable across dev/prod imports; slug is.

---

## R-9 — Multipart image-upload endpoint shape

**Decision**: `POST /api/tenants/:id/image` accepts `multipart/form-data` with a single field `file` (max 2 MiB, MIME must be `image/jpeg | image/png | image/webp`). The controller uses `@UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: acceptImageMimes }))`. The service:

1. Validates the file (defense in depth — bucket already refuses oversize/wrong MIME, but surfacing the validation at the API gives a nicer translated error).
2. Deletes the previous object (best-effort, logged on failure per FR-011d).
3. Uploads the new object at `tenants/{tenant_id}/{iso-timestamp}-{random-6-hex}.{ext}`.
4. Updates `tenants.image_path`.
5. Returns the refreshed `Tenant` row.

`DELETE /api/tenants/:id/image` performs steps 2 + 4 (set to null) + 5.

**Rationale**: `FileInterceptor` is the NestJS-idiomatic choice. Two endpoints (POST / DELETE) are clearer than a single PATCH with a null-magic-value. The spec's Data Access Architecture table lists this exact shape.

**Alternatives considered**:
- Single PATCH that accepts JSON `{ image: null }` or multipart. Rejected — type-ambiguous endpoints are harder to test and document.
- Two-step (sign URL → client uploads to bucket → reports path to API). Rejected — violates Principle VIII (frontend would call Supabase Storage directly).

---

## R-10 — Users form multi-tenant selection API contract

**Decision**: Extend the existing Zod schemas in `@ramcar/shared/validators/user.ts`:

```ts
const tenantIdsArray = z.array(z.string().uuid()).min(1, "at least one tenant required");
const adminGuardTenantFields = z.object({
  tenantIds: tenantIdsArray,
  primaryTenantId: z.string().uuid(),
}).refine(
  (v) => v.tenantIds.includes(v.primaryTenantId),
  { message: "primaryTenantId must be one of tenantIds", path: ["primaryTenantId"] },
);

export const createUserSchema = z.discriminatedUnion("role", [
  baseUserSchema.extend({ role: z.literal("resident"), tenantId: z.string().uuid() }),
  baseUserSchema.merge(adminGuardTenantFields).extend({ role: z.enum(["admin", "guard"]) }),
  baseUserSchema.merge(adminGuardTenantFields).extend({ role: z.literal("super_admin") }).partial({ tenantIds: true, primaryTenantId: true }), // super_admin ignores tenant assignment
]);
```

The API-side `UsersService.syncUserTenants(userId, tenantIds, primaryTenantId, actor)`:

1. Sets `profiles.tenant_id = primaryTenantId` (primary acts as legacy compatibility).
2. Computes diff vs. existing `user_tenants` rows and issues a single transactional `DELETE … WHERE user_id = $userId AND tenant_id NOT IN ($newIds)` followed by an INSERT … ON CONFLICT DO NOTHING for additions.
3. Validates the Admin actor may only assign to tenants in their own `tenant_ids` (FR-055).

**Rationale**: Discriminated union on `role` is the cleanest way to express the spec's "single dropdown for residents, multi-select for admin/guard". The `primaryTenantId IN tenantIds` refinement captures FR-052/FR-054.

**Alternatives considered**:
- Keep a single flat schema with optional fields. Rejected — fails to encode the "exactly one primary" rule at the type level and pushes validation into runtime code.
- Separate endpoints for user-create vs. user-tenant-assign. Rejected — UX requires both in one Sheet save; atomicity matters.

---

## R-11 — TenantSelector package placement

**Decision**: Ship the selector as a shared cross-app feature module at `packages/features/src/tenant-selector/` following the spec-014 pattern (visitors pilot). The module exports:

- `<TenantSelector />` — the full UI (Popover + Command combobox).
- `<TenantSelectorTrigger />` — the button shown in the TopBar (renders active tenant's TenantAvatar + name + chevron).
- `useTenantList()` — internal hook calling the injected HTTP transport via `useTransport()` adapter (web wires `fetch`, desktop wires the online client).

The host apps (`apps/web`, `apps/desktop`) each:

1. Import `<TenantSelector />` from `@ramcar/features/tenant-selector`.
2. Render it inside their `TopBar` component (web: `apps/web/src/features/navigation/components/top-bar.tsx`; desktop: `apps/desktop/src/features/navigation/components/top-bar.tsx`).
3. Wire the transport adapter (already in place from spec 014) and the i18n adapter (next-intl on web; react-i18next on desktop).

**Rationale**: The selector is a bi-app feature (spec §FR-042, Assumption "Cross-app sharing of the selector component"). Authoring it once avoids the per-app-duplication red flag in CLAUDE.md. The catalog page itself stays in `apps/web` because the booth never reaches it.

**Alternatives considered**:
- Put the selector in `@ramcar/ui` as a generic primitive. Rejected — it owns data-fetching (tenant list) and i18n strings, which makes it a feature, not a primitive.
- Duplicate in each app. Rejected — violates the shared-feature-module rule in CLAUDE.md (bi-app features MUST live in `packages/features`).

---

## R-12 — Backwards-compatibility strategy for pre-migration JWTs

**Decision**: During the rollout window (one token TTL after deploy), the API's `TenantGuard` tolerates JWTs that carry `app_metadata.tenant_id` but not `app_metadata.tenant_ids`. For such JWTs the guard computes `tenantScope` from the single tenant id (admin/guard → `scope: "list", tenantIds: [tenant_id]`; resident → `scope: "single", tenantId: tenant_id`). A warning line is logged once per user id per process instance (`logger.warn({ userId }, "legacy JWT without tenant_ids claim — awaiting refresh")`). After 24h the fallback branch is removed in a follow-up PR.

**Rationale**: JWT TTL in Supabase is short (default 1h). All active sessions refresh within a day. The migration seeds `user_tenants` rows so the computed fallback (`[tenant_id]`) and the subsequent authoritative claim are identical — no behavioral regression. Removing the fallback in a follow-up keeps the primary PR focused on the breaking change.

**Alternatives considered**:
- Force all users to re-authenticate on deploy. Rejected — disruptive; JWT TTL does the job naturally.
- Leave the fallback in forever. Rejected — ambiguous contract; the spec wants a clean cutover.

---

## R-13 — React Query invalidation strategy on tenant switch

**Decision**: On `setActiveTenantId(nextId)`, call `queryClient.invalidateQueries()` with no predicate — invalidate every query. The repo-wide convention is that React Query keys include `tenantId` (e.g., `["users", tenantId, filters]`), so the invalidation is correct even if a stray key forgot to include it (overbroad is safer than under-broad). Mutations that are in-flight at the moment of the switch complete against their original `tenantId` (React Query does not abort), matching spec Edge Case "Switching tenants while an in-flight mutation is pending".

**Rationale**: Predicate-based invalidation (match keys containing the old tenantId) is fragile — one developer forgetting to include `tenantId` in a key skips invalidation silently. Full invalidation is at most a few extra refetches and is the simplest correct behavior. The user experience cost is negligible because the UI was already about to re-fetch for the new tenant.

**Alternatives considered**:
- Predicate invalidation `queryKey.some(k => k === previousTenantId)`. Rejected — brittle.
- Remove all non-tenant-scoped keys from the cache. Rejected — unnecessarily nukes useful cache (e.g., tenant list for the selector itself).

---

## R-14 — `activeTenantId` persistence surface

**Decision**: Persist `activeTenantId` to `localStorage` under the key `ramcar.auth.activeTenantId` on web. On desktop, use the renderer's `localStorage` (Electron provides one per renderer) OR a tiny IPC passthrough to `electron-store` if future requirements need main-process visibility — v1 uses `localStorage` uniformly.

The Zustand `authSlice` reads the persisted value at store creation time (via `StoreProvider`) and validates it against `tenantIds`. If the persisted id is not in `tenantIds`, fall back to `profiles.tenant_id` (primary), then to `tenantIds[0]`, then to `""` (unassigned — selector renders no options, user sees tenant-gated pages as empty).

**Rationale**: Matches FR-041 exactly. `localStorage` is scoped per origin in the browser and per renderer in Electron — both are acceptable session surfaces. No cross-device sync needed (per-device choice is the expected UX).

**Alternatives considered**:
- Store in a cookie. Rejected — cookies are per-domain and cross-tab, but sync-across-tabs of active tenant can actually be confusing (an admin with two tabs open on two tenants is a legit workflow).
- Store in the URL (`?tenant=slug`). Rejected — every link would need to carry it; breaks copy/paste UX; the spec explicitly says URL is unchanged on switch (FR-048c).

---

## R-15 — Tenant selector source endpoint

**Decision**: The selector calls `GET /api/tenants?scope=selector&status=active&page_size=100` (SuperAdmin gets all + inactive via the `include_inactive=true` flag per FR-047). The `scope=selector` flag is a hint that the caller wants the lightweight projection `{ id, name, slug, image_path, status }` rather than the full `Tenant` row — the API may use it to skip JSON-heavy fields like `config` and `address`. If the hint is ignored the selector still works correctly; it's a performance optimization only.

**Rationale**: Spec Assumption "Tenant selector source endpoint" allows a dedicated endpoint OR a shared list endpoint with a scope param. Sharing keeps the API surface smaller. The `page_size=100` cap handles the 50-tenant ceiling from FR-060 with comfortable headroom.

**Alternatives considered**:
- Dedicated `GET /api/tenants/selector` endpoint. Rejected — duplicative; same authorization logic.
- Paginated selector. Rejected — 50-tenant ceiling makes paging overkill; one request covers every supported user.

---

## R-16 — RLS policy migration scope (enumerated)

**Decision**: The migration rewrites existing policies on these 7 tables:

| Table | Existing policy | Rewrite |
|-------|-----------------|---------|
| `public.tenants` | "Users can read own tenant" (auth_schema) | Three-branch: super_admin all; admin/guard `IN user_tenants`; resident `= profiles.tenant_id`. |
| `public.profiles` | "Users can read profiles in own tenant" (auth_schema); "Admins can insert profiles in own tenant" (users_module); "Users can update own profile" (auth_schema + users_module duplicate); "Admins can update profiles in scope" (users_module); "Users can read profiles in scope" (users_module) | Rewrite all tenant-scoped predicates to the three-branch form. The existing `tenant_id = (auth.jwt()->'app_metadata'->>'tenant_id')::uuid` literal is replaced by the three-branch expression. |
| `public.user_groups` | "Authenticated users can read user_groups" | **Keep unchanged** — `user_groups` is a platform-wide lookup, not tenant-scoped. |
| `public.vehicles` | "Users can read vehicles in scope"; "Staff can insert vehicles in own tenant"; "Admins can update vehicles in scope" | Three-branch rewrite on all. |
| `public.access_events` | "Users can read access events in scope"; "Staff can insert access events in own tenant"; "Staff can update access events in scope" | Three-branch rewrite on all. |
| `public.visit_persons` | "Users can read visit persons in scope"; "Staff can insert visit persons in own tenant"; "Staff can update visit persons in scope" | Three-branch rewrite on all. |
| `public.visit_person_images` | "Users can read visit person images in scope"; "Staff can insert visit person images"; "Staff can delete visit person images" | Three-branch rewrite on all. |

The new `public.user_tenants` table gets its own policies (see data-model.md §UserTenant RLS).

Storage policies for the new `tenant-images` bucket use the same three-branch shape but on `storage.objects` (see R-5).

**Rationale**: This enumeration is derived from `grep 'create policy'` across all existing migrations (see plan analysis phase) — no tenant-scoped policy is left untouched. `user_groups` is excluded because its policy is role-based, not tenant-based.

**Alternatives considered**:
- Leave legacy policies in place and rely on API-level check. Rejected — violates Constitution Principle I (RLS must mirror API).
- Emit SECURITY DEFINER helper functions and wrap the three-branch check in a single SQL function `public.can_access_tenant(target uuid)`. Kept as a refactor consideration — starting with inline expressions simplifies reviewability in migration #1; a follow-up can hoist them to a helper if duplication hurts.

---

## R-17 — Slug auto-generation

**Decision**: Generate slugs via an in-house helper `toSlug(name: string): string` that:

1. Lowercases and NFKD-normalizes the string.
2. Strips combining marks (`replace(/\p{M}/gu, "")`).
3. Replaces non-alphanumeric with `-`, collapses runs, trims leading/trailing `-`.
4. If the resulting slug is empty, uses a fallback `"tenant"`.

On create, the service attempts to insert with `slug = toSlug(name)`. On a unique-constraint collision, it retries up to 5 times appending `-<4-hex-suffix>` (e.g., `los-robles-7f2a`). After 5 retries it throws 409 Conflict; the user can edit the name.

**Rationale**: `slugify` is a valid dep but the 30-line helper avoids a new external dep for a trivial transformation. The collision-retry loop handles the "concurrent creates" edge case from the spec without a unique-index race.

**Alternatives considered**:
- Use the `slugify` npm package. Acceptable fallback; not strictly needed.
- Store a random suffix always (e.g., `los-robles-7f2a` even on first create). Rejected — unprettier URLs in the common case.

---

## R-18 — Inactive-tenant handling in the selector

**Decision**: The `GET /api/tenants` list endpoint, when called by an admin or guard with no explicit `status=All` filter, excludes `status='inactive'` tenants by default. The TopBar `TenantSelector` calls the endpoint without an explicit status filter so that deactivated tenants are hidden for those roles. For SuperAdmin, the list endpoint includes inactive tenants in the selector (FR-047) — the selector marks them with an "Inactive" badge so the SuperAdmin knows before switching in.

If the user's currently-active tenant becomes inactive mid-session (spec Edge Case), the selector detects the state on the next list refetch and triggers `setActiveTenantId(nextFallback)` where the fallback is: (a) the user's primary tenant id if still active, else (b) the first active tenant in `tenantIds`, else (c) empty string. React Query invalidation is fired as if the user had manually switched.

**Rationale**: Keeps the spec's "Admins can't switch into inactive tenants" rule enforceable at the data fetch, not only visually. The fallback chain matches the Edge Case description.

**Alternatives considered**:
- Let admins see inactive tenants but disable the option in the dropdown. Rejected — spec explicitly says "excluded from the TopBar tenant selector for Admins and Guards".
- No auto-switch on deactivation; show an error. Rejected — jarring; silent fallback is the better UX.

---

## R-19 — Migration test plan

**Decision**: The migration PR ships with:

1. A fixture `supabase/seed.sql` update that inserts a mix of admin/guard/resident profiles across multiple tenants.
2. A migration-diff check: `pnpm db:reset && pnpm db:migrate:dev && psql -c 'select count(*) from user_tenants'` asserts row count equals the seeded admin/guard count.
3. A Jest integration test in `apps/api/test/integration/` that signs in as each seeded user, reads the decoded JWT, and asserts `app_metadata.tenant_ids` matches expectations.
4. A pgTAP (or Supabase-SQL) test that attempts cross-tenant SELECT on each RLS-scoped table for a multi-tenant admin and asserts the visible row set equals the union of their assigned tenants.

**Rationale**: Exercises both the data migration (backfill correctness) and the RLS rewrite (cross-tenant isolation), closing the biggest risk of the change.

**Alternatives considered**:
- Rely on manual QA in staging. Rejected — the spec's SC-003/SC-004 demand controlled audits.

---

## R-20 — Image replacement orphan cleanup

**Decision**: On image upload replacing an existing image, the service issues a best-effort `storage.from('tenant-images').remove([oldPath])`. Failures are logged at `warn` level with the orphan path — no retry queue in v1 (spec FR-011d permits orphans as a known limitation). A future cleanup job can GC orphans by comparing bucket contents to `tenants.image_path`.

**Rationale**: Spec explicitly accepts orphans as v1 acceptable. Keeping it best-effort avoids building a retry infra that isn't needed yet.

**Alternatives considered**:
- Synchronous delete-then-upload with transactional compensation. Rejected — over-engineered for the risk.

---

## Summary of plan-phase decisions

| # | Decision | Impact |
|---|----------|--------|
| R-1 | `@CurrentTenant()` returns discriminated union `TenantScope`. | Every existing 23 call sites migrated in one PR. |
| R-2 | `TenantGuard` validates all incoming tenant targets. | Single enforcement point, guards consume `tenantScope`. |
| R-3 | Supabase SECURITY DEFINER Postgres custom access token hook. | Claims `role` + `tenant_ids` on every JWT. |
| R-4 | `user_tenants` schema with unique(user,tenant), cascade FKs, indexes, RLS. | Multi-tenant truth source for admin/guard. |
| R-5 | Public-read `tenant-images` bucket with MIME + size limits + policy-based writes. | Avatar rendering on every surface with no signed-URL overhead. |
| R-6 | API returns `image_path` only; frontend composes public URL. | No env coupling in the DB. |
| R-7 | `TenantAvatar` in `@ramcar/ui`. | Single primitive for list, selector options, selector trigger. |
| R-8 | FNV-1a → HSL deterministic color; first 1–2 letters of `name` for initials. | Stable fallback across surfaces/clients. |
| R-9 | Multipart `POST /api/tenants/:id/image` + `DELETE /api/tenants/:id/image`. | Two endpoints, no null-magic. |
| R-10 | Discriminated-union Zod schema for user create/update with `tenantIds` + `primaryTenantId`. | Compile-time correctness for role-specific fields. |
| R-11 | `TenantSelector` in `packages/features/src/tenant-selector/`. | Shared across web + desktop TopBars per spec 014 pattern. |
| R-12 | 24h `tenant_id` → `tenant_ids` fallback window after deploy. | Active sessions don't break; follow-up removes the fallback. |
| R-13 | Full `queryClient.invalidateQueries()` on tenant switch. | Safe; negligible UX cost. |
| R-14 | `localStorage[ramcar.auth.activeTenantId]` for per-session persistence. | Survives reloads; validates against `tenantIds` on hydrate. |
| R-15 | Selector shares `GET /api/tenants` with a `scope=selector` hint + `include_inactive=true` for SuperAdmin. | No duplicative endpoint. |
| R-16 | RLS rewrite enumerated for 7 tables + new `user_tenants` table + storage policies. | Every tenant-scoped table covered; no stragglers. |
| R-17 | `toSlug()` helper + 5-retry collision loop; no UI exposure. | Pretty URLs in common case; safe under concurrency. |
| R-18 | Inactive tenants hidden from admin/guard selector; visible with badge for SuperAdmin; auto-fallback on mid-session deactivation. | Matches spec Edge Cases. |
| R-19 | Migration ships with seed + integration + pgTAP/SQL isolation tests. | Closes SC-003/SC-004. |
| R-20 | Best-effort orphan cleanup on image replace; warn log only. | Known v1 limitation per FR-011d. |

No open NEEDS CLARIFICATION items remain. Phase 1 can proceed.
