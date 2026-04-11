# Form Draft Persistence — Design Spec

**Date:** 2026-04-10
**Feature ID:** 011-form-draft-persistence
**Status:** Draft

## Problem

When a user accidentally refreshes the page (or triggers pull-to-refresh on mobile) while filling out a form, all unsaved data is lost. There is no recovery mechanism.

## Solution

A reusable `useFormPersistence` hook that automatically saves form state to `localStorage` on a debounced interval, restores it on mount, and clears it on submit or explicit discard. Every authenticated form in the web app can adopt it with 2-3 lines of code.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Authenticated forms only | Never persist passwords or sensitive auth data |
| Staleness | Always restore draft | Trust user intent; let server reject stale data on submit |
| Storage key | Includes record ID for edits | Prevents cross-record draft bleed (edit User #5 vs #7) |
| Draft cleared when | Successful submit OR explicit cancel/discard | Survives accidental refresh; user can intentionally discard |
| Restore notification | Toast with discard action | Non-intrusive; makes restored state visible; quick discard access |
| Save frequency | Debounced, 1 second | Balances data protection with localStorage write performance |
| Architecture | Observer hook (Approach A) | Minimal invasion to existing `useState` pattern; incremental adoption |

## Hook API

### Signature

```ts
function useFormPersistence<T>(
  formKey: string,
  formData: T,
  options: {
    onRestore: (draft: T) => void;
    excludeFields?: (keyof T)[];
    debounceMs?: number; // default: 1000
  }
): {
  wasRestored: boolean;
  discardDraft: () => void;
  clearDraft: () => void;
};
```

### Parameters

- **`formKey`** — Unique identifier for the form + context. Examples: `"user-create"`, `"user-edit-5"`, `"vehicle-create"`.
- **`formData`** — Current form state object. Observed on every render; debounced writes to localStorage.
- **`onRestore`** — Callback invoked once on mount when a draft exists. Receives the parsed draft so the consuming component can call its own state setters.
- **`excludeFields`** — Optional array of field names to strip before saving (e.g., `['password', 'confirmPassword']`).
- **`debounceMs`** — Debounce interval in milliseconds. Defaults to `1000`.

### Return Values

- **`wasRestored`** — `true` if a draft was restored on mount. Used to trigger the toast notification.
- **`discardDraft`** — Clears the draft from localStorage and resets `wasRestored` to `false`. Called by the toast "Discard" action and Cancel buttons.
- **`clearDraft`** — Clears the draft from localStorage. Called after successful form submission. Functionally identical to `discardDraft`; both exist for semantic clarity at the call site (`clearDraft` = success path, `discardDraft` = abandon path).

### Lifecycle

1. **Mount** — Check localStorage for `ramcar-draft:{formKey}`. If found, parse and call `onRestore(draft.data)`, set `wasRestored = true`.
2. **On change** — After `formData` changes, wait for debounce interval, then write to localStorage (stripping `excludeFields`).
3. **Submit success** — Consumer calls `clearDraft()`.
4. **Cancel** — Consumer calls `discardDraft()`.
5. **Unmount** — Pending debounce timer is cancelled. Draft remains in localStorage for later.

## Storage Strategy

### Key Format

```
ramcar-draft:{formKey}
```

### Stored Value

```json
{
  "data": { /* form fields, excluding excluded fields */ },
  "savedAt": 1712764800000
}
```

The `savedAt` timestamp is used in the toast message to show when the draft was saved (e.g., "Draft restored from 2 minutes ago").

### SSR Safety

All `localStorage` access is guarded with `typeof window !== "undefined"`. This matches the existing pattern used by `sidebar-slice.ts` and `theme-slice.ts`.

### Error Handling

If `JSON.parse` fails on a stored draft (corrupted data), the draft is silently removed from localStorage and the form starts fresh.

### Expiration

None. Drafts persist until explicitly cleared by submit, cancel, or discard. No background cleanup or TTL.

## Integration Pattern

### Single-state forms (User Form)

```tsx
const [formData, setFormData] = useState<UserFormData>(initialFormData);

const { wasRestored, discardDraft, clearDraft } = useFormPersistence(
  'user-create',
  formData,
  {
    onRestore: (draft) => setFormData(draft),
    excludeFields: ['password', 'confirmPassword'],
  }
);

// Success
const handleSubmit = async (data: UserFormData) => {
  await createMutation.mutateAsync(data);
  clearDraft();
  router.push('/catalogs/users');
};

// Cancel
const handleCancel = () => {
  discardDraft();
  router.push('/catalogs/users');
};
```

### Edit forms (key includes record ID)

```tsx
useFormPersistence(`user-edit-${userId}`, formData, {
  onRestore: (draft) => setFormData(draft),
  excludeFields: ['password', 'confirmPassword'],
});
```

### Multi-state forms (Access Event Form)

Forms that use multiple `useState` calls compose them into a single object:

```tsx
const composedData = { direction, accessMode, vehicleId, notes };

const { wasRestored, discardDraft, clearDraft } = useFormPersistence(
  'access-event-create',
  composedData,
  {
    onRestore: (draft) => {
      setDirection(draft.direction);
      setAccessMode(draft.accessMode);
      setVehicleId(draft.vehicleId);
      setNotes(draft.notes);
    },
  }
);
```

### Toast notification (consumer responsibility)

The hook does not import toast or i18n — consumers handle notification:

```tsx
useEffect(() => {
  if (wasRestored) {
    toast.info(t('common.draftRestored'), {
      action: { label: t('common.discardDraft'), onClick: discardDraft },
    });
  }
}, [wasRestored]);
```

## Forms to Integrate

| Form | File | Key Pattern | Excluded Fields |
|------|------|-------------|-----------------|
| User Create | `features/users/components/create-user-page-client.tsx` | `user-create` | `password`, `confirmPassword` |
| User Edit | `features/users/components/edit-user-page-client.tsx` | `user-edit-{id}` | `password`, `confirmPassword` |
| Vehicle Create | `shared/components/vehicle-form/vehicle-form.tsx` | `vehicle-create` | *(none)* |
| Access Event | `features/residents/components/access-event-form.tsx` | `access-event-create` | *(none)* |

**Excluded:** Login form (auth, not behind authenticated routes), User Filters (ephemeral UI controls).

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `apps/web/src/shared/hooks/use-form-persistence.ts` | The hook implementation |
| `apps/web/src/shared/hooks/use-form-persistence.test.ts` | Unit tests (Vitest) |

### Modified Files

| File | Change |
|------|--------|
| `apps/web/src/features/users/components/create-user-page-client.tsx` | Add hook, toast, clear/discard on submit/cancel |
| `apps/web/src/features/users/components/edit-user-page-client.tsx` | Add hook, toast, clear/discard on submit/cancel |
| `apps/web/src/shared/components/vehicle-form/vehicle-form.tsx` | Add hook, toast, clear/discard on submit/cancel |
| `apps/web/src/features/residents/components/access-event-form.tsx` | Add hook, toast, clear/discard on submit/cancel |
| `packages/i18n/src/messages/en.json` | Add `common.draftRestored`, `common.discardDraft` keys |
| `packages/i18n/src/messages/es.json` | Add `common.draftRestored`, `common.discardDraft` keys |

### No Changes To

- `packages/store/` — form drafts are local state, not app-level Zustand state
- `packages/shared/` — no new validators or types needed
- `apps/api/` — purely frontend feature, no backend changes

## Translation Keys

**English (`en.json`):**
```json
{
  "common": {
    "draftRestored": "Draft restored from {time}",
    "discardDraft": "Discard"
  }
}
```

**Spanish (`es.json`):**
```json
{
  "common": {
    "draftRestored": "Borrador restaurado de {time}",
    "discardDraft": "Descartar"
  }
}
```

## Testing Strategy

### Unit Tests (`use-form-persistence.test.ts`)

- Saves form data to localStorage after debounce
- Restores draft on mount and calls `onRestore`
- Sets `wasRestored` to `true` when draft is restored
- Does not restore if no draft exists (`wasRestored` stays `false`)
- `clearDraft()` removes draft from localStorage
- `discardDraft()` removes draft and resets `wasRestored`
- Strips `excludeFields` before saving
- Handles corrupted localStorage data gracefully (removes and starts fresh)
- Cancels debounce timer on unmount
- Uses custom `debounceMs` when provided
- SSR-safe: does not crash when `window` is undefined

### Integration testing

Manual verification that each form saves, restores, and clears correctly. Covered by existing Playwright E2E flows if forms are exercised.
