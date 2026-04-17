# Phase 1 — UI Contracts

**Feature**: Visitor Form Image Capture UX
**Date**: 2026-04-16

This feature adds no new HTTP endpoints. The only interfaces introduced or modified are React component prop contracts and translation-key contracts. Existing REST endpoints are reused as-is (see spec's Data Access Architecture table).

---

## Existing API endpoints reused (no change)

| Operation | Endpoint | Notes |
|-----------|----------|-------|
| Create visit person | `POST /visit-persons` | JSON body: `CreateVisitPersonSchema`. Returns `VisitPerson`. |
| Upload / replace image | `POST /visit-persons/:id/images` | Multipart: `file`, `imageType`. Returns `VisitPersonImage`. |
| List images for person | `GET /visit-persons/:id/images` | Returns `VisitPersonImage[]` with signed URLs. |

No schema, guard, or RBAC changes.

---

## Component Contracts

All paths are relative to the app root unless otherwise noted. Contracts are identical between `apps/web` (next-intl) and `apps/desktop` (react-i18next) except for the translation hook used.

### `shared/components/image-capture/image-upload.tsx`

#### Props (unchanged field set; ref added)

```ts
interface ImageUploadProps {
  imageType: ImageType;
  onUpload: (file: File, imageType: ImageType) => void;
  isUploading: boolean;
  label?: string;
}

interface ImageUploadHandle {
  openFilePicker(): void;
}

// Component signature becomes:
// forwardRef<ImageUploadHandle, ImageUploadProps>
```

#### Behavior

- `openFilePicker()` programmatically opens the hidden `<input type="file">`. MUST be callable from a synchronous user-gesture chain (so the browser does not block the picker). Callers are responsible for calling `flushSync` on any state that must be applied before opening.
- File validation (MIME + size) occurs inside `handleFileChange`, unchanged, and applies equally whether the picker was opened by the Upload button or by `openFilePicker()`. **Shared helper**: extract the MIME/size check into a local `isValidImageFile(file)` so it's applied once.
- On validation failure: emit a toast via `sonner` and clear the input value.

#### Accessibility

- Button retains its current `type="button"` and disabled-while-uploading semantics.

---

### `shared/components/image-capture/image-grid.tsx`

#### Props (unchanged)

```ts
interface ImageGridProps {
  images: VisitPersonImage[];
  onReplace?: (imageType: ImageType) => void;
}
```

#### Visual contract changes

- Each tile root: `aspect-square` + `rounded-md overflow-hidden border relative group`. Replace `h-24` on the inner `<img>`/placeholder with `w-full h-full`.
- `<img>` uses `object-cover` (already present) and `w-full h-full`.
- Placeholder (no `signedUrl`) uses `w-full h-full flex items-center justify-center`.
- Footer bar keeps `absolute bottom-0 inset-x-0` with its dark translucent background.
- **Replace button** styling:
  - Text: `font-semibold` (from ghost `text-xs`).
  - Background chip: `bg-white/15 hover:bg-white/25`, `backdrop-blur-sm`, `px-2 py-0.5`, `rounded`.
  - Focus: add `focus-visible:ring-2 ring-white/70 outline-none`.
  - Optional leading icon: `lucide-react` `RefreshCw` at size 12 (`h-3 w-3`) before the text; purely visual.
  - `aria-label`: the translated `images.replaceAria` string (with the image type interpolated) when the visible text is just "Replace".

---

### `features/{visitors,providers}/components/image-section.tsx`

#### Props (extended for create-mode staging)

```ts
interface ImageSectionProps {
  // Existing (edit/view mode):
  visitPersonId?: string;            // CHANGED — now optional
  images?: VisitPersonImage[];
  isLoading: boolean;
  onUpload?: (params: {              // CHANGED — optional (only used when visitPersonId present)
    visitPersonId: string;
    file: File;
    imageType: ImageType;
  }) => void;
  isUploading: boolean;

  // NEW — create-mode staging:
  stagedImages?: Map<ImageType, { file: File; previewUrl: string }>;
  onStageImage?: (imageType: ImageType, file: File) => void;
  mode?: "create" | "edit" | "view";  // Defaults to "edit" for backward compatibility
}
```

#### Behavior

- **Edit/view mode** (`mode !== "create"`): unchanged from today — uploads go through `onUpload` against `visitPersonId`.
- **Create mode** (`mode === "create"`): uploads call `onStageImage(type, file)` instead. The grid composes `VisitPersonImage[]`-shaped tiles from `stagedImages` so the existing `ImageGrid` can render them without a forked UI. `signedUrl` is populated with the local blob `previewUrl`.
- **Header**: renders `<h4>{t("images.title")}</h4>` plus a new `<p className="text-sm text-muted-foreground">{t("images.selectTypeHint")}</p>` directly under it, above the type selector + upload controls (satisfies FR-008).
- **Replace mechanic**:
  - `handleReplace(imageType)` uses `flushSync` to set `selectedType` synchronously, then calls `uploadRef.current?.openFilePicker()`.
  - The same `handleReplace` drives both edit and create modes (the handler composes with either `onUpload` or `onStageImage` via a `handleFilePicked` unifier).

#### Helper — synthetic `VisitPersonImage` from staged state

```ts
function stagedToImages(
  staged: Map<ImageType, { file: File; previewUrl: string }>,
): VisitPersonImage[] {
  return Array.from(staged.entries()).map(([imageType, { previewUrl }]) => ({
    id: `staged-${imageType}`,
    imageType,
    storagePath: "",
    signedUrl: previewUrl,
    createdAt: new Date().toISOString(),
  }));
}
```

---

### `features/{visitors,providers}/components/visit-person-form.tsx` (web + desktop)

#### Props (extended)

```ts
interface VisitPersonFormProps {
  onSave: (data: {
    fullName: string;
    status: VisitPersonStatus;
    residentId: string;
    notes: string;
    stagedImages: Map<ImageType, File>;    // NEW — passed up on save
  }) => void;
  onCancel: () => void;
  isSaving: boolean;                       // true during create mutation
  isUploadingStagedImages?: boolean;       // NEW — true while flushing staged uploads
}
```

#### Behavior

- Maintains a local `stagedImages` Map keyed by `ImageType`.
- Renders `<ImageSection mode="create" stagedImages={...} onStageImage={...} isUploading={isUploadingStagedImages ?? false} isLoading={false} />` below the existing form fields, above the action buttons.
- Does NOT persist `stagedImages` through `useFormPersistence` — text fields only, unchanged.
- On submit: invokes `onSave` with `stagedImages`. Parent (`visit-person-sidebar.tsx`) orchestrates: `createMutation` first, then sequential `uploadMutation` per staged entry.
- On cancel: revokes all `previewUrl`s; no API calls made.

---

### `features/{visitors,providers}/components/visit-person-sidebar.tsx` (web + desktop)

#### Responsibilities (modified)

- Owns the "create → then flush images" orchestration.
- Tracks `isUploadingStagedImages` during the flush phase and passes it to the form.
- On full success: either (a) close the sheet, or (b) transition it into edit mode for the new person. **Decision**: close on success, consistent with the current behavior where the sidebar closes after create. Any failed image uploads show a toast and the user can reopen the record in edit mode to retry.

---

## Translation-key contract

All keys live in `packages/i18n/src/messages/{en,es}.json` (shared across web + desktop).

### Keys to add

| Key | English | Spanish |
|-----|---------|---------|
| `images.selectTypeHint` | Select the type of image you want to upload or change. | Selecciona el tipo de imagen que deseas subir o cambiar. |
| `images.replaceAria` | Replace {type} image | Reemplazar imagen de {type} |
| `visitPersons.form.imagesSectionLabel` | Photos | Fotos |
| `images.stagedBadge` | Pending upload | Pendiente por subir |

### Keys reused (no wording change)

- `images.title`
- `images.upload`
- `images.uploading`
- `images.replace`
- `images.uploadStarted`
- `images.types.face` / `images.types.id_card` / `images.types.vehicle_plate` / `images.types.other`

### Verification rule

A translation-key audit (grep for `t("images.` and `t("visitPersons.form.images` in both apps) must confirm every key referenced in code exists in both `en.json` and `es.json`. No missing key, no orphan key.

---

## Acceptance contracts (summary table)

| Spec FR | Contract location |
|---------|-------------------|
| FR-001 (image section in create form) | `visit-person-form.tsx` renders `ImageSection mode="create"` |
| FR-002 (attach during creation) | `visit-person-sidebar.tsx` orchestrates create-then-upload |
| FR-003 (no orphans on cancel) | `visit-person-form.tsx` never calls upload mutation on cancel; `previewUrl` revocation on unmount |
| FR-004 (square tiles) | `image-grid.tsx` `aspect-square` |
| FR-005 (prominent Replace) | `image-grid.tsx` Replace button styling |
| FR-006 (one-click Replace) | `image-section.tsx` `handleReplace` via `flushSync` + `openFilePicker()` |
| FR-007 (Replace uploads correct type) | `image-upload.tsx` `imageType` prop drives FormData field |
| FR-008 (instructional label) | `image-section.tsx` renders `images.selectTypeHint` |
| FR-009 (en+es translations) | `packages/i18n/src/messages/{en,es}.json` keys above |
| FR-010 (Replace same validation) | Shared `isValidImageFile` helper in `image-upload.tsx` |
| FR-011 (offline) | No regression — unchanged online-only create (see research.md Decision 6) |
| FR-012 (uniform visitor + provider) | Symmetric changes to both `features/visitors` and `features/providers` |
