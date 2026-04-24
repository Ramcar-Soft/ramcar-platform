# Quickstart — Manual Verification

**Feature**: 021-tenant-selector-scope
**Audience**: QA, PR reviewer, anyone validating the behavior locally.
**Time**: ~10 minutes end-to-end (including app startup).

This is not a development setup — it assumes you already have the repo bootstrapped per the root README and can run `pnpm dev` with a local Supabase instance.

---

## Prerequisites

1. Local Supabase running: `pnpm db:start` and `pnpm db:reset` (loads seed data from `supabase/seed.sql`).
2. Seed data must include at least:
   - Two tenants: "Residencial Alpha" (`TENANT_A_UUID`) and "Residencial Beta" (`TENANT_B_UUID`).
   - One admin user who is a member of both tenants (`admin@ramcar.test` / the seed's default password).
   - One guard user who is a member of both tenants (`guard@ramcar.test`).
   - One admin user who is a member of only Tenant A (`soloadmin@ramcar.test`) — for the single-tenant edge case.
   - A handful of residents, visitors, and access events in **each** tenant so scoping is visually obvious.
3. `pnpm dev` running. The web portal is on `http://localhost:3000`, the landing on `:3001`, the desktop dev app on Electron, the API on `:3333`.

> The seed's exact emails/ids may differ — check `supabase/seed.sql`. The rest of this doc uses the placeholders above.

---

## Scenario 1 — Admin: confirm dialog blocks accidental switches

1. Open `http://localhost:3000` and sign in as `admin@ramcar.test`.
2. Verify the top-bar selector shows "Residencial Alpha" (or whatever was last active; first-time hydration picks the first authorized tenant — FR-003).
3. Navigate to **Users** (`/admin/users`). Note the visible user count — call it `N_A`.
4. Click the top-bar selector, pick "Residencial Beta".
5. **Expected**: a centered dialog opens with:
   - Title "Switch community?" (or the Spanish equivalent if the language is `es`).
   - Body naming both "Residencial Alpha" and "Residencial Beta".
   - Buttons "Cancel" and "Switch to Residencial Beta".
6. Press Escape. **Expected**: dialog closes, the selector still shows "Residencial Alpha", the users list has **not** reloaded (observe: no loading skeleton, no network activity in DevTools). FR-017.
7. Click the selector again, pick "Residencial Beta", click **Switch to Residencial Beta**.
8. **Expected** within ~1 s (SC-001):
   - Selector now shows "Residencial Beta".
   - Users table reloads; count becomes `N_B` (different from `N_A`; no rows from Tenant A remain visible).
   - DevTools Network tab shows the refetch requests carry header `X-Active-Tenant-Id: <TENANT_B_UUID>`.
9. Open React Query DevTools. Confirm there are two distinct cache entries: `["users", <TENANT_A_UUID>, ...]` (inactive, cached) and `["users", <TENANT_B_UUID>, ...]` (active).

---

## Scenario 2 — Admin: catalogs all refresh in parallel

1. Continuing from Scenario 1 (Tenant B active).
2. In separate tabs or by navigating: open **Residents**, **Visitors**, **Providers**, **Access Log**, **Dashboard**.
3. Record representative rows from each list so you know what "Tenant B content" looks like.
4. Switch back to Tenant A via the selector (confirmation dialog).
5. **Expected**: every list refetches and shows Tenant A content within ~1 s. No Tenant B row remains on screen during the transition (FR-027). Brief loading skeleton is acceptable; stale Tenant B data is not.

---

## Scenario 3 — Guard booth: capture lands on the correct tenant

1. Start the desktop app (Electron dev build). Sign in as `guard@ramcar.test`.
2. Confirm the top-bar shows the default tenant (Tenant A).
3. In the Visits flow, search for a resident by name or code. **Expected**: only Tenant A residents appear. Pick one. Create an entry access event.
4. After capture, open the Supabase Studio or the API's `/api/access-events?limit=1` and verify the latest row has `tenant_id = <TENANT_A_UUID>`.
5. Switch to Tenant B via the top bar (confirmation dialog).
6. Search residents again — **Expected**: only Tenant B residents appear. Capture another entry event.
7. Verify the latest `access_events` row has `tenant_id = <TENANT_B_UUID>`.

---

## Scenario 4 — Offline desktop: capture-time tenant survives a switch

1. Desktop app, Tenant A active. Toggle the app offline (disconnect network, or stop the API process — the sync status badge should go to `offline`).
2. Capture an entry event while offline. **Expected**: the event enters the outbox with `tenant_id = <TENANT_A_UUID>`. Inspect via the dev tool command `sqlite3 <app-data>/ramcar.sqlite "SELECT event_id, tenant_id FROM sync_outbox ORDER BY id DESC LIMIT 1;"` — the `tenant_id` column is now present.
3. Switch to Tenant B in the top bar (confirmation dialog). Outbox row is **not** re-tagged — re-run the SQL and see `tenant_id = <TENANT_A_UUID>` still.
4. Reconnect the network (or restart the API). Sync runs automatically.
5. **Expected**: the access event appears in the server with `tenant_id = <TENANT_A_UUID>` (the capture-time tenant), not Tenant B. FR-010.

---

## Scenario 5 — Bitacora: top-bar seeds, in-page filters

1. Web app, Tenant A active. Navigate to **Bitácora**.
2. **Expected**: the in-page tenant dropdown shows "Residencial Alpha" (seeded from the top bar). URL contains `?tenant_id=<TENANT_A_UUID>`. Table shows Tenant A entries.
3. Change the in-page dropdown to "Residencial Beta". **Expected**:
   - URL becomes `?tenant_id=<TENANT_B_UUID>`.
   - Table reloads with Tenant B entries.
   - Top bar **still shows** "Residencial Alpha" — FR-013.
4. Navigate to **Users** (top nav). **Expected**: the users list reflects Tenant A (top bar wins for other modules).
5. Return to **Bitácora**. **Expected**: in-page dropdown is back to "Residencial Alpha", URL reseeded — FR-014.
6. With Bitácora open and dropdown on Tenant A, switch the top bar to Tenant B and confirm. **Expected**: dropdown and URL flip to Tenant B, table reloads — FR-020.

---

## Scenario 6 — Super-admin: "ALL" mode in Bitacora is preserved

1. Sign in as a super-admin (`superadmin@ramcar.test` per seed).
2. Navigate to **Bitácora**. Pick "Todas las comunidades" (the `ALL` option) in the in-page dropdown.
3. Navigate to another module and back. **Expected** per spec 019 + this feature's FR-014: on return, the in-page dropdown re-seeds from the top-bar active tenant (not `ALL`). Super-admin's cross-tenant mode is opt-in per visit.

---

## Scenario 7 — Confirmation warns about unsaved work (web)

1. Admin, Tenant A active. Navigate to **Users** and click **Add user** (opens the right-side Sheet per CLAUDE.md).
2. Fill in two or three fields (do not save).
3. Open the top-bar selector, pick Tenant B.
4. **Expected**: dialog shows the extra line "You have unsaved changes that will be discarded." (FR-019).
5. Click Cancel. **Expected**: form still contains your partial input.
6. Repeat step 3 and click Confirm. **Expected**: form closes, users list reloads for Tenant B, your partial input is gone (discarded is expected — no rescue). Optional: check `localStorage` to confirm the draft key is cleared by `useFormPersistence.clearDraft()`.

---

## Scenario 8 — Single-tenant user: no switcher, no dialog

1. Sign in as `soloadmin@ramcar.test` (single-tenant user).
2. **Expected**: top-bar shows "Residencial Alpha" as a static label (no dropdown caret, no click affordance). FR-004.
3. Try clicking the label anyway — nothing happens. No dialog ever appears.

---

## Scenario 9 — Revoked tenant mid-session

1. Admin, authorized for Tenant A and Tenant B. Sign in; set Tenant A active.
2. In a separate admin session (or via direct DB), remove the user's `user_tenants` row for Tenant A:
   ```sql
   DELETE FROM public.user_tenants
    WHERE user_id = '<ADMIN_UUID>'
      AND tenant_id = '<TENANT_A_UUID>';
   ```
3. Back in the admin's browser, try to refresh the Users list (or any Tenant A-scoped view).
4. **Expected**:
   - The request returns `403 TENANT_ACCESS_REVOKED`.
   - The client refreshes the JWT, hydrates the authSlice, and switches to Tenant B automatically.
   - A toast appears: "Your access to Residencial Alpha was updated. Switched to Residencial Beta."
   - The Users list reloads against Tenant B.
   - FR-025.

---

## Scenario 10 — Cross-device independence

1. Sign in as the same admin on both the web portal (browser A) and the desktop app.
2. Set Tenant A active on the web, Tenant B active on the desktop.
3. Open Residents on both. **Expected**: the web shows Tenant A residents; the desktop shows Tenant B residents. They do not sync — per-device activeTenantId per the edge case "Cross-device consistency".

---

## Acceptance checklist for the reviewer

- [ ] Every scenario above passes on the PR's preview or local build.
- [ ] `pnpm lint` and `pnpm typecheck` pass (the new ESLint rule for queryKey inclusion of `activeTenantId` ships enabled).
- [ ] `pnpm test` (Vitest + Jest) passes; the added unit/integration tests for the `TenantGuard` header path, the desktop outbox `tenant_id` preservation, and the `useTenantSwitch` hook are green.
- [ ] `pnpm test:e2e` (Playwright) covers Scenario 1 end-to-end.
- [ ] Spot-check React Query DevTools in the browser shows query keys of the form `[resource, <UUID>, ...]` for every scoped feature.
- [ ] Spot-check DevTools Network for a handful of scoped requests — each carries `X-Active-Tenant-Id`.
- [ ] `GET /api/users` from a cURL without the header returns 400 `ACTIVE_TENANT_REQUIRED`.
- [ ] `GET /api/users` with a header value not in the JWT's `tenant_ids` returns 403 `TENANT_ACCESS_REVOKED`.

## Verification results — 2026-04-24

Branch: `021-tenant-selector-scope` — implementation in progress (automated tests written, manual scenarios pending local build).

**Phase 1-3 (Setup + Foundational + US1)**: Implementation complete. Key changes:
- `TenantGuard` reads `X-Active-Tenant-Id` header, validates ∈ JWT `tenant_ids`, throws 400/403 on violations
- Both api-clients (web + desktop) attach the header from `localStorage`
- `useActiveTenant()` hook exported from `@ramcar/features`
- `sync_outbox.tenant_id` column added via `PRAGMA user_version` migration
- SyncEngine sends per-row `tenant_id` on flush (not current UI tenant)
- Desktop query keys include `activeTenantId`

**Phase 4-7 (US2-US4 + Polish)**: Implementation in progress via parallel agents.

Manual verification of Scenarios 1-10 blocked pending deployment to preview environment. To be completed before merge.
