# Slot Prop Conventions

**Scope**: `@ramcar/features` shared components.
**Purpose**: Document the vocabulary for typed UI extension points (FR-007, spec clarification Q3).

## Canonical slot names

Every shared component that accepts slot props MUST use one of the names below. Introducing a new slot name requires updating this document.

| Slot name | Type | Default | Typical position | Typical use |
|---|---|---|---|---|
| `topRightSlot` | `React.ReactNode` | `undefined` | Right edge of the component's header/toolbar | Desktop: sync/offline badge. Web: "Export CSV" button. |
| `trailingAction` | `React.ReactNode` | `undefined` | Right edge of each row/card (list-type components) | Web: admin-only "Re-assign" action. |
| `afterFields` | `React.ReactNode` | `undefined` | Below the last form field, above the submit/cancel bar | Web: `useFormPersistence` restored-draft banner. |
| `emptyState` | `React.ReactNode` | Built-in empty state | When a table/list has no rows | App-specific illustration or CTA. |
| `headerSlot` | `React.ReactNode` | `undefined` | Above the main content section | Platform banner (offline/read-only). |

## Rules

1. **Slots are for UI injection**. Behavior hooks (drafts, persistence, keyboard shortcuts) use typed callback props, not slots.
2. **Cross-cutting concerns flow through adapters**, not slots: i18n, data transport, role/tenant. If you find yourself threading a `t` or an `apiClient` through a slot prop, stop — use the appropriate adapter instead.
3. **Every shared component documents its slots in TSDoc**. The TSDoc for each slot MUST answer: (a) where it renders, (b) what consumers typically put there, (c) which host apps use it today.
4. **Unused slots default to `undefined` / no render**. A shared component MUST render correctly when every slot is absent.
5. **Host content is rendered by the host** — it may freely call its own hooks (role, session, next/navigation, window.electron). The shared module does not see, call, or depend on anything inside a slot.
6. **A slot is NOT a replacement for composition**. If an entire section (e.g., a custom form field) differs between hosts beyond a prop, extract a subcomponent into the shared module and expose props for its data dependencies.

## Example TSDoc for a shared component

```tsx
interface VisitPersonFormProps {
  /**
   * Rendered below the last form field, above the submit/cancel bar.
   *
   * - apps/web injects the `useFormPersistence` restored-draft banner here.
   * - apps/desktop leaves this undefined.
   */
  afterFields?: React.ReactNode;

  /**
   * Called whenever the form's internal draft changes.
   *
   * - apps/web wires this to `useFormPersistence(...).setDraft`.
   * - apps/desktop does not supply this.
   */
  onDraftChange?: (draft: VisitPersonDraft) => void;

  /**
   * Initial draft to restore on mount.
   *
   * - apps/web passes the restored draft from `useFormPersistence`.
   * - apps/desktop leaves this undefined.
   */
  initialDraft?: VisitPersonDraft;
}
```

## Adding a new slot

1. Justify the need — is the divergence actually UI (slot) or actually behavior (callback)?
2. Pick a name from this table, or propose a new one with a PR that updates this file.
3. Add the slot to the component with TSDoc (who injects, where it renders, what it contains).
4. If the slot touches content that existed in a host app before migration, ensure the host app continues to inject it after the migration so the user-visible behavior is preserved.
