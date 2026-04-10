# Research: Resident Access Log

**Feature**: 010-resident-access-log  
**Date**: 2026-04-10

## R1: Animated Right Sidebar Approach

**Decision**: Use the existing shadcn/ui `Sheet` component with `side="right"`.

**Rationale**: The Sheet component is already installed in `@ramcar/ui` and built on Radix Dialog primitives. It provides built-in slide-in/out animations via Tailwind data-state classes (`data-[state=open]:animate-in`, `data-[state=closed]:animate-out`), portal-based rendering, focus trapping, and Escape-to-close. This matches FR-004 (animated sidebar), FR-020 (Escape to close), and User Story 6 (smooth transitions) with zero additional dependencies.

**Alternatives considered**:
- **Custom CSS transitions**: Would require manual focus management, portal rendering, and animation state handling. More code, more bugs, for no benefit over Sheet.
- **Framer Motion**: Adds a dependency not currently in the project. Overkill for a simple slide-in panel when Sheet already handles it.
- **Radix Dialog directly**: Sheet IS Radix Dialog with directional sliding preconfigured. Using the raw primitive would just mean reimplementing what Sheet already does.

## R2: Keyboard Navigation Pattern

**Decision**: Custom `useKeyboardNavigation` hook with `document.addEventListener("keydown")` scoped to the page, disabled when sidebar is open.

**Rationale**: The keyboard requirements (B to focus search, arrow keys for row highlighting, Enter to select) are specific to this page's workflow and don't map to any existing component library feature. A dedicated hook encapsulates:
- `B` key listener (only when sidebar is closed and no input focused)
- Arrow up/down to track `highlightedIndex` state in the table
- Enter to trigger row selection (calls the same handler as row click)
- Cleanup of all listeners on unmount

**Implementation details**:
- Track `highlightedIndex` as a number (or `null` when no row highlighted)
- Arrow Down: increment index (clamp to last row)
- Arrow Up: decrement index (clamp to 0)
- Enter: call `onSelectResident(residents[highlightedIndex])`
- B: call `searchInputRef.current?.focus()`
- All listeners disabled when `sidebarOpen` is true (FR-015)
- Reset `highlightedIndex` when search results change

**Alternatives considered**:
- **WAI-ARIA grid pattern**: Full ARIA grid would require `role="grid"`, `role="row"`, `role="gridcell"` and comprehensive arrow key handling (including left/right for cells). This is overkill — the table is read-only and row selection is the only interaction. A simpler approach with `aria-selected` on highlighted rows is sufficient.
- **Third-party keyboard hook library (e.g., react-hotkeys-hook)**: Adds a dependency for a straightforward use case. The hook is ~40 lines of code. Not justified.

## R3: Residents API Module — Facade vs. Independent

**Decision**: Thin facade module that imports `UsersModule` via NestJS DI for listing residents, and imports `VehiclesModule` for fetching resident vehicles.

**Rationale**: Residents are users with `role = "resident"`. The existing `UsersService.list()` method supports filtering and pagination. Creating a duplicate repository for residents would violate DRY and risk divergence. The `ResidentsModule`:
- Imports `UsersModule` (already exports `UsersService`)
- `ResidentsService` calls `usersService.list({ role: "resident", ...filters })` with a hardcoded role filter
- `ResidentsController` provides the `/residents` endpoint with appropriate guards
- For vehicles: imports `VehiclesModule` and delegates `GET /residents/:id/vehicles` to `VehiclesService.findByUserId()`

**Alternatives considered**:
- **Add `/residents` route to existing UsersController**: Mixes concerns. The users controller manages user CRUD (admin function). The residents endpoint serves a different use case (guard-facing access log). Separate controllers keep the code aligned with the feature boundary.
- **Fully independent module with own repository**: Duplicates the profiles table query logic already in `UsersRepository`. More code to maintain, higher risk of inconsistency.

## R4: Desktop Offline Strategy for Access Events

**Decision**: SQLite outbox with UUID `event_id` for idempotent sync. Vehicle cache for offline vehicle selection.

**Rationale**: The desktop app must function without network connectivity (Constitution IV). Access events use the `event_id` field (already in the database schema) as an idempotency key. When offline:
1. Access events are saved to a local SQLite `access_events_outbox` table with a generated `event_id`.
2. Vehicle list for each resident is cached in SQLite (synced on startup and via Realtime when online).
3. New vehicles created offline go through a `vehicles_outbox` table.
4. When connectivity resumes, the SyncEngine pushes outbox items to the NestJS API. The API uses `event_id` for conflict-safe upsert.

**Conflict resolution**:
- **Access events**: Append-only, no conflicts. Each event has a unique `event_id`. Duplicate sends are safely ignored by the UNIQUE constraint on `(tenant_id, event_id)`.
- **Vehicles**: Last-write-wins. Vehicle data is simple attributes (brand, model, plate). The `updated_at` timestamp determines the winner. Conflicts are rare since guards typically create vehicles, not update them.

**SyncSlice states**: The UI shows current sync state: `idle` (all synced), `syncing` (pushing outbox), `error` (sync failed, will retry), `offline` (no connectivity, working locally).

**Alternatives considered**:
- **Queue-based sync (BullMQ)**: The API already has BullMQ infrastructure, but it runs server-side. The desktop app needs client-side offline storage, which SQLite + outbox pattern handles natively in Electron.
- **Service Worker**: Not applicable to Electron's main process architecture.

## R5: Reusable Vehicle Form Placement

**Decision**: `src/shared/components/vehicle-form/` in both web and desktop apps.

**Rationale**: The vehicle registration form is used by:
1. The residents access log feature (inline vehicle registration — FR-008, FR-009)
2. The users catalog feature (associating vehicles with residents — FR-010, future integration)

Since `features/A/` must not import from `features/B/` (Constitution III), the component cannot live in either feature directory. It belongs in `src/shared/components/` which is importable by any feature.

The form is domain-specific (vehicle types, brand/model/plate fields) so it does NOT belong in `@ramcar/ui` (which holds generic design-system components like Button, Input, Sheet).

**Component design**:
- `VehicleForm` accepts props: `onSave(vehicle)`, `onCancel()`, `userId` (the resident to associate), and optional `defaultValues`
- `VehicleTypeSelect` is a sub-component rendering the vehicle type enum as a dropdown with i18n labels
- Form validation uses the shared `createVehicleSchema` from `@ramcar/shared`
- The form is self-contained: it calls the vehicle creation API/IPC internally and returns the created vehicle via `onSave`

**Alternatives considered**:
- **`@ramcar/ui` package**: This package is for generic, design-system level components (Radix + Tailwind). A domain-specific form with business logic (vehicle types, API calls) doesn't belong here.
- **Separate `@ramcar/vehicle-form` package**: Over-engineering for a single form component shared between two features within the same apps. If vehicle forms become complex enough to warrant their own package, this can be extracted later.

## R6: Database Migration Scope

**Decision**: Single migration file creating `vehicles` and `access_events` tables. The `visit_persons`, `visit_person_images`, and `blacklist` tables are NOT created in this migration — they belong to the visitors and providers submodules.

**Rationale**: This feature only requires:
- `vehicles` table (for resident vehicle storage and access event vehicle references)
- `access_events` table (for logging entry/exit events)

The `visit_persons` table is needed for visitors and service providers (future submodules), not for residents (who are stored in the existing `profiles` table). Creating it now would add unused schema and orphan tables.

The migration follows the schema from `database-visits-schema.md` but only includes the tables relevant to this feature. RLS policies, indexes, and the `handle_updated_at` trigger follow the patterns in `20260409000000_users_module.sql`.

**Alternatives considered**:
- **Create all visit-module tables at once**: Would create `visit_persons`, `visit_person_images`, `blacklist`, `vehicles`, and `access_events`. Premature — those tables serve features not yet specified. Migration files should align with feature scope.
- **No migration (use existing tables only)**: Not possible. `vehicles` and `access_events` don't exist yet.

## R7: Sidebar Navigation Config Update

**Decision**: Update `visits-and-residents` in `sidebar-config.ts` to add `subItems` and expand role/platform access.

**Rationale**: The current config has `visits-and-residents` visible only to `super_admin` and `admin` on `web` only. Per the clarified spec:
- Guards need access to the Residents subpage (and eventually other subpages)
- The desktop app also needs this menu item
- Sub-items are needed: starting with "residents", future additions for "visitors" and "providers"

**Changes**:
```
visits-and-residents:
  roles: ["super_admin", "admin", "guard"]  (was: ["super_admin", "admin"])
  platforms: ["web", "desktop"]             (was: ["web"])
  subItems:
    - key: "residents", route: "/visits-and-residents/residents"
```

The `getItemsForRole()` function already handles sub-item filtering. No changes to the sidebar rendering components are needed — they already iterate `subItems` when present (as demonstrated by the "catalogs" menu item with its "users" sub-item).
