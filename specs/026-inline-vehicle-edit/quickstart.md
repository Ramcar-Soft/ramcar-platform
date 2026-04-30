# Quickstart: Manual Verification — Inline Vehicle Edit and Delete

**Branch**: `026-inline-vehicle-edit` | **Date**: 2026-04-29

This is the manual walkthrough for confirming the four user stories on web (`apps/web`) and desktop (`apps/desktop`). It is the smoke-test path used to validate the feature before requesting code review.

## Prerequisites

- Local Supabase running (`pnpm db:start`).
- `pnpm dev` running both `apps/web` and `apps/desktop` (or run them individually).
- Three seeded users in the active tenant: one `super_admin`, one `admin`, one `guard`. Each role has a known login.
- At least one seeded resident with one or more vehicles attached.
- At least one seeded visitor and one seeded service provider.

## US1 — Guard fixes a typo on a vehicle right after creating it (P1)

**Surface**: desktop (booth) and web (mirror — same shared sidebar component).
**Roles**: guard.

### Steps (desktop)

1. Sign in as the guard.
2. Open the Visitors view.
3. Click **Register New** in the visitors table. The right-side `Sheet` opens in `create` mode.
4. Fill in the visitor's full name, status (Flagged is the default for guards — leave it), and resident.
5. Scroll to the **Vehicles** section (the inline-vehicle section from spec 025) and click **Add vehicle**.
6. Fill in the vehicle fields. **Deliberately mistype the plate** (e.g. enter `XYZ123` instead of the intended `XYZ132`).
7. Click **Save**. The visitor and the vehicle are saved; the panel transitions to the access-event step.

### Verify the new behavior

8. The access-event step shows a vehicle picker. The just-created vehicle is pre-selected, displaying the typo.
9. Below the picker, look for a **manage vehicles** affordance. (Per the visit-person sidebar update — same affordance pattern as the residents access-event-sidebar.)
10. Click it. The Sheet's body switches to the manage view. The list shows the just-created vehicle with a **pencil** icon. The trash icon must NOT be visible (FR-007 — guards cannot delete).
11. Click the pencil. The body switches to a vehicle edit form pre-populated with the existing values.
12. Correct the plate (`XYZ123` → `XYZ132`). Click **Update**.
13. The form returns to the manage view; the row now shows the corrected plate label.
14. Click the back arrow. The body returns to the access-event step. The picker shows the corrected plate. The picker selection is still the same vehicle (no second vehicle was created).
15. Save the access event normally. The Sheet closes.

**Pass criteria**:
- The vehicle was edited in place (no new vehicle was created — verify with the visitor's vehicle list afterwards).
- The trash icon is never visible to a guard on this surface (US2 cross-check).
- No panel close-and-reopen happened between vehicle creation and the corrected save (SC-001).

### Same on web

Repeat the flow signed in as the same guard role on `apps/web`. The visitor sidebar uses the shared `@ramcar/features/visitors` package — UX is symmetric.

## US2 — Guards cannot delete vehicles (P1)

**Surface**: web + desktop.
**Roles**: guard.

### UI side — verify hidden affordance

1. Sign in as a guard on the desktop.
2. Open a visitor or provider that has at least one vehicle.
3. Open the manage vehicles list (per the path in US1 step 10).
4. Confirm: every row exposes a **pencil** icon. No row exposes a **trash** icon.
5. Repeat on web with the same guard account. Same expectation.

### API side — verify forbidden response

6. With the guard signed in (web — easiest to grab the JWT from devtools), issue a direct `DELETE /api/vehicles/:id` against:
   - a vehicle owned by a **resident** (expect 403 — already the case),
   - a vehicle owned by a **visit-person** (expect **403** — this is the FR-012 change; was 204 before).
7. Confirm the vehicle still appears in `GET /api/vehicles?visitPersonId=…` afterwards (it was not soft-deleted).

Example with `curl`:

```bash
# Substitute <JWT> and <VEHICLE_ID> appropriately.
curl -i -X DELETE \
  -H "Authorization: Bearer <JWT>" \
  http://localhost:3001/api/vehicles/<VEHICLE_ID>
# Expect: HTTP/1.1 403 Forbidden
```

### Admin/super-admin cross-check

8. Sign in as an admin or super-admin.
9. On the same visitor sidebar, the manage list MUST show both **pencil** and **trash** icons on each row.
10. Click the trash on one row. The confirmation dialog opens. Confirm.
11. The vehicle is soft-deleted; the row disappears from the list and from the picker on the access-event step.

**Pass criteria**:
- Guard cannot remove vehicles via UI (no trash icon) or via API (403 on direct call).
- Admin / super-admin can delete on the same surface.

## US3 — Admin manages resident vehicles inline in the user catalog edit sidebar (P2)

**Surface**: web only (residents are single-app per FR-016).
**Roles**: admin or super-admin.

### Steps

1. Sign in as an admin on `apps/web`.
2. Open the **Users** catalog.
3. Click a row whose role is `resident`. The user edit sidebar opens (`mode === "edit"`).
4. Below the user form, a **Vehicle** section is present. It lists the resident's vehicles, each with **pencil** and **trash** icons.
5. Click the pencil on a row. The Sheet body replaces the user form with the vehicle edit form pre-populated with that vehicle's values.
6. Edit the plate (or another field) and click **Update**. The body returns to the user form + vehicle list view; the row reflects the new plate label.
7. Confirm the resident profile fields above the vehicle list are NOT modified (SC-004).
8. Click the trash on another row. Confirm the deletion dialog. Confirm.
9. The row disappears from the list. The resident profile is unchanged.

### Cross-checks

10. Repeat steps 1-2 but click a row whose role is **admin** or **guard**. The vehicle section MUST NOT be present (FR-003).
11. Sign in as a guard (if the role can reach the user catalog — by default it cannot). If somehow on this surface, the vehicle section is hidden (FR-008).

**Pass criteria**:
- Edit and delete affordances visible to admin / super-admin.
- Vehicle section not rendered for non-resident users.
- Resident profile fields unaffected by vehicle ops.

## US4 — Admin manages visitor/provider vehicles inline in the visit-person edit sidebar (P2)

**Surface**: web + desktop (cross-app via `@ramcar/features/visitors`).
**Roles**: admin or super-admin.

### Steps

1. Sign in as an admin on web.
2. Open the **Visitors** catalog (or **Service Providers**). Click a row to open the sidebar.
3. The sidebar opens in **view** mode (not `edit`). Open the manage vehicles list (same affordance as US1).
4. The list shows the visitor's vehicles with **pencil** AND **trash** icons (admin/super-admin gets both).
5. Click pencil → edit form → Update. Returns to manage list with the new label.
6. Click trash → confirm dialog → Confirm. The row disappears.
7. Switch the sidebar to `edit` mode (e.g., via the trailing-action edit button on the row, or however the admin reaches the visitor edit form).
8. Confirm: the vehicle list section is also visible in edit mode beside the visit-person edit form (FR-002 — edit mode also exposes the list to admins/super-admins).
9. Confirm: edit and delete in edit mode behave identically to view mode.

### Repeat on desktop

10. Same flow as steps 1-9 on `apps/desktop`. The shared visit-person-sidebar component carries the same UX.

**Pass criteria**:
- Admin sees edit + delete on visitor and provider rows in both view and edit modes.
- Edits and deletes refresh the access-event picker (FR-011).
- Visit-person record fields (name, status, resident, notes) untouched by vehicle ops (SC-004).

## Edge case verifications

These are quick smoke checks for the spec's edge-case enumerations, run after the four user stories above pass.

### EC-1: Concurrent edit conflict

11. Two browser windows, both signed in as admins. Both open the same visitor's vehicle in edit mode.
12. Window A saves first. Window B saves second.
13. Window B sees the existing `VehicleForm` error toast (`vehicles.messages.errorUpdating`) and stays on the edit form. Acceptable.

### EC-2: Picker shows a stale selection after delete

14. As an admin, in the visit-person sidebar's view mode, select a vehicle in the access-event picker.
15. Open the manage list. Delete the **same** vehicle the picker had selected.
16. Return to the access-event step. The picker selection becomes empty (per D5 in `research.md`).

### EC-3: Empty vehicle list

17. As an admin, on a visitor with zero vehicles, open the manage list.
18. The empty-state message renders: "No vehicles registered." (`vehicles.manage.empty`). The "Add vehicle" affordance is still reachable from the access-event step.

### EC-4: Desktop offline

19. On the desktop, disable network. Open a visitor's manage list.
20. Click pencil → edit. Save. The behavior matches whatever the existing transport supports for `PATCH /api/vehicles/:id`. (Per D7: this spec does not introduce new offline support.)

## Automated verification

Run the test suites:

```bash
# Vehicles service spec (NestJS, Jest) — covers FR-012
pnpm --filter @ramcar/api test src/modules/vehicles/__tests__/vehicles.service.spec.ts

# Shared component spec (Vitest)
pnpm --filter @ramcar/features test src/shared/vehicle-form/__tests__/vehicle-manage-list.test.tsx

# Sidebar specs (Vitest)
pnpm --filter @ramcar/features test src/visitors/__tests__/visit-person-sidebar-manage.test.tsx
pnpm --filter web test src/features/providers/__tests__/provider-sidebar-manage.test.tsx
pnpm --filter web test src/features/users/__tests__/user-sidebar-manage.test.tsx

# Optional E2E
pnpm --filter web playwright test e2e/inline-vehicle-edit.spec.ts
```

All commands MUST pass before the work is considered complete.

## Common pitfalls during dev verification

- **Forgetting to update the existing access-event-sidebar call sites** when renaming `residentId` → `owner`. The two existing files (`apps/web/.../residents/access-event-sidebar.tsx`, `apps/desktop/.../residents/access-event-sidebar.tsx`) MUST be updated in lockstep with the prop change. SC-006 regression risk.
- **Mounting `VehicleManageList` for non-resident users in the user-sidebar**. The conditional must read `userData.role === "resident"`, not just "any user being edited". FR-003 + FR-008.
- **Hiding the trash icon by passing `canDelete={undefined}`**. The default is `true`, so `undefined` shows the trash. Pass an explicit `canDelete={false}` for guards on visit-person rows.
- **Picker selection not clearing after delete**. If you skip the `useEffect` cleanup in `AccessEventForm` / `VisitPersonAccessEventForm` (see D5), submitting the access-event step will fail with 404.
- **Not extending the `VehiclesService.remove` test**. The existing "forbids guards deleting resident vehicles" test still passes after FR-012, but the symmetric "forbids guards deleting visit-person-owned vehicles" test must be added or US2's API-side guarantee is untested.
