# Phase 0 — Research: Access Log (Bitácora)

**Feature**: `019-logbook-bitacora`
**Date**: 2026-04-22

## Unknowns extracted from Technical Context

The spec is explicit about intent, columns, filters, and route shape. The remaining unknowns are mechanical or schema-level choices where more than one reasonable path exists:

- **R1** — Which HTTP shape serves the list: a new `GET /api/access-events` on the existing module, or a sibling module?
- **R2** — How is the export streamed so that "~5,000 rows in 15 s" (SC-005) holds without buffering the whole result set in memory?
- **R3** — How is "Today" computed in the tenant's local time zone (FR-016) given that the `tenants` table currently has no `time_zone` column?
- **R4** — How does the API enforce cross-tenant refusal (Admin explicitly targeting another tenant → 403, FR-025) while allowing SuperAdmin aggregation across authorized tenants (FR-026)?
- **R5** — How do filters stay in the URL and survive refresh (FR-022) without producing feedback loops between state and the URL?
- **R6** — What does the Residents subpage "Unit" column source from, given that `profiles` has no `unit_number` column?
- **R7** — How does the resident combobox reuse spec 018's `ResidentSelect` without introducing tenant-ID prop coupling?
- **R8** — What is the search implementation across `visit_persons.full_name`, `visit_persons.phone`, `visit_persons.company`, `vehicles.plate`, `vehicles.brand`, `vehicles.model`, `access_events.notes`, and the visited resident's `profiles.full_name` given that Supabase queries span four tables?
- **R9** — How is the CSV localized (headers + enum cells) in the user's locale without a server-side i18n library in `apps/api`?

Each is resolved below. No residual `NEEDS CLARIFICATION` remains after this phase.

---

## Decision R1 — Endpoints live inside the existing `access-events` module

**Decision**: Add `GET /api/access-events` (list) and `GET /api/access-events/export` (CSV stream) to `apps/api/src/modules/access-events/access-events.controller.ts`. Both handlers apply method-level `@Roles("super_admin", "admin")` to narrow from the controller's current class-level `@Roles("super_admin", "admin", "guard")`. Existing create/update/recent/last endpoints are unaffected.

**Rationale**:
- The module already owns the `access_events` entity; a new module would fork the read and write paths of the same table, inflating module count without architectural benefit (Principle II).
- Method-level `@Roles` override is the standard NestJS approach and already used elsewhere — it keeps guard plumbing identical across the controller.
- The existing `access-events.module.ts` already imports `UsersModule`, which gives the list service direct access to `UsersService` for resolving guard/resident full-name columns if joins are supplemented by lookups (R8 shows they won't be — we'll do joined SELECTs — but the dep is available).

**Alternatives considered**:
- **Sibling `logbook` module**: Would duplicate repository wiring and violate the "one module per business domain" shape called out in `CLAUDE.md`. Rejected.
- **Separate `access-events-query` module vs. the write module**: Overkill for two endpoints on one table. The handler method pair is <80 LOC combined after shared helpers.

---

## Decision R2 — Export streams with Supabase range pagination, backpressure-friendly CSV writer

**Decision**: `AccessEventsService.exportCsv` returns a `ReadableStream<Uint8Array>` that:

1. Emits the UTF-8 BOM + header row synchronously.
2. Loops in batches of **500** rows (`range(offset, offset+499)`), formatted to CSV lines, and enqueued into the stream. `await` between batches yields the event loop and lets the HTTP socket drain.
3. Finishes when a batch returns fewer than 500 rows.

The controller passes this stream back via `@Res({ passthrough: false })` + `StreamableFile`, setting:
- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="logbook-<subpage>-<yyyy-mm-dd>.csv"`
- `Cache-Control: no-store`

**Rationale**:
- 5,000 rows × 500/batch = 10 round-trips to Postgres. At a typical 30–80 ms per Supabase query, total DB time is 300–800 ms; CSV serialisation is O(rows) in pure JS and negligible. Comfortably inside SC-005 (15 s start).
- Batch size 500 is the sweet spot between round-trip overhead (smaller batches) and memory pressure (larger batches hold up to ~500 × 2 KB = 1 MB of rows in flight). Existing Supabase client conventions in the repo already use `.range()` for pagination.
- The stream approach means the client sees the first byte well before the last row is queried. This is what "streaming within 15 seconds" tests are measuring in SC-005.
- `StreamableFile` is the idiomatic NestJS 11 primitive for this; it composes with interceptors and the existing JSON-only filters without special-casing.

**Alternatives considered**:
- **Fetch all 5,000 rows, CSV, respond**: Simple, but buffers the full payload server-side. At ~2 KB/row that's 10 MB in memory — tolerable now, but grows linearly if tenants scale. Rejected for headroom.
- **Generate CSV asynchronously via BullMQ + email link**: The spec's Out of Scope list explicitly rejects async + email delivery. Not an option.
- **Let the client paginate `/access-events` and stitch client-side**: Pushes business logic to the frontend, breaks Principle VIII, and makes the filename/locale awareness harder to centralise. Rejected.

---

## Decision R3 — Tenant time zone: additive column with UTC default, non-blocking

**Decision**: Add `time_zone text NOT NULL DEFAULT 'UTC'` to `public.tenants` via a new migration `2026042200000X_add_time_zone_to_tenants.sql`. The Logbook service reads `tenants.time_zone` once per request (joined against the scoped tenant list) and uses it to compute the inclusive boundaries of "Today / Last 7/30/90 days / Custom range" in that IANA zone, then converts the boundaries to UTC for the `created_at` filter on `access_events`.

For SuperAdmin "all tenants" requests (multi-tenant), the server resolves boundaries **per tenant** and issues a single composite `WHERE (tenant_id = $1 AND created_at >= $a AND created_at < $b) OR (tenant_id = $2 AND created_at >= $c AND created_at < $d) OR ...`. This correctly respects each tenant's local "Today" without forcing a single global zone.

Existing tenant rows are backfilled with `'UTC'` by the column default; an ops step (out of scope for this feature's merge) will update real tenants to their correct IANA name (e.g., `America/Tijuana`) once confirmed with customers.

**Rationale**:
- The spec's Assumption explicitly says "If a tenant record lacks an explicit time zone, the system default (UTC) applies and the planning phase is expected to confirm/populate tenant time zones." A column with a UTC default satisfies both halves: the default makes the feature ship safely; the column makes per-tenant overrides trivial without code changes.
- IANA strings (`'America/Tijuana'`, `'Europe/Madrid'`) are what JavaScript's `Intl.DateTimeFormat` + `Temporal` / `date-fns-tz` accept, which keeps both API (`date-fns-tz`) and frontend (`Intl`) cheap.
- Per-tenant boundary resolution for SuperAdmin "all tenants" is the only honest interpretation of FR-016 when more than one tenant is scoped. Collapsing to the SuperAdmin's own local zone would under- or over-count events at DST transitions and across zones.
- Additive migration with a safe default is reversible and does not require data backfill.

**Alternatives considered**:
- **Use UTC globally, no column**: Violates FR-016's intent for tenants outside UTC. Acceptable as a transitional state but not as the final answer.
- **Store a time zone offset integer** (e.g., `-07`): Wrong over DST. Rejected.
- **Defer the column to a follow-up spec**: Leaves `/access-events?date_from=today` semantically ambiguous at this spec's merge point, and Assumption explicitly makes this a planning-phase deliverable. Rejected.

---

## Decision R4 — Tenant scoping rules per role

**Decision**: The list/export service implements a small authorization helper `resolveTenantScope(actorRole, actorTenantId, requestedTenantId, authorizedTenantIds?)` returning one of:

- `{ kind: "single", tenantId }` — when the actor is an Admin, OR a SuperAdmin who explicitly selected one tenant.
- `{ kind: "many", tenantIds }` — when the actor is a SuperAdmin with no `tenant_id` filter.
- throws `ForbiddenException` — when an Admin passes a `tenant_id` different from their own JWT tenant, OR when a SuperAdmin passes a `tenant_id` not in their authorized set.

`authorizedTenantIds` comes from `TenantsService.findAll()` when the actor is a SuperAdmin (it already returns the correct set — existing service reads all tenants for `super_admin`). For Admins the authorized set is implicitly the single JWT tenant and the helper does not need the list.

The repository `list(filters, scope)` accepts this tagged union and branches its Supabase query accordingly: `.eq("tenant_id", tenantId)` for `single`; `.in("tenant_id", tenantIds)` for `many`.

**Rationale**:
- Centralises the role decision inside the service, so the controller only forwards what it received from `@CurrentUser() + @CurrentTenant()` and the repository only sees a resolved scope — mirrors the separation Users/Residents modules already enforce.
- The explicit `ForbiddenException` for Admin cross-tenant matches FR-025 (403, not silent rewrite to own tenant). Silent rewrite is a subtle data-leak risk if a future client assumes the server accepts `tenant_id`; returning 403 forces the mismatch to surface.
- The existing `access_events` SELECT RLS independently prevents cross-tenant reads (defense-in-depth, Principle I + VI); the API layer's job is to produce the right query AND refuse hostile inputs, not to rely on RLS as the primary check.

**Alternatives considered**:
- **Silently overwrite `tenant_id` with the JWT tenant for Admins**: Simpler but weaker security story (masks misconfigured clients and violates the spec's explicit 403 rule, FR-025). Rejected.
- **Push the entire authorization decision to RLS alone**: Would still reject Admin-targets-another-tenant at the DB, but as 0 rows instead of 403, defeating the spec's observability requirement. Rejected.

---

## Decision R5 — URL as the source of truth for filter state

**Decision**: Filters are stored in the URL via Next.js `useSearchParams()` + `router.replace(...)`. A custom hook `useLogbookFilters(personType)` returns the parsed filter state and a setter. The setter debounces URL updates for the free-text search at 300 ms (so typing does not produce a history entry per keystroke) and uses `router.replace` (not `router.push`) for all filter changes so the browser's back button skips past filter churn.

Inputs/outputs:
- Reads: `?date_preset=today | last_7d | last_30d | last_90d | custom`, `?date_from=YYYY-MM-DD`, `?date_to=YYYY-MM-DD`, `?search=<free>`, `?resident_id=<uuid>`, `?tenant_id=<uuid>` (SuperAdmin only), `?page=<n>`, `?page_size=10|25|50|100`.
- Writes: serialises the current filter object to the same query keys. Omits falsy/default values so the URL stays short.
- Syncs the TanStack Query key `["access-events", tenantId, personType, parsedFilters]` so a URL change → a React Query refetch is automatic.

**Rationale**:
- URL persistence is the single source of truth; copying, reloading, and browser history all "just work" (FR-022, Acceptance Scenario US2-4).
- `router.replace` keeps a single history entry for the Logbook — users hitting Back go back to whatever they came from (e.g., `/dashboard`), not through 30 filter micro-states.
- Debouncing the URL update for search also keeps the server load per-keystroke bounded (FR-020's "exactly one search request per 300 ms window" is already served by debouncing the TanStack Query enabled term; debouncing the URL is additive for UX, not required by spec).

**Alternatives considered**:
- **Zustand for filter state, URL only on demand**: The spec explicitly requires URL persistence (FR-022); making it opt-in is backwards.
- **Next.js Server-Components search-params-driven rendering**: Interesting but complicates the client-interactive filter toolbar (debounced search, live popover for presets). Client-first is cheaper to reason about here.

---

## Decision R6 — Residents subpage "Unit" column maps from `profiles.address`

**Decision**: The Residents-subpage "Unit" column reads `profiles.address` verbatim. i18n label renders as `logbook.residents.columns.unit` ("Unit" / "Unidad"). When `address` is `null`, the cell shows the translated empty placeholder (a thin em dash `—`, identical to other nullable cells).

**Rationale**:
- `profiles.address` is the only address-like field that currently exists (`users_module` migration line 9). It is documented in `ExtendedUserProfile` with a permissive `string | null`. Real tenant data observed on the current branch stores the unit number in this field (e.g., `"A-304"`, `"Torre 2 — 502"`).
- Adding a dedicated `unit_number` column to `profiles` would require a migration, a backfill plan, and coordinated updates to `users.create`/`users.update` UI copy — all out of scope for a read-only logbook. If a product decision later separates `unit_number` from `address`, the Logbook column switches its source with a one-line change; no contract change on the DTO side.
- Presentation-only decisions like this are how spec 017's `Swatch` color mapping stayed out of the migration layer.

**Alternatives considered**:
- **Add `unit_number` text column to `profiles`**: Correct long-term, but substantially outside the scope of "read-only logbook." Deferred to a dedicated spec.
- **Hide the Unit column if no residents have `address` set**: Feels inconsistent with the spec's fixed column set (FR-013) and with the other nullable cells that already render `—`.

---

## Decision R7 — Reuse `ResidentSelect` from `@ramcar/features` unchanged

**Decision**: The toolbar imports `ResidentSelect` from `@ramcar/features/shared/resident-select` (spec 018). No API changes on the picker. The toolbar passes `value` (selected `resident_id` or `undefined`) and `onChange(id | undefined)`; the picker handles tenant scoping internally via `useRole().tenantId` (FR-010 of spec 018 explicitly forbade a `tenantId` prop, and the picker already honours it).

For **SuperAdmin "all tenants" mode**, the residents combobox is hidden. Rationale: a cross-tenant resident search is ambiguous (two tenants may have residents with the same name) and requires a tenant-selector-first interaction to be meaningful. The spec does not require SuperAdmins to filter by resident across tenants — only within a chosen tenant (Acceptance Scenario US7-2 refers to "the current tenant scope"). When the SuperAdmin picks a specific tenant via the tenant selector, the residents combobox appears and scopes to that tenant.

**Rationale**:
- Zero changes to the shared picker keeps spec 018's "locked public prop contract" promise intact (spec 018 SC-003).
- Hiding the combobox under "all tenants" mode avoids cross-tenant leaks in the picker itself (which would need tenant scoping changes that spec 018 declined). The SuperAdmin workflow of "pick a tenant, then optionally pick a resident" is a single additional click, not a usability regression.

**Alternatives considered**:
- **Add a `tenantId` prop to `ResidentSelect`**: Breaks spec 018's design. Rejected.
- **Show the combobox but include cross-tenant results**: Would require a server change and a UI treatment for tenant disambiguation. Out of scope.

---

## Decision R8 — Search uses a composite view or an `RPC` for four-table LIKE

**Decision**: Implement the list query as a single Supabase call against `access_events` with `.select("*, visit_person:visit_persons(code, full_name, phone, company, status, resident:profiles!visit_persons_resident_id_fkey(id, full_name)), vehicle:vehicles(plate, brand, model), guard:profiles!access_events_registered_by_fkey(full_name), resident:profiles!access_events_user_id_fkey(id, full_name, address)")`. For the free-text search, use Supabase's `.or(...)` applied to the root table plus `.or(...)` on the embedded tables, joined by `inner` hint where the search field is on a related table.

Concretely:
- Base select: `from("access_events").select("...joined shape...", { count: "exact" })`
- Tenant + person_type: `.eq("tenant_id", ...)` or `.in("tenant_id", [...])`, `.eq("person_type", personType)`
- Date range: `.gte("created_at", from).lt("created_at", toExclusive)`
- Resident filter:
  - Visitors/providers subpage: `.eq("visit_person.resident_id", residentId)` (hinted inner join)
  - Residents subpage: `.eq("user_id", residentId)`
- Search is the tricky one. Because Supabase PostgREST does not support cross-table `OR`, we build a **database function** `search_access_events(tenant_ids uuid[], person_type text, date_from timestamptz, date_to timestamptz, resident_id uuid, search text, limit int, offset int)` that executes the composite `ILIKE ANY` across the four joined tables (with LATERAL joins or EXISTS subqueries) and returns both the page and the total count. The list service calls `.rpc("search_access_events", { ... })` in this case. When `search` is empty, the service uses the plain `.select()` path (no RPC), which keeps the common case single-statement.

**Rationale**:
- A single composite query outperforms N+1 joins at the application layer and is the existing convention in this repo (see `UsersRepository.list`'s embedded `tenants!inner(name)` select).
- Cross-table `OR` is the known PostgREST limitation; the common workaround in this codebase is to hide the composite behind a SECURITY DEFINER RPC (see migrations 008/010 patterns) that runs as the caller under RLS. The RPC is what the spec calls "server-side search across the full result set" (FR-020) — it lets the search terms match fields on joined rows without pulling them into the client.
- Keeping the no-search path on plain PostgREST keeps the daily ("Today + no search") load light.

**Alternatives considered**:
- **Run four separate queries and UNION in JS**: Breaks pagination (totals become wrong) and forces repeated tenant scoping. Rejected.
- **Index-driven materialized view**: Overkill at 5,000 events per tenant; maintenance burden not justified.
- **Client-side filter on a downloaded page**: Violates server-side pagination (FR-007).

A stub of `search_access_events` (SQL) is provided in `contracts/access-events-list.md` so review can rubber-stamp it before Phase 2 writes the migration.

---

## Decision R9 — CSV localisation uses a shared label table, not a server i18n runtime

**Decision**: The CSV writer reads a small label table keyed by locale and token, baked into `packages/shared/src/types/access-event.ts` (so both API and client see the same shape):

```ts
export const LOGBOOK_CSV_LABELS = {
  en: {
    columns: { code: "Code", name: "Name", /* ... */ },
    direction: { entry: "Entry", exit: "Exit" },
    accessMode: { vehicle: "Vehicle", pedestrian: "Pedestrian" },
    status: { allowed: "Allowed", flagged: "Flagged", denied: "Denied" },
  },
  es: { /* same shape in Spanish */ },
} as const;
```

The list/export endpoints accept an optional `locale` query param (`en` | `es`, defaulting to `en`). The controller reads it from `?locale=` and passes it to the service. The service looks up the label map and emits the header row + cell values in that locale. The frontend sends the user's current `next-intl` locale with each export call.

**Rationale**:
- `apps/api` has no i18n runtime today and adding one (nest-i18n, i18next) for six column headers and eight enum cells is over-engineered. A static label table in `@ramcar/shared` keeps the translations in one place, reusable by both sides, and is the same pattern spec 017 used for vehicle color labels (`vehicles.color.options.*` mirrored into the client).
- The CSV UI copy for filters and buttons already lives in `@ramcar/i18n`; the static table is only for the fields the server writes (headers + enum cells). If a third locale is added later, adding an entry to `LOGBOOK_CSV_LABELS` is a one-file change.

**Alternatives considered**:
- **Send the headers from the client, server only writes rows**: Fragile and duplicates the concept of "which column renders which field" on both sides. Rejected.
- **Add `nestjs-i18n`**: Real dep + initialization + message JSON separate from `@ramcar/i18n`. Too much for this spec's surface.

---

## Resolved unknowns summary

| Unknown | Decision | Reference |
|---|---|---|
| Endpoint location | Extend `apps/api/src/modules/access-events/` | R1 |
| Export streaming shape | `StreamableFile` + 500-row batches via Supabase `.range()` | R2 |
| Tenant time zone | Additive `tenants.time_zone` column (UTC default), per-tenant boundary math | R3 |
| Role-based tenant scoping | `resolveTenantScope` helper + `ForbiddenException` for cross-tenant Admin | R4 |
| Filter persistence | URL search params + `useLogbookFilters` + `router.replace` | R5 |
| "Unit" column source | `profiles.address` verbatim; placeholder on null | R6 |
| Residents combobox reuse | Unchanged `ResidentSelect` from `@ramcar/features`; hidden in all-tenants mode | R7 |
| Cross-table search | `search_access_events` SQL function called via Supabase `.rpc()` when `search` is non-empty | R8 |
| CSV localisation | `LOGBOOK_CSV_LABELS` static table in `@ramcar/shared`; `?locale=` param | R9 |

No residual `NEEDS CLARIFICATION` items.
