# Feature Specification: Vehicle Brand & Model Autocomplete (Mexico Market)

**Feature Branch**: `016-vehicle-brand-model-autocomplete`
**Created**: 2026-04-21
**Status**: Draft
**Input**: User description: "Vehicle selector for the vehicle form where users choose a brand and model, with an optional year field. App is primarily used in Mexico; dataset should reflect vehicles commonly available in the Mexican market. Must be fast, offline-capable, and not depend on external APIs at runtime. Two independent autocompletes (brand, then model dependent on brand), plus optional year input that persists on the vehicles table. Fuzzy brand search, startsWith/includes model search. Fallback to free text when brand/model not found. Component lives in `packages/features` to be shared across web and desktop."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Select a known vehicle's brand and model without typing the full name (Priority: P1)

A guard or resident administrator is adding a vehicle in the vehicle form (resident vehicles, visitor vehicles, or service provider vehicles). Today they type the brand and model into plain text inputs, which produces inconsistent data ("nissan", "Nisan", "NISSAN", "Nissan " with trailing spaces). In the new flow they type two or three characters in the brand field and pick "Nissan" from a suggestion list, the model field becomes enabled, and they pick "Versa" from a list filtered to Nissan models only. Saving the vehicle stores a clean, canonical `brand` + `model` pair, plus an optional `year`.

**Why this priority**: This is the single core scenario that delivers the feature's value — a consistently spelled, clean brand/model for every vehicle, captured in one fast keyboard-driven interaction. Without this, none of the other stories matter.

**Independent Test**: Open the vehicle form (from the residents, visitors, or service providers flow, web or desktop). Type "nis" in the brand field. A list appears with "Nissan" as a match. Press Enter or click "Nissan". The model field is now enabled; typing "ver" shows "Versa" and "Versa Note". Pressing Enter selects "Versa". Submit the form. The created vehicle record stores `brand="Nissan"`, `model="Versa"`, and, if provided, `year=<number>`.

**Acceptance Scenarios**:

1. **Given** the vehicle form is open and no brand is selected, **When** the user focuses the model field, **Then** the model field is disabled and indicates the user must pick a brand first.
2. **Given** the user has typed "nis" in the brand field, **When** the suggestion list renders, **Then** "Nissan" is shown as a match (fuzzy search tolerates partial spellings).
3. **Given** the user has selected "Nissan" as the brand, **When** they type "ver" in the model field, **Then** the suggestion list shows only Nissan models beginning with or containing "ver" (e.g., "Versa", "Versa Note") — models from other brands (e.g., Chevrolet "Aveo") do not appear.
4. **Given** the user has picked a brand and model via suggestions, **When** they save the form, **Then** the persisted vehicle row contains the canonical brand string and the canonical model string (no trailing whitespace, no mixed casing variations).
5. **Given** the user has picked a brand and model, **When** they also enter a four-digit year (e.g., 2019), **Then** the saved vehicle row contains `year = 2019`.
6. **Given** the user has picked a brand and model and left year blank, **When** they save, **Then** the saved vehicle row contains `year = null` (year remains optional).

---

### User Story 2 — Fall back to free text for a vehicle that isn't in the dataset (Priority: P1)

A user is registering a vehicle whose brand and/or model isn't in the curated Mexico dataset — for example, a rarely imported brand, a very old model, or a typo in the internal dataset. They must still be able to complete the form. The UI must offer an explicit "use what I typed" escape hatch: if the autocomplete yields no match, the user can accept their raw text as the brand (and then enter any free-text model), and saving proceeds as before.

**Why this priority**: Data coverage is a long tail — no curated dataset hits 100%. If unknown-brand vehicles cannot be saved, the feature becomes a blocker rather than an upgrade. This must ship with Story 1 (P1), not later.

**Independent Test**: Open the vehicle form. Type a brand that is not in the dataset (e.g., "Gumpert"). The suggestion list shows no matches but presents a "Use 'Gumpert'" option. Selecting it sets the brand to the typed string and enables the model field as free text (no suggestion list constrains the input). Type a free-text model. Save. The vehicle row persists with the user's exact brand and model strings.

**Acceptance Scenarios**:

1. **Given** the user types a brand string not in the dataset, **When** the suggestion list opens, **Then** an explicit option labeled "Use '<typed text>'" (or equivalent in the active locale) is offered as a selectable item.
2. **Given** the user selects the "Use '<typed text>'" fallback for the brand, **When** the model field becomes active, **Then** the model field accepts free text and does not restrict selection to any suggestion list.
3. **Given** the user has selected a known brand but types a model not in the dataset, **When** they accept the "Use '<typed text>'" fallback for the model, **Then** the model is saved verbatim to the vehicle record.
4. **Given** the user has saved a vehicle using free-text brand and/or model, **When** they re-open that vehicle for edit, **Then** the previously saved free-text value displays in the field as the current selection (and is searchable/editable from there).

---

### User Story 3 — Keyboard-first selection for fast entry (Priority: P2)

Guard-booth operation is keyboard-heavy. Users must be able to type → arrow → Enter to complete brand and model selection without touching the mouse. When the suggestion list is open, arrow keys move focus between items, Enter accepts the focused item, and Escape closes the list without changing the value.

**Why this priority**: This is a productivity win layered on top of Story 1, not a new capability. It sharpens the core flow but isn't blocking the feature from shipping.

**Independent Test**: Focus the brand field. Type "toy". The list opens with "Toyota" highlighted at the top. Press Enter. The brand is set; focus automatically shifts to the model field. Type "cor". "Corolla" appears highlighted. Press Enter. The model is set and focus shifts to the next control (year or save). No mouse input is used.

**Acceptance Scenarios**:

1. **Given** the brand suggestion list is open, **When** the user presses ArrowDown / ArrowUp, **Then** focus moves between suggestion items (wrapping at the ends).
2. **Given** an item in the suggestion list is focused, **When** the user presses Enter, **Then** that item is selected and the list closes.
3. **Given** the suggestion list is open, **When** the user presses Escape, **Then** the list closes and the input retains the last committed value (no selection is made from the list).
4. **Given** the user has confirmed a brand via Enter, **When** the brand selection completes, **Then** keyboard focus moves to the model field automatically (so the user can keep typing without reaching for the mouse).

---

### User Story 4 — Optional year input with validation (Priority: P2)

Users can optionally record the vehicle's year of manufacture. The form exposes a numeric year field that accepts a reasonable range (e.g., 1960–current year + 1) and rejects non-numeric or out-of-range values. Year is never required.

**Why this priority**: Year helps identify vehicles at the gate but is not essential for the core identify-by-brand-and-model flow. It ships with the other P1/P2 stories but is the cheapest slice to drop if scope compresses.

**Independent Test**: Open the vehicle form, pick a brand and model, and leave year blank. Save succeeds with `year = null`. Open it again, type "2019" in year, save: record stores `year = 2019`. Type "abc" or "1800": the form rejects and shows a validation message; save is not allowed.

**Acceptance Scenarios**:

1. **Given** the user enters a valid four-digit year within the accepted range, **When** they save the form, **Then** the `year` value is persisted on the vehicle row.
2. **Given** the user leaves the year field empty, **When** they save the form, **Then** the vehicle row persists with `year = null` and no validation error is shown.
3. **Given** the user enters a non-numeric or out-of-range year, **When** they attempt to save, **Then** a validation message indicates the year is invalid and the form does not submit.

---

### Edge Cases

- **User picks a brand, then changes it**: If the user has already selected a model and then changes the brand, the model must reset (the old model doesn't belong to the new brand's scope). The user sees the model field become empty and must pick again.
- **User types then deletes the brand**: If the user clears the brand input (empties it), the model is cleared and disabled.
- **Duplicate model names across brands** (e.g., "Nissan Versa" and "Chevrolet Versa-like"): Because model search is scoped to the currently selected brand, the user never sees cross-brand collisions.
- **Case sensitivity and accents**: "Peugeot" and "peugeot" and "PEUGEOT" must all match the same dataset entry; accents and diacritics ("Mazdã" vs "Mazda") must normalize during search. Canonical stored value is the dataset's canonical spelling.
- **Whitespace**: Leading/trailing whitespace in the typed input must be ignored for matching; stored canonical values have no surrounding whitespace.
- **User loads an existing vehicle that has a brand/model from a previous flow** (free-text values that pre-date this feature): The form must render the prior value as the current selection in each field without the suggestion list overriding it, and without throwing a "not in dataset" error.
- **User types brand but never commits it**: If the form is submitted while the brand field contains typed text that has not been committed to a selection (neither a dataset match nor a free-text fallback), the submission is blocked or the typed text is treated as free text per the same rules as the explicit fallback. Whichever path is chosen must be consistent — no silent coercion to a random dataset entry.
- **Dataset updated across releases**: A vehicle saved with a brand/model that matches the current dataset continues to render correctly even if the dataset is later trimmed (the stored value is a string; rendering does not require the dataset to confirm it exists).
- **Desktop offline**: The desktop app must be able to show the brand/model suggestions without any network connection. Since the dataset is static and bundled, this is naturally satisfied — but the feature must not introduce a runtime fetch that would break in the guard booth.
- **Very large typed queries** (user pastes a paragraph into the brand input): The autocomplete must not lag or crash. Suggestions stay bounded (≤10 rows) and search completes within the stated latency target.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The vehicle form MUST present the brand as an autocomplete input backed by a curated Mexico-market dataset.
- **FR-002**: The brand autocomplete MUST support fuzzy matching (tolerant of minor typos, partial fragments, and case/accent differences).
- **FR-003**: The model input MUST be disabled until a brand has been committed (selected from suggestions or accepted via free-text fallback).
- **FR-004**: Once a brand is committed, the model autocomplete MUST show only models belonging to that brand — the list is scoped, not global.
- **FR-005**: Model search MUST use `startsWith` or `includes` matching (not fuzzy) against that brand's model list.
- **FR-006**: Both autocompletes MUST cap visible suggestions at a reasonable maximum (5–10) and surface the top matches first.
- **FR-007**: If the user's typed brand does not match any dataset entry, the suggestion list MUST offer an explicit "Use '<typed text>'" option that commits the typed string as the brand.
- **FR-008**: If the brand was committed via the free-text fallback, the model field MUST accept any free-text input (no suggestion constraint).
- **FR-009**: If the user's typed model (with a known brand selected) does not match any of that brand's models, the suggestion list MUST offer an explicit "Use '<typed text>'" option that commits the typed string as the model.
- **FR-010**: The vehicle form MUST expose an optional numeric year field that accepts a four-digit year within a sensible range (lower bound around 1960, upper bound = current year + 1). Non-numeric and out-of-range values MUST be rejected with a visible validation message.
- **FR-011**: Year MUST be persisted on the vehicle record when provided, and MUST be persisted as null/absent when the user leaves it blank. Year being empty is not an error.
- **FR-012**: The persisted vehicle record MUST store the canonical dataset spelling of brand and model when they were chosen from the dataset, and the user's exact typed spelling when the fallback was used.
- **FR-013**: Changing the brand after a model has been picked MUST clear the model (the model no longer belongs to the new brand's scope).
- **FR-014**: Clearing the brand (emptying the input back to zero characters) MUST clear and disable the model.
- **FR-015**: The autocomplete suggestion lists MUST support keyboard navigation — ArrowUp/ArrowDown to move, Enter to select, Escape to close — with no dependency on a mouse.
- **FR-016**: The autocomplete suggestions MUST render results in under 50 ms for the full curated dataset on a typical reviewer laptop — "instant" feel, no debounced spinners.
- **FR-017**: The feature MUST NOT introduce any runtime HTTP/network call for dataset lookup. The dataset is bundled with the app (web and desktop) and loaded into memory.
- **FR-018**: The brand/model components MUST live in `packages/features` so both the web portal and the desktop guard-booth app consume the same implementation (single source of truth per the cross-app code-sharing architecture).
- **FR-019**: Opening the form to edit an existing vehicle that has brand/model values from before this feature (including values not in the dataset) MUST display those values as the current selection in their respective fields without error.
- **FR-020**: All user-facing strings introduced by this feature (labels, placeholders, the free-text fallback prompt, validation messages, empty-state text) MUST be available in both English and Spanish via `@ramcar/i18n` — duplicated per-app message files are not permitted for shared features.
- **FR-021**: The dataset MUST cover at minimum the top brands in Mexico for the `car` vehicle type (sedan/SUV/pickup). Brands included must reflect the stated Mexico market coverage goal (≥90% of real-world usage). Concrete brand list and version are decided during Phase 0 research; the specification commits to the coverage target, not a specific vendor list.
- **FR-022**: The dataset MUST be curatable — adding or removing brands/models must be a code-level change to a static data file followed by a new release. No CMS, no database table, no external service.

### Key Entities *(include if feature involves data)*

- **Vehicle brand/model dataset entry**: A brand name plus the list of model names belonging to that brand, for the Mexico market. Static data, bundled with the app. Shape: `{ [canonicalBrand: string]: string[] }`. No identifiers, no timestamps — this is a lookup, not a database table.
- **Vehicle record (modified)**: The existing `vehicles` table grows one optional column: `year` (nullable integer). `brand` and `model` columns are unchanged at the database level — they remain text — but the form now routes writes through the autocomplete component, producing consistent canonical values.

### Data Access Architecture *(mandatory for features involving data)*

This feature extends an existing database operation (vehicle creation) with an additional optional field (`year`). It does not introduce new endpoints. Brand/model dataset lookup is a purely client-side, in-memory operation against bundled static data — no API path is involved in that lookup.

| Operation | API Endpoint | HTTP Method | Request DTO | Response DTO |
|-----------|--------------|-------------|-------------|--------------|
| Create vehicle (existing, extended with `year`) | `POST /api/vehicles` | POST | `CreateVehicleSchema` (existing, extended to include optional `year`) | `Vehicle` (existing, extended with `year`) |
| List vehicles for a user (existing, no change to contract but response now includes `year`) | `GET /api/vehicles?userId=…` | GET | — | `Vehicle[]` (response shape extended with `year`) |
| List vehicles for a visit person (existing) | `GET /api/vehicles?visitPersonId=…` | GET | — | `Vehicle[]` |

**Brand/model dataset lookup**: Purely client-side. Bundled static data (TS module exporting `{ [brand]: string[] }`) loaded into memory once at feature mount. No API, no Supabase, no network call, no runtime fetch.

**Frontend data flow (vehicle write)**: TanStack Query → NestJS API (`/api/vehicles`) → Repository → Supabase/Postgres.
**Desktop offline vehicle write**: Continues to queue through the existing outbox transport (unchanged). The brand/model autocomplete is offline-safe by construction — it doesn't depend on the network path.
**Allowed frontend Supabase usage**: Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) only — unchanged by this feature.

### Assumptions

- Mexico-market dataset coverage goal is ≥90% by real-world usage, not 100%. The fallback path (FR-007, FR-008, FR-009) is the safety net for the remaining long tail.
- Initial scope is the `car` vehicle type per the input (sedan, SUV, pickup all handled by the same brand list). Other `vehicleType` values (`motorcycle`, `pickup_truck`, `truck`, `bicycle`, `scooter`, `other`) continue to use plain text inputs as they do today — they are explicitly out of scope for the initial dataset, though the component architecture must not preclude adding those categories later.
- The dataset lives as a TypeScript module under `packages/features` (or an adjacent static data file in the same package) that is tree-shaken into web and desktop bundles — no separate JSON fetch.
- Year lower bound of ~1960 covers all realistic production vehicles on the road; upper bound of current year + 1 accommodates newly released model-year listings.
- The Zod schema for `createVehicleSchema` in `@ramcar/shared` is extended to include `year`; the NestJS API accepts it via the existing Zod validation pipe. The `vehicles` Postgres table gains a nullable `year` column via a new migration.
- Fuzzy brand search uses a lightweight library (e.g., `fuse.js` or `match-sorter`) decided in Phase 0 research. Model search deliberately does NOT use fuzzy matching per the user input; it uses `startsWith` / `includes` only. This is enforced by the component architecture, not merely by convention.
- The feature does not retire or migrate existing vehicle rows with legacy casing or whitespace — old records keep their stored values; only new writes go through the canonical path. A future cleanup is out of scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of vehicle-save submissions in production (after launch) commit a brand from the dataset — measured by counting writes whose `brand` value matches a canonical dataset entry versus total writes over a 2-week post-launch window.
- **SC-002**: At least 90% of vehicle-save submissions commit a model that belongs to the selected brand's dataset model list — same measurement window and methodology as SC-001.
- **SC-003**: The suggestion list for the brand input renders in under 50 ms (p95) for the full curated dataset on a typical reviewer laptop — measured by a microbenchmark run in CI against the shared component.
- **SC-004**: Zero runtime HTTP requests are issued by the brand/model autocomplete for dataset lookup — verified by an E2E test that records network traffic while the user exercises the component and asserts the feature made no fetches.
- **SC-005**: Users can complete brand + model entry using keyboard only (arrow keys + Enter), verified by a Playwright / Vitest-DOM test that never synthesizes a pointer event.
- **SC-006**: The feature works in the desktop app when offline — verified by a desktop E2E (or equivalent integration) test that disables the network and exercises the full autocomplete flow.
- **SC-007**: 100% of user-facing strings introduced by the feature are present in both `en` and `es` locales in `@ramcar/i18n` — verified by a translation-key audit that fails CI on any missing key.
- **SC-008**: No duplicate per-app copy of the brand/model autocomplete component is added under `apps/web/src/features/` or `apps/desktop/src/features/` — verified by the existing `pnpm check:shared-features` CI check that already guards this boundary.
