# Contract — Logbook UI (Web App)

**Feature**: `019-logbook-bitacora`
**Purpose**: Defines the web-app-visible contract for the Logbook: routes, layout, subpage column sets, filter persistence, and empty/error states.

## Routes

All routes live under `/(dashboard)` in `apps/web`. Existing page files on this branch are rewritten to consume the new feature slice.

| Route | Purpose | File |
|---|---|---|
| `/logbook` | Redirects to `/logbook/visitors` (server component, keeps the already-shipped redirect) | `apps/web/src/app/[locale]/(dashboard)/logbook/page.tsx` |
| `/logbook` (layout) | Hosts tabs + filter toolbar; receives the active subpage via `{ children }` | `apps/web/src/app/[locale]/(dashboard)/logbook/layout.tsx` *(new)* |
| `/logbook/visitors` | Renders `<LogbookSubpage personType="visitor" />` | `apps/web/src/app/[locale]/(dashboard)/logbook/visitors/page.tsx` |
| `/logbook/providers` | Renders `<LogbookSubpage personType="service_provider" />` | `apps/web/src/app/[locale]/(dashboard)/logbook/providers/page.tsx` |
| `/logbook/residents` | Renders `<LogbookSubpage personType="resident" />` | `apps/web/src/app/[locale]/(dashboard)/logbook/residents/page.tsx` |

**Navigation gating**: Already implemented in `packages/shared/src/navigation/sidebar-config.ts` — the `logbook` item is restricted to `roles: ["super_admin", "admin"]` and `platforms: ["web"]`. No changes to sidebar config for this feature.

## Layout (`<LogbookShell>`)

Rendered by `/logbook/layout.tsx`. Structure:

```
┌──────────────────────────────────────────────────────────────┐
│  <PageHeading t="logbook.title" />                           │
│                                                              │
│  <Tabs value="visitors | providers | residents">             │
│     [Visitors]  [Providers]  [Residents]                     │
│  </Tabs>                                                     │
│                                                              │
│  <LogbookToolbar>                                            │
│     [DateRangeFilter]  [TenantSelect? (SuperAdmin)]          │
│     [ResidentSelect?]  [SearchInput]  [ExportMenu]           │
│  </LogbookToolbar>                                           │
│                                                              │
│  {children}  ← the active subpage outlet (<LogbookSubpage>)  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Tab semantics**:
- Next.js App Router does NOT rerun the shared layout when moving between sibling routes under the same layout — which is what the spec needs (no full page reload; tab switch < 1 s, SC-006).
- Tab buttons are `<Link>` elements to `/logbook/<subpage>` so browser back/forward work and the URL stays truthful. Active state is derived from `usePathname()`.
- Filter state is URL-persisted (see below), so tab switches preserve the query string *except* filters that don't apply (e.g., the Providers subpage keeps `date_*`, `search`, `tenant_id`, `resident_id` but the table query converts personType from the path).

## Toolbar (`<LogbookToolbar>`)

- **Date range**: `<DateRangeFilter>` — a single trigger rendering the current range as a readable string (e.g., `"Today"`, `"Last 7 days"`, `"Apr 15 – Apr 22"`). Opens a Popover with:
  - Presets list: Today, Last 7 days, Last 30 days, Last 3 months, Custom range.
  - When "Custom range" is picked: two `<DatePicker>` inputs (from `@ramcar/ui`) side by side with `from` / `to` labels. A "Apply" button commits the choice; an inline translated error surfaces when `to < from`.
  - Commit resets `page` to 1 and writes `date_preset` + (for Custom) `date_from` / `date_to` to the URL.
- **Tenant selector** (`<TenantSelect>`): rendered only when `useRole().role === "super_admin"`. Populated from `useTenants()` (`GET /tenants`). Options: `All tenants` (default, omits `tenant_id` from URL) + one row per authorized tenant. The Admin never sees this component in the DOM (component returns `null`).
- **Resident combobox** (`<ResidentSelect>` from `@ramcar/features`): rendered when `scope.kind === "single"`. Hidden in SuperAdmin "all tenants" mode (research R7). Selecting a resident sets `resident_id` in the URL and resets `page` to 1. The combobox fetches via the existing `/residents` endpoint.
- **Search input**: free-text with 300 ms debounce. The debounced value becomes the `search` URL param and the TanStack Query term. Pressing `Esc` clears.
- **Export menu** (`<ExportMenu>`): a dropdown with "Export current view" and "Export all…". The former downloads immediately with the active filter set (minus pagination); the latter opens `<ExportAllDialog>`.
- **Empty-filter affordance**: none. Filters are always in a valid state because the URL decoder provides defaults.

## Table (`<LogbookTable>`)

Shared component consumed by all three subpages. Props:

```ts
interface LogbookTableProps {
  columns: ColumnDef<AccessEventListItem>[];   // shadcn/TanStack Table column set
  data: AccessEventListItem[];
  meta: PaginationMeta;
  isLoading: boolean;
  error?: Error | null;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: 10 | 25 | 50 | 100) => void;
  showTenantColumn: boolean;                    // true iff SuperAdmin "all tenants"
}
```

**Rendering states**:
- `isLoading` (initial): rows replaced with `<Skeleton>` placeholders sized like 5 data rows. Pagination controls disabled.
- `error`: centered card with a translated error message and a Retry button that calls `refetch()`.
- `data.length === 0`: centered `<EmptyState>` with `logbook.empty.title` / `logbook.empty.description` translations (FR-009).
- Populated: shadcn `<Table>` with the column set, TanStack row IDs set to `item.id`.

**Row interaction**: FR-005 — rows are NOT clickable in this MVP. Cells do not open sheets or detail views.

**Pagination controls** (below the table):
- Previous / Next buttons
- `<PageIndicator>` rendering `{page} / {totalPages}` (translated key `logbook.pagination.indicator`)
- `<PageSizeSelect>` with options 10 / 25 / 50 / 100 (translated label `logbook.pagination.pageSize`)

## Subpage column sets

The three subpages differ only in their column definitions. Each column is a `ColumnDef<AccessEventListItem>` with an `i18n`-driven `header` and a `cell` render function.

### Visitors subpage columns

| Header i18n key | Cell source | Notes |
|---|---|---|
| `logbook.columns.code` | `row.visitPerson.code` | Monospaced font. |
| `logbook.columns.name` | `row.visitPerson.fullName` | Truncated with title attribute. |
| `logbook.columns.direction` | translated badge of `row.direction` | `logbook.direction.entry` / `logbook.direction.exit`. |
| `logbook.columns.residentVisited` | `row.visitPerson.residentFullName ?? "—"` | — |
| `logbook.columns.vehicle` | plate + brand or `""` | `row.accessMode === "vehicle" ? ` `${plate} — ${brand}` `: ""` |
| `logbook.columns.status` | `<StatusBadge status={row.visitPerson.status} />` | Colours: allowed=green, flagged=amber, denied=red. |
| `logbook.columns.registeredBy` | `row.registeredBy.fullName` | — |
| `logbook.columns.date` | formatted `row.createdAt` | `Intl.DateTimeFormat(locale, { dateStyle, timeStyle })` in effective tenant zone. |

SuperAdmin all-tenants mode prepends `logbook.columns.tenant` → `row.tenantName`.

### Providers subpage columns

Same as Visitors except:
- Replace `residentVisited` with `logbook.columns.company` → `row.visitPerson.company ?? "—"`.

### Residents subpage columns

| Header i18n key | Cell source |
|---|---|
| `logbook.columns.name` | `row.resident.fullName` |
| `logbook.columns.unit` | `row.resident.unit ?? "—"` |
| `logbook.columns.direction` | translated badge of `row.direction` |
| `logbook.columns.mode` | translated label of `row.accessMode` |
| `logbook.columns.vehicle` | plate + brand when mode = vehicle, else `""` |
| `logbook.columns.registeredBy` | `row.registeredBy.fullName` |
| `logbook.columns.date` | formatted `row.createdAt` |

## Filter persistence (URL ↔ state)

Implemented in `useLogbookFilters(personType)` (inside `features/logbook/hooks/`).

**Read on mount**: parse `useSearchParams()` into a `LogbookFilters` object.

```ts
interface LogbookFilters {
  datePreset: "today" | "last_7d" | "last_30d" | "last_90d" | "custom";
  dateFrom?: string;             // YYYY-MM-DD, only when datePreset === "custom"
  dateTo?: string;               // YYYY-MM-DD, only when datePreset === "custom"
  tenantId?: string;             // SuperAdmin only
  residentId?: string;
  search?: string;
  page: number;                  // default 1
  pageSize: 10 | 25 | 50 | 100;  // default 25
}
```

**Write on change**: `router.replace("/logbook/<subpage>?" + serialise(filters))`.

- Defaults are omitted from the URL (i.e., `datePreset=today`, `page=1`, `pageSize=25` do not appear).
- Search input debounces 300 ms before writing to the URL.
- Any filter change other than `page` resets `page` to `1` before writing.

## Export dialog (`<ExportAllDialog>`)

Opened by Export menu → "Export all…". Structure:

```
<Dialog>
  <DialogTitle>logbook.export.allTitle</DialogTitle>
  <DialogDescription>logbook.export.allDescription</DialogDescription>

  <DateRangeFilter> ← presets + custom range, same component as the toolbar
  <InlineError>     ← visible only if the user clicks Export without a range

  <Footer>
    [Cancel]  [Export]  ← Export disabled while loading
  </Footer>
</Dialog>
```

- The modal's date range is independent from the toolbar's. It MUST force the user to choose (FR-030 / Acceptance Scenario US10-1); no implicit default.
- Clicking "Export" calls `apiClient.download("/access-events/export", { params: { personType, tenantId, dateFrom, dateTo, locale } })` and triggers a browser download with the returned filename.
- Cancelling issues no network request.

## Error & edge-case rendering

| Case | Rendering |
|---|---|
| 401 from list | React Query's `onError` calls `window.location.href = "/login"` (existing behaviour across the app via the shared `apiClient`). |
| 403 (role) | The route is guarded by the layout's `useRole()` check redirecting to `/dashboard`. Secondary: if a 403 still reaches the client, render `<EmptyState variant="error" />` with a translated "Not authorised" label. |
| 403 (tenant mismatch — Admin passing a different `tenantId` via manually edited URL) | Same error empty state; the URL decoder ignores the mismatched `tenant_id` for Admins anyway (it's a SuperAdmin-only filter), so this is rare. |
| 5xx | `<EmptyState variant="error">` + Retry. |
| Zero rows | `<EmptyState>` centered, translated. |
| "Custom range" with `to < from` | Apply button disabled; inline translated error. No network request. |
| SuperAdmin with 0 authorized tenants | Tenant selector renders empty; table shows zero-rows empty state. No API call. |
| Admin without `tenant_id` in JWT | Redirects to `/unauthorized` (existing middleware already handles this). |

## i18n keys (to be added to `@ramcar/i18n`)

Grouped under `logbook.*`. Required in all active locales (`en`, `es` today).

```
logbook.title
logbook.tabs.visitors
logbook.tabs.providers
logbook.tabs.residents

logbook.toolbar.search.placeholder
logbook.toolbar.search.ariaLabel
logbook.toolbar.dateRange.trigger
logbook.toolbar.dateRange.apply
logbook.toolbar.dateRange.cancel
logbook.toolbar.dateRange.invalidRange
logbook.toolbar.tenantSelect.placeholder
logbook.toolbar.tenantSelect.allOption
logbook.toolbar.resident.placeholder  (only if overriding default)

logbook.presets.today
logbook.presets.last_7d
logbook.presets.last_30d
logbook.presets.last_90d
logbook.presets.custom

logbook.columns.tenant
logbook.columns.code
logbook.columns.name
logbook.columns.company
logbook.columns.residentVisited
logbook.columns.direction
logbook.columns.vehicle
logbook.columns.status
logbook.columns.registeredBy
logbook.columns.date
logbook.columns.unit
logbook.columns.mode

logbook.direction.entry
logbook.direction.exit
logbook.mode.vehicle
logbook.mode.pedestrian
logbook.status.allowed
logbook.status.flagged
logbook.status.denied

logbook.empty.title
logbook.empty.description
logbook.error.title
logbook.error.retry

logbook.pagination.previous
logbook.pagination.next
logbook.pagination.indicator          // "{page} / {totalPages}"
logbook.pagination.pageSize           // "Rows per page"
logbook.pagination.pageSizeOptions    // not translated; just numbers

logbook.export.menu.current
logbook.export.menu.all
logbook.export.allTitle
logbook.export.allDescription
logbook.export.allRequireRange
logbook.export.submit
logbook.export.cancel
logbook.export.generating
logbook.export.error
logbook.export.noRows
```

The sibling `LOGBOOK_CSV_LABELS` static table in `@ramcar/shared` mirrors the column-header and enum cell labels for server-side CSV emission (research R9). Both files must move together when a label changes.
