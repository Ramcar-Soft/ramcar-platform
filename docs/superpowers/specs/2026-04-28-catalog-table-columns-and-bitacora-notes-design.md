# Catalog table columns + Bitácora notes — design

**Date:** 2026-04-28
**Status:** Approved (pending implementation plan)

## Goal

Two related improvements to the access-control surfaces guards use day-to-day:

1. **Visitors and Providers catalog tables** gain two columns — the **address of the resident being visited** and the **license plates of the visit-person's own vehicles**. Plates are the primary signal: a guard glances at a registered visitor's row and confirms the plate at the gate matches the one on file.
2. **Bitácora (Access Logs) tables** gain a **notes** column on all three tabs (Visitors, Providers, Residents). The data is already returned by the API; the UI does not display it today.

## Non-goals

- Migrating the Providers catalog to the shared `@ramcar/features` package. Per CLAUDE.md that migration is pending post-pilot; the new columns will be added to the existing per-app duplication and the migration stays out of scope here.
- Schema changes. All required data already exists (`profiles.address`, `vehicles.plate`, `access_events.notes`).
- Filtering or sorting by the new columns. Display only.
- Editing notes from the Bitácora row.
- Changing the Bitácora desktop pages — those are stubs (`apps/desktop/src/features/access-log/pages/*-page.tsx` only render a heading).

## Decisions captured during brainstorming

| # | Decision | Rationale |
|---|----------|-----------|
| Q1 | Plates display: **first plate + `+N` badge** when more than one. | Keeps row height stable; full plate list is reachable in the existing sidebar via `useVisitPersonVehicles`. |
| Q2 | Apply the two new columns to **both** the Visitors catalog **and** the Providers catalog. | Consistency. Plates remain the visit-person's own vehicles, not the resident's, in both cases. |
| Q3 | Notes column appears on **all three** Bitácora tabs (Visitors, Providers, Residents). | Notes are surfaced uniformly for any access event. |
| Q4 | Long notes: **truncate at ~40 characters with ellipsis; full text in a hover tooltip**. | Matches the dense-scan rhythm of the Bitácora; rows stay one line tall. |
| Q5 | Column order: address and plates land **between resident/status and the trailing edit/date column**. Notes on Bitácora lands **immediately before the date column**. | Keeps related data adjacent without disrupting the existing trailing-action convention. |

## Architecture

The visit-persons list endpoint (`GET /visit-persons`) already enriches each row server-side with the resident's name. We extend that same enrichment pattern with two more batched lookups, returning the additional fields in the existing list response. The Bitácora notes data already ships from the `search_access_events` RPC; only the UI binds it.

No migrations. No new endpoints. No client-side fan-out queries.

## Data layer

### Shared types (`packages/shared/src/types/visit-person.ts`)

Extend the `VisitPerson` interface with two optional fields:

```ts
export interface VisitPerson {
  // …existing fields…
  residentName?: string;
  residentAddress?: string | null;
  vehiclePlates?: string[];
}
```

Both are optional so callers that consume single-row responses (sidebar fetches, create/update results) do not break, and so the desktop SQLite cache layout does not need a forced rev.

### API service (`apps/api/src/modules/visit-persons/visit-persons.service.ts`)

Today the service has:

- `fetchResidentNames(residentIds): Map<string, string>` — single batch query against `profiles`.
- An `enrichWithResidentName` single-row helper used by `findById`, `create`, `update`.
- `list()` calls `fetchResidentNames` once after the page query and merges names back in.

Changes:

1. **Rename** `fetchResidentNames` → `fetchResidentDisplayInfo`.
   - Inner select becomes `id, full_name, address`.
   - Returns `Map<string, { fullName: string; address: string | null }>`.
   - Both `enrichWithResidentName` and `list()` consume the new shape; the merging code now sets both `residentName` and `residentAddress`. The `enrichWithResidentName` helper is renamed to `enrichWithResidentDisplay` to match.
2. **Add** `fetchVehiclePlates(visitPersonIds: string[], scope: TenantScope): Promise<Map<string, string[]>>`.
   - Query: `SELECT visit_person_id, plate FROM vehicles WHERE tenant_id = … AND visit_person_id IN (…) AND deleted_at IS NULL AND plate IS NOT NULL ORDER BY created_at`.
   - Tenant scope applied via `applyTenantScope` exactly like the repository already does.
   - Returns a map keyed by `visit_person_id`. Visitors with no vehicles do not appear in the map; the merge step substitutes an empty array.
3. **`list()`** orchestrates the merges:
   - Fetch the page (existing).
   - In parallel: `fetchResidentDisplayInfo(uniqueResidentIds)` and `fetchVehiclePlates(uniquePersonIds, scope)`.
   - Build the enriched list in a single pass.
4. **Single-row paths** (`findById`, `create`, `update`) get `residentAddress` populated through the renamed helper. They leave `vehiclePlates` undefined — the visitor sidebar already loads vehicles via `useVisitPersonVehicles` so there is no caller that needs plates inline on a single-row response.

## Catalog table UI

### Shared cell helper

Add `packages/features/src/shared/plates-cell.tsx`:

```tsx
import { Badge } from "@ramcar/ui";

export function PlatesCell({ plates }: { plates?: string[] }) {
  if (!plates || plates.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const [first, ...rest] = plates;
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs">{first}</span>
      {rest.length > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-xs font-normal">
          +{rest.length}
        </Badge>
      )}
    </div>
  );
}
```

The badge is non-interactive — the row click already opens the sidebar, which lists every vehicle.

### Visitors table — `packages/features/src/visitors/components/visitors-table-columns.tsx`

Insert two new columns between the existing `resident_name` and `actions` columns:

```
code · full name · status · resident · ADDRESS · PLATES · edit
```

- `address` render: `<span className="text-sm">{p.residentAddress ?? "—"}</span>`
- `plates` render: `<PlatesCell plates={p.vehiclePlates} />`

### Providers tables — both apps

`apps/web/src/features/providers/components/providers-table-columns.tsx` and `apps/desktop/src/features/providers/components/providers-table-columns.tsx` both grow the same two columns between `status` and `actions`:

```
code · full name · company · phone · status · ADDRESS · PLATES · edit
```

The duplication is acknowledged tech debt (per CLAUDE.md) — this spec does not eliminate it, it touches both files identically. A subsequent migration can collapse them into the shared package and delete the per-app copies in one move.

### i18n (`packages/i18n/src/messages/{es,en}.json`)

Add to both `visitPersons.columns` and `providers.columns`:

| Key | ES | EN |
|---|---|---|
| `residentAddress` | `Dirección` | `Address` |
| `plates` | `Placas` | `Plates` |

Headers stay short — the column position next to "Resident" / next to "Status" supplies context.

## Bitácora notes column

### Shared cell helper

Add `apps/web/src/features/logbook/components/notes-cell.tsx`:

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ramcar/ui";

const TRUNCATE_AT = 40;

export function NotesCell({ notes }: { notes: string | null }) {
  if (!notes) return <span className="text-muted-foreground">—</span>;
  const truncated = notes.length > TRUNCATE_AT;
  const display = truncated ? `${notes.slice(0, TRUNCATE_AT)}…` : notes;

  if (!truncated) return <span className="text-sm">{display}</span>;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-sm cursor-help">{display}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm whitespace-pre-wrap">{notes}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

`@ramcar/ui` already exports the Tooltip primitives.

### Three Bitácora column files

Insert a `notes` column **immediately before the `date` column** in:

- `apps/web/src/features/logbook/components/visitors-columns.tsx`
- `apps/web/src/features/logbook/components/providers-columns.tsx`
- `apps/web/src/features/logbook/components/residents-columns.tsx`

Render: `<NotesCell notes={item.notes} />`. The `AccessEventListItem` type already exposes `notes: string | null` (returned by the `search_access_events` RPC), so no API or type change is needed.

### CSV export labels

`packages/shared/src/types/access-event.ts` — `LOGBOOK_CSV_LABELS` is the source of truth for export headers used by `apps/web/src/features/logbook/hooks/use-logbook-export.ts`.

Insert `"Notes"` / `"Notas"` between `"Registered by"` / `"Registrado por"` and `"Date"` / `"Fecha"` in all three column arrays (visitors, providers, residents) for both `en` and `es` locales.

The export hook then needs to emit `item.notes ?? ""` at the matching position in each row builder so CSV column count matches header count. Verify visually during implementation; mismatches between header order and row order are the realistic regression risk for this change.

### i18n (`packages/i18n/src/messages/{es,en}.json`)

Add to `logbook.columns`:

| Key | ES | EN |
|---|---|---|
| `notes` | `Notas` | `Notes` |

## Testing strategy

### Unit

- **API**: `apps/api/src/modules/visit-persons/__tests__/visit-persons.enrichment.spec.ts` (new) — verifies `list()` returns `residentAddress` from the joined profile and `vehiclePlates` from the visit-person's vehicles, including the no-vehicles, single-vehicle, and multi-vehicle cases. Tenant scope filtering is implicit (uses the same `applyTenantScope` path the existing tests cover).
- **PlatesCell**: `packages/features/src/shared/__tests__/plates-cell.test.tsx` (new) — renders for empty/undefined (shows "—"), single plate (no badge), multiple plates (first + `+N` with correct count).
- **Visitors table**: extend `packages/features/src/visitors/__tests__/visitors-table.test.tsx` — assert the new column headers (`Dirección`, `Placas` or English equivalents) render and a row with mocked `residentAddress` + `vehiclePlates` shows the values.
- **NotesCell**: `apps/web/src/features/logbook/__tests__/notes-cell.test.tsx` (new) — null → "—", short text → plain span, long text → truncated with tooltip trigger.
- **Logbook table**: extend `apps/web/src/features/logbook/__tests__/logbook-table.test.tsx` — assert the `notes` column header appears and a row with `notes` renders the cell.

### Skipped (deliberate)

The Providers feature has no existing column-rendering test in either app. Adding new test files there extends scope; the rendering is fully covered by the shared `PlatesCell` test, the column file is small and statically typed, and manual verification will cover it. Easy to revisit if the providers feature later gets a proper test suite.

### Manual

CLAUDE.md is explicit that type/test pass ≠ feature-correct for UI work.

- **Web (`apps/web`)**: visit `/[locale]/visits-and-residents/visitors`, then `/providers`, then each Bitácora tab. Confirm the new columns are populated, plate badges render with the right counts, address shows for visitors linked to a resident with an address (and "—" otherwise), notes truncate with a working tooltip, and CSV export contains the new column at the right position with values aligned to the header.
- **Desktop (`apps/desktop`)**: same checks for the Visitors and Providers tables. (No Bitácora work on desktop in this spec — those pages are stubs.)

### Build gates

Before declaring complete: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check:shared-features`.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| CSV header/row column-count mismatch when notes is added. | Verify by exporting at least one CSV per Bitácora tab during manual testing; the `LOGBOOK_CSV_LABELS` constant and the export-row builder must be edited in the same commit. |
| `fetchVehiclePlates` returns plates from soft-deleted vehicles. | Filter `deleted_at IS NULL` explicitly, mirroring the soft-delete migration `20260428000000_vehicles_soft_delete.sql`. |
| `enrichWithResidentName` rename breaks an unseen caller. | TypeScript catches it at compile time across the monorepo; rename is a single grep. |
| Per-app provider table duplication causes one app to drift. | Both files edited in the same change; manual verification on both apps. Migration to the shared package remains out of scope. |
| Adding `PlatesCell` under `packages/features/src/shared/` trips `pnpm check:shared-features`. | The shared CI script (`shared-features.json`) enforces parity for files migrated from per-app `src/shared/` — `PlatesCell` is new, not migrated, so no entry should be required. Verify the check still passes during implementation; if it doesn't, add `plates-cell.tsx` to the script's allowlist. |

## Out-of-scope follow-ups

- Migrating the Providers catalog to `@ramcar/features` and deleting the two per-app copies.
- Building out the desktop Bitácora pages (`apps/desktop/src/features/access-log/pages/*`) — currently placeholders.
- Sortable/filterable address and plates columns in the catalog tables.
