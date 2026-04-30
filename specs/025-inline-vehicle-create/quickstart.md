# Quickstart — Inline Vehicle Creation in Person Create Form

**Branch**: `025-inline-vehicle-create`

This walk-through is a manual verification script for the three host surfaces touched by the feature. It assumes a working local stack (`pnpm dev` + `pnpm db:start`) and a seeded tenant with at least one resident, one admin, one super-admin, and one guard account.

## Prerequisites

```bash
nvm use                    # Node 22 LTS
pnpm install
pnpm db:start              # Supabase local
pnpm dev                   # Web on :3000, desktop in dev mode, API on :3001
```

For the desktop verification, you may also want:

```bash
pnpm --filter @ramcar/desktop dev
```

---

## 1. Visitor + vehicle in one Save (booth — desktop, guard role)

This is the P1 path from the spec.

1. Sign into the desktop app as a `guard`.
2. From the dashboard, navigate to **Visitors** (or use the keyboard shortcut for the visit-person registration).
3. Press **N** (or click the "Register" button) to open the create sidebar.
4. Fill the visitor fields:
   - Full name: `Pedro Martinez`
   - Status: leave default (guards are forced to `flagged`)
   - Resident: pick any resident from the combobox.
5. Scroll down. You should see a **Vehicles** section under the visitor fields, with an **+ Add vehicle** button.
6. Click **+ Add vehicle**. A draft row appears with the same fields `VehicleForm` shows: vehicle type, brand, model, plate, color, year, notes.
7. Fill the vehicle row:
   - Type: `Car`
   - Brand: `Toyota`
   - Model: `Corolla`
   - Plate: `INL-001`
   - Color: any (e.g., black)
8. Press **Save** at the bottom of the form.

**Expected**:

- A single click submits both the visitor and the vehicle. The Save button shows a spinner; the vehicle row shows a "Saving…" badge.
- After both calls succeed, the sidebar transitions to the access-event step.
- The vehicle picker pre-selects `Toyota Corolla — INL-001` (the just-created vehicle).
- You can immediately record an entry without opening any "Add vehicle" view.

**Failure to verify**:

- Cancel the create flow before pressing Save → no visitor and no vehicle exist on the server.
- Re-open the create flow → you are NOT prompted to recover a draft (desktop has no draft persistence — this is intentional, see research §5).

---

## 2. Provider + vehicle in one Save (web, admin role)

1. Sign into the web app at `http://localhost:3000` as an `admin`.
2. Go to **Providers** (`/<locale>/visits-and-residents/providers`).
3. Click **Register provider**.
4. Fill the provider fields (full name, company, status, resident, etc.).
5. In the **Vehicles** section, click **+ Add vehicle** and fill one row.
6. Press **Save**.

**Expected**: identical to step 1 but on web — sidebar transitions to access-event step with the just-created vehicle pre-selected.

---

## 3. Resident + multiple vehicles in one Save (web, admin role)

1. Sign into the web app as an `admin` or `super_admin`.
2. Go to **Users** catalog.
3. Click **Create user**.
4. Fill the user fields:
   - Full name: `Ana López`
   - Role: **Resident**
   - Tenant: (locked to active tenant for non-super-admins)
   - Address: required for residents.
5. Scroll down. The **Resident vehicles** section appears (it is hidden when role is anything other than resident).
6. Click **+ Add vehicle** twice. Fill two rows:
   - Row 1: car / Toyota / Corolla / `RES-001`
   - Row 2: motorcycle / Honda / CBR / `RES-002`
7. Press **Create user**.

**Expected**:

- Both vehicles are created in sequence after the resident is created.
- The sidebar closes when all three records (1 person + 2 vehicles) have succeeded.
- The users table refreshes with Ana visible at the top.
- Opening Ana's vehicles management surface shows both vehicles.

---

## 4. Partial failure — plate conflict

1. From scenario 3 above, before pressing Create, set Row 1 plate to a value that is already used by another vehicle in the same tenant (e.g., create one ahead of time with plate `DUPL-1`).
2. Press **Create user**.

**Expected**:

- The user record is created successfully.
- Row 1 vehicle creation fails with a plate-uniqueness error rendered against Row 1's plate field. Row 1 status is `"error"`.
- Row 2 vehicle creation proceeds (sequential ordering doesn't bail on first failure).
- The sidebar STAYS OPEN. The user record is NOT deleted. The form fields for Ana are NOT reset.
- Adjust Row 1's plate to `RES-001-FIXED` and press Create user again.
- Only Row 1 is re-attempted (Row 2 already has status `"saved"` and is skipped). The user record is NOT re-created (the orchestrator's `personId` is reused).
- After Row 1 succeeds, the sidebar closes.

**This validates FR-007** (no orphan recreation, partial-success preservation, retry-without-recreate).

---

## 5. Role gate — guard cannot inline-add a resident vehicle

1. Sign in as a `guard`.
2. Go to the Users catalog (or hit the route directly if the link is hidden — guards typically can't reach this UI; this step is to verify the defense-in-depth behavior).
3. If you can open the user create sidebar and select role = resident, the **Resident vehicles** section MUST be hidden — no "+ Add vehicle" button, no rows.
4. As a sanity check, open DevTools and issue a direct API call:
   ```ts
   fetch("/api/vehicles", {
     method: "POST",
     headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
     body: JSON.stringify({ ownerType: "user", userId: "<some-resident-id>", vehicleType: "car", plate: "BYPASS-1" }),
   });
   ```
5. Expected: HTTP **403** with the `ForbiddenException` body. The API rejects regardless of the UI state.

**This validates FR-008 + FR-009** (guards CAN inline-add for visitor/provider; CANNOT for resident; API enforces the boundary independently of the UI).

---

## 6. No regression — person create with no inline vehicle

1. As an admin, open the visitor create sidebar.
2. Fill only the visitor fields. Leave the **Vehicles** section empty (do not click "+ Add vehicle").
3. Press **Save**.

**Expected**:

- The visitor is created.
- The sidebar transitions to the access-event step.
- The vehicle picker shows "No vehicles" exactly as today.
- The "Add vehicle" affordance from the access-event step still works.

**This validates SC-005** (no regression in the no-vehicle path).

---

## 7. Web draft recovery (resident path)

1. As an admin, open the user create sidebar with role = resident.
2. Fill the resident fields and add 2 inline vehicle rows with partial data (vehicle type set, brand chosen, plate typed).
3. **Reload the browser** (Cmd-R / Ctrl-R) without saving.
4. Re-open the user create sidebar.

**Expected**:

- All resident form fields are restored from `localStorage` (existing behavior).
- The 2 inline vehicle rows are restored, each with `status: "draft"` and the same field values you typed.
- Pressing Save submits both the user and both vehicles.

---

## 8. Smoke check — all tests pass

```bash
pnpm lint
pnpm typecheck
pnpm test --filter @ramcar/features
pnpm test --filter @ramcar/web
pnpm test --filter @ramcar/desktop
pnpm test --filter @ramcar/api      # existing 403-on-guard-resident-vehicle stays green
```

Optional E2E:

```bash
pnpm test:e2e --filter @ramcar/web -- --grep "inline vehicle"
```

---

## 9. Cleanup

```bash
# Reset DB to seed state if you want to re-run the verification.
pnpm db:reset
```

The created visitors, providers, residents, and vehicles from this walkthrough will be re-seeded.
