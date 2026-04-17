# Phase 1 — Data Model

**Feature**: Visitor Form Image Capture UX
**Date**: 2026-04-16

## Database schema

**No changes.** This feature reuses:

- `visit_persons` — unchanged.
- `visit_person_images` (`visit_person_id`, `image_type`, `storage_path`, …) — unchanged.
- Supabase Storage private bucket for image binaries — unchanged.

No migration is created for this feature.

## Client-side state model

The only "new" data model is the transient client state in the create form used to stage images before the visit-person record is persisted.

### Entity: StagedImage (client-only, per-form-instance)

| Field       | Type      | Description |
|-------------|-----------|-------------|
| `imageType` | `ImageType` (`"face" \| "id_card" \| "vehicle_plate" \| "other"`) | Image role. One entry per type. |
| `file`      | `File`    | Browser File object selected by the user. |
| `previewUrl`| `string`  | `URL.createObjectURL(file)` for local preview. Revoked on unmount and on replace. |

### Rules

- **Uniqueness**: at most one `StagedImage` per `imageType` at any time. Selecting a new file for the same `imageType` replaces the previous staged entry and revokes the previous `previewUrl`.
- **Lifetime**:
  - Created when the user picks a file in the create form.
  - Cleared when the create form unmounts (normal cancel or successful create).
  - All `previewUrl`s revoked on cleanup.
- **Not persisted** anywhere (not in Zustand, not in localStorage, not in SQLite). Draft-persistence hook (`useFormPersistence`) continues to persist *text fields only*; `File` objects are explicitly excluded because they are not serializable and the associated `previewUrl`s are blob URLs tied to the page session.

### State transitions

```text
(empty) ──user selects file for type T──► { T: { file, previewUrl } }
{ T: X } ──user selects new file for type T──► { T: { file', previewUrl' } }   // revoke X.previewUrl
{ ... } ──user activates Replace on type T──► (same as selecting a file for T)
{ ... } ──user cancels form──► (empty)                                         // revoke all
{ ... } ──user saves; POST /visit-persons succeeds──► upload queue: keys ordered
upload queue ──POST /visit-persons/:id/images (imageType=T)──► remove T
queue empty ──► (empty; sidebar transitions to edit mode or closes)
upload queue ──one upload fails──► remaining stays staged; error toast; user can retry from edit mode
```

### Validation (applies to both Upload and Replace paths)

- `file.type` ∈ `["image/jpeg", "image/png"]` — enforced by `<input accept>` and re-checked on change.
- `file.size` ≤ 5 × 1024 × 1024 (5 MB) — existing constant in `image-upload.tsx`.
- On validation failure: no staging, error toast, file input cleared.

## Related existing DTOs (reference only — unchanged)

- `CreateVisitPersonSchema` (`@ramcar/shared`) — used by create mutation.
- `UploadVisitPersonImageSchema` (`@ramcar/shared`) — used by image upload mutation (multipart `file` + `imageType` field).
- `VisitPersonImage` (`@ramcar/shared`) — response shape for list and upload.

No `@ramcar/shared` changes required for this feature.
