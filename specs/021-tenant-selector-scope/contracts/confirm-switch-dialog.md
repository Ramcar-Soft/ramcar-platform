# Contract — `<ConfirmSwitchDialog />` UI

**Feature**: 021-tenant-selector-scope
**Location**: `packages/features/src/tenant-selector/components/confirm-switch-dialog.tsx` (new file, cross-app).

This contract pins the component API, the copy rules, the a11y behavior, and the interaction rules so web and desktop render the same dialog and QA has a single check-list.

---

## Component API

```tsx
type ConfirmSwitchDialogProps = {
  open: boolean;
  sourceTenantName: string;     // non-empty — the currently active tenant
  targetTenantName: string;     // non-empty — the tenant the user picked
  hasUnsavedChanges: boolean;   // drives the additional warning line (FR-019)
  onCancel: () => void;         // closes dialog AND reverts selector visual state
  onConfirm: () => void;        // closes dialog, calls setActiveTenant, triggers cache refresh
};
```

- The dialog is **controlled** — `open` is driven by `useTenantSwitch`, which the selector calls.
- The dialog never closes itself on its own; `onCancel` or `onConfirm` MUST be called.
- `onConfirm` is the only code path that mutates `authSlice.activeTenantId`. The selector's visual state reverts on `onCancel` without any store write (FR-017).

---

## Copy rules

All strings live in `@ramcar/i18n` under `tenantSelector.confirm.*`. Supported locales: `en`, `es`.

| Key | en | es |
|---|---|---|
| `tenantSelector.confirm.title` | `Switch community?` | `¿Cambiar comunidad?` |
| `tenantSelector.confirm.body` | `You're about to switch from {source} to {target}. All lists, searches, and new records will target {target} until you switch again.` | `Estás a punto de cambiar de {source} a {target}. Todas las listas, búsquedas y nuevos registros se aplicarán a {target} hasta que cambies de nuevo.` |
| `tenantSelector.confirm.unsavedWarning` | `You have unsaved changes that will be discarded.` | `Tienes cambios sin guardar que se perderán.` |
| `tenantSelector.confirm.cancel` | `Cancel` | `Cancelar` |
| `tenantSelector.confirm.confirm` | `Switch to {target}` | `Cambiar a {target}` |
| `tenantSelector.confirm.revokedToast` | `Your access to {previous} was updated. Switched to {current}.` | `Tu acceso a {previous} fue actualizado. Cambiado a {current}.` |

Placeholders use next-intl's ICU-style `{token}` syntax on web; react-i18next interpolation on desktop (same token names).

---

## Layout (behavioral contract, not a design pixel spec)

```
+--------------------------------------------------------+
|  Switch community?                                  X  |  ← DialogTitle (X = close = Cancel)
+--------------------------------------------------------+
|                                                        |
|  You're about to switch from <source> to <target>.     |  ← DialogDescription
|  All lists, searches, and new records will target      |
|  <target> until you switch again.                      |
|                                                        |
|  ⚠ You have unsaved changes that will be discarded.    |  ← conditional on hasUnsavedChanges
|                                                        |
+--------------------------------------------------------+
|                        [ Cancel ] [ Switch to <target> ] |  ← DialogFooter
+--------------------------------------------------------+
```

- Built from `@ramcar/ui` primitives: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `Button`.
- Width: `sm:max-w-md` (centered) — distinct from the 800px Sheet used by catalog forms. A confirmation is not a form.
- The unsaved-warning line, when shown, uses the existing destructive text style (`text-destructive` Tailwind token).

---

## Interaction rules

1. **Opening**: `useTenantSwitch.onSelect(targetId)` opens the dialog, passing `source = authSlice.activeTenantName`, `target = selectedTenant.name`, `hasUnsavedChanges = unsavedChangesPort.hasUnsavedChanges()`.
2. **Cancel paths** (all must behave identically — FR-017):
   - Click "Cancel" button.
   - Press Escape.
   - Click the dialog overlay.
   - Click the close (X) button.
   Effect: dialog closes, selector visual state returns to the current `activeTenantName`, no store writes, no network requests.
3. **Confirm path**:
   - Click "Switch to {target}".
   - Press Enter while the Confirm button has focus (default focus — see a11y).
   Effect (in order, within the same tick):
   1. `queryClient.cancelQueries()` — aborts in-flight reads.
   2. `authSlice.setActiveTenant(targetId, targetName)` — triggers queryKey change.
   3. Dialog closes.
   4. Toast shows only if the flow originated from a revoked-tenant recovery (R5), NOT on normal user-initiated switches.
4. **Single-tenant users**: the selector is not interactive; the dialog never opens. If `useTenantSwitch` is called with `targetId === activeTenantId`, it no-ops.
5. **Re-entrancy**: if the user double-clicks the confirm button, the second click is ignored (`onConfirm` is debounced inside `useTenantSwitch`).

---

## Accessibility

- `role="dialog"` with `aria-modal="true"` (provided by Radix `Dialog`).
- `aria-labelledby` points to `DialogTitle`; `aria-describedby` points to `DialogDescription`.
- Initial focus lands on the Cancel button — a safe default for destructive actions per WCAG 3.2.5 and matches the project's existing confirmation patterns.
- Focus is restored to the tenant-selector trigger on close.
- Escape closes the dialog (Radix default) and maps to `onCancel`.
- Color is not the only affordance for the unsaved-warning line: the `⚠` icon (or equivalent `lucide-react AlertTriangle`) is rendered alongside the text.

---

## Analytics / telemetry

The `useTenantSwitch` hook SHOULD emit (via the existing analytics adapter, if present; otherwise a no-op):

- `tenant_switch.opened` — on dialog open. Payload: `{ from, to, hasUnsavedChanges }`.
- `tenant_switch.cancelled` — on cancel path.
- `tenant_switch.confirmed` — on confirm path.
- `tenant_switch.recovered` — when invoked by the revoked-tenant recovery.

Each event carries `from` and `to` as tenant UUIDs (low-sensitivity, already in logs).

---

## Out of scope for this contract

- Step-up auth (password, 2FA) — explicitly rejected by the spec's Assumptions ("not a high-ceremony step-up action").
- A "Don't ask again" checkbox — explicitly not allowed; FR-015 makes the confirmation unconditional.
- Bitacora's in-page dropdown — that is a `<Select>` in `apps/web/src/features/logbook/components/tenant-select.tsx`, not a dialog. This contract does not govern it.
