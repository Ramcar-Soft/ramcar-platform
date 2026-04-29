# Feature Specification: Vehicle Brand Logos

**Feature Branch**: `022-vehicle-brand-logos`
**Created**: 2026-04-28
**Status**: Draft
**Input**: User description: "For the vehicle search selector or when creating a new vehicle (desktop or web) — add logos for vehicle brands. Map brands to logos using the `filippofilip95/car-logos-dataset` dataset. When a vehicle (brand) is not found, allow saving anyway. Avoid a GET request on every vehicle-form load. Decide whether to use git-hosted URLs or to download the logos and bundle them in our repository."

## Context & Relationship to Spec 016

Spec **016 — Vehicle Brand & Model Autocomplete (Mexico Market)** has already shipped the foundation this feature builds on:

- A curated, frozen, **bundled-in-app** brand/model dataset at `packages/features/src/shared/vehicle-brand-model/data.ts` (no DB, no runtime GET).
- A shared `VehicleBrandSelect` component used in both `apps/web` and `apps/desktop`.
- An explicit **free-text fallback** ("Use '<typed text>'"), so users *already* save vehicles with brands not in the dataset.
- Canonical brand spelling is enforced for matched picks; raw user text is stored verbatim for the fallback path.

Therefore the user's "allow to save new" requirement and the "hardcoded list vs DB" decision are already resolved by 016 — **the brand catalog stays static and bundled, and the free-text fallback covers unknown brands**. This spec does not revisit those decisions.

This spec is purely additive and visual: it attaches a **logo image** to each brand and renders that logo wherever the brand is shown. Unknown (free-text) brands render without a logo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Recognize a brand at a glance in the brand picker (Priority: P1)

A guard or resident administrator opens the vehicle form and starts the brand autocomplete. Today the suggestion list is text-only, so spotting "Nissan" vs "Hyundai" requires reading. With logos, each suggestion row leads with a small brand mark, and the chosen brand's mark is shown inside the brand input once committed. This makes the form feel polished and helps guards (often in fast, low-attention conditions at the gate) confirm the right brand without re-reading.

**Why this priority**: This is the visible surface the user explicitly asked for ("Add logos for vehicles brands"). It anchors the entire feature; if logos do not appear in the brand picker, no other surface matters. It must ship together with the supporting infrastructure (logo asset bundle).

**Independent Test**: Open the vehicle form (in apps/web or apps/desktop). Type "nis" in the brand field. The Nissan suggestion row shows the Nissan logo to the left of the text. Press Enter. The brand input still shows the Nissan logo next to the committed text. Repeat for 5 other common Mexico-market brands; all show their logos in the suggestions and in the committed input. No image is broken. No layout jumps when the dropdown opens.

**Acceptance Scenarios**:

1. **Given** the brand autocomplete is open with results visible, **When** suggestions render, **Then** each suggestion row that maps to a known brand displays that brand's logo to the left of the brand name at a uniform target size.
2. **Given** the user has committed a known brand from the suggestion list, **When** the brand input shows the committed value, **Then** the brand's logo is shown inside the input next to the brand text.
3. **Given** the user has not yet typed anything, **When** they focus the brand input, **Then** no broken-image icon, no placeholder pulsing, and no layout shift is visible — the empty state is unchanged from the pre-feature behavior.
4. **Given** the user clears the brand input, **When** the input is empty again, **Then** the previously displayed logo is removed cleanly.

---

### User Story 2 — Recognize a vehicle by brand in lists, cards, and detail views (Priority: P2)

Anywhere the platform already renders a vehicle's brand as text — vehicle lists, vehicle cards in resident/visitor profiles, the vehicle detail in the access-log/bitácora flow, and any other read-only surface that displays the brand — a small logo appears alongside the brand text. This makes scanning a list of vehicles dramatically faster and reinforces brand recognition end-to-end.

**Why this priority**: This is a productivity multiplier for read-side surfaces, but it is not blocking the brand picker itself. It can ship in the same release as P1 or in a closely following one without breaking P1.

**Independent Test**: Navigate to a vehicle list (resident vehicles, visitor vehicles, or the access-log table that shows vehicle plate/brand). Verify the brand column or vehicle cell shows the brand logo + brand text together at a consistent size. Verify a row with an unknown/free-text brand shows just the text without a broken image. Verify the rendering is identical between apps/web and apps/desktop.

**Acceptance Scenarios**:

1. **Given** a vehicle list/table is on screen and a row's brand is a known brand, **When** that row renders, **Then** the brand logo is shown adjacent to the brand text at the established target size.
2. **Given** a vehicle's detail view is open, **When** the brand is rendered as text, **Then** the brand logo is shown adjacent to it.
3. **Given** the same vehicle is opened in apps/web and apps/desktop, **When** the brand is rendered, **Then** the logo is identical (same asset, same dimensions).

---

### User Story 3 — Unknown brand entered via free-text fallback degrades cleanly (Priority: P2)

A vehicle saved through spec 016's free-text fallback (e.g., a brand the dataset does not include) must not show a broken image, a 404 placeholder, or any error. The UI shows the brand text alone — or, if a generic neutral placeholder fits the visual rhythm of the row, that placeholder. The row's height and alignment must be identical to a known-brand row, so a list of mixed known/unknown brands does not appear "ragged."

**Why this priority**: The free-text fallback already exists (spec 016) and will continue to be used. Without this story, every fallback row would either show a broken image or visibly differ from known-brand rows. It must ship together with P1.

**Independent Test**: Save a vehicle using the free-text fallback ("Use '<typed text>'"). View it in (a) the brand picker when re-editing, (b) any vehicle list. The brand field/row shows the typed text without a broken image, and the row's vertical alignment matches a known-brand row above/below it.

**Acceptance Scenarios**:

1. **Given** a vehicle whose brand was committed via the free-text fallback, **When** that vehicle is rendered in any surface that shows the brand, **Then** no broken-image icon appears and no console-visible error is logged for the missing logo.
2. **Given** a list mixing known-brand rows and free-text-brand rows, **When** the list renders, **Then** the row heights and brand-cell horizontal alignment match — the absence of a logo does not collapse or shift the layout.
3. **Given** a free-text brand happens to share a normalized form with a known dataset brand (e.g., user typed "TOYOTA " with whitespace and uppercase), **When** the row renders, **Then** the known-brand logo IS shown — the lookup uses the same normalization as the brand picker so post-save rendering matches dataset matching.

---

### Edge Cases

- **Unknown / free-text brand** — see User Story 3 above.
- **Dataset brand without a bundled logo** (e.g., a new brand was added to `data.ts` in a PR that forgot the logo asset): the brand still renders as text without a broken image, no end-user-visible error. CI catches this gap (see SC-001) before it reaches users.
- **Logo file corruption or zero-byte asset**: the surface must still render the brand text and not crash; the corrupted asset is treated like a missing asset at runtime.
- **Mixed casing / accent / whitespace** in the stored brand string: lookup is case-insensitive, diacritic-insensitive, and ignores leading/trailing whitespace, so "Volkswagen", "VOLKSWAGEN", and " volkswagen " all resolve to the same logo.
- **Dark mode and themed surfaces**: logos must remain legible on both light and dark backgrounds the platform exposes today. (Concrete approach — single-asset on neutral tile vs. per-theme variants — is plan-phase.)
- **High-DPI displays**: logos render crisp at 1× and 2× device-pixel ratios.
- **Desktop offline**: the guard booth has no internet at the gate. Logos must render purely from the locally-installed app bundle (no CDN, no git-raw URL, no runtime fetch).
- **Bundle weight**: shipping ~25–35 brand logos must not balloon the desktop installer or web initial bundle. The build must keep brand-logo weight inside an explicit budget (set in plan-phase research).
- **License attribution**: if the source dataset's license requires attribution, that attribution must appear in a discoverable location (About / Acknowledgements / footer) without intruding on the form UX.
- **Pre-existing vehicles from before spec 016 / 022** with non-canonical brand spelling: if the stored value normalizes to a known brand, the logo appears; otherwise it is treated like a free-text brand. No data migration is performed by this feature.
- **Brand removed from `data.ts` later** while historical rows still reference it: rendering falls back to the no-logo path without error (per spec 016's removal policy).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The brand autocomplete suggestion list MUST display each known brand's logo next to the brand name at a uniform target size.
- **FR-002**: After a known brand has been committed, the brand input MUST display that brand's logo next to the committed text.
- **FR-003**: All read-side surfaces that render a vehicle's brand as text — vehicle lists/tables, vehicle cards in resident/visitor profiles, vehicle detail views, the access-log/bitácora vehicle cell — MUST display the brand logo adjacent to the brand text when the brand maps to a known dataset entry.
- **FR-004**: Brand logos MUST be bundled within the application (committed to this repository or a workspace package consumed by the apps). The feature MUST NOT depend on an external CDN, git-raw URL, or any runtime network fetch to retrieve a logo.
- **FR-005**: The feature MUST NOT introduce a vehicle-brands database table, a GET endpoint, or any per-tenant brand catalog. The static dataset from spec 016 remains the single source of truth for the brand list.
- **FR-006**: Logo lookup from a stored brand string MUST be normalized — case-insensitive, diacritic-insensitive, whitespace-trimmed — so that any spelling that matches a dataset brand under those rules resolves to the same logo asset.
- **FR-007**: When a stored brand string does not normalize to a dataset brand (i.e., free-text fallback or legacy data), the surface MUST render brand text only with no broken-image icon and no end-user-visible error. A neutral placeholder is allowed only if it is visually unobtrusive and matches the row layout (no jank).
- **FR-008**: When a dataset brand has no bundled logo asset (data drift), runtime behavior MUST match FR-007 (text only, no error). CI MUST detect this gap before release (see SC-001).
- **FR-009**: Logo display MUST be implemented once in the shared feature module (`packages/features`) and consumed by both `apps/web` and `apps/desktop`. Per-app duplicates are prohibited under the cross-app code-sharing constraint.
- **FR-010**: Logos MUST render correctly on both light and dark themes the platform supports. The feature MUST NOT regress existing dark-mode surfaces by introducing visually broken (e.g., black-on-black) brand marks.
- **FR-011**: Logo assets MUST be optimized — file size and dimensions appropriate for inline icon-scale rendering. The total bundle size impact across all brand logos MUST stay within the budget set in plan-phase research and MUST NOT inflate the desktop installer or web initial bundle beyond that budget.
- **FR-012**: The license terms of the source dataset (`filippofilip95/car-logos-dataset` or chosen equivalent) MUST be respected. Required attribution, if any, MUST appear in a discoverable surface (About / Acknowledgements / settings) and MUST NOT block or clutter the form/list UX.
- **FR-013**: Logo rendering MUST be offline-safe in the desktop guard booth. Disabling the network MUST NOT change what logos appear or cause any visible degradation.
- **FR-014**: Adding a new brand to the dataset (via spec 016's append-only mutation policy) MUST be a single-PR change that includes both the dataset entry and the matching logo asset; CI MUST fail on a dataset entry without a logo and on a logo asset without a dataset entry (orphan detection both directions).
- **FR-015**: Logo rendering MUST NOT introduce layout shift in the brand picker (committed value swap), in the suggestion list (open / type), or in any list/card/detail surface that adopts logos. Row heights and brand-cell horizontal alignment MUST be identical between known-brand and unknown-brand rows.

### Key Entities *(include if feature involves data)*

- **Brand logo asset**: A single optimized image file (format decided in plan-phase) representing one brand at icon scale. Bundled inside the repository alongside the brand dataset; indexed by the canonical brand name (the same key used by spec 016's `VEHICLE_BRAND_MODEL`). Static reference data — no database row, no API resource, no per-tenant variant.
- **Vehicle record (unchanged)**: The existing `vehicles` table. No schema change. The existing `brand` text column continues to drive logo lookup at render time via normalization.

### Data Access Architecture *(mandatory for features involving data)*

This feature does not introduce any new database operations, endpoints, or DTOs. Brand logo lookup is a purely client-side, in-memory resolution against bundled static assets.

| Operation | API Endpoint | HTTP Method | Request DTO | Response DTO |
|-----------|--------------|-------------|-------------|--------------|
| (none — no API path is introduced or modified) | — | — | — | — |

**Logo lookup**: Purely client-side. Bundled static assets imported at build time and resolved by the canonical brand key from spec 016's dataset. No API, no Supabase, no network call, no runtime fetch.
**Frontend data flow**: Unchanged from spec 016 for vehicle reads/writes — TanStack Query → NestJS API → Repository → Supabase/Postgres.
**Allowed frontend Supabase usage**: Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) only — unchanged.

### Assumptions

- **Logos are bundled in the repository, not loaded from a remote URL.** This was the user's open question and the chosen answer for these reasons: (a) the desktop guard booth is offline-first per Principle IV — runtime URL fetches break in the booth; (b) third-party `raw.githubusercontent.com` URLs and CDNs are not contractual — the source repo could rename, restructure, or rate-limit at any point; (c) bundled assets give predictable cold-start latency and crisp visuals; (d) the dataset is small (~25–35 brands today) so the bundle delta is acceptable.
- **No new database table, no GET endpoint.** Spec 016 already chose static-bundled brand data, and that decision propagates to logos. Free-text fallback (spec 016) is the contractually accepted way to save brands not in the dataset.
- **Source dataset**: `filippofilip95/car-logos-dataset` is the starting point. The actual on-disk format (SVG, optimized PNG, or both at multiple resolutions) and the license posture are settled in plan-phase research. The spec commits to "logos are bundled and licensed for redistribution," not to a specific file extension.
- **Logo asset key**: canonical brand name from spec 016's `VEHICLE_BRAND_MODEL`. Lookup is case-insensitive, diacritic-insensitive, whitespace-trimmed — same normalization the brand picker already applies.
- **No backfill of existing vehicles.** Pre-existing rows whose stored brand string normalizes to a known brand will start showing a logo automatically. Rows with non-canonical strings continue to render text-only until a future cleanup that is explicitly out of scope here.
- **Bundle size budget**: target ≤ ~3 MB total for all brand logos across web and desktop, set as a soft cap; the plan-phase decision can adjust within reason and document the final budget.
- **Logos are tenant-agnostic and theme-aware.** No per-tenant overrides. A single asset per brand, paired with rendering treatment that works on both light and dark surfaces (e.g., padding tile or per-theme variant if needed — plan-phase decision).
- **Surfaces in scope**: brand picker (suggestions + committed value), vehicle lists (resident vehicles, visitor vehicles, access-log/bitácora vehicle cell), vehicle cards in resident/visitor profiles, vehicle detail views. Surfaces NOT in scope: PDFs, exports, email notifications, mobile app (separate repo), printed receipts. These can adopt the same lookup later without spec changes.
- **Unknown-brand rendering treatment**: text-only is acceptable; a neutral placeholder is acceptable as long as it does not introduce row jank. The exact treatment is a design decision in plan-phase.
- **Vehicle types other than `car`** (motorcycle, bicycle, scooter, etc.) are out of scope for this iteration — those use plain text inputs today and have no curated brand dataset.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of brand keys in the bundled dataset (`packages/features/src/shared/vehicle-brand-model/data.ts`) have a matching logo asset, and 100% of bundled logo assets correspond to a brand key — verified by an automated CI check that fails on either-direction mismatch (no orphan logos, no missing logos).
- **SC-002**: Zero runtime HTTP requests are issued for brand-logo retrieval — verified by an end-to-end test that records network traffic while the user opens the vehicle form, exercises the brand picker, and views a vehicle list, and asserts no fetch resolves to a logo asset.
- **SC-003**: The vehicle form opens with brand logos visible at the same speed as before this feature (no measurable regression to spec 016's <50 ms suggestion-render target) — verified by a microbenchmark in CI.
- **SC-004**: Free-text / unknown brands render without a broken-image icon and without console errors — verified by an integration test that creates a vehicle through the free-text fallback and renders it on every in-scope surface.
- **SC-005**: The brand picker and all in-scope list/card/detail surfaces render logos correctly when the desktop app is fully offline — verified by a desktop integration test that disables the network before opening these surfaces.
- **SC-006**: Brand logos render at consistent target dimensions across all in-scope surfaces with no layout shift between known-brand and free-text-brand rows — verified by a visual / snapshot test on at least three consumption surfaces (autocomplete, vehicle list, vehicle detail).
- **SC-007**: Total brand-logo asset weight introduced by this feature is at or under the budget agreed in plan-phase research (target ≤ 3 MB across all brands, final number documented in `plan.md`) — verified by a build-time size check.
- **SC-008**: No per-app duplicate of brand-logo rendering is introduced under `apps/web/src/features/` or `apps/desktop/src/features/` — verified by the existing `pnpm check:shared-features` CI check.
- **SC-009**: Required license attribution (if any) for the chosen logo dataset is present in a discoverable location of the apps (About / Acknowledgements / settings) — verified by a release-checklist item and a one-line presence check in CI.
- **SC-010**: Adding a new brand to `data.ts` without its logo asset (or vice versa) fails CI before merge — verified by intentionally introducing a mismatched change in a CI dry-run and observing the build fail.
