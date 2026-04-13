# Tasks: Visitor & Service Provider Access Logging

**Input**: Design documents from `/specs/011-visitor-provider-access/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested — test tasks omitted. Add testing phase if needed.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database tables, shared types/validators, sidebar config — all code that downstream phases depend on.

- [X] T001 Create database migration with visit_persons table, code auto-generation trigger, visit_person_images table, FK constraints on vehicles.visit_person_id and access_events.visit_person_id, tightened chk_vehicle_owner constraint, UPDATE RLS policy on access_events, and visit-person-images storage bucket in supabase/migrations/{timestamp}_create_visit_persons_and_images.sql
- [X] T002 Regenerate TypeScript types from schema by running `pnpm db:types` and verify packages/db-types/src/types.ts includes visit_persons and visit_person_images tables
- [X] T003 [P] Create VisitPerson, VisitPersonStatus, and VisitPersonType types in packages/shared/src/types/visit-person.ts
- [X] T004 [P] Create VisitPersonImage and ImageType types in packages/shared/src/types/visit-person-image.ts
- [X] T005 [P] Extend Vehicle interface with nullable visitPersonId field and make userId nullable in packages/shared/src/types/vehicle.ts
- [X] T006 [P] Create createVisitPersonSchema, updateVisitPersonSchema, and visitPersonFiltersSchema validators in packages/shared/src/validators/visit-person.ts
- [X] T007 [P] Create imageTypeEnum validator in packages/shared/src/validators/visit-person-image.ts
- [X] T008 Modify createVehicleSchema to discriminated union with ownerType ('user' | 'visitPerson') in packages/shared/src/validators/vehicle.ts
- [X] T009 Modify createAccessEventSchema to support visitPersonId for visitor/service_provider personTypes and create updateAccessEventSchema in packages/shared/src/validators/access-event.ts
- [X] T010 Export all new types and validators from packages/shared/src/index.ts
- [X] T011 [P] Add visitors and providers sub-items under visits-and-residents in packages/shared/src/navigation/sidebar-config.ts

**Checkpoint**: `pnpm typecheck` passes. New tables exist in local Supabase. Shared types compile.

---

## Phase 2: Foundational (API Modules & Client Extensions)

**Purpose**: Complete API surface for visit persons, images, vehicles, and access events. Must complete before any frontend work.

**CRITICAL**: No user story work can begin until this phase is complete.

### Visit Persons API Module

- [X] T012 Create visit-persons module file, DTOs (re-export from @ramcar/shared), and register in apps/api/src/modules/visit-persons/visit-persons.module.ts and apps/api/src/modules/visit-persons/dto/
- [X] T013 Implement visit-persons repository with create, findById, list (type filter + ILIKE search across full_name/code/phone/company + pagination), and update methods in apps/api/src/modules/visit-persons/visit-persons.repository.ts
- [X] T014 Implement visit-persons service delegating to repository and joining residentName from profiles in apps/api/src/modules/visit-persons/visit-persons.service.ts
- [X] T015 Implement visit-persons controller with GET / (list+search), GET /:id, POST /, PATCH /:id endpoints in apps/api/src/modules/visit-persons/visit-persons.controller.ts

### Visit Person Images API Module

- [X] T016 Create visit-person-images module file and register in apps/api/src/modules/visit-person-images/visit-person-images.module.ts
- [X] T017 Implement visit-person-images repository with create, findByVisitPersonId, findById, and deleteById methods in apps/api/src/modules/visit-person-images/visit-person-images.repository.ts
- [X] T018 Implement visit-person-images service with Supabase Storage upload, signed URL generation (60min TTL), delete, and replace-by-type logic in apps/api/src/modules/visit-person-images/visit-person-images.service.ts
- [X] T019 Implement visit-person-images controller with multipart POST /visit-persons/:id/images (FileInterceptor), GET /visit-persons/:id/images, DELETE /visit-person-images/:id in apps/api/src/modules/visit-person-images/visit-person-images.controller.ts

### Existing Module Extensions

- [X] T020 [P] Extend vehicles repository with findByVisitPersonId method and modify create to accept visitPersonId in apps/api/src/modules/vehicles/vehicles.repository.ts
- [X] T021 [P] Extend vehicles controller with GET /vehicles?visitPersonId= query endpoint and updated POST validation in apps/api/src/modules/vehicles/vehicles.controller.ts
- [X] T022 [P] Extend vehicles service with findByVisitPersonId method and updated create for visitPersonId in apps/api/src/modules/vehicles/vehicles.service.ts
- [X] T023 Add update method and findRecentByVisitPersonId to access-events repository in apps/api/src/modules/access-events/access-events.repository.ts
- [X] T024 Add update and findRecentByVisitPersonId to access-events service in apps/api/src/modules/access-events/access-events.service.ts
- [X] T025 Add PATCH /access-events/:id and GET /access-events/recent-visit-person/:visitPersonId endpoints to access-events controller in apps/api/src/modules/access-events/access-events.controller.ts
- [X] T026 Register VisitPersonsModule and VisitPersonImagesModule in apps/api/src/app.module.ts

### Frontend API Client Extensions

- [X] T027 [P] Add upload() method supporting FormData/multipart to web apiClient in apps/web/src/shared/lib/api-client.ts
- [X] T028 [P] Add upload() method supporting FormData/multipart to desktop apiClient in apps/desktop/src/shared/lib/api-client.ts

**Checkpoint**: All API endpoints respond correctly via curl/Postman. Tenant isolation verified. `pnpm typecheck` passes.

---

## Phase 3: User Story 1 — Log Access Event for Existing Visitor (P1) MVP

**Goal**: Guard opens Visitante page, sees list of visitors, clicks a row, sidebar opens with person info + access event form, saves entry, sidebar closes with toast.

**Independent Test**: Navigate to /visits-and-residents/visitors, click a visitor row, fill direction + access mode, save. Verify access_events row created with person_type='visitor' and visit_person_id set.

### Implementation

- [X] T029 [US1] Create web route page in apps/web/src/app/[locale]/(dashboard)/visits-and-residents/visitors/page.tsx importing VisitorsPageClient
- [X] T030 [P] [US1] Create visitor type re-exports in apps/web/src/features/visitors/types/index.ts
- [X] T031 [P] [US1] Create useVisitPersons hook (type=visitor, pagination, search params) in apps/web/src/features/visitors/hooks/use-visit-persons.ts
- [X] T032 [P] [US1] Create useVisitPersonVehicles hook (fetch vehicles by visitPersonId) in apps/web/src/features/visitors/hooks/use-visit-person-vehicles.ts
- [X] T033 [P] [US1] Create useRecentVisitPersonEvents hook (fetch recent access events for visit person) in apps/web/src/features/visitors/hooks/use-recent-visit-person-events.ts
- [X] T034 [P] [US1] Create useCreateAccessEvent hook (extended for visitPersonId + person_type=visitor) in apps/web/src/features/visitors/hooks/use-create-access-event.ts
- [X] T035 [P] [US1] Create visit-person-status-badge component with color-coded allowed/flagged/denied indicators in apps/web/src/features/visitors/components/visit-person-status-badge.tsx
- [X] T036 [P] [US1] Create visitors-table-columns definition (code, fullName, status, residentName, lastVisit) in apps/web/src/features/visitors/components/visitors-table-columns.tsx
- [X] T037 [US1] Create visitors-table component with forwardRef for search input, row click, highlighted row, loading/error/empty states in apps/web/src/features/visitors/components/visitors-table.tsx
- [X] T038 [P] [US1] Create recent-events-list component for sidebar (reuse pattern from residents last-event-badge) in apps/web/src/features/visitors/components/recent-events-list.tsx
- [X] T039 [US1] Create visit-person-access-event-form with direction, accessMode, vehicle select, notes (mirrors residents AccessEventForm but uses visitPersonId) in apps/web/src/features/visitors/components/visit-person-access-event-form.tsx
- [X] T040 [US1] Create visit-person-sidebar component (Sheet with person info header, recent events, access event form) in apps/web/src/features/visitors/components/visit-person-sidebar.tsx
- [X] T041 [US1] Create visitors-page-client with state management (selected person, sidebar open, search, debounced search, filters) in apps/web/src/features/visitors/components/visitors-page-client.tsx
- [X] T042 [US1] Add visitPersons namespace translation keys (title, searchPlaceholder, columns, status labels, empty state) to apps/web/messages/es.json and apps/web/messages/en.json

**Checkpoint**: Visitante page displays visitors, clicking a row opens the sidebar, saving an access event works. Toast confirms success. This is the MVP.

---

## Phase 4: User Story 2 — Log Access Event for Existing Service Provider (P1)

**Goal**: Guard opens Proveedor page, sees list of providers with company/phone columns, clicks a row, sidebar opens with provider info + access event form (resident_id shown but optional), saves entry.

**Independent Test**: Navigate to /visits-and-residents/providers, click a provider row, save access event. Verify person_type='service_provider'. Verify resident_id field is visible but not required.

### Implementation

- [X] T043 [US2] Create web route page in apps/web/src/app/[locale]/(dashboard)/visits-and-residents/providers/page.tsx importing ProvidersPageClient
- [X] T044 [P] [US2] Create provider type re-exports in apps/web/src/features/providers/types/index.ts
- [X] T045 [P] [US2] Create useVisitPersons hook (type=service_provider) in apps/web/src/features/providers/hooks/use-visit-persons.ts
- [X] T046 [P] [US2] Create useVisitPersonVehicles hook in apps/web/src/features/providers/hooks/use-visit-person-vehicles.ts
- [X] T047 [P] [US2] Create useRecentVisitPersonEvents hook in apps/web/src/features/providers/hooks/use-recent-visit-person-events.ts
- [X] T048 [P] [US2] Create useCreateAccessEvent hook (person_type=service_provider) in apps/web/src/features/providers/hooks/use-create-access-event.ts
- [X] T049 [P] [US2] Create providers-table-columns definition (code, fullName, company, phone, status) in apps/web/src/features/providers/components/providers-table-columns.tsx
- [X] T050 [US2] Create providers-table component with forwardRef, row click, highlighted row, loading/error/empty states in apps/web/src/features/providers/components/providers-table.tsx
- [X] T051 [US2] Create provider-sidebar component (Sheet with provider info header showing company/phone, resident_id field shown but optional, recent events, access event form) in apps/web/src/features/providers/components/provider-sidebar.tsx
- [X] T052 [US2] Create providers-page-client with state management in apps/web/src/features/providers/components/providers-page-client.tsx
- [X] T053 [US2] Add providers namespace translation keys (title, columns, company, phone, empty state) to apps/web/messages/es.json and apps/web/messages/en.json

**Checkpoint**: Proveedor page displays providers with company/phone columns. Sidebar opens with provider info. Access events saved with correct person_type. Resident field optional.

---

## Phase 5: User Story 3 — Register New Visitor (P2)

**Goal**: Guard clicks "Register New" on Visitante page, sidebar opens in creation mode with person registration fields + access event form. Saving creates both visit_person and access_event records.

**Independent Test**: Click "Register New", fill full_name + resident + direction, save. Verify visit_persons row with type='visitor' and auto-generated VIS-XXXXX code, plus access_events row linked via visit_person_id.

### Implementation

- [X] T054 [US3] Create useCreateVisitPerson mutation hook in apps/web/src/features/visitors/hooks/use-create-visit-person.ts
- [X] T055 [US3] Create resident searchable select component (fetches residents list, allows search/selection) in apps/web/src/shared/components/resident-select/resident-select.tsx
- [X] T056 [US3] Create visit-person-form component (full_name, status select, resident-select, notes) for visitor registration in apps/web/src/features/visitors/components/visit-person-form.tsx
- [X] T057 [US3] Add "Register New" button to visitors-page-client and sidebar create/view mode toggle in apps/web/src/features/visitors/components/visitors-page-client.tsx
- [X] T058 [US3] Update visit-person-sidebar to handle create mode: show visit-person-form above access event form, orchestrate combined save (create person then create event) in apps/web/src/features/visitors/components/visit-person-sidebar.tsx

**Checkpoint**: "Register New" button opens sidebar in create mode. Saving creates visit_person + access_event. Auto-generated code visible.

---

## Phase 6: User Story 4 — Register New Service Provider (P2)

**Goal**: Guard clicks "Register New" on Proveedor page, sidebar opens with provider-specific registration fields (company, phone, optional resident_id) + access event form.

**Independent Test**: Register new provider with company and phone. Verify visit_persons row with type='service_provider' and PRV-XXXXX code.

### Implementation

- [X] T059 [US4] Create useCreateVisitPerson mutation hook (service_provider type) in apps/web/src/features/providers/hooks/use-create-visit-person.ts
- [X] T060 [US4] Create provider-form component (full_name, phone, company, status, resident-select optional, notes) in apps/web/src/features/providers/components/provider-form.tsx
- [X] T061 [US4] Add "Register New" button to providers-page-client and sidebar create/view mode toggle in apps/web/src/features/providers/components/providers-page-client.tsx
- [X] T062 [US4] Update provider-sidebar to handle create mode with combined save (create person then event) in apps/web/src/features/providers/components/provider-sidebar.tsx

**Checkpoint**: "Register New" for providers works. Provider-specific fields (company, phone) saved. PRV- code auto-generated.

---

## Phase 7: User Story 5 — Search and Filter (P2)

**Goal**: Guard types in search input, list filters in real-time (debounced) across full_name, code, phone, company. Empty state suggests registering new.

**Independent Test**: Type a partial name, verify filtered results. Type a phone number, verify match. Clear search, verify full list returns. Type nonexistent value, verify empty state with "Register New" suggestion.

### Implementation

- [X] T063 [US5] Integrate debounced search state (300ms delay) with server-side filtering into visitors-page-client.tsx (useEffect timer, debouncedSearch passed to useVisitPersons)
- [X] T064 [P] [US5] Integrate debounced search state into providers-page-client.tsx
- [X] T065 [US5] Add search empty state with "Register New" call-to-action in visitors-table.tsx and providers-table.tsx

**Checkpoint**: Search works across all fields with debounce. Empty state shows actionable message.

---

## Phase 8: User Story 8 — Inline Vehicle Registration (P2)

**Goal**: When a visitor/provider has no vehicles and guard selects vehicle mode, the sidebar shows VehicleForm inline. After saving, the new vehicle auto-selects in the dropdown.

**Independent Test**: Select person with no vehicles, choose vehicle access mode, click "Add Vehicle", fill vehicle form, save. Verify vehicle dropdown reloads with new vehicle selected.

### Implementation

- [X] T066 [US8] Extend VehicleForm to accept optional visitPersonId prop (alternative to userId), update createVehicle hook to use ownerType discriminated union in apps/web/src/shared/components/vehicle-form/vehicle-form.tsx
- [X] T067 [US8] Create useCreateVehicle hook for visit persons in apps/web/src/features/visitors/hooks/use-create-vehicle.ts
- [X] T068 [P] [US8] Create useCreateVehicle hook for providers in apps/web/src/features/providers/hooks/use-create-vehicle.ts
- [X] T069 [US8] Add vehicle form toggle to visit-person-sidebar (show VehicleForm when guard clicks "Add Vehicle", return to access event form on save/cancel) in apps/web/src/features/visitors/components/visit-person-sidebar.tsx
- [X] T070 [P] [US8] Add vehicle form toggle to provider-sidebar in apps/web/src/features/providers/components/provider-sidebar.tsx

**Checkpoint**: Inline vehicle registration works for both visitors and providers. New vehicle auto-selected after save.

---

## Phase 9: User Story 6 — Keyboard-Driven Navigation (P3)

**Goal**: Guards operate the list without mouse. B focuses search, ArrowUp/Down navigates rows, Enter opens sidebar, Escape blurs. Shortcuts disabled when sidebar is open.

**Independent Test**: Press B (search focuses), type name, ArrowDown (row highlights), Enter (sidebar opens). Verify shortcuts inactive while sidebar open.

### Implementation

- [X] T071 [US6] Create useKeyboardNavigation hook (adapted from residents pattern: B, ArrowUp/Down, Enter, Escape, sidebarOpen guard) in apps/web/src/features/visitors/hooks/use-keyboard-navigation.ts
- [X] T072 [P] [US6] Create useKeyboardNavigation hook for providers in apps/web/src/features/providers/hooks/use-keyboard-navigation.ts
- [X] T073 [US6] Integrate keyboard navigation into visitors-page-client (searchInputRef, highlightedIndex state, hook wiring) and add highlighted row aria-selected styling to visitors-table.tsx
- [X] T074 [P] [US6] Integrate keyboard navigation into providers-page-client and providers-table.tsx

**Checkpoint**: Full keyboard workflow works on both visitors and providers pages. No shortcut interference with sidebar form inputs.

---

## Phase 10: User Story 7 — Edit Access Event (P3)

**Goal**: Guard can correct a previously logged access event (direction, vehicle, notes) from the sidebar's recent events list.

**Independent Test**: Open sidebar, click edit on a recent event, change direction from entry to exit, save. Verify access_events row updated. Cancel returns to create mode.

### Implementation

- [X] T075 [US7] Create useUpdateAccessEvent mutation hook in apps/web/src/features/visitors/hooks/use-update-access-event.ts
- [X] T076 [P] [US7] Create useUpdateAccessEvent mutation hook in apps/web/src/features/providers/hooks/use-update-access-event.ts
- [X] T077 [US7] Add edit mode support to visit-person-access-event-form (pre-fill fields from existing event, toggle between create/edit, clear on cancel) in apps/web/src/features/visitors/components/visit-person-access-event-form.tsx
- [X] T078 [US7] Add edit action buttons to recent-events-list items and wire edit selection to sidebar state in apps/web/src/features/visitors/components/visit-person-sidebar.tsx and providers sidebar

**Checkpoint**: Access events editable from sidebar. Edit mode pre-fills correctly. Cancel reverts to create mode.

---

## Phase 11: Image Capture (Cross-Cutting — FR-023/024/025)

**Goal**: Guards can attach optional images (face, id_card, vehicle_plate, other) during registration or on subsequent visits. Web uses file upload. Existing images viewable and replaceable.

**Independent Test**: Open visitor sidebar, upload a face image, verify it appears in image grid. Upload another face image, verify it replaces the previous one. Verify images persist across sidebar open/close.

### Implementation

- [X] T079 [P] Create image-upload component (file input accepting JPEG/PNG, max 5MB, imageType selector) in apps/web/src/shared/components/image-capture/image-upload.tsx
- [X] T080 [P] Create image-grid component (display thumbnails from signed URLs, show image type label, replace button) in apps/web/src/shared/components/image-capture/image-grid.tsx
- [X] T081 [P] Create useVisitPersonImages query hook in apps/web/src/features/visitors/hooks/use-visit-person-images.ts
- [X] T082 [P] Create useUploadVisitPersonImage mutation hook in apps/web/src/features/visitors/hooks/use-upload-visit-person-image.ts
- [X] T083 [P] Create useVisitPersonImages query hook for providers in apps/web/src/features/providers/hooks/use-visit-person-images.ts
- [X] T084 [P] Create useUploadVisitPersonImage mutation hook for providers in apps/web/src/features/providers/hooks/use-upload-visit-person-image.ts
- [X] T085 Create image-section component composing image-grid + image-upload with view/add/replace logic in apps/web/src/features/visitors/components/image-section.tsx
- [X] T086 Integrate image-section into visit-person-sidebar.tsx (show between person info and access event form) and provider-sidebar.tsx
- [X] T087 Add images namespace translation keys (capture labels, image types, upload prompts, replace confirmation) to apps/web/messages/es.json and apps/web/messages/en.json

**Checkpoint**: Image upload, display, and replacement works on both visitors and providers sidebars. All 4 image types supported.

---

## Phase 12: Desktop — Visitors & Providers Features

**Goal**: Desktop (Electron) app mirrors web visitors and providers features with react-i18next and webcam capture.

**Independent Test**: Open desktop app, navigate to Visitante/Proveedor page, full workflow matches web. Webcam capture produces image for upload.

### Implementation

- [X] T088 [P] Create desktop visitors feature directory with types, page wrapper in apps/desktop/src/features/visitors/pages/visitors-page.tsx and apps/desktop/src/features/visitors/types/index.ts
- [X] T089 [P] Create desktop providers feature directory with types, page wrapper in apps/desktop/src/features/providers/pages/providers-page.tsx and apps/desktop/src/features/providers/types/index.ts
- [X] T090 [P] Create desktop visitors hooks (use-visit-persons, use-create-visit-person, use-visit-person-vehicles, use-recent-visit-person-events, use-create-access-event, use-update-access-event, use-create-vehicle, use-visit-person-images, use-upload-visit-person-image, use-keyboard-navigation) in apps/desktop/src/features/visitors/hooks/
- [X] T091 [P] Create desktop providers hooks (mirror visitors hooks with type=service_provider) in apps/desktop/src/features/providers/hooks/
- [X] T092 Create desktop visitors components (visitors-page-client, visitors-table, visitors-table-columns, visit-person-sidebar, visit-person-form, visit-person-access-event-form, visit-person-status-badge, recent-events-list, image-section) in apps/desktop/src/features/visitors/components/
- [X] T093 Create desktop providers components (providers-page-client, providers-table, providers-table-columns, provider-sidebar, provider-form) in apps/desktop/src/features/providers/components/
- [X] T094 Create webcam-capture component using getUserMedia with live preview, capture button, retake, JPEG output (max 1280px, quality 0.85) in apps/desktop/src/shared/components/image-capture/webcam-capture.tsx
- [X] T095 [P] Create desktop image-upload component (file fallback) in apps/desktop/src/shared/components/image-capture/image-upload.tsx
- [X] T096 [P] Create desktop image-grid component in apps/desktop/src/shared/components/image-capture/image-grid.tsx
- [X] T097 Extend desktop VehicleForm to accept optional visitPersonId prop in apps/desktop/src/shared/components/vehicle-form/vehicle-form.tsx
- [X] T098 Add /visits-and-residents/visitors and /visits-and-residents/providers routes to page-router.tsx, update visits-and-residents redirect logic in apps/desktop/src/shared/components/page-router.tsx
- [X] T099 Add desktop i18n translation keys for visitPersons, providers, and images namespaces to apps/desktop/public/locales/es/ and apps/desktop/public/locales/en/

**Checkpoint**: Desktop visitors and providers pages work end-to-end. Webcam capture produces uploadable images. All i18n keys present.

---

## Phase 13: Desktop — Offline Infrastructure

**Goal**: Full offline support for desktop app. All write operations cached locally in SQLite and synced via outbox on reconnect.

**Independent Test**: Disconnect network, create visit person + log access event + capture image on desktop. Reconnect. Verify all data syncs to server with correct tenant_id and event_id idempotency.

### Implementation

- [X] T100 Install better-sqlite3 dependency and configure electron-builder to include native module in apps/desktop/package.json
- [X] T101 Create SQLite database singleton with connection management and schema initialization in apps/desktop/electron/repositories/database.ts
- [X] T102 Create local schema DDL (visit_persons, vehicles, access_events, visit_person_images_meta, sync_outbox tables with matching columns) in apps/desktop/electron/repositories/database.ts
- [X] T103 [P] Create visit-persons local repository (CRUD + search on SQLite) in apps/desktop/electron/repositories/visit-persons-repository.ts
- [X] T104 [P] Create vehicles local repository in apps/desktop/electron/repositories/vehicles-repository.ts
- [X] T105 [P] Create access-events local repository in apps/desktop/electron/repositories/access-events-repository.ts
- [X] T106 [P] Create images metadata local repository and file-system image cache ({userData}/images/ path convention) in apps/desktop/electron/repositories/images-repository.ts
- [X] T107 [P] Create sync-outbox repository (enqueue, dequeue, markSynced, markFailed) in apps/desktop/electron/repositories/sync-outbox-repository.ts
- [X] T108 Create sync-engine service: online/offline detection, FIFO outbox processing, idempotent upload via event_id, image file upload via API multipart, retry with backoff in apps/desktop/electron/services/sync-engine.ts
- [X] T109 Create visit-persons IPC handlers (list, create, update, getImages, uploadImage — proxy to API if online, fallback to SQLite if offline, enqueue writes to outbox) in apps/desktop/electron/ipc/visit-persons-handlers.ts
- [X] T110 [P] Create sync IPC handlers (getSyncStatus, triggerSync, getOutboxCount) in apps/desktop/electron/ipc/sync-handlers.ts
- [X] T111 Update preload.ts with visitPersons, vehicles, accessEvents, images, and sync API namespaces in apps/desktop/electron/preload.ts
- [X] T112 Register all new IPC handlers in main.ts and initialize sync engine on app ready in apps/desktop/electron/main.ts
- [X] T113 Add SyncSlice (idle | syncing | error | offline states) to Zustand store and add sync status indicator to desktop top bar in packages/store/ and apps/desktop/src/features/navigation/components/top-bar.tsx

**Checkpoint**: Desktop works offline. Data syncs on reconnect. Outbox processes in order. No data loss.

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, redirects, form persistence, and final verification.

- [X] T114 [P] Update visits-and-residents/page.tsx redirect to default to visitors (or first available sub-item) in apps/web/src/app/[locale]/(dashboard)/visits-and-residents/page.tsx
- [X] T115 [P] Add form persistence (useFormPersistence hook) to visit-person-form, provider-form, and access event forms for draft restoration in visitor and provider sidebar components
- [X] T116 Run pnpm typecheck across all workspaces and fix any type errors
- [X] T117 Run pnpm lint across all workspaces and fix any lint issues
- [X] T118 Verify full quickstart.md workflow end-to-end on both web and desktop platforms

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — first user story, establishes patterns
- **US2 (Phase 4)**: Depends on Phase 2 — can run in PARALLEL with US1
- **US3 (Phase 5)**: Depends on US1 (extends visitors sidebar with create mode)
- **US4 (Phase 6)**: Depends on US2 (extends providers sidebar with create mode)
- **US5 (Phase 7)**: Depends on US1 or US2 (adds search to existing page clients)
- **US8 (Phase 8)**: Depends on US1 or US2 (adds vehicle form to existing sidebars)
- **US6 (Phase 9)**: Depends on US1 or US2 (adds keyboard nav to existing page clients)
- **US7 (Phase 10)**: Depends on US1 or US2 (adds edit mode to existing sidebars)
- **Images (Phase 11)**: Depends on Phase 2 (API) + US1 or US2 (sidebar exists)
- **Desktop (Phase 12)**: Depends on Phase 2 (API) — can proceed in parallel with web phases
- **Desktop Offline (Phase 13)**: Depends on Phase 12
- **Polish (Phase 14)**: Depends on all desired phases being complete

### User Story Dependencies

```
Phase 1 (Setup)
    └── Phase 2 (Foundational API)
            ├── US1 (P1) ──→ US3 (P2)
            │                 US5 (P2)*
            │                 US8 (P2)*
            │                 US6 (P3)*
            │                 US7 (P3)*
            │                 Images*
            │
            ├── US2 (P1) ──→ US4 (P2)
            │                 (US5, US8, US6, US7, Images also apply to providers)
            │
            └── Desktop (Phase 12) ──→ Desktop Offline (Phase 13)

* These phases touch both visitors and providers
```

### Within Each User Story

- Hooks before components (data layer before UI)
- Table before sidebar (list before detail view)
- Page client last (orchestrates all components)
- i18n alongside or after components

### Parallel Opportunities

- **Phase 1**: T003–T007, T011 all parallel (different files)
- **Phase 2**: T020–T022 parallel (vehicles), T027–T028 parallel (api clients)
- **US1 + US2**: Can be developed in parallel (different feature directories)
- **US3 + US4**: Can be developed in parallel after respective US1/US2
- **US5 + US8 + US6 + US7**: Can be developed in parallel (touch different aspects of the page)
- **Desktop (Phase 12)**: Can proceed in parallel with web US3–US7 phases
- **Image hooks**: T081–T084 all parallel (different files)

---

## Parallel Example: Phase 3 (User Story 1)

```
# Launch all hooks in parallel (different files):
T031: useVisitPersons hook
T032: useVisitPersonVehicles hook
T033: useRecentVisitPersonEvents hook
T034: useCreateAccessEvent hook

# Launch all display components in parallel:
T035: visit-person-status-badge
T036: visitors-table-columns
T038: recent-events-list

# Then sequential (dependencies):
T037: visitors-table (depends on T036)
T039: access-event-form (depends on T034)
T040: visit-person-sidebar (depends on T038, T039)
T041: visitors-page-client (depends on T031, T037, T040)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (database + shared types)
2. Complete Phase 2: Foundational API
3. Complete Phase 3: User Story 1 — Visitors list + sidebar + access event
4. **STOP and VALIDATE**: Test Visitante page independently
5. Deploy/demo if ready — guards can log visitor entries

### Incremental Delivery

1. Setup + Foundational → API ready
2. US1 → Visitors access logging works → **MVP**
3. US2 → Providers access logging works
4. US3 + US4 → New person registration works
5. US5 + US8 → Search + inline vehicles
6. US6 + US7 → Keyboard nav + event editing
7. Images → Photo capture/upload
8. Desktop → Electron mirrors web
9. Desktop Offline → Full offline support

### Parallel Team Strategy

With multiple developers after Phase 2 completes:

- **Developer A**: US1 → US3 → US5 → US6 (visitors track)
- **Developer B**: US2 → US4 → US8 → US7 (providers track)
- **Developer C**: Images (Phase 11) → Desktop (Phase 12) → Desktop Offline (Phase 13)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story from spec.md
- Visitors and providers share ~80% structure — providers phase is lighter since patterns are established in visitors
- Desktop offline (Phase 13) is the highest-effort phase — build online-only desktop first (Phase 12), add offline as final increment
- Image capture is cross-cutting (applies to both visitors and providers) — Phase 11 can interleave with other phases
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
