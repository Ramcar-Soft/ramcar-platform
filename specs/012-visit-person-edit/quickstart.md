# Quickstart: Edit Visitor/Service Provider Records & Read-Only Access Events

**Feature**: `012-visit-person-edit`
**Prerequisite**: Spec 011 (Visitor & Service Provider Access Logging) is deployed and functional.

This quickstart walks a developer through validating the feature end-to-end on their local machine, on **both web and desktop**.

---

## 1. Environment setup

```bash
# From the monorepo root
pnpm install
pnpm db:start              # local Supabase
pnpm db:reset              # seeds users, tenants, a few visit persons
```

## 2. Sanity checks before you start

```bash
# Build must pass — this also catches any missed cleanup of the removed access-event update path
pnpm typecheck
pnpm lint

# Access-event update hooks must be gone:
rg "useUpdateAccessEvent|updateAccessEventSchema|UpdateAccessEventInput" apps packages
# → expect zero matches (documentation files in specs/ are excluded if scoped as above)
```

## 3. Run the apps

```bash
pnpm dev                   # starts web (:3000), www, api (:3001), desktop
```

Log in as a `guard` user (seeded). Navigate to **Visitantes** under the "visits-and-residents" menu group.

## 4. Verify User Story 1 — Edit a visitor (web)

1. On the Visitantes table, locate any row. Observe the **trailing actions column** with an edit icon button.
2. Click the **edit button** (not the row body). The right sidebar opens with the title "Edit Visitor".
3. Confirm the form is pre-populated with the visitor's current values (full name, status, resident, notes).
4. Confirm **no access-event form** is visible, and the vehicle/access-mode selectors are absent.
5. Change the full name (e.g., add a middle initial) and click **Save**.
6. Confirm: the sidebar closes, a success toast appears ("Visitor updated"), and the row in the table reflects the new name immediately.
7. Open the `access_events` table in a DB inspector (or call the recent-events endpoint for this visitor). Confirm **no new row** was created as a side effect.

## 5. Verify User Story 2 — Edit a provider (web)

Navigate to **Proveedores**. Click the edit button on any provider. Confirm the form includes `phone` and `company` fields. Change the company, save, verify the row updates and no access event was recorded.

## 6. Verify User Story 3 — Preserve new-visit workflow (web)

1. On the Visitantes table, **click the row body** (not the edit button). The sidebar opens in the existing view/log mode — recent events, vehicle selector, access-event form all present.
2. Fill the form and save. A new access event is recorded as before.
3. Press `B` to focus the search, arrow down to a row, press `Enter`. The sidebar opens in view mode — **not** edit mode.
4. Click **Register New**. The sidebar opens in create mode, unchanged from spec 011.

## 7. Verify User Story 4 — Access events are read-only (web)

1. Open any person with past access events. Inspect the recent-events list in the sidebar.
2. Confirm **no edit button, no delete button, no mutation controls** on any past event.
3. Open a **resident** from the Residents module. Confirm the same — recent events are purely read-only.
4. From a terminal:

   ```bash
   curl -i -X PATCH http://localhost:3001/api/access-events/<any-uuid> \
        -H "Authorization: Bearer $JWT" \
        -H "Content-Type: application/json" \
        -d '{"notes":"hack"}'
   ```

   Expect **`404 Not Found`** (the handler is gone).

## 8. Verify User Story 5 — Image management from edit sidebar (web + desktop)

1. Open the edit sidebar for a visitor with no images.
2. Upload a face image. Confirm it appears in the image section.
3. Save the form (or close the sidebar with no text-field changes). Reload the page and open the edit sidebar again. The image is still there.
4. Upload another face image to the same person. Confirm the old image is replaced (spec 011 FR-025 behavior preserved).

## 9. Verify desktop parity

Switch to the Electron desktop app (it was started by `pnpm dev`). Repeat steps 4–8 in the desktop UI. Confirm identical behavior.

### Offline scenario (desktop only)

1. In the desktop app, toggle offline (disable network on the host machine or use the dev panel).
2. Edit a visitor. Save. Confirm the sidebar closes and the row reflects the new values optimistically.
3. Re-enable the network. Observe the outbox draining (`SyncSlice` goes `syncing → idle`).
4. Refresh the web app (as the same tenant). Confirm the visitor's server record reflects the edit.

## 10. Verify unsaved-changes warning

1. Open the edit sidebar for a visitor. Type something into the name field.
2. Click outside the sheet (or press Escape). Confirm an `AlertDialog` appears: "Discard changes?" with "Keep editing" and "Discard" buttons.
3. Click **Keep editing**. The sheet stays open and the dirty text is preserved.
4. Repeat and click **Discard**. The sheet closes and the visitor record is unchanged.

## 11. Verify draft persistence

1. Open the edit sidebar for visitor A. Type a new name. **Do not save.** Close with "Discard? → Keep editing" then navigate the browser back.
2. Return to the Visitantes page and open visitor A's edit sidebar again. Confirm the draft is restored (toast: "Draft restored") with the new name.
3. Open the edit sidebar for a **different** visitor B. Confirm B's form is **not** contaminated by A's draft (draft key is per-person ID).

## 12. Tear-down

```bash
# stop dev servers (Ctrl+C)
pnpm db:stop
```

## Acceptance summary

| Story | Verified in step | Success criterion covered |
|-------|------------------|---------------------------|
| US1 Visitor edit | §4, §11 | SC-001, SC-003, SC-005 |
| US2 Provider edit | §5 | SC-001, SC-003 |
| US3 Preserve new-visit | §6 | SC-004 |
| US4 Read-only access events | §7 (+ §9) | SC-002 |
| US5 Image management | §8 (+ §9) | — |
| Desktop offline | §9 offline scenario | SC-006 |
