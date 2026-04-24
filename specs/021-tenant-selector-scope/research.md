# Phase 0 Research — Active Tenant Scoping

**Feature**: 021-tenant-selector-scope
**Date**: 2026-04-24
**Status**: Complete — no open NEEDS CLARIFICATION items

This document consolidates the design decisions needed to turn the top-bar tenant selector into the authoritative scope for every read and write. Each decision is framed as **Decision / Rationale / Alternatives considered**, following the plan-template convention. Findings here feed `data-model.md` and `contracts/`.

---

## R1. How does the client communicate the active tenant to the API?

**Decision**: Attach a `X-Active-Tenant-Id: <uuid>` HTTP header on every request to the NestJS API, injected automatically by the per-app HTTP client (`apps/web/src/shared/lib/api-client.ts`, `apps/desktop/src/shared/lib/api-client.ts`). The client reads the value from the Zustand `authSlice.activeTenantId`. The desktop SyncEngine sends the header using the `tenant_id` stored on each outbox row (not the current active tenant) when flushing queued writes.

**Rationale**:

- **One place to enforce**: the header is attached in the HTTP client, so every call site gets correct scoping for free. Per-call-site query params would leave too many chances to forget.
- **Works for GET and POST/PATCH/DELETE uniformly**. Unlike a body field, a header piggybacks on requests with no body (lists, deletes).
- **Does not pollute URLs or cache entries**: preserves current URL shapes so existing deep links, analytics, and server logs remain untouched.
- **Matches what the NestJS `TenantGuard` already does**: the guard today (spec 020) already checks params/query/body for a requested tenant and validates it against `tenant_ids` from the JWT. Reading from a header is a trivial addition, not a redesign.
- **Server remains authoritative** (FR-026, Principle I). The guard validates `X-Active-Tenant-Id ∈ tenant_ids` on every request. A tampered or mistaken client cannot access other-tenant data.
- **Bitacora is cleanly unaffected**: Bitacora's query param `tenant_id` remains its authoritative filter (FR-012). It is the one and only exception; passing its view-local tenant through the URL is orthogonal to the header.

**Alternatives considered**:

- **Query parameter `activeTenantId` on every endpoint** — would force every call site to remember to append it and pollute every URL. Easy to forget in bespoke fetches. Rejected.
- **JWT custom claim `active_tenant_id`**, refreshed on switch via Supabase's custom access token hook. Elegant in isolation but introduces JWT refresh latency on every switch (FR-018 wants instant refresh), adds a second migration to the hook added in spec 020, and complicates the desktop offline case (queued writes would need the original JWT, not the current one). Rejected for this scope; could be revisited later if we want the claim to be visible in RLS as well.
- **Path prefix `/api/tenants/:tenantId/...`** — large refactor across every existing endpoint, breaks external consumers (mobile app). Rejected.
- **Leave the server to pick the "first" tenant from the JWT `tenant_ids`** — this is effectively what single-tenant users got before, but it makes multi-tenant behavior implicit and impossible to observe client-side. Rejected because FR-001/FR-005 require visible, predictable scoping.

---

## R2. How are TanStack Query caches kept free of cross-tenant leakage during and after a switch?

**Decision**: Every scoped query key MUST include `activeTenantId` as the first discriminator after the resource name, following the constitutional convention `[resource, tenantId, modifier, filters]`. On confirmed switch, the cache is not manually invalidated; the key change itself triggers refetch of currently mounted queries against the new tenant and leaves old-tenant entries in the cache for TanStack Query's garbage collector to evict. Mounted queries that previously returned data for Tenant A are not rendered during the in-flight refetch — the UI shows a loading state (Principle IV + FR-027).

Additionally, the `useTenantSwitch` hook calls `queryClient.cancelQueries()` immediately after `setActiveTenant()` fires to abort any in-flight old-tenant reads (handles edge case: "tenant switch while a list is fetching"). This is belt-and-suspenders — the key change alone already prevents stale data from rendering in the now-wrong tenant's view — but cancelation frees network and avoids wasted work.

**Rationale**:

- **Aligns with the constitution** (Technology Constraints — "React Query keys MUST include `tenantId`").
- **Automatic cache partitioning**: two tenants' data cannot collide because they are stored under different cache keys. This also gives us free back-button-style behavior (switching back to Tenant A inside the GC window yields instant cached data).
- **No brittle global invalidation**: `queryClient.invalidateQueries()` with no filter would nuke auth, tenant membership, and Bitacora's cross-tenant queries (which are intentionally unscoped for super-admin). The key-based approach leaves those alone.

**Alternatives considered**:

- **Global `queryClient.clear()` on switch** — nukes auth and Bitacora cross-tenant caches. Rejected.
- **Hand-maintained allowlist of keys to invalidate** — drifts as features are added. Rejected.
- **Rely only on server-side scoping without client-side cache partitioning** — would still show Tenant A data briefly after a switch while a new fetch completes (FR-018 prohibits). Rejected.

**Audit scope**: see `contracts/endpoint-scoping-matrix.md` for the per-feature list of query keys requiring the `activeTenantId` discriminator. Keys used by `packages/features/src/visitors`, `apps/web/src/features/users`, residents, access-log, patrols (if present), blacklist (if present), and dashboard metrics will be updated. Bitacora's key already uses a `scopeKey` derived from its URL param and remains correct.

---

## R3. How does the confirmation dialog detect unsaved work?

**Decision**: Introduce an `unsaved-changes` adapter port in `@ramcar/features` with the shape:

```ts
type UnsavedChangesPort = {
  hasUnsavedChanges: () => boolean;
};
```

- **Web host** provides an implementation backed by a new Zustand slice `unsavedFormsRegistry` (in `apps/web/src/shared/hooks/use-unsaved-forms-registry.ts`). Forms register/deregister themselves on mount/unmount via a new `useRegisterUnsavedForm(isDirty: boolean)` hook. The existing `useFormPersistence` hook (spec 014, web-only) is extended to also register the form as dirty when it has a draft newer than the last saved state.
- **Desktop host** provides a stub implementation that returns `false`. Rationale: the desktop booth's primary flows (entry/exit capture, visit-person search) are quick, not long-form; the spec's Edge Cases already place unsaved-changes warnings on the web side only, where multi-field forms (users, residents, providers) live.

The `useTenantSwitch` hook calls `hasUnsavedChanges()` when opening the `<ConfirmSwitchDialog />` and passes the boolean as the `hasUnsavedChanges` prop. The dialog copy switches from "Confirm switch?" to "Confirm switch? Unsaved changes will be discarded." when true (FR-019).

**Rationale**:

- **Keeps the shared module host-agnostic**: the shared dialog doesn't need to know about `useFormPersistence` or Electron.
- **Reuses existing web primitive**: spec 014 already codified `useFormPersistence` as the web-only extension point; extending it with a dirty flag is incremental.
- **Cheap desktop stub**: the desktop booth today has no multi-field-create surface that warrants the warning; if that changes, the port can get a real implementation without touching the shared dialog.

**Alternatives considered**:

- **`window.beforeunload` listener only** — works for browser reloads but not for SPA route changes during a switch. Rejected.
- **Scan localStorage for `useFormPersistence` draft keys** — fragile (drafts persist across sessions intentionally; "dirty" isn't the same as "has draft"). Rejected.
- **`react-hook-form`'s `formState.isDirty` subscription** — couples the shared module to a specific form library. Rejected.

---

## R4. How does the desktop outbox preserve the capture-time tenant?

**Decision**: Add a `tenant_id TEXT NOT NULL` column to `sync_outbox` in the desktop SQLite database. On enqueue, the `SyncEngine` and `SyncOutboxRepository` stamp `tenant_id = activeTenantId` (read from the authSlice snapshot) onto the row, independent of any tenant data already inside the `payload`. On flush, the SyncEngine reads each row's `tenant_id` and sends it as `X-Active-Tenant-Id` to the API, *not* the current UI-active tenant.

**Schema migration** (desktop SQLite, not Supabase): the existing `database.ts` creates `sync_outbox` on startup with `CREATE TABLE IF NOT EXISTS`. We add an `ALTER TABLE sync_outbox ADD COLUMN tenant_id TEXT NOT NULL DEFAULT ''` step gated by a `PRAGMA user_version` bump, then backfill NULL rows from the `payload.tenant_id` where recoverable and mark the remaining as `'unknown'` (they will fail validation at the API and the user will be prompted to re-capture — acceptable since the outbox is typically drained daily). A brief note in quickstart.md calls this out for QA.

**Rationale**:

- **Meets FR-010 directly and auditably**: the capture-time tenant is a first-class column, visible in diagnostics. Relying on `payload.tenant_id` alone is fragile — some payloads (e.g., future blacklist deletes by id) may not carry a tenant at all.
- **Matches the X-Active-Tenant-Id design**: the sync engine sends the same header as the online path; the server code path is identical.
- **Cheap**: one `ALTER TABLE` and one per-row stamp on enqueue.

**Alternatives considered**:

- **Rely on payload-embedded `tenant_id` at sync time** — works today for visit-person and vehicle creates that carry the column in the payload, but not extensible. Rejected.
- **Capture a snapshot of the whole authSlice** on the outbox row — overkill; only `tenant_id` is load-bearing for routing. Rejected.
- **Use a device-level "active tenant at last sync" variable** — would re-tag events if the user switches between capture and sync. Violates FR-010. Rejected.

---

## R5. How does the client recover when the active tenant is revoked mid-session?

**Decision**: The HTTP client detects the API's revoked-tenant response (HTTP 403 with body `{ code: "TENANT_ACCESS_REVOKED" }` — a response shape the NestJS `TenantGuard` already produces for membership mismatch, per spec 020). On that response, the client:

1. Reads the fresh `tenant_ids` list from the current Supabase JWT (triggering a refresh via `supabase.auth.refreshSession()` first).
2. Calls `authSlice.hydrateActiveTenant(fallbackPrimary)` with the first id in the refreshed list.
3. Cancels all in-flight scoped queries via `queryClient.cancelQueries()`.
4. Shows a toast: "Your access to <name> was updated. Switched to <new name>." (strings live in `@ramcar/i18n`.)
5. If the refreshed list is empty, routes to the `no-access` page (spec 020) and clears the authSlice tenant fields.

**Rationale**:

- **Keeps recovery inside the transport layer** rather than sprinkling 403 handlers into every feature hook.
- **Reuses existing primitives**: `hydrateActiveTenant()` already handles the "pick a sensible default" logic.
- **Server-authoritative**: the client never picks the new tenant speculatively; it reloads from the JWT first.

**Alternatives considered**:

- **Polling `/api/tenants/selector` on an interval** to preempt revocation — wasteful and racy. Rejected.
- **Realtime subscription on `user_tenants`** — adds a long-lived WebSocket just for a rare event. Rejected; the 403-on-demand fallback is good enough.

---

## R6. How does Bitacora reconcile its in-page dropdown with the top-bar active tenant?

**Decision**: Bitacora's URL `tenant_id` query param remains the authoritative filter for its table (FR-012). A new effect in `useLogbookFilters` runs on module mount and on `activeTenantId` change:

- If Bitacora is the currently mounted view AND the URL `tenant_id` is absent OR equals a stale previous value from a prior visit, the effect rewrites the URL to the current `activeTenantId` via `router.replace()` (no history push).
- If Bitacora is the currently mounted view AND the user chose a different tenant inside Bitacora (URL `tenant_id !== activeTenantId`), we leave it alone — that is the deliberate divergence the spec preserves (FR-013).
- On module unmount, no cleanup is needed — the URL is naturally discarded when the user navigates away, and the URL resets to the fresh active tenant on return (FR-014).
- On a confirmed top-bar switch, after `setActiveTenant()` fires, the Bitacora route's URL is rewritten to the new `activeTenantId` to satisfy FR-020. This is handled inside `useLogbookFilters` via a `useEffect` that watches `activeTenantId`; the `useTenantSwitch` hook does not need special-case Bitacora logic.

The super-admin "ALL" sentinel continues to work because "ALL" is a non-UUID sentinel that is never equal to `activeTenantId`; the effect only overrides when the URL param is missing (fresh entry) — a super-admin who deliberately picks "ALL" will not be overridden on re-entry within the same navigation (by design: their choice persists in the URL until they leave).

**Rationale**:

- **Matches the spec language**: top bar seeds, in-page dropdown filters.
- **Preserves spec 019 super-admin behavior**.
- **Single source of truth for Bitacora's filter stays the URL**: no hidden state, easy to share via copy-paste links.

**Alternatives considered**:

- **Ignore top-bar changes entirely** while Bitacora is mounted — violates FR-020. Rejected.
- **Push top-bar changes into the URL param always** (even mid-view) — violates FR-013. Rejected.
- **Use a separate Zustand "Bitacora view tenant" slice** — adds state duplication; the URL already carries it. Rejected.

---

## R7. How do we audit and enforce that every scoped query key includes `activeTenantId`?

**Decision**: One-time audit in Phase 2 (tasks), plus a lightweight custom ESLint rule (`@ramcar/eslint-plugin-query-keys/require-tenant-id`) that flags `useQuery`/`useInfiniteQuery` calls where the first two positional elements of `queryKey` are string literals and `tenantId`/`activeTenantId` is not among the first three elements. The rule is scoped to `apps/**/src/features/**` and `packages/features/**` and has an ignore list for the three known cross-tenant views (Bitacora for super-admin, tenant-selector's own `tenants/selector` query, `auth/profile`).

**Rationale**:

- **Prevents regression as new features land**. Without enforcement, the next feature will forget and re-introduce the bug.
- **Cheap**: the rule is ~30 lines, one file, and runs in `pnpm lint`.
- **Constitution-aligned**: reinforces Principle I and the Technology Constraints' query-key requirement.

**Alternatives considered**:

- **Code review only** — relies on human vigilance; drifts over time. Rejected.
- **Runtime assertion inside a `useTenantScopedQuery` wrapper** — forces every feature to adopt a new primitive, big migration cost. Rejected.
- **TypeScript type branding** for tenant-scoped keys — fights the library's generics, brittle. Rejected.

---

## Summary of consequences for downstream phases

- **Phase 1 data-model**: three client-side entities (Active Tenant Selection, Tenant Membership read model, Bitacora View Tenant) plus one new persisted column (desktop `sync_outbox.tenant_id`). No Postgres schema changes.
- **Phase 1 contracts**: three files — the `X-Active-Tenant-Id` wire contract, an endpoint-scoping matrix (per existing endpoint, what the active tenant does to reads and writes), and the confirmation-dialog UI contract (props, strings, behavior).
- **Phase 1 quickstart**: a five-minute manual verification script for reviewers: sign in with a multi-tenant account on web + desktop, capture events, flip tenants through the confirmation dialog, check Bitacora override behavior, simulate a revoked membership, and confirm cache partitioning in DevTools.
- **Phase 2 tasks (out of scope for this plan command)** will enumerate the per-feature queryKey audit, the guard update, the outbox migration, the ESLint rule, and the i18n string additions.

All **NEEDS CLARIFICATION** items from the plan's Technical Context are now resolved.
