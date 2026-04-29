# Phase 0 Research — Prominent Success/Error Feedback For Access Log Recording

**Spec**: [./spec.md](./spec.md) | **Plan**: [./plan.md](./plan.md) | **Date**: 2026-04-29

The Technical Context in `plan.md` had no `NEEDS CLARIFICATION` markers — the spec already pinned the user-facing behavior, the constitutional gates resolve cleanly, and the call sites are enumerated. The decisions below are the **architectural** choices that the plan defers to research: where the primitive lives, what it builds on, how its lifecycle hooks into the existing mutation flow, and how the no-stacking / no-duplicate-toast invariants are enforced. Each item documents what was chosen, why, and what was rejected.

---

## Decision 1 — Shared module placement

**Decision**: Place the primitive in `packages/features/src/access-event-feedback/`, exported via `@ramcar/features` (subpath: `@ramcar/features/access-event-feedback`).

**Rationale**:
- The component needs to read user-facing strings (`accessEvents.feedback.*`) from `@ramcar/i18n` through the platform's `useI18n()` port. That port is currently defined in `packages/features/src/adapters/i18n.tsx` and is the only adapter that bridges `next-intl` (web) and `react-i18next` (desktop) without per-app forking. A primitive that uses the adapter must live downstream of the adapter — i.e., in `packages/features` (or a package that depends on it). `packages/ui` is upstream of `packages/features` (it ships shadcn primitives consumed by the features layer), so placing this work there would invert the dependency.
- The primitive is **composed** from existing shadcn primitives (`Dialog`, `DialogPortal`, `DialogOverlay`, `DialogContent`, `DialogTitle`, `DialogDescription`, `Button`) — it is not itself a new shadcn primitive. shadcn primitives are intentionally minimal Radix wrappers; an opinionated success/error overlay with mutation-lifecycle state, retry closure, auto-dismiss, and replace-policy is one layer up the stack.
- Precedent: `tenant-selector` (spec 020/021) is a similarly small cross-app composed component (Popover + Command) that uses the i18n adapter and an injected transport — it lives in `packages/features/src/tenant-selector/`. The same shape applies here.

**Alternatives considered**:
1. **`packages/ui/src/components/ui/access-event-feedback.tsx`** — rejected: would force string keys to be passed in via props by every caller (since `@ramcar/ui` cannot import `@ramcar/features`), reintroducing the per-app string duplication that FR-013 forbids. Also breaks the convention that `@ramcar/ui` ships unopinionated primitives.
2. **A brand-new `packages/access-event-feedback` workspace package** — rejected: spec 014 explicitly directs cross-app shared modules into `packages/features`. Creating a parallel single-purpose package adds workspace overhead with no offsetting benefit.
3. **In-app implementation in each consumer** — rejected: violates FR-008 and would fail `pnpm check:shared-features`.

**`shared-features.json` placement**: register under `sharedPrimitives` (not `features`). The `features` entries (e.g., `visitors`, `tenant-selector`) are full domain views with their own routing surface; `access-event-feedback` is a primitive consumed inside other features' submit flows, which matches the intent of the existing `sharedPrimitives` array (`vehicle-brand-model`, `vehicle-brand-logos`).

---

## Decision 2 — UI foundation (Radix Dialog wrapper, not custom portal)

**Decision**: Build the overlay as a controlled wrapper over `Dialog` / `DialogPortal` / `DialogOverlay` / `DialogContent` / `DialogTitle` / `DialogDescription` from `@ramcar/ui`. The component renders only when `state !== "idle"` and stays open while it has an outcome to show.

**Rationale**:
- Radix `Dialog` ships every accessibility behavior the spec requires:
  - **Focus trap** while open + automatic focus restore to the originating trigger on close (FR-010).
  - **Esc-to-close** and **click-outside-to-close** wired by default — bound to our `onOpenChange` for both success (manual override of auto-dismiss) and error (only path to close).
  - **`role="dialog"` + `aria-modal="true"`** + correct `aria-labelledby` / `aria-describedby` wiring through `DialogTitle` / `DialogDescription`.
  - **`Esc`** keyboard dismissal honored.
- The package's existing `DialogContent` uses the identical `tw-animate-css` classes our spec needs (`data-[state=open]:animate-in zoom-in-95 fade-in-0`, `data-[state=closed]:animate-out zoom-out-95 fade-out-0`), so the centered + scaled + faded entry/exit animation is already the default behavior — we keep it.
- The default centered placement (`fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]`) matches FR-001 ("centered, viewport-anchored") with no positional override needed.
- The existing dim scrim (`DialogOverlay` is `bg-black/50` with fade-in/out) satisfies A11 ("subtle scrim, non-blocking — backdrop click counts as dismiss"). For success we keep the default backdrop click → dismiss; for error we still allow it (per FR-006 the policy is "no auto-dismiss," not "no manual dismiss") — backdrop click counts as the explicit dismiss action.

**Alternatives considered**:
1. **Sonner's `toast.custom` with positional override** — rejected: Sonner is engineered for stack-of-corner toasts; coercing it into a centered, animation-rich, single-instance, non-stacking overlay fights the library. Also the spec is explicit that the corner Sonner notification is what we are replacing, not extending.
2. **Custom `<Portal>` + custom focus trap** — rejected: re-derives behavior we already get from Radix Dialog (focus trap, body scroll lock, accessible labelling), which is an audited industry-standard implementation.
3. **shadcn `AlertDialog`** — rejected: `AlertDialog` is designed for destructive confirmations (forces an action button, traps focus into the action). Our success path does not require interaction (auto-dismisses), and the visual language (centered card with icon + text) is closer to `Dialog` than `AlertDialog`.

---

## Decision 3 — Controller hook lifecycle and retry closure

**Decision**: Provide a single controller hook `useAccessEventFeedback()` that returns `{ state, show, dismiss, retry }` and stays alongside the host's existing `useCreateAccessEvent()` mutation. The hook captures the most recent submission's mutate function reference and payload in a ref so `retry()` can re-invoke them without the call site reproducing the wiring.

**State machine**:

```
idle → success({ payload, autoDismissAt }) → idle           (auto-dismiss after ~2s OR Esc/click/dismiss)
idle → error({ payload, message, retryFn })                 (only Esc/click/dismiss/retry leaves this state)
success → success | error                                   (a new outcome replaces — no stacking)
error → success | error                                     (retry resolves into the next outcome in place)
```

**Hook contract** (consumer's view):

```ts
const feedback = useAccessEventFeedback();

const handleSave = useCallback(
  async (formData) => {
    if (!person) return;
    feedback.show(
      () =>
        createAccessEvent.mutateAsync({
          personType: "visitor",
          visitPersonId: person.id,
          ...formData,
          source: "web",
        }),
      {
        personName: person.fullName,
        direction: formData.direction,
        accessMode: formData.accessMode,
      },
    );
  },
  [person, createAccessEvent, feedback],
);
```

**Why this shape**:
- **`show(submit, payload)`** — accepts a thunk that performs the mutation (so the same wiring works whether the consumer calls `mutateAsync` directly or routes through a host-injected transport on desktop, per spec A4/A9). The thunk is captured in a ref so `retry()` re-invokes it with the same closure.
- **The `payload` describes what to display on success** (person name + direction + access mode — FR-003). It is decoupled from the submit thunk: the same payload renders on success, and is preserved across retries on error so the user sees the same identity content if retry succeeds.
- **No state ever leaves the hook on `unmount`**: the controller cleans up its auto-dismiss timer in a `useEffect` cleanup, and Radix Dialog handles focus-trap teardown. SC-011 is enforced by a Vitest assertion on a 10× open/close loop.

**Alternatives considered**:
1. **Pass the mutation result directly** (the consumer's TanStack Query `onSuccess` / `onError` handlers each call `feedback.success(...)` or `feedback.error(...)`). This is simpler at first but requires the consumer to write the retry plumbing themselves at every site, duplicating logic. The thunk-capturing form pushes that into the hook once.
2. **Render the overlay from a global app-shell provider** (one mount per app, with a context-published `show()` API). Rejected for now: the immediate need is at most 2 surfaces per app, and a per-call-site mount is closer to the existing `<VisitPersonSidebar />` pattern. We can promote to a global provider in a follow-up if more surfaces adopt the primitive.

---

## Decision 4 — Replace-not-stack policy

**Decision**: At most one acknowledgment is on screen. A new `show()` while a prior outcome is visible (a) cancels the prior auto-dismiss timer, (b) updates the underlying state to the new payload, and (c) lets Radix's `data-[state=open]` transition handle the visual handoff (the `DialogContent` does not unmount mid-update, so the new icon/title/description fade-cross-replace within the existing card).

**Rationale**:
- FR-012 forbids stacking. The simplest enforcement is a single state slot, not a queue. If a new outcome arrives 100 ms after a prior one (e.g., the guard double-tapped Save and both resolved), the user sees the second outcome — which is the correct behavior because that is what was last persisted.
- The Radix Dialog stays mounted across the update; only the inner success-vs-error visual swaps. This avoids a flicker between two `DialogContent` mounts and keeps the focus trap continuous.

**Alternatives considered**:
1. **Queue of pending outcomes** — rejected: introduces ordering decisions (FIFO? newest wins?) for a corner case that the user has explicitly said to avoid.
2. **Block new submissions while an overlay is on screen** — rejected: the spec's edge case "Concurrent submission while overlay is on screen" notes that on success the underlying form is closed/reset — so a same-surface double-submit-in-flight is not a realistic path. We do not need to block at the primitive level; the surface already prevents it by closing the form on `mutate.onSuccess`.

---

## Decision 5 — Auto-dismiss timing and reduced-motion handling

**Decision**:
- **Success auto-dismiss**: ≈ 2000 ms display, then ≈ 200 ms exit animation (Radix `DialogContent` `data-[state=closed]` duration is 200 ms). Total wall-clock until the overlay is unmounted ≤ 2200 ms — comfortably inside SC-004's 3 s budget.
- **Error**: no auto-dismiss timer is ever created. The controller hook does not call `setTimeout` on the error branch.
- **Reduced motion**: the overlay component applies the `motion-reduce:` Tailwind modifiers to its animation classes (e.g., `animate-in zoom-in-95 fade-in-0 motion-reduce:zoom-in-100 motion-reduce:fade-in-100 motion-reduce:transition-none` — and the same for `animate-out`). Under `(prefers-reduced-motion: reduce)`, the OS-honored modifier collapses scale and translate to identity and removes the transition, satisfying FR-004 and SC-006.

**Rationale**:
- 2 s is the spec's target (A3, ~2 s, tunable in 1.5–3 s). It is long enough to read three short tokens (name + direction + mode) at booth-glance distance without delaying the next entry.
- Errors that auto-dismissed would re-introduce the failure mode the spec is trying to remove ("guard looks away during the create"). Hardcoding "no timer on error" at the hook layer is the simplest enforcement.
- `tw-animate-css` already exposes the `motion-reduce:*` modifiers we need; we don't add a new dependency. Tailwind compiles `motion-reduce:` against the OS media query, so the runtime cost is zero.

**Alternatives considered**:
1. **Make the success duration a prop** — out of scope for this iteration. The spec gives a 1.5–3 s band; we ship 2 s (mid-band). If a tenant later argues for longer/shorter, it becomes a one-line change in the controller hook (and a follow-up spec if it diverges per surface).
2. **Use `framer-motion`** — rejected: adds a new dependency for what `tw-animate-css` (already installed) handles natively for the Sheet/Dialog primitives.
3. **JS-detect `matchMedia('(prefers-reduced-motion: reduce)')` and render a no-op-animation variant** — rejected: doubles the code path. Tailwind's `motion-reduce:` modifier is the idiomatic, single-source way to honor the preference.

---

## Decision 6 — Suppressing the existing corner toasts at migrated call sites

**Decision**: Each migrated call site removes only the access-event-create-outcome `toast.success(...)` / `toast.error(...)` lines listed in spec A6. Other Sonner calls in those files (visit-person create, visit-person update, image upload, forbidden, etc.) remain.

**Concrete edits** (per call site):

| File | Existing Sonner call to REMOVE | Sonner calls to KEEP (unrelated) |
|------|-------------------------------|----------------------------------|
| `packages/features/src/visitors/components/visitors-view.tsx` | `toast.success(t("accessEvents.messages.created"))` at line ~194 | `toast.success(t("visitPersons.messages.created"))` (line 155), `toast.error(t("visitPersons.messages.imageUploadFailed"))` (167), `toast.success(t("visitPersons.messages.updated"))` (207), `toast.error(t("visitPersons.messages.forbidden"))` (213), `toast.error(t("visitPersons.messages.errorUpdating"))` (215) |
| `packages/features/src/visitors/components/visit-person-access-event-form.tsx` | `toast.error(t("accessEvents.messages.errorCreating"))` at line ~123 (replace with re-throw / let controller hook handle the rejection) | n/a |
| `apps/desktop/src/features/residents/components/residents-page-client.tsx` | `toast.success(t("accessEvents.messages.created"))` (96), `toast.error(t("accessEvents.messages.errorCreating"))` (100) | n/a |
| `apps/desktop/src/features/providers/components/providers-page-client.tsx` | `toast.success(t("accessEvents.messages.created"))` (165) | `toast.success(t("providers.messages.created"))` (127), `toast.error(t("providers.messages.imageUploadFailed"))` (143), `toast.success(t("providers.messages.updated"))` (178), `toast.error(t("providers.messages.errorUpdating"))` (182) |
| `apps/web/src/features/residents/components/residents-page-client.tsx` | `toast.success(t("messages.created"))` (105) | n/a |
| `apps/web/src/features/residents/components/access-event-form.tsx` | `toast.error(t("messages.errorCreating"))` (~131) (replace with re-throw / let controller hook handle the rejection) | n/a |
| `apps/web/src/features/providers/components/providers-page-client.tsx` | `toast.success(t("messages.created"))` (174) | `toast.success(tProviders("messages.created"))` (130), `toast.error(tProviders("messages.imageUploadFailed"))` (146), `toast.success(tProviders("messages.updated"))` (187), `toast.error(tProviders("messages.errorUpdating"))` (191) |

**Forms vs page-clients**: the two `*-access-event-form.tsx` files (web and the shared visit-person form) currently call `toast.error` from inside their `try { onSave(...) } catch { toast.error(...) }` block. The migration removes the `toast.error` call but **keeps** the `try / catch` (so the form's submit button does not stay in a "submitting" state on rejection). The catch block instead lets the rejection propagate via re-throw — or, equivalently, the form's `onSave` prop now fires the controller hook's `show(thunk, payload)` from the page-client, so the form does not need to know about the overlay at all and can simply `await onSave(...)` then `clearDraft()`. The cleanest shape is: the form's `onSave` becomes a fire-and-forget that resolves immediately (for web's draft-clearing purposes), while the controller hook owns the user-visible error path.

**Rationale**:
- Spec A6 is exhaustive about which strings disappear and which remain. Following it literally avoids accidentally removing toasts for unrelated actions (visit-person create, image upload).
- Moving the error path from the form into the page-client (via the controller hook) prevents the form from re-implementing the overlay logic and keeps the existing `useFormPersistence` (web-only) branch intact — it still calls `clearDraft()` on resolve.

**Alternatives considered**:
1. **Leave the corner toast and stack it with the overlay** — rejected: explicitly forbidden by FR-009 and SC-003.
2. **Globally disable Sonner whenever the overlay is on screen** — rejected: would also suppress unrelated valid toasts (e.g., a visit-person `imageUploadFailed` that fires alongside an access-event success). Per-line removal is precise and auditable.

---

## Decision 7 — Cross-app i18n keys

**Decision**: Add a new `accessEvents.feedback` block to `packages/i18n/src/messages/en.json` and `es.json`. Existing keys (`accessEvents.messages.created`, `accessEvents.messages.errorCreating`) remain in the catalog — they are still used elsewhere (e.g., generic toast paths the spec did not enumerate) and removing them risks breaking unrelated surfaces.

**Proposed keys** (final wording is content-design-pass material, not architectural):

| Key | EN (proposed) | ES (proposed) |
|-----|---------------|---------------|
| `accessEvents.feedback.successTitle` | `Access recorded` | `Acceso registrado` |
| `accessEvents.feedback.successDescription` | `{personName} · {direction} · {accessMode}` | `{personName} · {direction} · {accessMode}` |
| `accessEvents.feedback.successAriaAnnouncement` | `Access event saved for {personName}, {direction}, {accessMode}.` | `Evento de acceso guardado para {personName}, {direction}, {accessMode}.` |
| `accessEvents.feedback.errorTitle` | `Couldn't record access` | `No se pudo registrar el acceso` |
| `accessEvents.feedback.errorDescription` | `{reason}` | `{reason}` |
| `accessEvents.feedback.errorFallbackReason` | `Please try again. If the problem continues, contact an administrator.` | `Inténtalo de nuevo. Si el problema persiste, contacta a un administrador.` |
| `accessEvents.feedback.errorAriaAnnouncement` | `Failed to record access event: {reason}` | `Error al registrar el evento de acceso: {reason}` |
| `accessEvents.feedback.retry` | `Retry` | `Reintentar` |
| `accessEvents.feedback.dismiss` | `Dismiss` | `Cerrar` |

**Rationale**:
- A single `accessEvents.feedback` namespace keeps the new keys discoverable and prevents collision with the existing `accessEvents.messages.*` (which we are not deleting).
- `{personName} · {direction} · {accessMode}` uses the existing locale's labels for `direction` (e.g., `accessEvents.direction.entry`) and `accessMode` (e.g., `accessEvents.accessMode.vehicle`) — the controller hook resolves them once and feeds them as already-localized strings into the description template. This avoids nested `t(...)` calls inside the template.
- Putting the strings in `@ramcar/i18n` (single source of truth) is enforced by SC-010's CI grep ("no app-level message file contains the new keys"). Implementation will run that grep as part of `pnpm check` (or a dedicated CI step) — see `quickstart.md` for the exact command to add.

**Alternatives considered**:
1. **Reuse `accessEvents.messages.created` as the success title** — rejected: that string ("Access event logged successfully") is sentence-case past-tense, which reads correctly as a corner toast but is too long and too prose-y for a centered card title. The new short title + structured description split (`successTitle` + `successDescription`) is clearer at glance distance.
2. **Per-app message-file overrides** — explicitly rejected by FR-013 / SC-010.

---

## Decision 8 — Test strategy

**Decision**: Layered tests, anchored to the success criteria in the spec. All authored alongside the primitive in the `packages/features/src/access-event-feedback/` test file unless the assertion requires app-level wiring (the per-surface SC-001/SC-002 checks).

| Test | Location | Asserts |
|------|----------|---------|
| `access-event-feedback-overlay.test.tsx` — success render | `packages/features/src/access-event-feedback/components/` | Overlay in DOM with success icon + title + description (+ `role="status"` polite live region content); SC-001, SC-007 |
| `access-event-feedback-overlay.test.tsx` — error render | same | Overlay in DOM with error icon + title + description + retry button; assertive live region; SC-002, SC-007 |
| `access-event-feedback-overlay.test.tsx` — auto-dismiss success | same | Use fake timers; assert overlay leaves DOM within 3 s after success; SC-004 |
| `access-event-feedback-overlay.test.tsx` — error does NOT auto-dismiss | same | Use fake timers; advance 10 s; assert overlay still in DOM; SC-005 |
| `access-event-feedback-overlay.test.tsx` — replace, not stack | same | Trigger success then immediately error; assert exactly one DialogContent in DOM; SC-003, FR-012 |
| `access-event-feedback-overlay.test.tsx` — reduced motion | same | Mock `matchMedia('(prefers-reduced-motion: reduce)')` to true; assert computed-style transform is identity (no scale/translate); SC-006 |
| `access-event-feedback-overlay.test.tsx` — accessibility (axe-core) | same | Run `axe(container)` on success and error states; assert zero violations including color-contrast in light + dark; SC-007, SC-012 |
| `access-event-feedback-overlay.test.tsx` — leak stress | same | Open/close 10× with fake timers; assert no orphan DOM nodes, no remaining timers (`vi.getTimerCount() === 0`), no remaining focus traps; SC-011 |
| **Per-call-site integration tests** (existing test files in each surface) | `apps/desktop/src/features/residents/components/__tests__/`, `apps/web/...`, `packages/features/src/visitors/components/` | After `mutate.onSuccess`, exactly one overlay in DOM ≤ 200 ms; Sonner's container has 0 new toasts; SC-001, SC-003 |
| **Per-call-site integration tests — error** | same | After `mutate.onError`, error overlay in DOM ≤ 200 ms; retry control works (re-fires same payload); SC-002 |
| **CI grep** — no per-app duplicate | `pnpm check:shared-features` (existing); plus a new check that no `apps/*/src/features/` directory contains a centered-overlay implementation for access events | SC-008, FR-008 |
| **CI grep** — i18n single source | New grep step asserting that `apps/*/messages/*.json` does NOT contain any `accessEvents.feedback.*` key | SC-010, FR-013 |

**Layout-shift assertion (SC-009)**: a Vitest test that measures `getBoundingClientRect()` of a known surface element before opening the overlay and after closing it, asserting equal positions. Since the overlay portals to `document.body`, this is a near-tautology — but the test guarantees we do not later regress by, e.g., applying a body class that shifts the page.

**Rationale**:
- Each test maps to a measurable success criterion (SC-001…SC-012). No test is gratuitous.
- Vitest fake timers + RTL is sufficient — no need for Playwright at the unit/integration level. Existing E2E coverage on the access-event flow can be re-pointed at the new overlay if/when the team chooses, but is not required for this spec's acceptance.

**Alternatives considered**:
1. **Browser-based Playwright suite for the overlay** — overkill for the unit-level assertions (timer, replace, focus, axe). Worth considering only if a future regression in real browser engines is observed.

---

## Open questions deferred to implementation

- **Final wording of the i18n strings** in EN/ES — listed as proposals above; content-design pass during implementation, not architectural.
- **Final auto-dismiss duration** — start at 2000 ms (mid of the 1.5–3 s band). Tunable from one constant in the controller hook if usability data argues otherwise.
- **Whether to add a tiny "queued offline" subtle subtitle on desktop** when offline — out of scope per A4. Captured here so it is not forgotten if the team later decides to surface queued vs. confirmed.

All Technical Context entries from `plan.md` are now resolved. Phase 0 is complete; proceeding to Phase 1 design (`data-model.md`, `contracts/`, `quickstart.md`).
