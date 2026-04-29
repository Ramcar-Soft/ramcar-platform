# Contract — `@ramcar/features/access-event-feedback`

**Spec**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md) | **Date**: 2026-04-29

This feature exposes **no HTTP API**. The "contracts" surface here is the **TypeScript / React API** of the new shared module — what each consumer app commits to import and call. It is the public boundary that `pnpm check:shared-features` (FR-008 / SC-008) audits and that consuming PRs must not bypass.

## Public exports

The package `@ramcar/features` re-exports the new module either at the package root (`@ramcar/features`) or at the subpath `@ramcar/features/access-event-feedback` — final choice during implementation. The exported names below are the contract:

```ts
export { useAccessEventFeedback } from "./hooks/use-access-event-feedback";
export { AccessEventFeedbackOverlay } from "./components/access-event-feedback-overlay";
export type {
  AccessEventFeedbackPayload,
  AccessEventFeedbackState,
  AccessEventFeedbackController,
  AccessEventFeedbackOverlayProps,
} from "./types";
```

No other internal helpers, constants, or sub-components are exported. The closed surface is intentional — adopters compose only through the documented hook + component.

## Hook: `useAccessEventFeedback()`

### Signature

```ts
function useAccessEventFeedback(): AccessEventFeedbackController;
```

### Behavior

- Returns a stable controller object across renders. `controller.show`, `controller.dismiss`, `controller.retry` are stable function identities (memoized inside the hook); `controller.state` updates as the state machine advances.
- Internally manages:
  - the `AccessEventFeedbackState` discriminated union,
  - the auto-dismiss `setTimeout` handle (only created in the `success` branch),
  - the `retryFn` closure (captured from the most recent `show(...)` call).
- Cleans up timers on unmount.

### Invariants the hook MUST satisfy

| # | Invariant | Maps to |
|---|-----------|---------|
| H-1 | `controller.state.kind === "idle"` on initial render. | FR-012 |
| H-2 | A `show(submit, payload)` call that resolves transitions to `success` and starts exactly one auto-dismiss timer. | FR-001, FR-005 |
| H-3 | A `show(submit, payload)` call that rejects transitions to `error` and starts NO timer. | FR-002, FR-006 |
| H-4 | A new `show(...)` while in `success` cancels the prior timer and replaces the state (no stacking). | FR-012 |
| H-5 | `dismiss()` while in `success` cancels the prior timer and returns to `idle`. | FR-005 |
| H-6 | `dismiss()` while in `error` returns to `idle`; no timer is involved. | FR-006 |
| H-7 | `retry()` while in `error` re-invokes the captured submit closure with the original payload (the user does not re-enter form data). | FR-002 acceptance #2 |
| H-8 | `retry()` while in `success` or `idle` is a no-op. | FR-012 |
| H-9 | Component unmount clears any pending auto-dismiss timer (no leaked timer). | SC-011 |

## Component: `<AccessEventFeedbackOverlay />`

### Signature

```ts
function AccessEventFeedbackOverlay(props: AccessEventFeedbackOverlayProps): ReactElement | null;
```

### Behavior

- Renders `null` when `props.controller.state.kind === "idle"`.
- Renders a Radix `Dialog` (open) when the state is `success` or `error`.
  - `DialogOverlay` — dim scrim with fade animation. Backdrop click → `controller.dismiss()`.
  - `DialogContent` — centered card with the success or error variant.
  - `DialogTitle` and `DialogDescription` — populated from i18n.
  - On `success`: a polite live region (`role="status"`) wraps the announcement string from `accessEvents.feedback.successAriaAnnouncement`. Auto-dismiss is governed by the controller; the component does NOT own the timer.
  - On `error`: an assertive live region (`role="alert"`) wraps the announcement string from `accessEvents.feedback.errorAriaAnnouncement`. Two action buttons: **Retry** (calls `controller.retry()`) and **Dismiss** (calls `controller.dismiss()`).
- All animation classes carry `motion-reduce:` modifiers so `prefers-reduced-motion: reduce` collapses scale/translate to identity (FR-004, SC-006).
- The `onOpenChange` of the Radix Dialog is bound such that any `false` (Esc, click-outside, ✕) resolves to `controller.dismiss()`.
- Focus is automatically trapped while open (Radix default) and restored to the originating control on close (Radix default — FR-010).

### Invariants the component MUST satisfy

| # | Invariant | Maps to |
|---|-----------|---------|
| C-1 | Centered, viewport-anchored placement (no surface layout shift — overlay portals to `document.body`). | FR-001, SC-009 |
| C-2 | Success variant shows a success icon (`lucide-react CheckCircle2`), title from `accessEvents.feedback.successTitle`, description from `accessEvents.feedback.successDescription` with `personName`, localized `direction`, localized `accessMode`. | FR-003 |
| C-3 | Error variant shows an error icon (`lucide-react AlertTriangle`), title from `accessEvents.feedback.errorTitle`, description from the controller's `state.reason` (or fallback). | FR-002 |
| C-4 | The error variant exposes a Retry button labeled `accessEvents.feedback.retry` and a Dismiss button labeled `accessEvents.feedback.dismiss`. | FR-002 |
| C-5 | Long content (≥ 50-char `personName`) wraps inside the card without breaking layout or pushing dismiss out of view. | FR-015 |
| C-6 | Light + dark themes pass WCAG AA color-contrast on icon, title, description, retry button, dismiss button, scrim. | FR-011, SC-012 |
| C-7 | All user-facing strings are read via `useI18n()` from `@ramcar/i18n`; no inline string literals in the component. | FR-013, SC-010 |

## i18n contract — `@ramcar/i18n` keys added by this feature

These keys MUST exist in `packages/i18n/src/messages/en.json` and `packages/i18n/src/messages/es.json`. They MUST NOT exist in any `apps/*/messages/*.json` (SC-010 grep enforces).

| Key | Required parameters |
|-----|---------------------|
| `accessEvents.feedback.successTitle` | none |
| `accessEvents.feedback.successDescription` | `personName: string`, `direction: string` (already-localized), `accessMode: string` (already-localized) |
| `accessEvents.feedback.successAriaAnnouncement` | same as above |
| `accessEvents.feedback.errorTitle` | none |
| `accessEvents.feedback.errorDescription` | `reason: string` |
| `accessEvents.feedback.errorFallbackReason` | none |
| `accessEvents.feedback.errorAriaAnnouncement` | `reason: string` |
| `accessEvents.feedback.retry` | none |
| `accessEvents.feedback.dismiss` | none |

Wording proposals are documented in `research.md` Decision 7. Final wording is content-design-pass material.

## `shared-features.json` contract

After this feature ships, `shared-features.json` MUST gain a new entry under `sharedPrimitives`:

```json
{
  "name": "access-event-feedback",
  "package": "@ramcar/features/access-event-feedback",
  "addedAt": "2026-04-29",
  "notes": "Spec 023. Centered, animated success/error overlay for access-event creation. Replaces corner Sonner toast at all 7 access-event-create call sites. No next/*, no \"use client\", no window.electron — uses i18n adapter and Radix Dialog primitives from @ramcar/ui."
}
```

`pnpm check:shared-features` MUST continue to pass after the registration is added.

## Consumer contract — what each call site MUST do

Each of the 7 call sites listed in `plan.md` MUST:

1. Call `const feedback = useAccessEventFeedback();` once in the component body.
2. Replace its existing access-event submit handler so that it routes through `feedback.show(thunk, payload)` (where `thunk` performs the existing `mutateAsync` call and `payload` carries `personName`, `direction`, `accessMode`).
3. Render `<AccessEventFeedbackOverlay controller={feedback} />` inside its top-level JSX (alongside the existing `<...Sidebar />` mount).
4. Remove the specific access-event-create `toast.success(...)` and/or `toast.error(...)` lines listed in `research.md` Decision 6.
5. NOT introduce its own per-app duplicate of the overlay or hook (FR-008 / SC-008).

## Negative contracts (what consumers MUST NOT do)

- MUST NOT import any internal symbol from `packages/features/src/access-event-feedback/` other than the exports in the public surface above.
- MUST NOT add any `accessEvents.feedback.*` key to per-app message files.
- MUST NOT keep both the overlay AND the corresponding `accessEvents.messages.created` / `accessEvents.messages.errorCreating` corner toast (FR-009, SC-003).
- MUST NOT pass overrideable className / wording / duration props through the overlay component (no extension surface in this iteration; future-spec decision).

## Backwards compatibility

- The keys `accessEvents.messages.created` and `accessEvents.messages.errorCreating` remain in `@ramcar/i18n` (research.md Decision 7) so any non-enumerated caller continues to work. They are simply no longer fired at the migrated call sites.
- The existing `useCreateAccessEvent` hook signature is unchanged — adopters of this feature do not pay a migration cost in their data-fetching layer.
