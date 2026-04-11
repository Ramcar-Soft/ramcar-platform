# Form Draft Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable `useFormPersistence` hook that saves form state to localStorage on change, restores it on page load, and clears on submit/cancel — protecting users from accidental data loss.

**Architecture:** Observer hook pattern. The hook watches existing `useState` form data via a ref + debounced effect, persists to localStorage under `ramcar-draft:{formKey}`, and restores on mount. Each form component integrates the hook internally (2-3 lines) without changing its external API. Consumers show a toast with discard action when a draft is restored.

**Tech Stack:** React 18 hooks, localStorage, Vitest (jsdom), next-intl, sonner (toast)

**Spec:** `docs/superpowers/specs/2026-04-10-form-draft-persistence-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/web/src/shared/hooks/use-form-persistence.ts` | The hook: debounced save, restore on mount, clear/discard |
| Create | `apps/web/src/shared/hooks/use-form-persistence.test.ts` | Unit tests for the hook |
| Modify | `packages/i18n/src/messages/en.json` | Add `common.draftRestored`, `common.discardDraft` |
| Modify | `packages/i18n/src/messages/es.json` | Add `common.draftRestored`, `common.discardDraft` |
| Modify | `apps/web/src/features/users/components/user-form.tsx` | Add hook, toast on restore, discard on cancel |
| Modify | `apps/web/src/features/users/components/create-user-page-client.tsx` | Remove try/catch so submit errors propagate to UserForm |
| Modify | `apps/web/src/features/users/components/edit-user-page-client.tsx` | Remove try/catch so submit errors propagate to UserForm |
| Modify | `apps/web/src/shared/components/vehicle-form/vehicle-form.tsx` | Add hook, clear on save success, discard on cancel |
| Modify | `apps/web/src/features/residents/components/access-event-form.tsx` | Add hook, toast on restore, discard on cancel, clear on save |
| Modify | `apps/web/src/features/residents/components/access-event-sidebar.tsx` | Update `onSave` type to `Promise<void>` |
| Modify | `apps/web/src/features/residents/components/residents-page-client.tsx` | Change `.mutate()` to `.mutateAsync()` so save errors propagate |

---

### Task 1: Add translation keys

**Files:**
- Modify: `packages/i18n/src/messages/en.json`
- Modify: `packages/i18n/src/messages/es.json`

- [ ] **Step 1: Add English translation keys**

In `packages/i18n/src/messages/en.json`, add two keys inside the existing `"common"` object:

```json
"common": {
    "appName": "RamcarSoft",
    "loading": "Loading...",
    "error": "An error occurred",
    "draftRestored": "Draft restored from {time}",
    "discardDraft": "Discard"
  },
```

- [ ] **Step 2: Add Spanish translation keys**

In `packages/i18n/src/messages/es.json`, add two keys inside the existing `"common"` object:

```json
"common": {
    "appName": "RamcarSoft",
    "loading": "Cargando...",
    "error": "Ocurrió un error",
    "draftRestored": "Borrador restaurado de {time}",
    "discardDraft": "Descartar"
  },
```

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm typecheck --filter @ramcar/i18n`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/i18n/src/messages/en.json packages/i18n/src/messages/es.json
git commit -m "feat(i18n): add draft persistence translation keys"
```

---

### Task 2: Write failing tests for useFormPersistence

**Files:**
- Create: `apps/web/src/shared/hooks/use-form-persistence.test.ts`

The test file uses Vitest with jsdom environment (configured in `apps/web/vitest.config.ts`). The hook is tested using `@testing-library/react`'s `renderHook` and `act`.

- [ ] **Step 1: Create the test file with all test cases**

Create `apps/web/src/shared/hooks/use-form-persistence.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormPersistence } from "./use-form-persistence";

const STORAGE_PREFIX = "ramcar-draft:";

function getStored(key: string) {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
  return raw ? JSON.parse(raw) : null;
}

function setStored(key: string, data: unknown, savedAt = Date.now()) {
  localStorage.setItem(
    `${STORAGE_PREFIX}${key}`,
    JSON.stringify({ data, savedAt }),
  );
}

describe("useFormPersistence", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves form data to localStorage after debounce", () => {
    const onRestore = vi.fn();
    const { rerender } = renderHook(
      ({ data }) =>
        useFormPersistence("test-form", data, { onRestore }),
      { initialProps: { data: { name: "" } } },
    );

    rerender({ data: { name: "Alice" } });
    expect(getStored("test-form")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const stored = getStored("test-form");
    expect(stored.data).toEqual({ name: "Alice" });
    expect(stored.savedAt).toBeTypeOf("number");
  });

  it("restores draft on mount and calls onRestore", () => {
    setStored("test-form", { name: "Bob" });
    const onRestore = vi.fn();

    const { result } = renderHook(() =>
      useFormPersistence("test-form", { name: "" }, { onRestore }),
    );

    expect(onRestore).toHaveBeenCalledWith({ name: "Bob" });
    expect(result.current.wasRestored).toBe(true);
  });

  it("does not restore if no draft exists", () => {
    const onRestore = vi.fn();

    const { result } = renderHook(() =>
      useFormPersistence("test-form", { name: "" }, { onRestore }),
    );

    expect(onRestore).not.toHaveBeenCalled();
    expect(result.current.wasRestored).toBe(false);
  });

  it("clearDraft removes draft from localStorage", () => {
    setStored("test-form", { name: "Bob" });
    const onRestore = vi.fn();

    const { result } = renderHook(() =>
      useFormPersistence("test-form", { name: "" }, { onRestore }),
    );

    act(() => {
      result.current.clearDraft();
    });

    expect(localStorage.getItem(`${STORAGE_PREFIX}test-form`)).toBeNull();
  });

  it("discardDraft removes draft and resets wasRestored", () => {
    setStored("test-form", { name: "Bob" });
    const onRestore = vi.fn();

    const { result } = renderHook(() =>
      useFormPersistence("test-form", { name: "" }, { onRestore }),
    );

    expect(result.current.wasRestored).toBe(true);

    act(() => {
      result.current.discardDraft();
    });

    expect(localStorage.getItem(`${STORAGE_PREFIX}test-form`)).toBeNull();
    expect(result.current.wasRestored).toBe(false);
  });

  it("strips excludeFields before saving", () => {
    const onRestore = vi.fn();
    const { rerender } = renderHook(
      ({ data }) =>
        useFormPersistence("test-form", data, {
          onRestore,
          excludeFields: ["password", "confirmPassword"],
        }),
      {
        initialProps: {
          data: { name: "Alice", password: "secret", confirmPassword: "secret" },
        },
      },
    );

    rerender({
      data: { name: "Alice", password: "secret", confirmPassword: "secret" },
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const stored = getStored("test-form");
    expect(stored.data).toEqual({ name: "Alice" });
    expect(stored.data.password).toBeUndefined();
    expect(stored.data.confirmPassword).toBeUndefined();
  });

  it("handles corrupted localStorage data gracefully", () => {
    localStorage.setItem(`${STORAGE_PREFIX}test-form`, "not-valid-json{{{");
    const onRestore = vi.fn();

    const { result } = renderHook(() =>
      useFormPersistence("test-form", { name: "" }, { onRestore }),
    );

    expect(onRestore).not.toHaveBeenCalled();
    expect(result.current.wasRestored).toBe(false);
    expect(localStorage.getItem(`${STORAGE_PREFIX}test-form`)).toBeNull();
  });

  it("cancels debounce timer on unmount", () => {
    const onRestore = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ data }) =>
        useFormPersistence("test-form", data, { onRestore }),
      { initialProps: { data: { name: "" } } },
    );

    rerender({ data: { name: "Alice" } });
    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(getStored("test-form")).toBeNull();
  });

  it("uses custom debounceMs when provided", () => {
    const onRestore = vi.fn();
    const { rerender } = renderHook(
      ({ data }) =>
        useFormPersistence("test-form", data, {
          onRestore,
          debounceMs: 500,
        }),
      { initialProps: { data: { name: "" } } },
    );

    rerender({ data: { name: "Alice" } });

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(getStored("test-form")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(getStored("test-form")?.data).toEqual({ name: "Alice" });
  });

  it("does not save initial render data as a draft", () => {
    const onRestore = vi.fn();
    renderHook(() =>
      useFormPersistence("test-form", { name: "" }, { onRestore }),
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(getStored("test-form")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/web && pnpm vitest run src/shared/hooks/use-form-persistence.test.ts`
Expected: FAIL — module `./use-form-persistence` does not exist yet.

- [ ] **Step 3: Commit failing tests**

```bash
git add apps/web/src/shared/hooks/use-form-persistence.test.ts
git commit -m "test: add failing tests for useFormPersistence hook"
```

---

### Task 3: Implement useFormPersistence hook

**Files:**
- Create: `apps/web/src/shared/hooks/use-form-persistence.ts`
- Test: `apps/web/src/shared/hooks/use-form-persistence.test.ts` (from Task 2)

- [ ] **Step 1: Create the hook implementation**

Create `apps/web/src/shared/hooks/use-form-persistence.ts`:

```ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_PREFIX = "ramcar-draft:";

interface StoredDraft<T> {
  data: T;
  savedAt: number;
}

interface UseFormPersistenceOptions<T> {
  onRestore: (draft: T) => void;
  excludeFields?: (keyof T)[];
  debounceMs?: number;
}

export function useFormPersistence<T extends Record<string, unknown>>(
  formKey: string,
  formData: T,
  options: UseFormPersistenceOptions<T>,
) {
  const { onRestore, excludeFields, debounceMs = 1000 } = options;
  const [wasRestored, setWasRestored] = useState(false);
  const storageKey = `${STORAGE_PREFIX}${formKey}`;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  // Restore on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const stored: StoredDraft<T> = JSON.parse(raw);
      onRestoreRef.current(stored.data);
      setWasRestored(true);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  // Debounced save on change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (typeof window === "undefined") return;

    timerRef.current = setTimeout(() => {
      let dataToSave = { ...formData };

      if (excludeFields) {
        for (const field of excludeFields) {
          delete dataToSave[field];
        }
      }

      const stored: StoredDraft<T> = {
        data: dataToSave,
        savedAt: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(stored));
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [formData, storageKey, debounceMs, excludeFields]);

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const discardDraft = useCallback(() => {
    clearDraft();
    setWasRestored(false);
  }, [clearDraft]);

  return { wasRestored, discardDraft, clearDraft };
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd apps/web && pnpm vitest run src/shared/hooks/use-form-persistence.test.ts`
Expected: All tests PASS.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck --filter @ramcar/web`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/shared/hooks/use-form-persistence.ts
git commit -m "feat: implement useFormPersistence hook"
```

---

### Task 4: Integrate into UserForm (create + edit)

**Files:**
- Modify: `apps/web/src/features/users/components/user-form.tsx` — lines 1-8 (imports), 49-57 (props), 65-78 (state init), 120-129 (handleSubmit), 350-363 (buttons)
- Modify: `apps/web/src/features/users/components/create-user-page-client.tsx` — lines 24-31 (handleSubmit)
- Modify: `apps/web/src/features/users/components/edit-user-page-client.tsx` — lines 30-37 (handleSubmit)

The `formData` state lives inside `UserForm`, so the hook goes there. The parent's `onSubmit` is changed to `Promise<void>` so UserForm can `await` it and clear the draft only on success.

- [ ] **Step 1: Update parent `onSubmit` in create-user-page-client.tsx to propagate errors**

In `apps/web/src/features/users/components/create-user-page-client.tsx`, change `handleSubmit` to not catch errors (let them propagate to UserForm):

```tsx
  const handleSubmit = async (data: UserFormData) => {
    await createMutation.mutateAsync(data as CreateUserInput);
    router.push(`/${locale}/catalogs/users`);
  };
```

(Remove the `try/catch` wrapper — the error is still tracked via `createMutation.error` for display.)

- [ ] **Step 2: Update parent `onSubmit` in edit-user-page-client.tsx to propagate errors**

In `apps/web/src/features/users/components/edit-user-page-client.tsx`, change `handleSubmit` to not catch errors:

```tsx
  const handleSubmit = async (data: UserFormData) => {
    await updateMutation.mutateAsync(data as UpdateUserInput);
    router.push(`/${locale}/catalogs/users`);
  };
```

- [ ] **Step 3: Add hook and toast to UserForm**

In `apps/web/src/features/users/components/user-form.tsx`:

**Add imports** (at the top, alongside existing imports):

```tsx
import { useEffect } from "react";
import { toast } from "sonner";
import { useFormPersistence } from "@/shared/hooks/use-form-persistence";
```

(Note: `useState` is already imported. Change `import { useState } from "react"` to `import { useState, useEffect } from "react"`)

**Update the `UserFormProps` interface** — change `onSubmit` to return `Promise<void>`:

```tsx
interface UserFormProps {
  mode: "create" | "edit";
  initialData?: ExtendedUserProfile;
  tenants: { id: string; name: string }[];
  userGroups: UserGroup[];
  isPending: boolean;
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
}
```

**Add the hook** — after the `useState` for `formData` (after line 78), add:

```tsx
  const persistenceKey = isEdit
    ? `user-edit-${initialData?.id}`
    : "user-create";

  const { wasRestored, discardDraft, clearDraft } = useFormPersistence(
    persistenceKey,
    formData,
    {
      onRestore: (draft) => setFormData((prev) => ({ ...prev, ...draft })),
      excludeFields: ["password", "confirmPassword"],
    },
  );

  const tCommon = useTranslations("common");

  useEffect(() => {
    if (wasRestored) {
      toast.info(tCommon("draftRestored", { time: "" }), {
        action: {
          label: tCommon("discardDraft"),
          onClick: () => discardDraft(),
        },
      });
    }
  }, [wasRestored, tCommon, discardDraft]);
```

**Update `handleSubmit`** — change to async, await `onSubmit`, clear draft on success:

```tsx
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const submitData = { ...formData };
    if (isEdit || !submitData.password) {
      delete submitData.password;
      delete submitData.confirmPassword;
    }
    try {
      await onSubmit(submitData);
      clearDraft();
    } catch {
      // Submission failed — keep draft for recovery
    }
  };
```

**Wrap `onCancel`** — update the Cancel button's `onClick` to also discard the draft:

Change the Cancel button from:
```tsx
        <Button type="button" variant="outline" onClick={onCancel}>
```
to:
```tsx
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            discardDraft();
            onCancel();
          }}
        >
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck --filter @ramcar/web`
Expected: PASS

- [ ] **Step 5: Run all web tests**

Run: `cd apps/web && pnpm vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/users/components/user-form.tsx \
       apps/web/src/features/users/components/create-user-page-client.tsx \
       apps/web/src/features/users/components/edit-user-page-client.tsx
git commit -m "feat: integrate form draft persistence into user form"
```

---

### Task 5: Integrate into VehicleForm

**Files:**
- Modify: `apps/web/src/shared/components/vehicle-form/vehicle-form.tsx` — lines 1-9 (imports), 17-27 (component body), 28-52 (handleSubmit), 109-125 (buttons)

VehicleForm manages its own mutation internally (`useCreateVehicle`), so it has full control over success/failure. No parent changes needed.

- [ ] **Step 1: Add hook and toast to VehicleForm**

In `apps/web/src/shared/components/vehicle-form/vehicle-form.tsx`:

**Update imports** — change `import { useState } from "react"` and add hook + useEffect:

```tsx
import { useState, useEffect, useMemo } from "react";
import { useFormPersistence } from "@/shared/hooks/use-form-persistence";
```

(`toast` and `useTranslations` are already imported.)

**Add the hook** — after the individual `useState` calls (after line 27), add:

```tsx
  const tCommon = useTranslations("common");

  const composedData = useMemo(
    () => ({ vehicleType, brand, model, plate, color, notes }),
    [vehicleType, brand, model, plate, color, notes],
  );

  const { wasRestored, discardDraft, clearDraft } = useFormPersistence(
    "vehicle-create",
    composedData,
    {
      onRestore: (draft) => {
        setVehicleType(draft.vehicleType ?? "");
        setBrand(draft.brand ?? "");
        setModel(draft.model ?? "");
        setPlate(draft.plate ?? "");
        setColor(draft.color ?? "");
        setNotes(draft.notes ?? "");
      },
    },
  );

  useEffect(() => {
    if (wasRestored) {
      toast.info(tCommon("draftRestored", { time: "" }), {
        action: {
          label: tCommon("discardDraft"),
          onClick: () => discardDraft(),
        },
      });
    }
  }, [wasRestored, tCommon, discardDraft]);
```

**Update `handleSubmit`** — add `clearDraft()` in the `onSuccess` callback:

```tsx
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = createVehicleSchema.safeParse({
      userId,
      vehicleType,
      brand: brand || undefined,
      model: model || undefined,
      plate: plate || undefined,
      color: color || undefined,
      notes: notes || undefined,
    });

    if (!result.success) return;

    createVehicle.mutate(result.data, {
      onSuccess: () => {
        clearDraft();
        toast.success(t("messages.created"));
        onSaved();
      },
      onError: () => {
        toast.error(t("messages.errorCreating"));
      },
    });
  };
```

**Wrap `onCancel`** — update the Cancel button:

Change:
```tsx
          onClick={onCancel}
```
to:
```tsx
          onClick={() => {
            discardDraft();
            onCancel();
          }}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck --filter @ramcar/web`
Expected: PASS

- [ ] **Step 3: Run all web tests**

Run: `cd apps/web && pnpm vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/shared/components/vehicle-form/vehicle-form.tsx
git commit -m "feat: integrate form draft persistence into vehicle form"
```

---

### Task 6: Integrate into AccessEventForm

**Files:**
- Modify: `apps/web/src/features/residents/components/access-event-form.tsx` — lines 1-16 (imports), 22-25 (props interface), 40-54 (component body), 72-79 (handleSubmit), 189-196 (buttons)
- Modify: `apps/web/src/features/residents/components/access-event-sidebar.tsx` — line 28 (onSave type)
- Modify: `apps/web/src/features/residents/components/residents-page-client.tsx` — lines 87-118 (handleSave)

AccessEventForm's mutation lives in the parent (`residents-page-client.tsx`). We change the `onSave` callback to return `Promise<void>` so the form can clear the draft on success.

- [ ] **Step 1: Update residents-page-client.tsx to use mutateAsync**

In `apps/web/src/features/residents/components/residents-page-client.tsx`, update `handleSave`:

```tsx
  const handleSave = useCallback(
    async (formData: {
      direction: Direction;
      accessMode: AccessMode;
      vehicleId?: string;
      notes: string;
    }) => {
      if (!selectedResident) return;

      await createAccessEvent.mutateAsync({
        personType: "resident",
        userId: selectedResident.id,
        direction: formData.direction,
        accessMode: formData.accessMode,
        vehicleId: formData.vehicleId,
        notes: formData.notes || undefined,
        source: "web",
      });
      toast.success(t("messages.created"));
      handleCloseSidebar();
    },
    [selectedResident, createAccessEvent, t, handleCloseSidebar],
  );
```

- [ ] **Step 2: Update onSave type in access-event-sidebar.tsx**

In `apps/web/src/features/residents/components/access-event-sidebar.tsx`, update the `onSave` type in the interface:

```tsx
  onSave: (data: {
    direction: Direction;
    accessMode: AccessMode;
    vehicleId?: string;
    notes: string;
  }) => Promise<void>;
```

- [ ] **Step 3: Add hook and toast to AccessEventForm**

In `apps/web/src/features/residents/components/access-event-form.tsx`:

**Update imports** — add `useCallback` and `useMemo` to the React import, add hook, toast:

```tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useFormPersistence } from "@/shared/hooks/use-form-persistence";
```

(`useTranslations` is already imported.)

**Update `AccessEventFormProps`** — change `onSave` return type:

```tsx
interface AccessEventFormProps {
  vehicles?: Vehicle[];
  isLoadingVehicles?: boolean;
  onSave: (data: AccessEventFormData) => Promise<void>;
  onCancel: () => void;
  onAddVehicle?: () => void;
  isSaving: boolean;
}
```

**Add the hook** — after the `useState` calls (after line 54), add:

```tsx
  const tCommon = useTranslations("common");

  const composedData = useMemo(
    () => ({ direction, accessMode, vehicleId, notes }),
    [direction, accessMode, vehicleId, notes],
  );

  const { wasRestored, discardDraft, clearDraft } = useFormPersistence(
    "access-event-create",
    composedData,
    {
      onRestore: (draft) => {
        setDirection(draft.direction ?? "entry");
        setAccessMode(draft.accessMode ?? "vehicle");
        setVehicleId(draft.vehicleId ?? "");
        setNotes(draft.notes ?? "");
      },
    },
  );

  useEffect(() => {
    if (wasRestored) {
      toast.info(tCommon("draftRestored", { time: "" }), {
        action: {
          label: tCommon("discardDraft"),
          onClick: () => discardDraft(),
        },
      });
    }
  }, [wasRestored, tCommon, discardDraft]);
```

**Update `handleSubmit`** — make it async, await `onSave`, clear on success:

```tsx
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave({
        direction,
        accessMode,
        vehicleId: accessMode === "vehicle" ? vehicleId : undefined,
        notes,
      });
      clearDraft();
    } catch {
      // Save failed — keep draft for recovery
    }
  };
```

**Wrap `onCancel`** — update the Cancel button:

Change:
```tsx
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
```
to:
```tsx
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            discardDraft();
            onCancel();
          }}
          disabled={isSaving}
        >
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck --filter @ramcar/web`
Expected: PASS

- [ ] **Step 5: Run all web tests**

Run: `cd apps/web && pnpm vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/residents/components/access-event-form.tsx \
       apps/web/src/features/residents/components/access-event-sidebar.tsx \
       apps/web/src/features/residents/components/residents-page-client.tsx
git commit -m "feat: integrate form draft persistence into access event form"
```
