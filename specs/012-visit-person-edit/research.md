# Research: Edit Visitor/Service Provider Records & Read-Only Access Events

**Feature**: `012-visit-person-edit`
**Date**: 2026-04-13

All unknowns in this feature came from choosing between several equally valid implementation shapes. Every decision below was resolved by inspecting the existing spec 011 implementation in `apps/web/src/features/{visitors,providers}` and `apps/desktop/src/features/{visitors,providers}`, and aligning with the patterns already in use. No external research was required.

---

## 1. Sidebar mode model

**Decision**: Extend the existing `sidebarMode: "view" | "create"` state to `"view" | "create" | "edit"`. A single `Sheet` instance continues to render; the mode selects which body to show.

**Rationale**:

- The `VisitPersonSidebar` component already branches on `mode` and already owns `person` and form-orchestration state.
- Adding a third discriminated mode is consistent with the existing branching and does not require splitting the component into three siblings.
- Only one sheet at a time is visible anyway (the guard cannot be editing and logging simultaneously), so a single instance with a mode discriminator is the natural shape.

**Alternatives considered**:

- **Separate `<VisitPersonEditSheet />` component**: rejected. Would duplicate open/close state, keyboard focus handling, and the image section. More code, more divergence risk.
- **URL query param `?edit=<id>`**: rejected for now. The existing new-visit flow does not use query params either; introducing them asymmetrically creates two navigation conventions in the same feature. Can be added later if deep-linking to a specific edit is ever requested.

---

## 2. Edit form composition

**Decision**: Create a new `VisitPersonEditForm` component per feature (`visitors/` and `providers/`) instead of reusing `VisitPersonForm`.

**Rationale**:

- `VisitPersonForm` is hardcoded for create mode: its internal state initializes from empty strings, its form-persistence key is `visit-person-create`, and it emits a `CreateVisitPersonDto`-shaped payload. Forcing it to handle edit mode would require five prop additions and a conditional branch in each state setter — more complexity than just writing a second ~120-line form.
- Edit mode has meaningfully different fields for providers (phone, company) versus visitors. A single form that tries to handle both `type`s via props is more brittle than keeping a parallel form per feature.
- Having a dedicated edit form makes the "no access-event form" requirement (FR-005) trivially enforceable — the file simply does not import the access-event form.

**Alternatives considered**:

- **Shared `VisitPersonEditForm` in a shared module**: rejected. Would place visit-person-specific form code outside `features/visitors` and `features/providers`, violating feature-based architecture (Constitution II).
- **Extend `VisitPersonForm` with `mode: "create" | "edit"`**: rejected as above; the form-persistence hook and default values diverge enough that the conditionals outweigh the DRY gain.

---

## 3. Draft-key strategy for edit drafts

**Decision**: Use form-persistence key `visit-person-edit-<personId>`. Each in-progress edit gets its own namespace; create drafts (`visit-person-create`) are untouched.

**Rationale**:

- Guards may open two different persons for editing in quick succession; each needs its own draft state.
- The `useFormPersistence` hook already accepts a string key, so this is a zero-cost namespacing strategy.
- When the edit completes (save or explicit discard), `clearDraft()` removes the entry by ID, keeping localStorage clean.

**Alternatives considered**:

- **Single `visit-person-edit` key**: rejected. If a guard starts editing visitor A, closes the sheet, then opens visitor B, the draft from A would incorrectly restore into B's form.
- **No draft persistence for edit mode at all**: rejected. Losing a half-written correction because of accidental navigation would undermine the "data integrity" motivation of the feature.

---

## 4. Unsaved-changes warning pattern

**Decision**: Lightweight inline `AlertDialog` (already available in `@ramcar/ui`) fired when the guard attempts to close the sheet while the edit form is dirty. Two buttons: "Discard changes" and "Keep editing".

**Rationale**:

- `AlertDialog` is already used elsewhere in the codebase for destructive confirmations.
- A full modal dialog is too heavy; a toast is too easy to miss. The `AlertDialog` strikes the middle.
- The dialog is only rendered while the form is dirty, so there is no noise in the common case.

**Alternatives considered**:

- **`beforeunload` browser prompt**: rejected — only protects against full-page navigation, not against sheet-close or route changes. The hook is also hostile to automated testing.
- **No warning at all, but auto-persist draft**: rejected. The draft already persists for recovery, but the warning is what prevents accidental data loss from closing the sheet believing a save happened.

---

## 5. Desktop outbox op kind for visit-person update

**Decision**: Add outbox operation kind `"visit_person.update"`. Payload: `{ personId: string, patch: UpdateVisitPersonInput, eventId: string }`. `eventId` is a client-generated UUID used for idempotency.

**Rationale**:

- Consistent with the existing outbox pattern used in spec 011 for `"access_event.create"` and `"visit_person.create"`.
- The sync engine replays outbox entries against `PATCH /api/visit-persons/:personId` with the body `patch`, which is exactly the existing endpoint contract — no API change needed.
- Conflict strategy: **last-write-wins**. If two guards edited the same visit person while one was offline, the later `updated_at` wins on server replay. This matches spec 011's general posture and the spec 012 edge-case note. A richer conflict model (optimistic locking via `version` column) is explicitly out of scope.

**Alternatives considered**:

- **Block offline edits**: rejected — violates Constitution IV (Offline-First Desktop) and FR-011.
- **Client-side version check before enqueueing**: rejected — requires a new `version` column on `visit_persons` and reconciliation logic on the server. Deferred to a future feature.

---

## 6. Access-event update removal approach

**Decision**: **Hard delete** the access-event update surface. Specifically:

| Layer | Change |
|-------|--------|
| `packages/shared/src/validators/access-event.ts` | Remove `updateAccessEventSchema` + `UpdateAccessEventInput` export. |
| `packages/shared/src/index.ts` | Remove re-exports. |
| `apps/api/src/modules/access-events/access-events.controller.ts` | Delete the `@Patch(":id")` handler. |
| `apps/api/src/modules/access-events/access-events.service.ts` | Delete `update(...)` method. |
| `apps/api/src/modules/access-events/access-events.repository.ts` | Delete `update(...)` method if present. |
| `apps/web/src/features/{visitors,providers}/hooks/use-update-access-event.ts` | Delete file. |
| `apps/desktop/src/features/{visitors,providers}/hooks/use-update-access-event.ts` | Delete file. |
| `apps/{web,desktop}/src/features/{visitors,providers}/components/recent-events-list.tsx` | Remove `onEdit` prop + edit button. |
| `apps/{web,desktop}/src/features/{visitors,providers}/components/visit-person-sidebar.tsx` | Remove `editingEvent` state, `onUpdateEvent` prop, `handleSaveOrUpdate`. |
| `apps/{web,desktop}/src/features/{visitors,providers}/components/visit-person-access-event-form.tsx` | Remove `editingEvent` / `onCancelEdit` props and related branches; form returns to a pure create-only shape. |
| `apps/{web,desktop}/src/features/{visitors,providers}/components/*-page-client.tsx` | Remove `useUpdateAccessEvent` import + `handleUpdateEvent` + `updateAccessEvent.isPending` from `isSaving`. |
| Translation files | Remove `accessEvents.form.edit` and `messages.updated` keys (or downgrade `messages.updated` to visit-person-only if reused). |

**Rationale**:

- A feature flag would be dead code from day one — there is no rollback scenario (the spec explicitly decides access events are now immutable).
- Removing the shared Zod schema is the strongest guarantee: if any client code still referenced the schema, the TypeScript build would fail and surface the call site for cleanup.
- Deleting the NestJS route means a misbehaving client hitting `PATCH /api/access-events/:id` gets a 404 — the desired defense-in-depth.

**Alternatives considered**:

- **Feature flag / soft disable**: rejected as above.
- **Keep the endpoint but restrict to `super_admin`**: rejected. The spec prefers immutability as a trust property, not a role-gated workflow.

---

## 7. i18n key changes

**Decision**: Add `visitPersons.edit.title`, `visitPersons.edit.save`, `visitPersons.edit.saving`, `visitPersons.edit.discardConfirmTitle`, `visitPersons.edit.discardConfirmBody`, `visitPersons.edit.keepEditing`, `visitPersons.edit.discard`, `visitPersons.messages.updated`, and accessibility labels `visitPersons.actions.editVisitor`, `visitPersons.actions.editProvider`. Remove `accessEvents.form.edit` and `accessEvents.messages.updated` from web + desktop locale files.

**Rationale**:

- The "updated" confirmation toast belongs to the visit-person domain now, not the access-event domain — moving the key clarifies ownership.
- Spanish and English both need the keys; both locale files are updated together.

**Alternatives considered**: None — follows existing i18n conventions.

---

## Summary of unresolved items

None. All items resolved by the decisions above.
