# Phase 1 Data Model — Prominent Success/Error Feedback For Access Log Recording

**Spec**: [./spec.md](./spec.md) | **Plan**: [./plan.md](./plan.md) | **Research**: [./research.md](./research.md) | **Date**: 2026-04-29

## Persisted entities

**None.** This feature does not introduce or modify any persisted entity.

- No PostgreSQL table is added or altered.
- No Supabase RLS policy is added or altered.
- No NestJS DTO is added or altered.
- No Supabase Storage bucket is added or altered.
- No desktop SQLite table is added or altered.
- No outbox column is added or altered.

The `access_events` row that is created when the user submits the form is created by the **existing** `useCreateAccessEvent()` mutation against the **existing** NestJS endpoint. This feature only changes how the resolution of that mutation is rendered to the user.

The spec's "Key Entities" section confirms this: *"This feature does NOT introduce or modify a persisted entity. The acknowledgment is a transient UI state attached to the resolution of the existing access-event-create flow."*

## Ephemeral state shapes (UI-only, in-memory)

These types live in `packages/features/src/access-event-feedback/types.ts` and govern the controller hook's state machine. They are not Zod schemas (no external input crosses a boundary), but they are exact TypeScript types that the component and hook contract on.

### `AccessEventFeedbackPayload`

Identifies the access event that just resolved (or is being retried). Used to render the success description (FR-003) and to preserve identity content across retries on error.

```ts
import type { Direction, AccessMode } from "@ramcar/shared";

/**
 * Identity content rendered inside the centered overlay.
 * - personName comes from the surface (selected resident, visit person, provider).
 * - direction and accessMode are the form-submitted values; the overlay resolves
 *   their localized labels through the i18n adapter at render time.
 */
export interface AccessEventFeedbackPayload {
  personName: string;
  direction: Direction;
  accessMode: AccessMode;
}
```

### `AccessEventFeedbackState`

Discriminated union representing the controller hook's state. Exactly one branch is active at any time (FR-012 — no stacking).

```ts
export type AccessEventFeedbackState =
  | { kind: "idle" }
  | {
      kind: "success";
      payload: AccessEventFeedbackPayload;
      /**
       * Wall-clock ms timestamp at which the auto-dismiss timer fires.
       * Used by tests; not user-visible.
       */
      autoDismissAt: number;
    }
  | {
      kind: "error";
      payload: AccessEventFeedbackPayload;
      /**
       * Plain-language failure reason. Falls back to
       * accessEvents.feedback.errorFallbackReason when the mutation
       * does not surface a human-readable reason.
       */
      reason: string;
      /**
       * Closure that re-runs the original submission. Stored verbatim
       * from the show() call so retry preserves all context.
       */
      retryFn: () => Promise<unknown>;
    };
```

**State transitions** (recap from research.md, Decision 3):

| From | Event | To | Side effects |
|------|-------|-----|--------------|
| `idle` | `show(submit, payload)` resolves successfully | `success` | start auto-dismiss timer (≈ 2000 ms) |
| `idle` | `show(submit, payload)` rejects | `error` | (no timer) |
| `success` | auto-dismiss timer fires | `idle` | (timer cleared by definition) |
| `success` | `dismiss()` (Esc / click-outside / dismiss control / new submission) | `idle` | clear auto-dismiss timer |
| `success` | new `show(submit, payload)` resolves | `success` (replaced) | clear prior timer; start new timer with new payload |
| `success` | new `show(submit, payload)` rejects | `error` (replaced) | clear prior timer |
| `error` | `dismiss()` | `idle` | none |
| `error` | `retry()` resolves successfully | `success` | start auto-dismiss timer |
| `error` | `retry()` rejects | `error` (in-place update of `reason`) | none |
| `error` | new `show(submit, payload)` from the surface (rare; e.g., user closed and reopened the form) | `success` or `error` accordingly | none beyond the standard transition |

The state machine is closed: every event from every state has a defined target. The implementation enforces it with a discriminated-union `switch`; the test suite (research.md, Decision 8) covers each transition explicitly.

### `AccessEventFeedbackController`

The return shape of `useAccessEventFeedback()`. Every consumer of the hook contracts on this surface.

```ts
export interface AccessEventFeedbackController {
  /** Current state of the overlay. The component branches on `state.kind`. */
  state: AccessEventFeedbackState;

  /**
   * Run a submission and surface its outcome.
   *
   * @param submit - thunk that performs the mutation (returns a promise).
   * @param payload - identity content to display alongside the outcome.
   *
   * On success: transition to { kind: "success", payload, autoDismissAt }.
   * On rejection: transition to { kind: "error", payload, reason, retryFn },
   *   where retryFn === () => show(submit, payload) so the user-visible retry
   *   reuses the same closure.
   *
   * If the controller is currently in `success` or `error` state, the new
   * outcome replaces the prior (no stacking — FR-012).
   */
  show(submit: () => Promise<unknown>, payload: AccessEventFeedbackPayload): void;

  /**
   * Manually close the overlay. Returns the controller to `idle`.
   * No-op when `state.kind === "idle"`.
   *
   * Wired into Radix Dialog's onOpenChange (Esc / click-outside / dismiss button).
   */
  dismiss(): void;

  /**
   * Re-run the most recent failed submission. No-op unless `state.kind === "error"`.
   * The promise resolves into the next outcome (handled by the controller).
   */
  retry(): void;
}
```

### `<AccessEventFeedbackOverlay />` props

The render surface. It reads `state` from the controller and emits the centered card.

```ts
export interface AccessEventFeedbackOverlayProps {
  /** The controller returned by useAccessEventFeedback(). */
  controller: AccessEventFeedbackController;
}
```

The overlay does not accept any string props — all user-facing text comes from `useI18n()` inside the component (FR-013). It also does not accept a className override or theming prop in this iteration; the visual language is fixed (per FR-011 the success/error tokens are the platform's existing palette and are not consumer-tunable).

## Validation rules

There is no external input. The controller's contract is enforced by TypeScript (discriminated unions + strict mode). No Zod is required.

## Concurrency model

- **Single state slot per controller instance** — replace-not-stack policy (FR-012).
- **One controller per host surface** — each call site (`<VisitorsView />`, each `*-page-client.tsx`) owns its own controller via `useAccessEventFeedback()`. There is no shared global slot, so two different surfaces in the same app cannot collide. (In practice only one such surface is ever interactive at a time per app, but the architecture does not assume this.)
- **Timer ownership** — the controller's auto-dismiss timer is a `useRef<ReturnType<typeof setTimeout> | null>`, cleared on every transition out of `success` (whether by dismiss, by replacement, or by the timer firing). A `useEffect` cleanup clears it on unmount.

## Persistence boundaries

The overlay state is intentionally non-persistent:

- **Not in `localStorage`** — the user closing the booth window or refreshing the web tab should NOT replay an old success acknowledgment.
- **Not in Zustand (`@ramcar/store`)** — there is no need for cross-surface communication; each host owns its instance.
- **Not in TanStack Query cache** — the cache holds the access-event resource list (which is invalidated by the existing mutation's `onSuccess`); the overlay is not a queryable resource.

## Migration impact

Zero. No data migration is required. No backfill. No feature flag. The change is a drop-in replacement of the resolution renderer at each call site. Once the per-call-site change is merged, all subsequent access-event creations use the new overlay; there is no transitional state where some users see the overlay and others see the corner toast.
