# Quickstart — Access Log (Bitácora)

**Feature**: `019-logbook-bitacora`
**Audience**: Developer or QA validating a local build of this feature.

## Prerequisites

- Node 22 LTS (`.nvmrc`), `pnpm` installed.
- Supabase local stack running: `pnpm db:start`.
- Migrations applied (including the Phase 2 migration that adds `tenants.time_zone` and the `search_access_events` RPC): `pnpm db:migrate:dev && pnpm db:types`.
- Seed data containing at least:
  - Two tenants: `Tenant A`, `Tenant B`.
  - A SuperAdmin authorised for both (A and B).
  - An Admin for `Tenant A` only.
  - A Guard and a Resident (one each) in `Tenant A`.
  - At least 30 access events in `Tenant A` created today, mixing `person_type = visitor`, `service_provider`, `resident`, with some entries using `access_mode = vehicle` and vehicles registered.
  - At least 5 access events in `Tenant B` created today.

## Running locally

```bash
pnpm dev
# Watches all workspaces. Apps listen on:
#  - web    http://localhost:3000
#  - api    http://localhost:3001
```

## Smoke flow — Admin of Tenant A (happy path)

1. **Sign in** as `admin-a@example.com` at `http://localhost:3000/en`.
2. Click **Logbook** in the sidebar. URL becomes `/en/logbook/visitors`. Filter bar shows `Today`.
3. **Table populated**: rows appear within ~1 s. Columns: `Code | Name | Direction | Resident visited | Vehicle | Status | Registered by | Date`. Status is a translated badge. Vehicle column empty for pedestrian rows.
4. **Tab to Providers**: click `Providers`. URL becomes `/en/logbook/providers`. Table switches. `Resident visited` column replaced by `Company`. Filters (date range) preserved.
5. **Tab to Residents**: click `Residents`. URL becomes `/en/logbook/residents`. Columns: `Name | Unit | Direction | Mode | Vehicle | Registered by | Date`. `Unit` cell shows the resident's `profiles.address` or `—` when null.
6. **Preset**: pick `Last 7 days` from the date filter. URL gains `?date_preset=last_7d`. Page resets to 1. More rows appear.
7. **Custom range**: pick `Custom range`, set `from` to 3 days ago, `to` to yesterday, Apply. URL gains `?date_preset=custom&date_from=...&date_to=...`. Rows reflect the selection.
8. **Invalid range**: set `to < from`. Apply disabled; inline translated error shown. No network request fires.
9. **Search**: type `john` into the search input. After 300 ms, exactly one network request fires (`/access-events?personType=resident&search=john&...`). Rows filter. Clearing the input restores unfiltered rows.
10. **Resident combobox**: pick a resident by partial name. URL gains `?resident_id=<uuid>`. Rows filter to that resident's own events. Clear the combobox → rows return.
11. **Pagination**: if total > 25, Next/Previous work; page indicator updates. Change page size to `50`. URL gains `?page_size=50`. Rows per page doubles.
12. **URL persistence**: copy the URL, open it in a new tab. The same filter state (date range, search, resident, page, page size) is restored on first paint.
13. **Refresh**: reload the page. Same state restored.
14. **Export current view**: click `Export` → `Export current view`. A CSV downloads named `logbook-residents-<yyyy-mm-dd>.csv`. Open it in Excel/Numbers:
    - First row is the translated header (`Name, Unit, Direction, Mode, Vehicle, Registered by, Date`).
    - Rows contain every match for the active filters (not just the visible page).
    - Spanish accents render correctly (UTF-8 BOM).
15. **Export all**: click `Export` → `Export all…`. A modal opens. Click `Export` without choosing a range → inline translated error, no download. Pick `Last 30 days`, click `Export`. A CSV downloads with all 30-day rows (ignoring the toolbar's date range). Filename still reflects the subpage.
16. **Zero rows**: switch to `Custom range` with `from = 2020-01-01, to = 2020-01-01`. Empty state appears centered with translated text.
17. **No rows → Export current view**: the Export button's "Export current view" item shows a translated "No rows to export" label and is disabled.

## Smoke flow — SuperAdmin (multi-tenant)

1. Sign in as `super@example.com`.
2. Go to `/en/logbook`. Redirect → `/en/logbook/visitors`. Filter bar now includes a **Tenant selector** (not visible to Admin).
3. Default is `All tenants`. Table shows events from both Tenant A and Tenant B. A `Tenant` column appears as the first column.
4. Pick `Tenant B` in the selector. URL gains `?tenant_id=<tenant-B-uuid>`. Rows narrow to Tenant B only. The `Tenant` column disappears. The `Resident` combobox becomes available (it was hidden under "All tenants").
5. Clear the tenant selector → back to `All tenants`. `Tenant` column returns. Resident combobox hides.
6. **Export current view** in `All tenants` mode: downloads a CSV with the `Tenant` column prepended.
7. **Cross-tenant rejection (manual URL edit)**: append `?tenant_id=<random-uuid>` to the URL. React Query receives 403; error empty state appears.

## Smoke flow — Guard (must be denied)

1. Sign in as `guard-a@example.com`.
2. The sidebar does NOT show the `Logbook` item (confirmed by `sidebar-config.ts`).
3. Navigate manually to `/en/logbook/visitors`. The dashboard layout's role check redirects to `/dashboard` (existing guard).
4. Direct API probe: `curl -H "Authorization: Bearer $GUARD_JWT" http://localhost:3001/access-events?personType=visitor` → **403 Forbidden**.
5. Direct API probe for export: same URL + `/export` → **403 Forbidden**.

## Smoke flow — Resident (must be denied)

Identical to Guard: sidebar hides the item, manual nav redirects, direct API calls return **403**.

## Automated test suites to run

```bash
# Backend unit + integration
pnpm --filter @ramcar/api test
# → includes new tests:
#   apps/api/src/modules/access-events/__tests__/access-events.controller.spec.ts  (RBAC + tenant rules)
#   apps/api/src/modules/access-events/__tests__/access-events.service.spec.ts     (filter resolution, scope branching)
#   apps/api/src/modules/access-events/__tests__/access-events.repository.spec.ts  (integration w/ Supabase local)

# Shared schemas
pnpm --filter @ramcar/shared test
# → includes new tests:
#   packages/shared/src/validators/access-event.test.ts  (new accessEventListQuerySchema, accessEventExportQuerySchema cases)

# Frontend unit tests
pnpm --filter @ramcar/web test
# → includes new tests:
#   apps/web/src/features/logbook/__tests__/use-logbook-filters.test.ts  (URL <-> state)
#   apps/web/src/features/logbook/__tests__/logbook-toolbar.test.tsx     (filter interactions)
#   apps/web/src/features/logbook/__tests__/logbook-table.test.tsx       (skeleton, empty, error states)
#   apps/web/src/features/logbook/__tests__/export-menu.test.tsx         (download helper wiring, modal flow)

# Playwright E2E (optional but recommended before merge)
pnpm --filter @ramcar/web test:e2e -- logbook.spec.ts
```

## Access-control audit (maps to SC-004)

Run a scripted request matrix and confirm every denial:

```bash
# Variables (adjust to your local seed)
API=http://localhost:3001
ADMIN_A_JWT=...
ADMIN_B_JWT=...
SUPERADMIN_JWT=...
GUARD_JWT=...
RESIDENT_JWT=...
TENANT_A=00000000-0000-0000-0000-00000000000a
TENANT_B=00000000-0000-0000-0000-00000000000b
TENANT_X=00000000-0000-0000-0000-00000000000x  # not authorised for anyone

# 1. Guard → 403
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $GUARD_JWT" "$API/access-events?personType=visitor"
# expect: 403

# 2. Resident → 403
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $RESIDENT_JWT" "$API/access-events?personType=visitor"
# expect: 403

# 3. Admin A without tenant_id → own tenant
curl -s -H "Authorization: Bearer $ADMIN_A_JWT" "$API/access-events?personType=visitor" | jq '.data | length'
# expect: matches Tenant A today's visitor count

# 4. Admin A explicitly targeting Tenant B → 403
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $ADMIN_A_JWT" "$API/access-events?personType=visitor&tenantId=$TENANT_B"
# expect: 403

# 5. SuperAdmin without tenant_id → both tenants
curl -s -H "Authorization: Bearer $SUPERADMIN_JWT" "$API/access-events?personType=visitor" | jq '.data | map(.tenantId) | unique | length'
# expect: >= 2

# 6. SuperAdmin targeting Tenant X (not authorised for anyone) → 403
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $SUPERADMIN_JWT" "$API/access-events?personType=visitor&tenantId=$TENANT_X"
# expect: 403
```

All six commands must produce the expected outcome to satisfy SC-004 (zero cross-tenant leakage, 100% role denial).

## Known "feature works in spite of" caveats (non-blocking)

- **Tenant time zone defaults to `UTC`** until ops sets `tenants.time_zone = 'America/Tijuana'` (or equivalent) for real rows. Today's boundaries are computed in UTC until then. Filename date segment uses UTC in SuperAdmin "all tenants" mode regardless.
- **Residents-subpage `Unit` column reads from `profiles.address`**. If product decides to introduce a dedicated `unit_number` column in a later spec, only the column's `cell` function and the DB field need to change; the DTO `AccessEventListItem.resident.unit` shape stays.
- **Search with `ILIKE '%...%'`** on joined tables is fine at current scale (< 10k rows per tenant). If a tenant scales past this, introduce `pg_trgm` GIN indexes on the searched columns (future work, not this spec).
