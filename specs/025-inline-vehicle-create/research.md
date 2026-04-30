# Phase 0 Research — Inline Vehicle Creation in Person Create Form

**Branch**: `025-inline-vehicle-create`
**Status**: Complete — all NEEDS CLARIFICATION resolved.

This document captures the design decisions that resolve every "NEEDS CLARIFICATION" surfaced while filling Technical Context, plus the best-practice review for each technology choice referenced in the plan.

---

## 1. Where does the inline vehicle UI live?

**Decision**: Add `<InlineVehicleSection />` and `useInlineVehicleSubmissions()` as new exports inside `packages/features/src/shared/vehicle-form/`. Reuse the existing `VehicleForm` field set by composing it (or factoring its body into a `<VehicleFields />` subcomponent that both `VehicleForm` and `<InlineVehicleSection />`'s row render) — do not duplicate `vehicleType / brand / model / plate / color / year / notes` rendering.

**Rationale**:
- FR-012 explicitly requires the inline section to be implemented in the cross-app shared feature module for the visitors/providers case and to reuse the existing shared vehicle form rather than fork its fields and validation.
- The `vehicle-form` primitive is already shared (indirectly, via the visitors migration); extending the same directory keeps the feature surface coherent and avoids creating a new manifest entry in `shared-features.json`.
- Co-locating the orchestration hook with the rendering component lets both depend on the same `createVehicleSchema` import path and the same adapter ports (`useTransport`, `useRole`, `useI18n`).

**Alternatives considered**:
- *Per-app inline sections in `apps/web/src/features/users/`, `apps/web/src/features/providers/`, `apps/desktop/src/features/providers/`, `packages/features/src/visitors/`*: rejected — would fork field rendering across four files, directly violating FR-012 and triggering the spec 014 red-flag "new component added under both apps' features for a feature listed [in the manifest]". Also makes future schema changes (e.g., a new vehicle field) a four-place edit instead of one.
- *A new sibling primitive `packages/features/src/shared/inline-vehicle-section/`*: rejected — there is no behavior in the inline section that doesn't already touch `vehicle-form` data, and a sibling would force a circular-looking import (`inline-vehicle-section/` ⇄ `vehicle-form/`). Co-locating inside the existing `vehicle-form/` directory is simpler.
- *Generalize `VehicleForm` itself to accept an array of vehicles*: rejected — `VehicleForm` today is a single-record form, used in the access-event flow's "Add vehicle" view AND in `VehicleManageList`'s edit flow. Mutating it into a list-aware component would break those call sites and confuse the read.

---

## 2. Save model — one HTTP call, two HTTP calls, or N+1?

**Decision**: N+1 sequential client-orchestrated calls. On Save: (a) `POST /api/visit-persons` or `POST /api/users` once; on success, (b) `POST /api/vehicles` once per inline draft, awaited sequentially. The orchestration is owned by `useInlineVehicleSubmissions()` and exposes a per-entry status (`"draft" | "saving" | "saved" | "error"`).

**Rationale**:
- The spec's Assumption #3 ratifies that "same form" means the same Sheet panel, not a literal single HTTP request, so the simpler client-orchestrated approach is sanctioned.
- Per-entry plate-uniqueness errors must be attributable to the specific row that conflicted (FR-006 + FR-015). A single bulk endpoint would need to invent a multi-error envelope; sequential per-vehicle calls give us that for free via existing 4xx responses.
- FR-007 requires that a person-create success followed by a vehicle-create failure must NOT recreate the person on retry. A client orchestrator that tracks `personId` after the first call and only retries the failing vehicle entries is the simplest implementation of that contract.
- Sequential (not parallel) ordering is intentional: when 2+ inline rows have the same plate, parallel inserts would produce a non-deterministic "which one wins" race. Sequential ordering preserves the "first row wins, second row shows the conflict against itself" UX.

**Alternatives considered**:
- *New batch endpoint `POST /api/persons-with-vehicles`*: rejected — adds a new API surface, a new Zod schema, and a new server-side error envelope, all to save a presentation-layer convenience. The current sequential approach reuses everything.
- *Parallel `Promise.all` over vehicle posts*: rejected — see plate-conflict ordering above. Also makes the per-entry "saving" UI flicker indistinct.
- *Single transactional RPC*: rejected — would require a new Postgres function, a new Supabase migration, and new RLS plumbing for a presentation refactor.

---

## 3. Partial-failure UX (the spec's hardest edge)

**Decision**:
- After person-create succeeds, the orchestrator stores `personId` and the just-saved person's owner-type once. On any subsequent Save click, the orchestrator does NOT re-issue the person create — it skips straight to issuing `POST /api/vehicles` for entries whose status is `"draft"` or `"error"`.
- Each inline entry has its own per-row error display (FR-006). Toast-level errors are suppressed for inline-section failures; only field-level errors are rendered, anchored to the failing row.
- Closing the Sheet via the form's Cancel button (or via Esc / overlay click) leaves the already-saved person and any already-saved vehicles in the database. The user can re-open the existing edit/manage flows to fix the rest. This matches the edge-case decision in the spec ("Closing the panel must not delete the person").
- After a successful close (all entries `"saved"`), the visitor/provider sidebar transitions to the access-event step with the just-created vehicle pre-selected if exactly one inline vehicle was saved. If 2+ were saved, the picker shows the first as a sensible default but does not block the user from picking another (FR-004 + FR-005).
- For residents (web only), success closes the sidebar and the users table re-renders with the new resident row.

**Rationale**:
- FR-007 is the load-bearing requirement here. The orchestrator's `personId` memoization is the mechanism that prevents a duplicate person on retry.
- Toast-suppression for inline rows prevents the user from being spammed with one toast per failing row when 3+ rows fail at once.
- The "exactly one inline vehicle → pre-select" rule already exists in `VisitPersonSidebar`'s `justCreatedVehicleId` state (`packages/features/src/visitors/components/visit-person-sidebar.tsx:99`); we wire the orchestrator to set that state on the single-vehicle path.

**Alternatives considered**:
- *Roll back the person on any vehicle failure*: rejected — would require a new DELETE call, a new transactional shape, and would surprise the user (their visitor record disappears; "but I just saved them"). Also conflicts with the spec's edge-case ruling.
- *Show only a top-level error banner*: rejected — FR-006 explicitly mandates field-level errors anchored to the entry that caused them.
- *Auto-retry on transient failures*: rejected — out of scope; the user retries by clicking Save again.

---

## 4. Role gate — UI hiding vs. API rejection (FR-008 / FR-010)

**Decision**: Implement at both layers; rely on the API as the authoritative reject.

- **API layer (already exists)**: `VehiclesService.create` throws `ForbiddenException` when `dto.ownerType === "user" && role === "guard"` (`apps/api/src/modules/vehicles/vehicles.service.ts:21-23`). This is the ground truth and MUST remain.
- **UI layer (new)**: `<InlineVehicleSection />` accepts an `ownerKind: "resident" | "visitPerson"` prop. When `ownerKind === "resident"`, the section reads `useRole().role` and renders nothing (returns `null`) when the role is `"guard"`. The resident-side mounting in `UserForm` is already gated by `formData.role === "resident"`, so the section won't render at all unless the form is in resident mode; the explicit guard-role hide inside the section is defense in depth in case the parent gate is ever bypassed.

**Rationale**:
- The constitution's Principle VI is explicit: "Frontend MUST hide UI elements the current role cannot access, but MUST NOT rely on UI hiding as the sole authorization mechanism."
- Defense in depth at three layers (parent role-gate, child role-gate, API guard) is cheap and aligns with the existing `canEditUserTenantField` / `RolesGuard` patterns in the codebase.
- Visitor / provider inline-add is permitted for all roles (FR-009 + FR-010 explicitly allow `guard`, `admin`, `super_admin`), so the section just renders unconditionally on those surfaces.

**Alternatives considered**:
- *UI-only hide*: rejected — Constitution Principle VI explicitly forbids UI hiding as sole authz.
- *API-only reject (no UI hide)*: rejected — would let a guard fill a vehicle form and click Save only to be told "forbidden" after the fact. Worse UX, and the spec's FR-008 mandates UI hiding.

---

## 5. Web draft persistence (FR-013)

**Decision**: Extend the existing `useFormPersistence` snapshot for `user-create` and `user-edit-<id>` to include an `inlineVehicles` array alongside the existing `formData` object. The hook already accepts arbitrary serializable shapes (`Record<string, unknown>`), so widening the type is non-breaking. The list contains only the *user-entered field values* per row (not derived state, not status, not error messages); on restore, every restored row begins in `"draft"` status with no `vehicleId`, mirroring a fresh open.

The desktop counterpart does not implement draft recovery (out of scope for desktop today, per the spec). The shared `<InlineVehicleSection />` accepts an optional `initialDraft` prop and an `onDraftChange` callback so the host app (web) can wire restoration; desktop omits both and the section behaves as a transient form.

**Rationale**:
- FR-013 mandates draft recovery parity for the web user form. Folding inline vehicles into the same snapshot keeps the persistence story coherent and avoids a second `localStorage` key.
- Excluding status / errors from the persisted snapshot is intentional: a partially-failed save's error state is meaningful only within the live session; on a reload, the user is starting over from fresh drafts.
- The shared module exposes the prop pair `initialDraft` + `onDraftChange` as adapter-style extension points (matching the pattern already used by `VisitPersonForm` for non-vehicle fields), keeping the shared component free of any host-app persistence assumptions.

**Alternatives considered**:
- *Separate `localStorage` key for inline vehicles*: rejected — two keys risk drifting out of sync, and the existing tests for `useFormPersistence` would need a new mock for the second key.
- *Persist status/errors too*: rejected — see above; leaves the user staring at "saved" badges for entries that don't exist in the database after the reload.

---

## 6. Cache-key alignment for vehicle TanStack Query invalidation

**Decision**: The orchestrator hook's `mutationFn` reuses the same `["vehicles", tenantId, ownerKind, ownerId]` cache key shape that `VehicleForm` already uses (`packages/features/src/shared/vehicle-form/vehicle-form.tsx:111`). After all inline saves succeed, the orchestrator calls `queryClient.invalidateQueries({ queryKey: ["vehicles", tenantId, ownerKind, ownerId] })` once per principal (typically a single principal — the just-created person). This guarantees:

- For visitors/providers: the access-event step's vehicle picker (`useVisitPersonVehicles`) sees the freshly-created vehicles on its first read.
- For residents: any open `<VehicleManageList />` for that resident in another part of the app re-fetches.

**Rationale**: Constitution constraint — TanStack Query keys MUST include `tenantId`. The orchestrator reads `tenantId` from `useRole()` (the existing adapter port), matching how `VehicleForm` reads it today.

**Alternatives considered**:
- *Skip invalidation and rely on the post-save sidebar mode flip to remount the access-event form*: rejected — works for the visitor/provider single-vehicle path, but residents have no mode flip, and a stale `VehicleManageList` cache elsewhere in the app would lie about the new vehicles.

---

## 7. i18n key namespace

**Decision**: Add a `vehicles.inline.*` namespace in `@ramcar/i18n` with these keys (initial set; final list is in the i18n PR):

- `vehicles.inline.sectionTitle` — "Vehicles" (visitor/provider context)
- `vehicles.inline.sectionTitleResident` — "Resident vehicles" (user form context, slightly more specific because the form has multiple field groups)
- `vehicles.inline.addEntry` — "Add another vehicle"
- `vehicles.inline.removeEntry` — "Remove this vehicle"
- `vehicles.inline.savingEntry` — "Saving…"
- `vehicles.inline.savedEntry` — "Saved"
- `vehicles.inline.retryEntry` — "Retry"
- `vehicles.inline.errorPlateInUse` — falls through to the existing vehicle plate-conflict copy if one exists; otherwise a new "Plate already in use" string

All other vehicle field labels reuse existing `vehicles.*` keys (since the inline rows render the same field set as `VehicleForm`).

**Rationale**: FR-017 mandates that all new strings live in the shared i18n catalog. The `inline` sub-namespace mirrors the existing `vehicles.color.*`, `vehicles.brand.*`, etc., grouping convention.

**Alternatives considered**:
- *Reuse `vehicles.title` ("Register Vehicle") for the section header*: rejected — that string is currently used as a page-level form heading, not as a section header inside another form. Distinguishing them keeps future copy edits independent.

---

## 8. Why no providers migration as part of this spec?

**Decision**: This spec deliberately does NOT migrate `providers` from per-app to shared. The `<InlineVehicleSection />` is shared; the providers feature still owns its own form/sidebar wrappers (which call into `<InlineVehicleSection />`).

**Rationale**:
- Spec 014 lists `providers` as "pending post-pilot migration". Mixing a presentation refactor (this spec) with a structural migration would balloon scope and conflict with the per-pilot rollout cadence.
- The shared component-and-hook is the only thing that needed to land in the shared package to satisfy FR-012. The providers wrappers consuming it from each app is structurally identical to how the apps' own residents and visits flows already consume `VehicleForm` and `VehicleManageList` from the shared package.

**Alternatives considered**:
- *Migrate providers to `packages/features/src/providers/` as part of this spec*: rejected — out of scope; would require its own spec entry and shared-features.json update.

---

## 9. Testing strategy

**Decision**:
- **Shared module unit tests** (`packages/features/src/shared/vehicle-form/__tests__/`):
  - `inline-vehicle-section.test.tsx`: add row, remove row, validate-then-show-error, multi-row mixed status, role-gate (resident + guard hides), role-gate (resident + admin shows).
  - `use-inline-vehicle-submissions.test.ts`: orchestration — happy multi-vehicle path; person-saved-then-vehicle-fails; retry-without-recreate; partial-multi-row failure leaves succeeded rows alone.
- **Visitors integration tests** (`packages/features/src/visitors/__tests__/`):
  - `visit-person-form.test.tsx` (existing, edited): inline section visible in create mode, hidden in edit (edit doesn't take vehicles inline; vehicles are managed via the access-event step's add-vehicle flow).
  - `visitors-view-inline-vehicle.test.tsx` (new): full happy path — guard role, registers visitor with one vehicle, sidebar transitions to access-event with vehicle pre-selected.
- **Web users tests** (`apps/web/src/features/users/__tests__/`):
  - `user-form-inline-vehicle.test.tsx` (new): resident path renders section; non-resident roles hide section; guard role hides section even when role=resident is somehow set.
- **Web providers tests** (`apps/web/src/features/providers/__tests__/`):
  - `provider-inline-vehicle.test.tsx` (new): provider create with one inline vehicle; sidebar pre-selects the just-created vehicle.
- **Desktop providers tests** (`apps/desktop/src/features/providers/__tests__/`):
  - `provider-inline-vehicle.test.tsx` (new): same as web provider test, but using the `react-i18next` adapter to validate i18n wiring works on desktop too.
- **API tests** (`apps/api/src/modules/vehicles/__tests__/`): existing `vehicles.service.spec.ts` already covers the guard-on-resident-vehicle 403; no new API tests needed for FR-008. We rely on this existing safety net being green to satisfy the "API rejects" half of FR-008.
- **E2E (optional)** (`apps/web/e2e/inline-vehicle-create.spec.ts`): one happy-path test that opens the visitors page, registers a visitor with one vehicle, and asserts the access-event step is reached with the vehicle pre-selected. Marked optional because the Vitest integration tests already exercise this path at the component layer.

**Rationale**: Mirror the testing layout already in place for spec 011 (visitors), spec 015 (users sidebar), and spec 022 (vehicle brand logos). Each layer of the stack gets coverage without duplicating assertions.

**Alternatives considered**:
- *Skip desktop tests entirely*: rejected — the i18n adapter for desktop is the seam most likely to silently regress (e.g., a missing `react-i18next` key path). One desktop integration test catches that.

---

## 10. Performance budget for sequential vehicle saves

**Decision**: For up to 5 inline vehicles per resident (and up to 2–3 per visitor/provider in practice), sequential `POST /api/vehicles` calls are acceptable without a "batch" optimization. Each call is < 200 ms p95 in the current `apps/api/.../vehicles.service.ts` repository; 5 sequential calls bound the worst case at ~1 s, dominated by network. The Sheet remains responsive (per-row "saving…" badges, Save button disabled while in flight).

**Rationale**:
- The spec does not give a hard p95 latency budget; SC-002 only requires the new flow be at least 40% faster than the current multi-step flow, which it trivially achieves by eliminating screen transitions and re-mounts.
- Pre-emptive batching would invent a new endpoint and a new error envelope — see decision (2).

**Alternatives considered**:
- *Limit residents to 1 inline vehicle and force the rest to be added via the existing manage flow*: rejected — the spec's FR-005 explicitly requires multiple inline vehicles for residents.

---

## 11. Conflict resolution & idempotency

**Decision**: No idempotency keys are introduced. The retry-after-partial-failure path in `useInlineVehicleSubmissions` only retries entries whose status is `"draft"` or `"error"`. Entries whose status is `"saved"` (the orchestrator received a 2xx with a real `vehicle.id`) are excluded from subsequent saves. The user can also explicitly remove a `"saved"` entry, which calls `DELETE /api/vehicles/:id` (this matches the existing remove-after-create UX in `VehicleManageList`) — but the spec does NOT require remove-after-save in the inline section; the simpler interpretation is that "saved" entries become read-only badges in the section and are removed only via the post-create edit/manage surface.

**Recommendation**: Initial implementation treats `"saved"` rows as read-only badges (with a "Saved" pill and the vehicle's plate/brand) and does NOT offer a delete button. Users delete via the existing manage surface after the create flow finishes. This keeps the inline section unambiguous (per the edge-case ruling in the spec: "the chosen interaction must be unambiguous to the user").

**Rationale**:
- Idempotency keys would require a new API column and a new client UUID-per-entry plumbing, for a UX that the user can already get by retrying entries that are still in `"error"` status.
- Treating `"saved"` rows as read-only sidesteps the question "what happens if I remove a saved row?" — the answer is "you can't from here; use the edit flow."

**Alternatives considered**:
- *Add `Idempotency-Key` header*: rejected — out of scope; not requested by the spec; existing API doesn't support it.

---

## Summary

All open questions resolved. No changes required to the API, the shared Zod validators, the Postgres schema, or the desktop SQLite/outbox. The feature is a presentation refactor that:

1. Adds two shared exports under `packages/features/src/shared/vehicle-form/` (`InlineVehicleSection` + `useInlineVehicleSubmissions`).
2. Threads them through three host-app surfaces: shared visitors, web/desktop providers, web users.
3. Folds inline-vehicle drafts into the existing `useFormPersistence` snapshot for the web user form.
4. Adds 8 new i18n strings in `@ramcar/i18n`.
5. Hides the section for `role === "guard"` when the parent person is a resident, in addition to the API-level reject already in place.

Proceed to Phase 1.
