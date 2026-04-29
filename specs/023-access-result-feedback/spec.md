# Feature Specification: Prominent Success/Error Feedback For Access Log Recording

**Feature Branch**: `023-access-result-feedback`
**Created**: 2026-04-29
**Status**: Draft
**Input**: User description: "Create a more evident success dialog/message after a new access log has been recorded, possible centered in the screen, it should be animated to give it more prominent interaction in the screen, so the guard is 100% sure the actions was completely successfully, but also in the other hand if something went wrong, it should be also visible for the user, the success message/dialog should be global not only for guard role"

## Context

Today, when a user records an access event (an `access_events` row — visitor / service-provider / resident, entry or exit, vehicle or pedestrian), the platform shows a small **corner toast** that fades within ~2 seconds. That same pattern is used in every surface that creates an access event today:

- **`apps/desktop`** (offline-first guard booth): `features/residents/components/residents-page-client.tsx`, `features/providers/components/providers-page-client.tsx`, and the shared `<VisitorsView />` (used for the visitors flow).
- **`apps/web`** (admin / resident portal): `features/residents/components/residents-page-client.tsx`, `features/providers/components/providers-page-client.tsx`, and the shared `<VisitorsView />`.
- **Shared module**: `packages/features/src/visitors/components/visitors-view.tsx`, line 194 — the success toast that both apps go through for the visitors persona.

A guard at the gate is rarely looking at the corner of the screen. Vehicles queue, the visitor is at the window, paper logs may be open — a 2-second peripheral toast is easy to miss, leading guards to second-guess whether the entry was saved and to scroll the recent-events list to verify. Errors share the same problem: a small red corner toast is easy to overlook, and the guard moves on assuming success. The same uncertainty applies to administrators recording an access from the web portal.

This feature replaces the corner-toast outcome notification **for access-event creation** with a centered, animated, attention-grabbing acknowledgment that confirms (success) or alerts (error) clearly enough to remove all doubt. The mechanism is implemented once in shared code and consumed by every app/role that can create an access event today — `apps/desktop` (Guard) **and** `apps/web` (Admin, Resident) — because the user explicitly asked for the feedback to be "global, not only for guard role."

The desktop's `apps/desktop/src/features/access-log/pages/*` directory currently holds three placeholder pages (only an `<h1>` each) — they are not the entry point for access-event creation today. The actual creation paths are the residents / providers / visitors surfaces above, which is what this spec changes.

This spec is **scoped to access-event creation**. The same primitive may later be adopted by other high-stakes actions (tenant switch, blacklist add, etc.); those adoptions are out of scope here and would each be evaluated as separate features.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Guard at the booth is unmistakably confirmed after recording an entry/exit (Priority: P1)

A guard at the gate has a visitor at the window and records the entry through the desktop visitors flow. They tap **Save** inside the access-event sheet. Today, a small corner toast flashes for ~2 seconds and is easy to miss when a vehicle is pulling up. With this feature, the screen dims subtly behind a centered card that animates in (scale + fade), shows a large success icon, and displays "Access recorded — *Juan Pérez* · *Entry* · *Vehicle*." The guard sees it without searching, the card auto-dismisses within ~2 seconds (or earlier on Esc / click), the access-event sheet closes, and the booth is ready for the next entry.

**Why this priority**: This is the primary explicit ask — "guard is 100% sure the action was completely successful." It is the journey that motivates the feature. Without P1, none of the supporting work (shared primitive, animation, reduced-motion fallback, accessibility) ships, and P2 and P3 become blocked re-implementations.

**Independent Test**: On `apps/desktop`, log in as a Guard, open the visitors flow (`<VisitorsView />`), select a visitor, fill direction = entry / mode = vehicle (with a vehicle), tap Save. Without scrolling or moving the mouse, the centered success acknowledgment must appear with the visitor's name, direction, and mode visible; must use a success-themed icon and color; must animate in; must auto-dismiss within the established window; and the existing Sonner corner toast must NOT also fire for that outcome. The recent-events list must reflect the new event after the acknowledgment dismisses.

**Acceptance Scenarios**:

1. **Given** the guard has a visitor selected and the access-event form is filled correctly, **When** the guard taps Save and the create resolves successfully, **Then** a centered success acknowledgment animates in identifying the visitor, direction, and access mode — and the existing corner success toast for that outcome is suppressed.
2. **Given** the centered success acknowledgment is on screen, **When** the auto-dismiss timer elapses **OR** the guard presses Esc / clicks outside / clicks the dismiss control, **Then** the acknowledgment animates out and the access-event sheet is closed/reset, ready for the next entry.
3. **Given** the guard saves two access events in quick succession, **When** the second create resolves before the first acknowledgment auto-dismisses, **Then** at most one centered acknowledgment is on screen — the new one replaces (or queues behind a brief exit animation) the prior. No stacking.
4. **Given** the system reports `prefers-reduced-motion: reduce`, **When** the acknowledgment appears, **Then** the entry/exit motion collapses to an instant fade — no scale, no translate — and all other behavior (auto-dismiss, dismissibility, content) is unchanged.

---

### User Story 2 — Web admin / resident records an access and gets the same prominent feedback (Priority: P2)

An Admin (or a Resident, on a surface a Resident is allowed to use) recording an access event from `apps/web` — for a resident, a service provider, or a visitor — sees the **same** centered acknowledgment they would see at the booth, with the same visual language and behavior. The user explicitly stated "global, not only for guard role"; shipping the prominent acknowledgment only on desktop would re-introduce the inconsistency the feature is meant to remove and force a duplicate web implementation later.

**Why this priority**: Shipping P2 fulfills the user's "global" constraint and proves the shared primitive composes across both apps without per-app forking. It is independently testable against the web call sites. Lower priority than P1 only because the desktop guard journey is the most acute pain; P1 + P2 together complete the success-side experience.

**Independent Test**: On `apps/web`, log in as Admin, open the residents page, fill the access-event form, save — the centered success acknowledgment must appear with the same visual language, content (resident name + direction + mode), animation, and dismiss behavior as the desktop app. Repeat on the providers page, then on the visitors page. Repeat as a Resident user on a Resident-allowed surface. Confirm at code-review time that the acknowledgment primitive is imported from a shared workspace package (per spec 014) and that `pnpm check:shared-features` passes — no per-app duplicate.

**Acceptance Scenarios**:

1. **Given** an Admin on `apps/web` successfully creates an access event from the residents, providers, or visitors surface, **When** the create resolves, **Then** the centered success acknowledgment appears with the same visual language and behavior as P1, and the corresponding corner success toast is suppressed.
2. **Given** a Resident user on `apps/web` successfully records an access event on a Resident-allowed surface, **When** the create resolves, **Then** the centered acknowledgment fires identically — no role gating on the acknowledgment itself.
3. **Given** code review of this feature, **When** the acknowledgment primitive is consumed, **Then** it is imported from a shared workspace package (e.g., `@ramcar/features` or `@ramcar/ui`) by both `apps/web` and `apps/desktop` with NO per-app duplicate implementation under `apps/*/src/features/`. `pnpm check:shared-features` continues to pass.

---

### User Story 3 — Failed access-event recording is unmissable too (Priority: P2)

When the access-event create fails — connection lost, server rejection, validation surfaced from the server, permission error, etc. — the user sees an **analogously prominent centered error acknowledgment** with a clear failure reason in plain language and an explicit next step (retry / cancel / dismiss). The error acknowledgment uses the same anchor and animation language as success but with error-themed visual treatment (icon, color), and unlike the success state it does NOT auto-dismiss — so a guard who looks away during the create cannot miss the failure.

**Why this priority**: The user explicitly stated the error path must also be "visible for the user." Shipping P1 + P2 alone would create an asymmetry where successes are unmissable but failures still hide in the corner — exactly the failure mode the user is calling out. The error path is part of the same primitive (one outcome dialog, two states), so cost-to-ship is bundled.

**Independent Test**: With the API mocked to reject (or the network disabled), attempt to create an access event from each surface in P1 and P2. The centered error acknowledgment must appear with an error-themed icon and color, a plain-language failure reason, and at least one explicit user action (retry or dismiss). The form must remain in its filled state so retry doesn't require re-entering data. The original corner error toast must be suppressed for the same outcome.

**Acceptance Scenarios**:

1. **Given** the access-event create call fails for any reason (network, 4xx, 5xx, timeout), **When** the failure resolves, **Then** a centered error acknowledgment animates in with an error-themed icon, a plain-language reason, and at least one explicit action (retry or dismiss).
2. **Given** the centered error acknowledgment is on screen, **When** the user activates the retry action, **Then** the create is re-attempted with the same form data — the user does not retype anything — and the new resolution path (success or failure) reuses the same overlay primitive.
3. **Given** the user dismisses the error acknowledgment, **When** the overlay closes, **Then** the form is restored to its pre-submit state with all data intact, and the user can edit and resubmit.
4. **Given** an access-event create resolves to a failure that would also have triggered a corner error toast, **When** the centered error appears, **Then** no duplicate corner toast is shown for the same outcome.

---

### Edge Cases

- **Auto-dismiss timing (success)**: ~2 seconds — long enough to read three short tokens (name + direction + mode), short enough not to delay the next entry. Plan-phase polishable in the 1.5–3 s band.
- **Auto-dismiss policy (error)**: errors do NOT auto-dismiss. They stay until an explicit user action (retry / cancel / dismiss). A guard who looks away cannot miss the failure.
- **Rapid back-to-back submissions**: at most one centered acknowledgment is on screen at a time. New outcomes replace prior ones (or queue behind a brief exit animation). No stacking.
- **Reduced motion**: when the OS reports `prefers-reduced-motion: reduce`, the entry/exit transition collapses to an instant fade — no scale, no translate, no spinner-style motion.
- **Screen reader / keyboard**: success announced via a polite ARIA live region; error via an assertive ARIA live region. Esc dismisses; focus is restored to the originating Save control after dismiss (or to a sensible landing element if Save is unmounted).
- **Theme**: legible in both light and dark themes (no green-on-light-green or red-on-dark-red contrast issues).
- **Window sizes**: anchored to the viewport center; never clipped on the platform's minimum supported sizes (desktop guard booth, web responsive minimums).
- **Long person names**: visitor names ≥ 50 characters wrap inside the centered card without breaking layout or pushing the dismiss control out of view.
- **Desktop offline / sync queue**: when the desktop creates an access event while offline and the existing access-event-create mutation resolves successfully (whether by direct API or by host-injected mutation transport reporting success), the success acknowledgment uses the same wording as online — the user does not need to know the difference at acknowledgment time. If the transport reports a hard failure, the error acknowledgment fires. This spec does NOT introduce a separate "queued" overlay state — that is a follow-up if/when product wants to surface queued vs. confirmed.
- **Existing corner toast**: the existing `toast.success("accessEvents.messages.created")` and `toast.error("accessEvents.messages.errorCreating")` are removed for the access-event-create outcome — replaced by the new acknowledgment, not stacked alongside it. Other Sonner calls in those files (visit-person create/update, image upload, etc.) are unchanged.
- **Concurrent submission while overlay is on screen**: while the success acknowledgment is on screen, the underlying form/sheet is closed/reset — there is no "submit again" race.
- **Navigation away mid-acknowledgment**: closing the desktop window or following a link while the acknowledgment is on screen logs no errors; the next page load starts in a clean state (no leaked timers, no orphan DOM, no leaked focus traps).
- **Sound / haptics**: out of scope for this iteration — visual + accessibility-text only. Sound at the booth is a defensible follow-up but creates accessibility, environment-noise, and tenant-policy considerations that don't belong in this spec.
- **Other actions**: the primitive must be designed for reuse, but only the access-event-create call sites are migrated in this spec.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Successfully creating an access event from any surface that creates one today (desktop residents/providers/visitors, web residents/providers/visitors) MUST display a **centered, viewport-anchored success acknowledgment** that is visually distinct from the existing Sonner corner toast.
- **FR-002**: A failed access-event creation from any of those same surfaces MUST display a **centered, viewport-anchored error acknowledgment** with the same anchor and animation language as success but error-themed visual treatment (icon, color), a plain-language failure reason, and at least one explicit next-step action (retry or dismiss).
- **FR-003**: The success acknowledgment MUST identify what was just recorded — at minimum the person's name, the direction (entry / exit), and the access mode (vehicle / pedestrian). This is what makes the user "100% sure the action was completely successful" instead of just "something happened."
- **FR-004**: The acknowledgment MUST animate on entry (e.g., scale-up + fade-in) and on exit. The animation MUST respect the OS / browser `prefers-reduced-motion` preference and degrade to an instant fade with no transform when reduced motion is set.
- **FR-005**: The success acknowledgment MUST auto-dismiss within an established short window (target ≈ 2 seconds, tunable in 1.5–3 s) AND MUST be immediately user-dismissible via Esc, click on backdrop, or an explicit dismiss control — whichever happens first.
- **FR-006**: The error acknowledgment MUST NOT auto-dismiss. It MUST stay until the user takes an explicit action (retry or dismiss) so a failure cannot be missed by a user who looks away during the create.
- **FR-007**: The mechanism MUST be available across **all apps and roles that create access events today** — `apps/desktop` (Guard) and `apps/web` (Admin, Resident) — without role gating. The user's "global, not only for guard role" instruction means the primitive is invoked the same way from every persona surface that creates an access event.
- **FR-008**: The acknowledgment primitive MUST be implemented in a shared workspace package (`packages/features` or `packages/ui`) and consumed by both `apps/web` and `apps/desktop`. Per-app duplicate implementations under `apps/*/src/features/` for this primitive are prohibited and MUST fail the existing `pnpm check:shared-features` check.
- **FR-009**: For the access-event-create outcome, the existing corner toasts (`toast.success("accessEvents.messages.created")` and `toast.error("accessEvents.messages.errorCreating")`) MUST NOT also fire — exactly one outcome notification is delivered per resolution. Corner toasts for unrelated actions (visit-person create/update, image upload, etc.) MUST continue to behave as before.
- **FR-010**: The acknowledgment MUST be screen-reader accessible — success announced through a polite ARIA live region, error through an assertive ARIA live region — and keyboard-dismissible (Esc), with focus restored to a sensible element (originating Save control, or a designated landing control if Save is unmounted) after dismiss.
- **FR-011**: The acknowledgment MUST be visually correct in both light and dark themes — sufficient contrast on icon, text, and backdrop in each.
- **FR-012**: At most one centered acknowledgment MUST be on screen at any time. If a new outcome resolves while a prior acknowledgment is visible, the prior is replaced (or queued behind a brief exit animation). Stacking is prohibited.
- **FR-013**: All user-facing text in the acknowledgment (success message, error message, retry label, dismiss label, accessibility announcement) MUST live in the `@ramcar/i18n` shared message catalog — single source of truth for both apps. Strings MUST NOT be duplicated per-app.
- **FR-014**: The acknowledgment MUST NOT block the user from initiating the next access event for longer than its auto-dismiss window. The underlying form / sheet is closed and reset on success so that, the moment the success acknowledgment is dismissed (auto or manual), the surface is ready for the next entry.
- **FR-015**: The acknowledgment MUST handle exceptionally long content (e.g., visitor names ≥ 50 characters) by wrapping inside the centered card without breaking layout or pushing the dismiss control out of view.

### Key Entities

This feature does NOT introduce or modify a persisted entity. The acknowledgment is a transient UI state attached to the resolution of the existing access-event-create flow.

### Data Access Architecture *(mandatory for features involving data)*

This feature does not introduce or modify a database operation, an API endpoint, or a DTO. It is a pure presentation-layer change on the resolution of the existing access-event-create call.

| Operation | API Endpoint | HTTP Method | Request DTO | Response DTO |
|-----------|--------------|-------------|-------------|--------------|
| (none — no API path is introduced or modified) | — | — | — | — |

**Frontend data flow**: Unchanged — TanStack Query → NestJS API → Repository → Supabase/Postgres for the access-event create. The acknowledgment is rendered from the resolution of that existing mutation.
**Allowed frontend Supabase usage**: Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) only — unchanged.

### Assumptions

- **A1 — Scope is access-event creation only.** Existing corner toasts on other actions (visit-person create/update, image upload, user create, vehicle create, etc.) are out of scope and remain on their current notifications. The primitive is designed to be reusable, but no other adoption is part of this spec's acceptance.
- **A2 — Success content shows the captured detail.** Success acknowledgment includes the person's name, the direction (entry / exit), and the access mode (vehicle / pedestrian). The user's "100% sure" wording calls for confirmation of WHAT was recorded, not just THAT something happened. Notes are not echoed (often long, free-text, low signal at acknowledgment time).
- **A3 — Auto-dismiss window for success ≈ 2 seconds.** Plan-phase polishable in the 1.5–3 s band. Errors do NOT auto-dismiss.
- **A4 — Desktop offline behavior reuses the existing mutation resolution.** When the desktop creates an access event while offline, the existing `useCreateAccessEvent` resolution path determines success vs. error (whether via direct API or via the host-injected mutation transport reporting completion). The success acknowledgment fires on success regardless of online/offline; the error acknowledgment fires on hard failure. This spec does NOT introduce a "queued vs. confirmed" overlay distinction — that is a follow-up if product wants to surface it later.
- **A5 — Sound / haptics out of scope.** Pure visual + accessibility-text feedback this iteration.
- **A6 — Existing corner toasts are replaced for this outcome, not stacked.** Specifically: `toast.success("accessEvents.messages.created")` in `packages/features/src/visitors/components/visitors-view.tsx`, `apps/desktop/src/features/residents/components/residents-page-client.tsx`, `apps/desktop/src/features/providers/components/providers-page-client.tsx`, and the analogous web call sites; and `toast.error("accessEvents.messages.errorCreating")` in `apps/web/src/features/residents/components/access-event-form.tsx` and `packages/features/src/visitors/components/visit-person-access-event-form.tsx`. All other Sonner calls in those files remain unchanged.
- **A7 — Shared module placement.** The acknowledgment primitive lives in `packages/features` (alongside the other cross-app shared modules per spec 014) or `packages/ui` (if it is generic enough to belong with the shadcn-style primitives). Final placement is plan-phase. Per-app duplicates are forbidden under spec 014's guard rails (`pnpm check:shared-features`).
- **A8 — i18n via the shared catalog and adapter.** New strings live in `@ramcar/i18n`. Per the platform's i18n adapter pattern, the shared component obtains strings through the injected `useI18n()` adapter and works under both `next-intl` (web) and `react-i18next` (desktop).
- **A9 — Error retry semantics.** Retry calls the same mutation function with the same form payload, captured in the closure that opened the overlay. It does NOT route through a separate service. If the retry also fails, the same overlay updates in place — no stacking.
- **A10 — Design language reuses existing tokens.** The acknowledgment uses the platform's existing color tokens for success and error states (`@ramcar/config/tailwind`), the existing icon set (`lucide-react`), and the existing animation utilities (`tw-animate-css` is already installed for Sheet animations and is sufficient for this work). No new dependency is introduced solely for the animation.
- **A11 — Backdrop / scrim is non-blocking.** A subtle scrim may dim the surface behind the acknowledgment for emphasis, but it does NOT trap input long enough to be perceived as blocking. The user can always dismiss with Esc or click-outside; the backdrop click counts as dismiss.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At every site that creates an access event today (desktop residents/providers/visitors, web residents/providers/visitors), a successful create renders the centered acknowledgment effectively immediately (within ~200 ms of the mutation resolving — the human perception threshold for a discrete event), verified by an integration test on each surface that asserts the acknowledgment is in the DOM within 200 ms after `mutate.onSuccess`.
- **SC-002**: A failed access-event create renders the centered error acknowledgment within ~200 ms of the mutation rejecting, verified by an integration test per surface that mocks the API to reject and asserts the error acknowledgment is in the DOM with a non-empty failure-reason text and a working retry control within 200 ms after `mutate.onError`.
- **SC-003**: For each access-event create outcome, exactly **one** outcome notification is shown — the corner toast for that outcome does not also fire — verified by an integration test that asserts the Sonner toast container has zero new toasts and the acknowledgment overlay container has exactly one.
- **SC-004**: The success acknowledgment auto-dismisses within ~3 seconds of appearance (covers the 2-second target plus exit-animation buffer), verified by an integration test that polls for overlay removal after `mutate.onSuccess`.
- **SC-005**: The error acknowledgment does NOT auto-dismiss, verified by an integration test that observes the overlay still in the DOM 10 seconds after `mutate.onError` and dismisses only on explicit user action.
- **SC-006**: With `prefers-reduced-motion: reduce`, the acknowledgment uses an instant fade and no scale/translate motion, verified by a computed-style assertion under the reduced-motion media query.
- **SC-007**: The acknowledgment is screen-reader accessible — success in a polite ARIA live region, error in an assertive ARIA live region — verified by an axe-core / RTL accessibility assertion on both states.
- **SC-008**: 100% of the access-event-create call sites listed in A6 invoke the shared acknowledgment primitive (no per-app duplicate), verified by `pnpm check:shared-features` continuing to pass and by a CI grep that asserts no `apps/*/src/features/` directory contains a centered-overlay implementation for access events.
- **SC-009**: 0 layout shift attributable to the acknowledgment on the surfaces below it, verified by a CLS measurement before vs. after acknowledgment open/close on at least one desktop and one web surface.
- **SC-010**: Localized strings for success, error, retry button, and dismiss button live exclusively in `@ramcar/i18n`, verified by a CI grep that no app-level message file contains the new keys.
- **SC-011**: Repeated invocation (10 successive access-event creates with the acknowledgment animating in/out each time) leaves no orphan DOM nodes, no leaked timers, and no leaked focus traps, verified by a stress integration test that records DOM-node count, active-timer count, and focus-trap count before vs. after.
- **SC-012**: Both light and dark themes pass a contrast assertion on the success and error overlay (icon, text, backdrop) at the platform's WCAG AA threshold, verified by an axe-core color-contrast assertion in both themes.
