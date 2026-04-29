# Quickstart: Single-Tenant UI Scope for Admins and Guards (v1)

**Spec**: 024 | **Branch**: `024-non-superadmin-tenant-scope` | **Date**: 2026-04-29

This is the manual verification script for reviewers and QA. Each section maps to a User Story and asserts the FR-* behaviors directly. Running all five sections covers SC-001 through SC-008.

## Prerequisites

```bash
# 1. Pull and check out the branch
git checkout 024-non-superadmin-tenant-scope

# 2. Install dependencies
pnpm install

# 3. Start the local Supabase + apply migrations + seed
pnpm db:start
pnpm db:reset

# 4. Generate types (no-op if no migrations changed; harmless to run)
pnpm db:types

# 5. Run all apps in dev mode (in another terminal)
pnpm dev
```

You should now have:
- `http://localhost:3000` — `apps/web` portal
- `apps/desktop` Electron window — guard booth app
- `http://localhost:3001` (or whatever your env sets) — `apps/api` NestJS

The seed should provide the following test accounts (verify by reading `supabase/seed.sql`):

| Email | Password | Role | tenant_ids |
|-------|----------|------|------------|
| `superadmin@test.com` | `Test123!` | super_admin | `*` |
| `admin_with_zero_tenants@test.com` | `Test123!` | admin | `[]` |
| `admin_with_one_tenant@test.com` | `Test123!` | admin | `[t1]` |
| `guard@test.com` | `Test123!` | guard | `[t1]` |
| `resident@test.com` | `Test123!` | resident | `[t1]` |

If your seed differs, create the missing rows by hand via the SuperAdmin Users-catalog UI before continuing.

---

## Section 1 — Selector visibility (Story 1, FR-001/002, SC-001)

### 1.1 Admin with one tenant — selector is hidden

1. Open `http://localhost:3000/login`.
2. Sign in as `admin_with_one_tenant@test.com`.
3. Land on the dashboard. Open DevTools → Elements.
4. ✅ Confirm: the top bar shows the tenant **name + avatar** as plain text (no chevron, no popover trigger).
5. ✅ Confirm: `document.querySelector('header [role="combobox"]')` returns `null`.
6. Click the area where the selector used to be.
7. ✅ Confirm: nothing happens (no popover opens).
8. Navigate: Dashboard → Users → Residents → Visitors → Logbook → Tenants.
9. ✅ Confirm: the selector remains a plain static display on every page.

### 1.2 Guard on desktop — selector is hidden

1. Sign out the web session.
2. Launch the desktop app (or focus the running window).
3. Sign in as `guard@test.com`.
4. ✅ Confirm: top bar shows the tenant name as plain static text.
5. ✅ Confirm: clicking the area does nothing (no popover).
6. Navigate to the access-log capture screen.
7. ✅ Confirm: every list, dropdown, search result is scoped to the guard's one tenant. (No data from other tenants appears.)

### 1.3 SuperAdmin — selector renders fully

1. In a separate browser profile, sign in as `superadmin@test.com`.
2. ✅ Confirm: the top bar has a clickable selector with chevron.
3. Click it.
4. ✅ Confirm: the popover lists every tenant in the system.
5. Pick a different tenant.
6. ✅ Confirm: the spec-021 confirmation dialog appears, then the switch applies.
7. ✅ Confirm: lists / counts / filters reload, scoped to the new tenant.

### 1.4 Admin with multiple legacy tenants — deterministic current tenant

1. As SuperAdmin, open Users → edit `admin_with_one_tenant@test.com` → assign a second tenant via the Users form.
2. Refresh the SuperAdmin page; verify two `user_tenants` rows exist for that admin (via `psql` or the Supabase Studio).
3. Sign out. Sign in as `admin_with_one_tenant@test.com` (now multi-tenant at the data layer).
4. ✅ Confirm: the top bar still shows a static, non-interactive display.
5. Open DevTools → Application → Local Storage → check `ramcar.auth.activeTenantId`.
6. ✅ Confirm: the value matches the Admin's `profiles.tenant_id` (priority 1 of the deterministic rule).
7. As SuperAdmin, set the Admin's `profiles.tenant_id` to a value not in their `tenant_ids` (manual SQL, simulating bad data).
8. Sign out / sign in as the Admin again.
9. ✅ Confirm: `localStorage["ramcar.auth.activeTenantId"]` is now the lexicographically-first tenant by name (priority 3).

---

## Section 2 — Tenants-create gating (Story 2, FR-008–FR-013, SC-002, SC-006)

### 2.1 Admin with zero tenants — Sheet opens

1. Sign in as `admin_with_zero_tenants@test.com`.
2. Navigate to `/catalogs/tenants`.
3. ✅ Confirm: the table is empty (no rows).
4. Click the **New Tenant** button.
5. ✅ Confirm: the right-side Sheet opens (the spec-020 form).
6. Fill `name = "My First Community"`, `address = "123 Test St"`. Submit.
7. ✅ Confirm: success toast appears; the new tenant is in the table.

### 2.2 Same Admin — Create button now opens ContactSupportDialog

1. Stay signed in as the same Admin.
2. ✅ Confirm: the table now has one row.
3. Click **New Tenant** again.
4. ✅ Confirm: the Sheet does **not** open.
5. ✅ Confirm: a centered Dialog appears with:
   - title `"Contact support to add another community"`
   - body sentence about one-community accounts
   - support-instruction line (email or in-app help)
   - **OK** button only (no input fields, no link to the Sheet)
6. Press `Escape`. ✅ Confirm: dialog closes.
7. Click **New Tenant** a third time.
8. Press the **OK** button.
9. Click **New Tenant** a fourth time.
10. Click outside the dialog content.
11. ✅ Confirm: dialog closes each time, no Sheet ever opens.

### 2.3 Same session, no manual reload (FR-012)

The previous step verifies T1 → T3 (R3) within a single session: the Admin signed in once, created one tenant, and immediately got the dialog on the next click — without signing out, without a manual page refresh, without a token refresh.

✅ Confirm in the React Query DevTools (or by network tab): `["tenants", …]` was invalidated by `useCreateTenant.onSuccess` and refetched between the two clicks.

### 2.4 SuperAdmin — Sheet always opens (FR-013)

1. Sign out. Sign in as `superadmin@test.com`.
2. Navigate to `/catalogs/tenants`.
3. ✅ Confirm: the table shows every tenant in the system.
4. Click **New Tenant**.
5. ✅ Confirm: the Sheet opens.
6. Cancel. Click **New Tenant** ten times.
7. ✅ Confirm: the Sheet opens each time. The ContactSupportDialog never appears.

### 2.5 Admin existing-tenant path (no first-time fixture)

1. Sign in as `admin_with_one_tenant@test.com` (already has one tenant assigned).
2. Navigate to `/catalogs/tenants`.
3. ✅ Confirm: the table shows their one tenant.
4. Click **New Tenant**.
5. ✅ Confirm: the ContactSupportDialog opens immediately (no Sheet).

---

## Section 3 — User-form tenant field (Story 3, FR-014–FR-019, SC-003, SC-004)

### 3.1 SuperAdmin creator — single-select with all tenants

1. Sign in as `superadmin@test.com`.
2. Navigate to `/catalogs/users`.
3. Click **New User**.
4. Fill `fullName = "Test Guard"`, `email = "test_guard_1@test.com"`, `role = "guard"`.
5. ✅ Confirm: the tenant field is a `<Select>` with a chevron. There are **no** chips, no primary-radio, no X buttons.
6. Open the select.
7. ✅ Confirm: every tenant in the system is listed.
8. Pick one tenant. Submit.
9. ✅ Confirm: success toast. New user appears in the list.
10. Open DevTools → Network. Find the `POST /api/users` request body.
11. ✅ Confirm: payload contains `tenant_ids: ["<the-id>"]` (length-1 array) and `primary_tenant_id: "<the-id>"`. NOT a multi-tenant array.

### 3.2 Admin creator — single-select pre-filled and locked

1. Sign out. Sign in as `admin_with_one_tenant@test.com`.
2. Navigate to `/catalogs/users` (Admin has access).
3. Click **New User**.
4. Fill `fullName = "Test Resident A"`, `email = "test_resident_a@test.com"`, `role = "resident"`.
5. ✅ Confirm: the tenant `<Select>` is rendered.
6. ✅ Confirm: the value is pre-set to the Admin's tenant name (the only one).
7. ✅ Confirm: the select is **disabled** — the chevron is visually muted, clicking does not open the menu, keyboard focus + Space/Enter does not open it.
8. ✅ Confirm: a hint paragraph below the select reads (English): `"New users are added to your community. Contact support if you need to assign a different one."`
9. Submit the form.
10. ✅ Confirm: the new resident is created with `profiles.tenant_id` equal to the Admin's tenant.

### 3.3 Admin creator — same lock for guard role

1. As the same Admin, click **New User**.
2. Fill `fullName = "Test Guard B"`, `email = "test_guard_b@test.com"`, `role = "guard"`.
3. ✅ Confirm: the tenant select remains disabled and pre-filled.
4. Submit.
5. ✅ Confirm: payload at `POST /api/users` shows `tenant_ids: ["<admin's-tenant>"]`, `primary_tenant_id: "<admin's-tenant>"`.
6. Verify in DB:
   ```sql
   SELECT tenant_id FROM user_tenants WHERE user_id = '<the-new-guard-id>';
   ```
   ✅ Confirm: exactly one row, equal to the Admin's tenant.

### 3.4 SuperAdmin editing a legacy multi-tenant user (FR-019)

Pre-step: as SuperAdmin, manually insert a second `user_tenants` row for an existing guard:
```sql
INSERT INTO user_tenants (user_id, tenant_id) VALUES ('<some-guard-id>', '<another-tenant-id>');
```

1. As SuperAdmin, navigate to Users → click the row → edit.
2. ✅ Confirm: the tenant `<Select>` shows **one** value (the user's `profiles.tenant_id`).
3. Change it to a different tenant.
4. Submit.
5. Verify in DB:
   ```sql
   SELECT tenant_id FROM user_tenants WHERE user_id = '<the-guard-id>';
   ```
   ✅ Confirm: exactly **one** row, equal to the newly-selected tenant. The legacy second row is gone (FR-019).

### 3.5 Validation (FR-017)

1. As SuperAdmin, click **New User**.
2. Fill `fullName`, `email`, `role = "guard"`. Leave the tenant select empty (don't pick anything).
3. Click **Create**.
4. ✅ Confirm: validation error appears below the tenant select with a translated message (e.g., `"Required"` in English / `"Requerido"` in Spanish).
5. ✅ Confirm: no network request was sent (Network tab shows no `POST /api/users`).

---

## Section 4 — SuperAdmin regression (Story 4, FR-020/021, SC-005)

The simplest way to verify SC-005 is to run the existing E2E tests for specs 020 and 021 unchanged:

```bash
pnpm test:e2e -- specs/020 specs/021
```

✅ Confirm: all SuperAdmin acceptance tests pass.

Manual smoke (5 minutes):

1. Sign in as SuperAdmin.
2. Switch tenants via the selector (with confirmation dialog) — works.
3. Open `/logbook` — Bitacora dropdown reflects the active tenant (spec 021 FR-016).
4. Open `/catalogs/tenants` — full list, Create always opens Sheet, no gating.
5. Open `/catalogs/users` — multi-tenant chip control is **gone** (replaced with single-select); but the single-select for SuperAdmin remains free to change to any tenant.

---

## Section 5 — API regression (FR-022)

```bash
pnpm test --filter=@ramcar/api
pnpm test:e2e --filter=@ramcar/api
```

✅ Confirm: 100% pass on all API suites. Any failure here indicates an accidental API edit (a violation of FR-022).

```bash
git diff main -- apps/api packages/shared/src/validators
```

✅ Confirm: the diff is **empty** (no API or DTO changes from this branch). One exception: if the team chose to remove `users.validation.tooManyTenants` and friends from `@ramcar/shared` because the v1 form no longer references them, that's documented in the contracts and acceptable. But there should be no schema change to `createUserSchema` / `updateUserSchema`.

---

## Done

If all five sections pass, the spec is functionally complete. Open a PR with the diff summary; the linked `tasks.md` (Phase 2) will enumerate the implementation tasks.

If any section fails, file the failure under the relevant FR number and rerun after the fix.
