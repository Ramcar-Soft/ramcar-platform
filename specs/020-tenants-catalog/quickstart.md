# Quickstart — 020-tenants-catalog

**Purpose**: End-to-end manual verification of the Tenants Catalog + multi-tenant assignment + TopBar selector. Matches the spec's independent-test script for Stories 1 → 7.

**Pre-conditions**:
- Local Supabase running (`pnpm db:start`).
- Migration for this feature applied (`pnpm db:migrate:dev`).
- Seed data present: a SuperAdmin, one Admin with 1 tenant, one Guard with 0 tenants, one Resident, and 3 tenants (`los-robles`, `san-pedro`, `valle-verde`).
- Web portal running (`pnpm --filter @ramcar/web dev`).
- API running (`pnpm --filter @ramcar/api dev`).
- (Optional) Desktop renderer running (`pnpm --filter @ramcar/desktop dev`) for the selector parity check.

---

## Scenario 1 — SuperAdmin creates a tenant (Story 1, P1)

1. Sign in as the seeded SuperAdmin at `http://localhost:3000/es`.
2. Open the sidebar → Catalogs → **Tenants**. Confirm the route is `/es/catalogs/tenants`.
3. Confirm the table renders with the 3 seeded tenants, sorted by `created_at` desc, with columns: avatar + name, address, status badge (translated "Activo"), created date, actions.
4. Click **Create Tenant**. A right-side Sheet slides in (width `w-[400px] sm:w-[800px]`).
5. Enter `Crear Fraccionamiento` in Name and `Calle Falsa 123, CDMX` in Address. Leave Status = "Active". Leave Image empty.
6. Submit. Expect:
   - Sheet closes; translated success toast "Inquilino creado".
   - New row appears at the top of the table without a page reload.
   - Open the Network tab: exactly one `POST /api/tenants` request returned 201, and one background `GET /api/tenants?status=active&page=1&page_size=25` refetch.
   - Inspect DB: `select count(*) from user_tenants where user_id = '<superadmin>'` remains unchanged (SuperAdmin is NOT auto-assigned).

**Pass criteria**: Story 1 acceptance scenarios 1–6 all green. Time-to-complete ≤ 30 s (SC-001).

---

## Scenario 2 — Multi-tenant assignment & JWT claim (Story 2, P1)

1. As SuperAdmin, open the Users catalog.
2. Edit the seeded Guard user. Change Role to **Guard** (already set) and, in the tenant multi-select combobox, add `los-robles` + `san-pedro` (mark `los-robles` as primary). Save.
3. Inspect DB:
   - `select * from user_tenants where user_id = '<guard>'` returns 2 rows; `assigned_by` = the SuperAdmin's id.
   - `select tenant_id from profiles where user_id = '<guard>'` = `<los-robles id>` (primary).
4. Open an incognito window; sign in as the Guard.
5. Decode the Supabase session access token (use browser DevTools → Application → Cookies → `sb-…-auth-token` → copy the `access_token` → paste into `jwt.io`). Verify:
   - `app_metadata.role == "guard"`.
   - `app_metadata.tenant_ids` is a two-UUID array `[los-robles, san-pedro]` (order: by `user_tenants.created_at asc`).
   - `app_metadata.tenant_id` == `<los-robles id>`.
6. In the Guard's browser, open DevTools Network tab and hit `GET /api/access-events?page=1` (via the Logbook page). Assert the response contains rows from both tenants only.
7. In DevTools Console, issue:
   ```js
   fetch("/api/access-events?tenant_id=<valle-verde id>", { headers: { authorization: `Bearer ${accessToken}` } }).then(r => r.status)
   ```
   Expect HTTP `403` (TenantGuard rejects cross-tenant target).

**Pass criteria**: Story 2 acceptance scenarios 1–7 all green. SC-003 cross-tenant leak check passes.

---

## Scenario 3 — TopBar selector switches tenants (Story 3, P1)

1. Still signed in as the Guard from Scenario 2. The TopBar renders a tenant selector (between the tenant name display and the theme toggle).
2. Confirm:
   - Trigger shows `TenantAvatar` + active tenant name (`Los Robles`) + chevron.
   - Click — a Popover opens with a search input and 2 options (both active tenants). Each row shows avatar + name + a checkmark next to the active one.
3. Type `san` into the search. Only `San Pedro` remains visible.
4. Pick `San Pedro`. Expect:
   - Popover closes.
   - TopBar trigger now shows `San Pedro`.
   - Every visible React Query cache refetches; the Logbook page (if open) now shows only `San Pedro` events.
   - `localStorage.getItem("ramcar.auth.activeTenantId")` = `<san-pedro id>`.
   - URL unchanged.
5. Reload the page. Expect `San Pedro` is restored as the active tenant.

**Pass criteria**: Story 3 acceptance scenarios 1–8 all green. Switch time < 3 s (SC-002, FR-059).

---

## Scenario 4 — Admin creates a tenant and is auto-assigned (Story 4, P1)

1. Sign out. Sign in as the seeded Admin (starts with 1 tenant — `los-robles`).
2. Note that the TopBar **selector is hidden** (Admin has only 1 tenant). Confirm.
3. Navigate to `/es/catalogs/tenants`. Table shows 1 row: `Los Robles`.
4. Click **Create Tenant**. Submit `Name = Mis Nuevos Robles`, `Address = Ejemplo 9`. Save.
5. Inspect DB:
   - New tenant row in `public.tenants`.
   - New row in `public.user_tenants` with `user_id = <admin>`, `tenant_id = <new tenant>`, `assigned_by = <admin>` (the Admin is recorded as the assigner, per FR-012).
6. In DevTools Console, force a token refresh:
   ```js
   await supabase.auth.refreshSession();
   const { data } = await supabase.auth.getSession();
   console.log(data.session.user.app_metadata);
   ```
   Expect `tenant_ids` is now a 2-element array.
7. Confirm the TopBar selector now appears (Admin has 2 tenants).

**Pass criteria**: Story 4 acceptance scenarios 1–5 all green. SC-009 total time ≤ 10 s.

---

## Scenario 5 — Edit tenant + image flow (Story 5, P2 + FR-011a-d)

1. As SuperAdmin, on the catalog table, click the Edit action on `Los Robles`.
2. Sheet opens with the tenant's current fields. The image field shows either a placeholder avatar (initials on deterministic color from `los-robles`) or an existing image.
3. Click the image field → upload a 500 KB `.webp`. Live preview updates. Save.
4. Confirm:
   - Response 200; table thumbnail updates to the new image.
   - DB: `select image_path from public.tenants where slug = 'los-robles'` returns a `tenants/<id>/…webp` path.
   - The TopBar selector trigger's thumbnail (if `Los Robles` is active) reflects the new image without a reload.
5. Edit again; click **Remove** on the image field → Save. `image_path = null`. Thumbnail falls back to initials.
6. Try uploading a 3 MB PNG. Expect a translated error toast "La imagen debe ser ≤ 2 MB" (frontend pre-check), AND no POST request issued.
7. Try uploading a `.svg`. Expect a translated error toast "Formato no permitido" (frontend pre-check).
8. Bypass the frontend by crafting a curl `POST /api/tenants/<id>/image` with a 3 MB `.svg`. Expect HTTP 415 or 413 from the API (double-layer enforcement per FR-035c/d).

**Pass criteria**: Story 5 acceptance scenarios 1–6 + FR-011/035 enforcement green.

---

## Scenario 6 — Role gating & RLS (Story 7, P2)

1. Sign in as the Guard. Open the sidebar. **Tenants** entry is absent.
2. Navigate to `/es/catalogs/tenants` directly. Expect redirect to the Guard's default landing page (or a translated 403 page if the app renders one).
3. Hit `/api/tenants` with the Guard's token (curl). Expect HTTP 403.
4. Sign in as the Resident. Repeat steps 1–3 with the same expectations.

**Pass criteria**: Story 7 acceptance scenarios 1–4 green.

---

## Scenario 7 — Search and status filter (Story 8, P3)

1. As SuperAdmin, on `/es/catalogs/tenants`:
   - Type `los` in the search input. After 300 ms, table filters to tenants whose name or address contains `los` (case-insensitive). Pagination resets to page 1.
   - Change the status filter to **Inactive**. Table re-queries and shows only inactive rows (or the empty-state "No records found" if none).
   - Change to **All**. Table shows every row.
   - Clear the search. Table shows the full status-filtered list.

**Pass criteria**: Story 8 acceptance scenarios 1–5 green. Debounce visibly gates network requests (observe Network tab).

---

## Scenario 8 — RLS cross-tenant isolation (SC-003)

Run the pgTAP / Supabase-SQL integration script (`apps/api/test/integration/rls-tenants.sql`) that, for each tenant-scoped table, signs in as a multi-tenant Admin and asserts the visible row set matches `union(tenant A rows, tenant B rows)` and never leaks rows from tenant C. Run via:

```bash
pnpm db:reset && pnpm db:migrate:dev
psql "$DATABASE_URL" -f apps/api/test/integration/rls-tenants.sql
```

Expected output: `ok 1` through `ok N` with no `not ok`.

---

## Scenario 9 — Desktop parity (optional but recommended)

1. Launch the desktop renderer. Sign in as the Guard.
2. Confirm the TopBar renders the same `TenantSelector` + `TenantAvatar` (imported from `@ramcar/features/tenant-selector`).
3. Switch tenants via the selector. Expect the same behaviour as web (Zustand update, React Query invalidation, no navigation change).
4. Visit the Access Log page; confirm events match the selected tenant.
5. Go offline (toggle airplane mode). Trigger a visit-person creation. Confirm the existing SyncSlice flows the write through the outbox. The active tenant context (from the cached JWT + `localStorage`) is used for the outbox event's `tenant_id`.

**Pass criteria**: Desktop TopBar UI matches web; offline write carries the correct `tenant_id`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `tenant_ids` claim absent from JWT | Hook not enabled | `supabase/config.toml` → `[auth.hook.custom_access_token]` → `enabled = true` + restart auth (`pnpm db:start --restart`). |
| Admin can't PATCH their own tenant | JWT predates migration | Sign out / back in, or wait for token refresh (default TTL ≈ 1h). |
| Selector trigger shows wrong thumbnail after switch | `activeTenantId` reads from stale Zustand state | Verify `useAppStore((s) => s.activeTenantId)` is used (not a memoized snapshot). |
| Image upload 413 despite <2 MB file | Bucket `file_size_limit` mis-set | `supabase storage buckets update tenant-images --file-size-limit 2097152`. |
| Frontend still calls `/api/tenants` on the old `?tenant=slug` convention | Caller not migrated | grep remaining `apps/web/src/features/users/hooks/use-tenants.ts`; remove and point to `@/features/tenants/hooks/use-tenants`. |

---

## Success-criteria checkpoints

| Criterion | How to verify |
|-----------|---------------|
| SC-001 (≤30 s tenant create) | Scenario 1 stopwatch. |
| SC-002 (≤3 s tenant switch) | Scenario 3 performance panel. |
| SC-003 (cross-tenant denial) | Scenarios 2, 8. |
| SC-004 (no access lost post-migration) | `select count(*) from user_tenants` == `select count(*) from profiles where role in ('admin','guard') and tenant_id is not null`. |
| SC-005 (first-switch success) | Scenario 3 walk-through with unfamiliar tester. |
| SC-006 (all strings translated) | Toggle `/es` ↔ `/en` in the URL; spot-check no English fallback in Spanish mode. |
| SC-007 (<1 s catalog render, p95) | DevTools Performance panel; repeat 10× and observe the 95th. |
| SC-008 (no regression for residents) | Scenario 6 ± inspect each resident-visible page (Access Log, Visits, Residents). |
| SC-009 (≤10 s Admin create→switch) | Scenario 4 stopwatch. |
