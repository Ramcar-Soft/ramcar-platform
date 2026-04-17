# Feature Specification: Visitor Form Image Capture UX

**Feature Branch**: `013-visitor-form-images`
**Created**: 2026-04-16
**Status**: Draft
**Input**: User description: "update web and desktop apps, when creating a new visitor or service provider, the form should also display the image selection, not only when editing the visitor/service provider, images should display as square in the image grids, replace button on image grid should be more prominent or 'resaltar' from the gray label, when clicking on the replace button it should automatically select the type of image and perform the action of the upload button, add a label in top of the form to upload the photos with a label that describe that user needs to select the type of image wants to upload/change, make sure to add the proper english and spanish translations"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture photos while registering a new visitor (Priority: P1)

A guard or admin is registering a brand-new visitor or service provider at the booth (desktop app) or from the portal (web app). While the record is being created, they also need to attach reference photos (face, ID card, vehicle plate, other) in the same flow — instead of having to save the record first, reopen it in edit mode, and only then attach images.

**Why this priority**: Capturing reference photos at registration time is the single biggest workflow gap. Guards frequently have the visitor in front of them exactly once — at entry — and must capture the face and ID card right then. Forcing them to save first and re-open the record loses that moment, increases abandonment of the photo step, and leads to incomplete records that are less useful at future entries.

**Independent Test**: Open the "New visitor / service provider" flow in either app, fill the required identity fields, select an image type, upload a photo, and save. The created record must contain the attached image(s), and no intermediate edit step must be required.

**Acceptance Scenarios**:

1. **Given** a user opens the "Register new visitor" sidebar, **When** the form is displayed, **Then** the image capture section is visible within the same form (not hidden behind a save-and-reopen step).
2. **Given** a user is registering a new visitor and has not yet saved, **When** they select an image type and upload a photo, **Then** the photo is associated with the new visitor record upon save and appears in the grid immediately.
3. **Given** a user is registering a new service provider, **When** they proceed without uploading any image, **Then** the record is still created successfully (images remain optional).
4. **Given** a user has uploaded one or more images during registration, **When** they cancel the form, **Then** any uploaded images tied to an unsaved record are not retained.

---

### User Story 2 - Replace an existing image in one click (Priority: P1)

When a user sees an already-captured photo in the image grid and wants to swap it (e.g., blurry face photo), clicking "Replace" on that tile must (a) pre-select the matching image type automatically and (b) immediately open the file picker — the same action as pressing the upload button. Today the user must separately change the type selector and then press upload.

**Why this priority**: This directly removes friction from the most frequent recovery action guards perform (bad photo → retake). It's small in scope but high-frequency, and the current two-step behavior is a common source of errors (wrong type selected, wrong file replaced).

**Independent Test**: In a record that already has a face image, click "Replace" on the face tile. The type selector must switch to "Face" and the OS file picker must open without any further click. Choosing a file uploads it as the face type and updates the tile.

**Acceptance Scenarios**:

1. **Given** a visitor has an existing "Face" photo in the grid, **When** the user clicks "Replace" on that tile, **Then** the image type selector is set to "Face" and the file picker opens in the same interaction.
2. **Given** the user opened the file picker via Replace, **When** they pick a new image file, **Then** the image for that specific type is uploaded and the tile updates without requiring a separate Upload button click.
3. **Given** the user opened the file picker via Replace, **When** they cancel the picker without selecting a file, **Then** no upload occurs and the previous image remains unchanged.

---

### User Story 3 - Clear, prominent image grid and upload guidance (Priority: P2)

The image grid and surrounding controls must give clear visual guidance: tiles render as squares so faces and IDs are not cropped or distorted; the "Replace" control stands out from the dark label instead of blending into the gray footer band; and above the upload controls, a heading/instruction tells the user "Select the type of image you want to upload or change" so the type-selector's purpose is immediately understood.

**Why this priority**: These are comprehension and visual-polish improvements. They don't unlock new capability on their own, but they reduce misuse of the existing flow (wrong type uploaded, Replace button missed) and are cheap to ship alongside P1 and P2.

**Independent Test**: Open either the create or edit form with at least one image present. The tile renders as a square (1:1), the Replace action is visually emphasized (not a faint text button), and a heading above the type selector/upload button describes the required action to the user.

**Acceptance Scenarios**:

1. **Given** any image tile in the grid, **When** it is rendered, **Then** its visible area is square (width equals height) and the photo is shown without distortion.
2. **Given** a tile shows its label footer, **When** the user sees the Replace control, **Then** Replace is visually distinct from the gray label text (through emphasis such as weight, contrast, or accent color) so it reads as an actionable control.
3. **Given** the image section is shown in either create or edit mode, **When** the user looks above the type selector, **Then** a clear instructional label tells them to pick the type of image to upload or change.
4. **Given** the user is viewing the portal in Spanish or English, **When** any new label or instruction text is displayed, **Then** it is presented in the active language using the proper translation.

---

### Edge Cases

- **Uploading before save (Story 1)**: If the backend requires a persisted record before accepting image uploads, the form must either (a) persist the record first transparently on image selection, or (b) stage the image client-side and upload it immediately after the record is created on save. Whichever path is chosen, it must be invisible to the user and must not leave orphan images if the user cancels.
- **Canceling a new-record form after staging images**: No orphan image files or database rows must remain for a record that was never saved.
- **Unsupported file or oversized file via Replace**: The same validation that applies to the Upload button must apply to files chosen via Replace (format and size limits), with the same error feedback.
- **Replacing on a tile whose image type is not in the selector list**: Selecting "Replace" must still drive the upload for that type even if the current selector value differs.
- **Offline desktop create**: On the desktop booth, if the new record is created while offline, any images staged during creation must queue through the same sync/outbox path as other offline writes and not be lost.
- **Slow networks during Replace**: While the new upload is in flight, the tile must not present stale state that implies the replacement already succeeded.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The "Register new visitor / service provider" form in both the web portal and the desktop app MUST display the image capture section (grid + type selector + upload control + instructional label) in the same form used for creation, not only in the edit form.
- **FR-002**: Users MUST be able to attach one or more images to a new visitor or service provider as part of the creation flow, without first saving and reopening the record.
- **FR-003**: If the user cancels the creation form after selecting or uploading images, the system MUST NOT retain any orphan images tied to the unsaved record.
- **FR-004**: Image tiles in the image grid MUST be displayed with a square (1:1) aspect ratio in both the web and desktop apps.
- **FR-005**: The "Replace" control inside each image tile MUST be visually emphasized so it is clearly distinguishable from the tile's label text (e.g., via stronger weight, contrast, or accent color). "Visually distinguishable" means a user glancing at the tile can identify Replace as an interactive control without hovering.
- **FR-006**: When the user activates the "Replace" control on a tile of a given image type, the system MUST (a) set the active image type selector to that tile's type and (b) open the file picker in the same interaction — equivalent to selecting that type and then pressing Upload.
- **FR-007**: A file chosen through the "Replace" interaction MUST be uploaded and associated with the image type of the tile it was initiated from, replacing (or creating, if none exists) the image of that type for that visitor.
- **FR-008**: The image capture section (in both create and edit forms) MUST include a heading/instructional label above the type selector and upload control that tells the user to choose the type of image they want to upload or change.
- **FR-009**: All new or changed user-facing text introduced by this feature MUST be available in both English (en) and Spanish (es) via the existing translation system, for both the web and desktop apps.
- **FR-010**: File validation (accepted formats and maximum size) applied by the Upload action MUST also apply identically to files chosen via the Replace action.
- **FR-011**: On the desktop app, if the user creates a visitor/service provider (with or without images) while offline, the record and any attached images MUST be handled by the existing sync/outbox mechanism consistently with other offline writes.
- **FR-012**: The visual and behavioral changes MUST apply uniformly to both "visitor" and "service provider" creation flows — the feature does not treat them as two separate UX paths.

### Key Entities *(include if feature involves data)*

- **Visit person (visitor / service provider)**: The record being created or edited. Already exists; this feature does not change its schema.
- **Visit person image**: An image attached to a visit person with an image type (face, ID card, vehicle plate, other). Already exists; this feature does not change its schema. The change is in when and how a user can attach one — now during creation, not only during edit.

### Data Access Architecture *(mandatory for features involving data)*

This feature reuses the existing create-visit-person and upload-visit-person-image endpoints. No new endpoints or DTOs are introduced. Listed here for completeness so reviewers can confirm the API-first rule is respected.

| Operation | API Endpoint | HTTP Method | Request DTO | Response DTO |
|-----------|--------------|-------------|-------------|--------------|
| Create visitor / service provider | `POST /api/visit-persons` | POST | `CreateVisitPersonSchema` (existing) | `VisitPerson` (existing) |
| Upload / replace an image for a visit person | `POST /api/visit-persons/:id/images` | POST | multipart: file + `imageType` (existing) | `VisitPersonImage` (existing) |
| List images for a visit person | `GET /api/visit-persons/:id/images` | GET | — | `VisitPersonImage[]` (existing) |

**Frontend data flow**: TanStack Query → NestJS API → Repository → Supabase/Postgres
**Allowed frontend Supabase usage**: Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) only

### Assumptions

- The preferred path for "upload images during creation" is that the form saves the visit-person record first (either automatically on first image selection or on the single Save action) and then associates uploaded images to that record, rather than introducing a new batch-create-with-images endpoint. This keeps the API surface unchanged.
- "Square" means a 1:1 aspect-ratio container. Photos that are not square are expected to fill the container via an object-cover-style behavior, matching the current rendering for cropped faces and IDs.
- "More prominent Replace button" is a visual emphasis decision within the existing design system — not a new component. It is implemented with existing tokens (color, weight, contrast) rather than a bespoke variant.
- English and Spanish are the only two locales in scope; no other locales are added.
- Offline create on desktop already uses the outbox pattern; this feature does not change that pattern, only ensures images staged during creation route through it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly created visitor / service provider records that include at least one image can have that image captured in a single form session, with zero save-edit-reopen round trips.
- **SC-002**: Replacing an existing image requires exactly one user action (one click/tap on Replace) to reach the OS file picker, down from the current two-action sequence (change type selector, then press Upload).
- **SC-003**: In usability review, users correctly identify the purpose of the image type selector and the Replace control on first viewing, without needing a verbal explanation.
- **SC-004**: 100% of user-facing strings introduced by this feature are present in both English and Spanish locale files for both web and desktop apps — verified by a translation-key audit with no missing or untranslated keys.
- **SC-005**: No orphan image records or storage objects exist after a user cancels a new-visitor creation form that had staged images — verified by checking image storage and database state after cancel.
