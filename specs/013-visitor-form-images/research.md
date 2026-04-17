# Phase 0 — Research & Design Decisions

**Feature**: Visitor Form Image Capture UX
**Branch**: `013-visitor-form-images`
**Date**: 2026-04-16

## Purpose

Resolve the open design questions implicit in the spec (marked in Assumptions rather than as `[NEEDS CLARIFICATION]`) so Phase 1 can produce concrete contracts and quickstart steps.

---

## Decision 1 — How to attach images to a not-yet-created visit-person

### Options evaluated

**A. Transactional create-with-images endpoint.** Add a new endpoint that accepts the full person + multipart images in one call.

**B. Save-first, then upload.** Call existing `POST /visit-persons`. On success, flush each staged image via existing `POST /visit-persons/:id/images`. If an image upload fails, keep the created person and surface a non-blocking toast.

**C. Eager save on first image selection.** Silently create the record the moment the user picks their first image, then upload images against the new id. On cancel, call a delete endpoint (which does not exist) — or leave orphans.

### Decision

**B. Save-first, then upload (client-staged).**

### Rationale

- Does not require a new API endpoint or DTO. Keeps the API surface unchanged (spec says this is preferred; constitution Principle V keeps Zod DTOs as the single schema source).
- No orphan risk: if the user cancels before pressing Save, nothing was ever sent — satisfies FR-003 and SC-005 trivially.
- Partial failure is gracefully handled: the person exists, and the user is already viewing the record in edit mode right after save, so they can retry a failed image upload from the existing edit-mode flow without re-entering data.
- Matches existing mutation hooks (`useCreateVisitPerson`, `useUploadVisitPersonImage`) with no signature changes.

### Alternatives considered

- **(A) Transactional endpoint**: rejected — requires a new backend module, new Zod DTO, and multipart-with-JSON handling (which NestJS's Zod pipe does not natively support). Large backend blast radius for a UX change.
- **(C) Eager save**: rejected — creates orphan visit-persons on cancel (equivalent to orphan images); requires a new delete-on-cancel path and a confirmation dialog for cancels, both of which are worse UX and more code.

### Implications

- The create form holds staged `File` objects in local state, keyed by `imageType`.
- On submit, after the create mutation resolves with the new `VisitPerson.id`, the form iterates staged files and calls the existing upload mutation sequentially. Sequential (not parallel) because FormData uploads against a single resource are cheap and ordering keeps the UX simpler for error reporting.
- Visual feedback while uploading uses the existing `isUploading` flag. The sidebar stays open and transitions into "edit" mode (or closes, TBD in tasks) once all uploads settle.

---

## Decision 2 — One-click Replace mechanic

### Options evaluated

**A. Hoist the hidden `<input type="file">` into `ImageSection`.** Expose a ref; both the Upload button and the Replace button on a tile trigger `inputRef.current.click()` after setting `selectedType`.

**B. Imperative handle on `ImageUpload`.** Expose `openFilePicker()` via `forwardRef` + `useImperativeHandle`. `ImageSection` calls it after updating `selectedType` via `setState` in a layout effect.

**C. Double-click simulate.** On Replace, programmatically change selector then dispatch a synthetic click on the Upload button.

### Decision

**B. Imperative handle on `ImageUpload`.**

### Rationale

- Keeps the file-input and its validation co-located with the existing `ImageUpload` component (single source of truth for accepted-types + size limits → satisfies FR-010 automatically).
- Does not require `ImageSection` to know anything about `<input type="file">` internals.
- React's `setState` + `flushSync` (or a `useEffect` keyed on `selectedType`) gives a reliable way to set the type *before* opening the picker. The picker opens synchronously after `flushSync`, preserving the browser's user-gesture context (file pickers require this in Chrome/Firefox/Safari; a queued microtask after a click is still within the gesture).

### Alternatives considered

- **(A) Hoist input**: rejected — duplicates the file-validation logic unless we also refactor it into a shared hook. Larger diff for the same outcome.
- **(C) Synthetic click on Upload**: rejected — brittle and relies on DOM structure.

### Implications

- `ImageUpload` becomes `forwardRef<{ openFilePicker(): void }, ImageUploadProps>`.
- `ImageSection` holds a ref to `ImageUpload`. The `handleReplace(imageType)` handler calls `flushSync(() => setSelectedType(imageType))` then `uploadRef.current?.openFilePicker()`.
- The handler must still run inside the user-gesture stack. `flushSync` is synchronous, so the picker opens synchronously from the click — file picker gesture requirement preserved.

---

## Decision 3 — Square tile layout

### Options evaluated

**A. `aspect-square` + `object-cover`** (Tailwind utilities). Container is forced 1:1; the image fills it and is centered-cropped.

**B. Fixed `h-32 w-32`** or similar pixel sizes per tile.

**C. Responsive aspect via CSS custom properties.**

### Decision

**A. `aspect-square` + `object-cover`.**

### Rationale

- Single-line Tailwind change; works identically on web (Next.js) and desktop (Vite + Tailwind).
- Scales with the grid's column width (`grid-cols-2`) so tiles stay square regardless of sheet width (400px mobile, 800px desktop).
- `object-cover` keeps faces and ID cards filling the frame without distortion — matches FR-004 and SC-003 expectations.

### Alternatives considered

- **(B) Fixed size**: rejected — doesn't scale with the Sheet's responsive widths.
- **(C) Custom-property approach**: rejected — overkill for this change.

---

## Decision 4 — Prominent Replace button styling

### Options evaluated

**A. Solid accent-background pill** (primary or secondary variant) overlaid in the tile footer.
**B. Bold white text + backdrop chip** — keep the ghost variant but add `font-semibold`, `bg-white/15`, `backdrop-blur-sm`, slight padding.
**C. Floating icon button (camera/pencil) in the tile corner**, in addition to or instead of the footer.

### Decision

**B. Bold text + subtle chip background** for the Replace control; keep the footer layout; add a focus-visible ring. Combine with **C** as a progressive enhancement: a small camera/swap icon next to the label text.

### Rationale

- Retains the existing footer pattern (no layout shift).
- Raises contrast enough that Replace reads as actionable at a glance (FR-005, SC-003) without competing with the primary Save button in the form.
- Keeps the button within `@ramcar/ui` tokens (weight, background alpha, backdrop-blur are all Tailwind utilities already in use).

### Alternatives considered

- **(A) Solid accent pill**: rejected — visually competes with the Save CTA in the form, which is the primary action.
- **(C) Corner icon only**: rejected — losing the text label would hurt accessibility in a high-throughput guard workflow.

---

## Decision 5 — Where new translation strings live

### Options evaluated

**A. `packages/i18n/src/messages/{en,es}.json` only**, consumed by both web (`next-intl`) and desktop (`react-i18next`).
**B. Duplicate strings into both apps' local message directories.**

### Decision

**A. Single source in `packages/i18n`.**

### Rationale

- This is the existing convention in the repo (confirmed by reading `packages/i18n/src/messages/en.json` — it already holds `images.*` keys used by both apps).
- Avoids drift between English and Spanish across apps.

### New keys to add (both locales)

- `images.selectTypeHint` — "Select the type of image you want to upload or change." / "Selecciona el tipo de imagen que deseas subir o cambiar."
- `images.sectionTitleCreate` — (optional, only if section title differs in create mode) otherwise reuse `images.title`.
- `images.replaceAria` — accessible label for the Replace button when the text is truncated visually.
- `visitPersons.form.imagesLabel` — short section header (e.g., "Photos" / "Fotos") to mark the image section inside the create form.

Exact wording is finalized in Phase 1 (contracts + quickstart).

---

## Decision 6 — Spec FR-011 (offline create)

### Context

Spec FR-011 asks that offline creation flow through the outbox. Current desktop `useCreateVisitPerson` calls `apiClient.post` directly (no outbox). Adding outbox support for create is a larger backend/desktop change (new outbox op, new IPC, new sync-engine handler, new reconciliation for the server-assigned id).

### Decision

**Scope FR-011 down to "no regression vs. current behavior."** Creation remains online-only on desktop for this feature. If the network is unavailable at the moment of Save, the create mutation fails with the current error UX, staged images remain in form state, and the user can retry.

### Rationale

- Current behavior is already online-only; this feature does not regress it.
- Adding outbox support for create is out of scope for a UX-focused ticket and would invalidate the "no backend changes" scoping.
- Noted as a deliberate out-of-scope item so a future ticket can add offline-create + offline-image-upload holistically.

### Alternatives considered

- **Adding outbox support now**: rejected — doubles the scope and touches SQLite, IPC, sync-engine, and image binary persistence.

---

## Decision 7 — Providers vs. Visitors code paths

### Context

The repo has `features/visitors/` and `features/providers/` with parallel components (`visit-person-form.tsx`, `visit-person-sidebar.tsx`, `image-section.tsx`). Both need the same changes.

### Decision

**Apply the same changes symmetrically to both features.** Do not collapse them into a shared component in this ticket — that's a separate refactor and outside the spec's scope ("visitor and service provider flows should be treated uniformly" = behavior, not code structure).

### Rationale

- Consistent with existing architecture decisions in 011/012.
- Keeps the diff small and review-friendly.
- Leaves the door open for a later deduplication refactor.

---

## Out of Scope (documented)

- New `POST /visit-persons/with-images` transactional endpoint.
- Outbox support for offline create on desktop.
- Camera capture (getUserMedia / webcam) — only file-upload is in scope.
- Image cropping / rotation tooling.
- Changing the image-type enum.

## Summary

All open design questions resolved. No `NEEDS CLARIFICATION` markers remain. Phase 1 can proceed to generate `data-model.md`, `contracts/ui-contracts.md`, and `quickstart.md`.
