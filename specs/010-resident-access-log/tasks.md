# Tasks: Resident Access Log

**Input**: Design documents from `/specs/010-resident-access-log/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the spec. Test tasks are omitted.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared types, validators, i18n keys, and navigation config that all stories depend on

- [x] T001 [P] Create vehicle TypeScript types and enums (vehicleType, VehicleResponse) in `packages/shared/src/types/vehicle.ts`
- [x] T002 [P] Create access event TypeScript types and enums (direction, accessMode, personType, AccessEventResponse) in `packages/shared/src/types/access-event.ts`
- [x] T003 [P] Create vehicle Zod validators (createVehicleSchema, CreateVehicleInput) in `packages/shared/src/validators/vehicle.ts`
- [x] T004 [P] Create access event Zod validators (createAccessEventSchema, CreateAccessEventInput, residentFiltersSchema) in `packages/shared/src/validators/access-event.ts`
- [x] T005 Re-export new types and validators from `packages/shared/src/index.ts`
- [x] T006 [P] Add "residents", "vehicles", and "accessEvents" i18n keys (labels, placeholders, toasts, empty states, vehicle types, direction values, access modes) to `packages/i18n/src/messages/en.json` and `packages/i18n/src/messages/es.json`
- [x] T007 [P] Update sidebar config: add "guard" to visits-and-residents roles, add "desktop" to platforms, add subItems with "residents" entry in `packages/shared/src/navigation/sidebar-config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database tables, API modules, and module registration. MUST complete before any user story.

**Database**:

- [x] T008 Create Supabase migration with `vehicles` and `access_events` tables (CREATE TABLE, CHECK constraints, indexes, RLS policies, handle_updated_at trigger) following schema from data-model.md. Run `pnpm db:new create_vehicles_and_access_events`, write SQL in `supabase/migrations/{timestamp}_create_vehicles_and_access_events.sql`
- [ ] T009 Apply migration and regenerate types: `pnpm db:migrate:dev` then `pnpm db:types` to update `packages/db-types/`

**API — Vehicles Module** (needed by US3, US4):

- [x] T010 [P] Create VehiclesRepository with `create(dto, tenantId)` and `findByUserId(userId, tenantId)` methods querying the vehicles table via Supabase client in `apps/api/src/modules/vehicles/vehicles.repository.ts`
- [x] T011 [P] Create vehicle DTOs: CreateVehicleDto (imports createVehicleSchema from @ramcar/shared) and VehicleResponseDto in `apps/api/src/modules/vehicles/dto/create-vehicle.dto.ts` and `apps/api/src/modules/vehicles/dto/vehicle-response.dto.ts`
- [x] T012 Create VehiclesService with `create(dto, tenantId, currentUser)` and `findByUserId(userId, tenantId)` methods. Validate user exists in tenant before creating. In `apps/api/src/modules/vehicles/vehicles.service.ts`
- [x] T013 Create VehiclesController with `POST /vehicles` endpoint. Apply @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard), @Roles("guard", "admin", "super_admin"). Validate body with createVehicleSchema. In `apps/api/src/modules/vehicles/vehicles.controller.ts`
- [x] T014 Create VehiclesModule exporting VehiclesService in `apps/api/src/modules/vehicles/vehicles.module.ts`

**API — Access Events Module** (needed by US1):

- [x] T015 [P] Create AccessEventsRepository with `create(dto, tenantId)` and `findLastByUserId(userId, tenantId)` methods querying access_events table via Supabase client in `apps/api/src/modules/access-events/access-events.repository.ts`
- [x] T016 [P] Create access event DTOs: CreateAccessEventDto (imports createAccessEventSchema from @ramcar/shared) and AccessEventResponseDto in `apps/api/src/modules/access-events/dto/create-access-event.dto.ts` and `apps/api/src/modules/access-events/dto/access-event-response.dto.ts`
- [x] T017 Create AccessEventsService with `create(dto, tenantId, registeredBy)` and `findLastByUserId(userId, tenantId)` methods. Validate userId and vehicleId exist in tenant. Handle idempotent upsert via eventId. In `apps/api/src/modules/access-events/access-events.service.ts`
- [x] T018 Create AccessEventsController with `POST /access-events` and `GET /access-events/last/:userId` endpoints. Apply guards and roles. Validate body with createAccessEventSchema. In `apps/api/src/modules/access-events/access-events.controller.ts`
- [x] T019 Create AccessEventsModule exporting AccessEventsService in `apps/api/src/modules/access-events/access-events.module.ts`

**API — Residents Module** (facade, needed by US1, US2):

- [x] T020 Create ResidentsService as thin facade: inject UsersService, call `list({ role: "resident", ...filters })` for residents list. Inject VehiclesService for `getVehicles(residentId, tenantId)`. In `apps/api/src/modules/residents/residents.service.ts`
- [x] T021 Create ResidentFiltersDto (imports residentFiltersSchema from @ramcar/shared) in `apps/api/src/modules/residents/dto/resident-filters.dto.ts`
- [x] T022 Create ResidentsController with `GET /residents` and `GET /residents/:id/vehicles` endpoints. Apply guards and roles. Validate query with residentFiltersSchema. In `apps/api/src/modules/residents/residents.controller.ts`
- [x] T023 Create ResidentsModule importing UsersModule and VehiclesModule, exporting ResidentsService in `apps/api/src/modules/residents/residents.module.ts`

**Register modules**:

- [x] T024 Register ResidentsModule, VehiclesModule, and AccessEventsModule in AppModule imports array in `apps/api/src/app.module.ts`

**Checkpoint**: Database tables created, all API endpoints functional, shared types/validators exported. User story implementation can begin.

---

## Phase 3: User Story 1 — Log a Resident Entry on Foot (Priority: P1) MVP

**Goal**: Guard sees resident list, clicks a row, sidebar opens with last event context and form (direction defaults to "Entry", mode "Pedestrian"), saves access event, sidebar closes with toast.

**Independent Test**: Navigate to `/visits-and-residents/residents`, click a resident row, verify sidebar slides in with form, select direction and mode, save, verify toast appears and sidebar closes.

### Implementation for User Story 1

- [x] T025 [US1] Create server component page at `apps/web/src/app/[locale]/(dashboard)/visits-and-residents/residents/page.tsx` that renders ResidentsPageClient
- [x] T026 [US1] Update visits-and-residents index page to redirect to `/visits-and-residents/residents` (or show sub-navigation) in `apps/web/src/app/[locale]/(dashboard)/visits-and-residents/page.tsx`
- [x] T027 [P] [US1] Create `useResidents(filters)` hook: TanStack Query calling `GET /api/residents` with ResidentFiltersDto in `apps/web/src/features/residents/hooks/use-residents.ts`
- [x] T028 [P] [US1] Create `useLastAccessEvent(userId)` hook: TanStack Query calling `GET /api/access-events/last/:userId`, enabled when userId is set in `apps/web/src/features/residents/hooks/use-last-access-event.ts`
- [x] T029 [P] [US1] Create `useCreateAccessEvent()` mutation hook: TanStack Mutation calling `POST /api/access-events`, invalidates relevant queries on success in `apps/web/src/features/residents/hooks/use-create-access-event.ts`
- [x] T030 [P] [US1] Define residents table column definitions (fullName, email, phone, address, status badge) with i18n labels in `apps/web/src/features/residents/components/residents-table-columns.tsx`
- [x] T031 [US1] Create ResidentsTable component: renders data table with columns, row click handler calling onSelectResident(resident), loading skeleton, empty state. Receives residents data and highlightedIndex as props. In `apps/web/src/features/residents/components/residents-table.tsx`
- [x] T032 [US1] Create LastEventBadge component: displays direction + relative timestamp of last access event as read-only badge. Shows "No previous entries" when null. In `apps/web/src/features/residents/components/last-event-badge.tsx`
- [x] T033 [US1] Create AccessEventForm component: direction radio (entry/exit, default "entry" per FR-022), access mode radio (vehicle/pedestrian, default "pedestrian"), notes textarea, Save/Cancel buttons. Calls onSave with form data. In `apps/web/src/features/residents/components/access-event-form.tsx`
- [x] T034 [US1] Create AccessEventSidebar component: wraps Sheet from @ramcar/ui with side="right". Renders LastEventBadge + AccessEventForm. Props: open, resident, onClose, onSaved. In `apps/web/src/features/residents/components/access-event-sidebar.tsx`
- [x] T035 [US1] Create ResidentsPageClient orchestrator component: manages state (selectedResident, sidebarOpen, filters), wires useResidents + useLastAccessEvent + useCreateAccessEvent, composes ResidentsTable + AccessEventSidebar, handles save flow (mutation → close sidebar → show success toast). In `apps/web/src/features/residents/components/residents-page-client.tsx`
- [x] T036 [US1] Create feature-local type re-exports in `apps/web/src/features/residents/types/index.ts`

**Checkpoint**: Core workflow complete — guard can list residents, open sidebar, log pedestrian entry/exit, see confirmation toast. MVP is functional.

---

## Phase 4: User Story 2 — Search and Filter the Resident List (Priority: P1)

**Goal**: Free-text search filters residents by name, email, phone, address, unit number. Real-time results as the guard types.

**Independent Test**: Type partial text in search input, verify table filters correctly. Clear search, verify full list restores. Search with no matches shows empty state.

### Implementation for User Story 2

- [x] T037 [US2] Add search Input component to ResidentsTable with debounced onChange (300ms) that updates filters.search. Add ref for keyboard shortcut integration. Style with placeholder text from i18n. In `apps/web/src/features/residents/components/residents-table.tsx`
- [x] T038 [US2] Verify ResidentFiltersDto search param is wired through useResidents hook to API. Ensure the API's residents service passes search to usersService.list() which supports ILIKE across full_name, email, phone, address. Adjust `apps/web/src/features/residents/hooks/use-residents.ts` if needed.

**Checkpoint**: Search functional — guard can find any resident by typing partial info.

---

## Phase 5: User Story 3 — Log a Resident Entry with Vehicle (Priority: P1)

**Goal**: When access mode is "Vehicle", form shows vehicle dropdown for the resident. Auto-selects if only one vehicle. Vehicle info displayed in dropdown (brand, model, plate, color).

**Independent Test**: Select a resident with vehicles, choose "Vehicle" mode, verify dropdown appears. Select a resident with one vehicle, verify auto-selection. Save with vehicle, verify access event includes vehicleId.

### Implementation for User Story 3

- [x] T039 [P] [US3] Create `useResidentVehicles(residentId)` hook: TanStack Query calling `GET /api/residents/:id/vehicles`, enabled when residentId is set in `apps/web/src/features/residents/hooks/use-resident-vehicles.ts`
- [x] T040 [US3] Extend AccessEventForm: when mode is "vehicle", show vehicle Select dropdown populated from useResidentVehicles. Each option shows "brand model — plate (color)". Auto-select when exactly one vehicle. vehicleId becomes required for save. Hide dropdown when mode is "pedestrian". In `apps/web/src/features/residents/components/access-event-form.tsx`

**Checkpoint**: Vehicle selection complete — guard can log vehicle entries with correct vehicle reference.

---

## Phase 6: User Story 4 — Register a New Vehicle Inline (Priority: P2)

**Goal**: When a resident has no vehicles (or needs to add another), an inline vehicle registration form appears within the sidebar. After saving, the new vehicle is selected in the access event form.

**Independent Test**: Select a resident with no vehicles, choose "Vehicle" mode, verify inline vehicle form appears. Fill type/brand/model/plate/color, save vehicle, verify it becomes selected. For a resident with existing vehicles, click "Add Vehicle", verify sub-form appears.

### Implementation for User Story 4

- [x] T041 [P] [US4] Create `useCreateVehicle()` mutation hook: TanStack Mutation calling `POST /api/vehicles`, invalidates resident vehicles query on success in `apps/web/src/features/residents/hooks/use-create-vehicle.ts`
- [x] T042 [P] [US4] Create VehicleTypeSelect component: renders Select dropdown with vehicle type enum values, labels from i18n (car→Automovil, motorcycle→Motocicleta, etc.) in `apps/web/src/shared/components/vehicle-form/vehicle-type-select.tsx`
- [x] T043 [US4] Create VehicleForm reusable component: form with VehicleTypeSelect (required), brand, model, plate, color, notes inputs. Validates with createVehicleSchema. Props: userId, onSave(vehicle), onCancel(). Calls useCreateVehicle internally. In `apps/web/src/shared/components/vehicle-form/vehicle-form.tsx`
- [x] T044 [US4] Integrate VehicleForm into AccessEventForm: add "Add Vehicle" button below vehicle dropdown. When clicked (or when no vehicles exist), show VehicleForm inline. On vehicle save, refresh vehicle list and auto-select new vehicle. Preserve parent form state during vehicle creation. In `apps/web/src/features/residents/components/access-event-form.tsx`

**Checkpoint**: Inline vehicle registration complete — guard can register vehicles without leaving the page.

---

## Phase 7: User Story 5 — Navigate Using Keyboard Shortcuts (Priority: P2)

**Goal**: B focuses search, arrow keys highlight table rows, Enter opens sidebar for highlighted row. All disabled when sidebar is open.

**Independent Test**: Press B → search focuses. Type name, press ArrowDown → first row highlights. Press Enter → sidebar opens. Open sidebar, press B → nothing happens.

### Implementation for User Story 5

- [x] T045 [US5] Create `useKeyboardNavigation` hook: manages highlightedIndex state, listens for keydown events (B→focus search ref, ArrowDown→increment, ArrowUp→decrement clamped to 0/last, Enter→call onSelect with highlighted resident). Disabled when sidebarOpen is true. Resets highlightedIndex on data change. In `apps/web/src/features/residents/hooks/use-keyboard-navigation.ts`
- [x] T046 [US5] Integrate useKeyboardNavigation into ResidentsPageClient: pass searchInputRef, sidebarOpen state, residents data, and onSelectResident handler. Pass highlightedIndex to ResidentsTable. In `apps/web/src/features/residents/components/residents-page-client.tsx`
- [x] T047 [US5] Add visual highlight styling to ResidentsTable: apply aria-selected and highlight background to the row at highlightedIndex. Ensure highlighted row scrolls into view. In `apps/web/src/features/residents/components/residents-table.tsx`

**Checkpoint**: Keyboard navigation complete — guard can perform the full workflow without a mouse.

---

## Phase 8: User Story 6 — Sidebar Animation and Close Behavior (Priority: P3)

**Goal**: Smooth slide-in/out transitions. Escape closes sidebar. Clicking a different resident switches the sidebar content.

**Independent Test**: Click row → sidebar slides in. Press Escape → sidebar slides out. Click different row while sidebar is open → content switches to new resident.

### Implementation for User Story 6

- [x] T048 [US6] Verify Sheet slide animation works correctly in AccessEventSidebar (Sheet side="right" provides this by default). Add custom transition duration if needed via Tailwind classes. In `apps/web/src/features/residents/components/access-event-sidebar.tsx`
- [x] T049 [US6] Implement resident switching: when sidebarOpen is true and a different resident row is clicked, update selectedResident without closing/reopening the sidebar. Reset form state and refetch last access event for the new resident. In `apps/web/src/features/residents/components/residents-page-client.tsx`
- [x] T050 [US6] Handle inactive resident visual distinction: add dimmed styling (opacity, muted text) to rows where resident.status === "inactive" in ResidentsTable. Ensure they remain clickable. In `apps/web/src/features/residents/components/residents-table.tsx`

**Checkpoint**: All web user stories complete and polished.

---

## Phase 9: Desktop Implementation

**Purpose**: Mirror all web functionality on the desktop Electron app with IPC-based data access and offline support.

**SQLite & Repositories**:

- [ ] T051 [P] DEFERRED: Create vehicles SQLite repository (SQLite not yet set up in desktop app). In `apps/desktop/electron/repositories/vehicles.repository.ts`
- [ ] T052 [P] DEFERRED: Create access events SQLite repository (SQLite not yet set up). In `apps/desktop/electron/repositories/access-events.repository.ts`

**Services**:

- [x] T053 [P] Create desktop API client and query provider for online data access in `apps/desktop/src/shared/lib/api-client.ts` and `apps/desktop/src/shared/lib/query-provider.tsx`
- [ ] T054 [P] DEFERRED: Create desktop vehicles service with offline outbox (depends on T051). In `apps/desktop/electron/services/vehicles.service.ts`
- [ ] T055 [P] DEFERRED: Create desktop access events service with offline outbox (depends on T052). In `apps/desktop/electron/services/access-events.service.ts`

**IPC Handlers & Preload**:

- [ ] T056 [P] DEFERRED: Create residents IPC handlers (online-first: renderer calls API directly via apiClient). In `apps/desktop/electron/ipc/residents-handlers.ts`
- [ ] T057 [P] DEFERRED: Create vehicles IPC handlers. In `apps/desktop/electron/ipc/vehicles-handlers.ts`
- [ ] T058 [P] DEFERRED: Create access events IPC handlers. In `apps/desktop/electron/ipc/access-events-handlers.ts`
- [ ] T059 DEFERRED: Add IPC bridges to preload contextBridge. In `apps/desktop/electron/preload.ts`
- [ ] T060 DEFERRED: Register IPC handlers in main process. In `apps/desktop/electron/main.ts`

**Desktop Frontend (renderer)**:

- [x] T061 [P] Create desktop residents hooks: useResidents, useResidentVehicles, useLastAccessEvent, useCreateAccessEvent, useCreateVehicle — calling apiClient (online-first). In `apps/desktop/src/features/residents/hooks/`
- [x] T062 [P] Create desktop VehicleForm and VehicleTypeSelect in `apps/desktop/src/shared/components/vehicle-form/` (mirror web versions, use desktop hooks)
- [x] T063 Create desktop residents feature components: ResidentsPage, ResidentsTable, ResidentsTableColumns, AccessEventSidebar, AccessEventForm, LastEventBadge, useKeyboardNavigation. Mirror web implementations but use desktop hooks. In `apps/desktop/src/features/residents/components/`
- [x] T064 Add residents page route to desktop app navigation/routing in `apps/desktop/src/shared/components/page-router.tsx`

**Checkpoint**: Desktop app mirrors all web functionality with offline support.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, error handling refinements, and cross-platform consistency

- [x] T065 Add network error handling with retry option to AccessEventForm: on mutation error, show error toast with "Retry" action, preserve form data in sidebar (do not close). In `apps/web/src/features/residents/components/access-event-form.tsx`
- [x] T066 Verify `pnpm lint` and `pnpm typecheck` pass across all workspaces. Fix any issues.
- [ ] T067 Run quickstart.md validation: verify all curl commands work against local API, verify web and desktop pages load correctly
- [ ] T068 Seed test data: add sample resident users with vehicles and sample access events to `supabase/seed.sql` for local development

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion (shared types/validators must exist for API DTOs) — BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Phase 2 completion
  - US1 (Phase 3): Can start immediately after Phase 2
  - US2 (Phase 4): Depends on US1 (extends the table component)
  - US3 (Phase 5): Depends on US1 (extends the form component)
  - US4 (Phase 6): Depends on US3 (extends vehicle selection)
  - US5 (Phase 7): Depends on US1 (adds keyboard to existing page)
  - US6 (Phase 8): Depends on US1 (polishes existing sidebar)
- **Desktop (Phase 9)**: Depends on Phase 2 (API modules). Can run in parallel with web user stories.
- **Polish (Phase 10)**: Depends on all desired phases being complete

### User Story Dependencies

```
Phase 2 (Foundational)
  ├──→ US1 (Phase 3) ──→ US2 (Phase 4)
  │         ├──→ US3 (Phase 5) ──→ US4 (Phase 6)
  │         ├──→ US5 (Phase 7)
  │         └──→ US6 (Phase 8)
  └──→ Desktop (Phase 9) [parallel with web stories]
```

### Within Each User Story

- Hooks and column definitions (marked [P]) can be built in parallel
- Components depend on hooks being available
- Orchestrator component depends on all sub-components

### Parallel Opportunities

- All Phase 1 tasks marked [P] can run in parallel (types, validators, i18n, sidebar config)
- Phase 2 API modules: Vehicles (T010-T014), Access Events (T015-T019), and Residents (T020-T023) can be built in parallel. Residents module depends on the other two at module registration.
- Phase 3: Hooks T027-T029 and columns T030 can be built in parallel
- Phase 6: useCreateVehicle T041 and VehicleTypeSelect T042 can be built in parallel
- Phase 9: All SQLite repos (T051-T052), services (T053-T055), and IPC handlers (T056-T058) can be built in parallel

---

## Parallel Example: User Story 1

```text
# After Phase 2 is complete, launch these in parallel:
Task T027: "Create useResidents hook"
Task T028: "Create useLastAccessEvent hook"
Task T029: "Create useCreateAccessEvent hook"
Task T030: "Define residents table columns"

# Then sequentially:
Task T031: "Create ResidentsTable" (uses T027, T030)
Task T032: "Create LastEventBadge"
Task T033: "Create AccessEventForm"
Task T034: "Create AccessEventSidebar" (uses T032, T033)
Task T035: "Create ResidentsPageClient" (uses T031, T034, T027-T029)
```

## Parallel Example: Desktop Phase

```text
# All repositories in parallel:
Task T051: "Create vehicles SQLite repository"
Task T052: "Create access events SQLite repository"

# All services in parallel:
Task T053: "Create desktop residents service"
Task T054: "Create desktop vehicles service"
Task T055: "Create desktop access events service"

# All IPC handlers in parallel:
Task T056: "Create residents IPC handlers"
Task T057: "Create vehicles IPC handlers"
Task T058: "Create access events IPC handlers"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (shared types, validators, i18n, nav config)
2. Complete Phase 2: Foundational (migration, 3 API modules, register in AppModule)
3. Complete Phase 3: User Story 1 (resident list, sidebar, form, save)
4. **STOP and VALIDATE**: Guard can list residents, click one, log a pedestrian entry, see toast
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Pedestrian entry workflow → **MVP!**
3. US2 → Multi-field search → Better resident discovery
4. US3 → Vehicle entry workflow → Full access modes
5. US4 → Inline vehicle registration → No-friction vehicle onboarding
6. US5 → Keyboard shortcuts → Power-user efficiency
7. US6 → Animation polish → UX refinement
8. Desktop → Offline-capable guard booth app
9. Polish → Error handling, lint, seed data

### Parallel Team Strategy

With multiple developers after Phase 2 completion:

- **Developer A**: US1 → US2 → US5 (web table and interaction layer)
- **Developer B**: US3 → US4 (vehicle selection and registration)
- **Developer C**: Desktop phase (Phase 9, can start immediately after Phase 2)
- US6 and Polish can be picked up by whoever finishes first

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable after its phase completes
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The reusable VehicleForm (T042-T043) lives in `src/shared/components/` per Constitution III (import boundaries)
- Desktop IPC hooks mirror web TanStack Query hooks but call `window.api.*` instead of `apiClient`
