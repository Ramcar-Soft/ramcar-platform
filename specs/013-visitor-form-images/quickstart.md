# Phase 1 — Quickstart

**Feature**: Visitor Form Image Capture UX
**Branch**: `013-visitor-form-images`

End-to-end manual verification for both surfaces. Do this after each independent user-story slice is merged.

## Prerequisites

```bash
pnpm install
pnpm db:start          # local Supabase on :54322
pnpm db:reset          # applies migrations + seeds tenant + users
```

Seeded credentials (from existing seed):
- Admin: `admin@demo.local` / `demo1234`
- Guard: `guard@demo.local` / `demo1234`

Have 2–3 sample images ready in JPEG/PNG, each < 5 MB. One should have a non-square aspect ratio (e.g. portrait ID card) to visually verify tile cropping.

---

## Test A — Web portal: create visitor with images (User Story 1 + 3)

```bash
pnpm --filter @ramcar/web dev
# open http://localhost:3000
```

1. Sign in as admin.
2. Navigate to **Visitors**.
3. Click **+ Register visitor**.
4. **Expect (FR-001, FR-008)**: the sidebar now contains a **Photos** section with a title, the hint text "Select the type of image you want to upload or change.", a type selector (Face / ID Card / Vehicle Plate / Other), and an Upload button.
5. Fill: Full name = "Ada Lovelace", Status = Allowed, pick any resident, Notes = "Test A".
6. In the Photos section, select **Face** → **Upload** → pick a sample image.
7. **Expect**: a tile appears showing the image; tile is **square** (FR-004); footer shows **Face** and a **Replace** action that is visually prominent against the dark footer (FR-005).
8. Switch type to **ID Card** → **Upload** → pick a portrait-aspect image.
9. **Expect**: second tile appears, also square, the portrait image is cropped center-cover (no distortion).
10. Click **Save**.
11. **Expect**:
    - The create mutation succeeds.
    - Both staged images upload sequentially (toast "Upload started" ×2 acceptable).
    - The sidebar closes or transitions to edit view for the new person.
    - The visitor appears in the list. Opening their sidebar shows both images in the grid.
12. **Expect**: no console errors; no orphan rows in Supabase Storage (spot-check via Studio at http://localhost:54323 → Storage → `visit-person-images`).

## Test B — Web portal: cancel after staging (User Story 1, FR-003, SC-005)

1. Repeat steps 1–9 from Test A but instead of Save, click **Cancel**.
2. **Expect**: the sidebar closes. No new visitor created; no new Storage objects; no `visit_person_images` rows. Browser blob URLs are revoked (no warnings in console after a few seconds).

## Test C — Web portal: one-click Replace (User Story 2)

1. Open an existing visitor that already has a **Face** photo.
2. In the Photos section, click **Replace** on the Face tile.
3. **Expect (FR-006)**: the type selector jumps to **Face** AND the OS file picker opens in the same click — no second click on Upload required.
4. Pick a new image.
5. **Expect (FR-007)**: only the Face image is replaced; the ID Card image, if present, is unchanged.
6. Click **Replace** on the Face tile again, but this time **cancel** the file picker.
7. **Expect**: no upload, previous image remains.
8. Click **Replace** and select a file that is 6 MB.
9. **Expect (FR-010)**: the same validation error as pressing Upload with a 6 MB file. Previous image unchanged.

## Test D — Providers (Service Providers) (FR-012)

Repeat Tests A, B, C against the **Service providers** page. Behavior must be identical.

## Test E — Desktop app (all three user stories)

```bash
pnpm --filter @ramcar/desktop dev
```

1. Sign in as guard.
2. Repeat Tests A, B, C, D in the desktop app.
3. **Expect**: identical visual and behavioral results; Spanish labels when system locale is `es`.

## Test F — Localization (FR-009, SC-004)

1. Toggle the app locale to Spanish (web: via `/es` path or locale switcher; desktop: locale toggle).
2. Revisit Photos section in create and edit modes.
3. **Expect**: all labels — "Fotos", "Selecciona el tipo de imagen…", "Reemplazar", "Subir", "Pendiente por subir" — render in Spanish with no missing-key placeholders.
4. Grep audit (developer):
   ```bash
   # No untranslated new keys
   grep -E '(images\.(selectTypeHint|replaceAria|stagedBadge)|visitPersons\.form\.imagesSectionLabel)' \
     packages/i18n/src/messages/en.json packages/i18n/src/messages/es.json
   ```
   All four keys must appear in both files.

## Test G — Partial upload failure (edge case)

Simulate one image upload failure (e.g., DevTools → Network → throttle to offline mid-upload).

1. Start a create flow with 2 staged images.
2. Go offline right after clicking Save but before uploads start (or simulate via a forced 500 on the image endpoint).
3. **Expect**: the create succeeds; the first image upload succeeds; the second fails with a toast. The visitor exists with the one successful image. The user can open the new visitor in edit mode and retry the missing image upload from there.
4. No stuck spinners, no double-create.

## Test H — Accessibility smoke

1. Tab to the Replace button on a tile.
2. **Expect**: visible focus ring (FR-005 styling includes `focus-visible:ring-2`).
3. Press Enter.
4. **Expect**: same behavior as clicking Replace — type auto-selects and file picker opens.

---

## Success criteria cross-check

| SC  | Verified by |
|-----|-------------|
| SC-001 | Test A end-to-end completes without reopening record |
| SC-002 | Test C step 3 — one click only |
| SC-003 | Tests A + F + H — visual clarity + labels present in both locales |
| SC-004 | Test F grep audit |
| SC-005 | Test B — Storage + DB spot-check |
