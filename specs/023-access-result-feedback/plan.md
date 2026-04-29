# Implementation Plan: Prominent Success/Error Feedback For Access Log Recording

**Branch**: `023-access-result-feedback` | **Date**: 2026-04-29 | **Spec**: [./spec.md](./spec.md)
**Input**: Feature specification from `/specs/023-access-result-feedback/spec.md`

## Summary

Replace the small corner Sonner toast that fires after creating an `access_events` row with a centered, viewport-anchored, animated overlay so the guard (and admin / resident) is unmistakably acknowledged on success and impossible to ignore on failure. The overlay is implemented **once** in `packages/features/src/access-event-feedback/` and consumed by `apps/desktop` and `apps/web` per spec 014's cross-app code-sharing rule. It builds on the Radix `Dialog` primitive already exported from `@ramcar/ui` (gives us a focus trap, Esc-to-close, click-outside, and ARIA defaults for free), uses the existing `tw-animate-css` zoom/fade utilities for the entry/exit animation with `motion-reduce:` modifiers for `prefers-reduced-motion`, and consumes user-facing strings through the existing `useI18n()` adapter (`@ramcar/features/adapters`) so a single `accessEvents.feedback.*` block in `@ramcar/i18n` serves both apps. The existing `toast.success("accessEvents.messages.created")` and `toast.error("accessEvents.messages.errorCreating")` calls at the migrated call sites are removed (not stacked) so exactly one outcome notification fires per resolution. No DB schema, API, DTO, or desktop SQLite/outbox change is introduced.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode across the monorepo), Node.js 22 LTS.
**Primary Dependencies**:
- `@ramcar/ui` (Radix `Dialog`, `DialogPortal`, `DialogOverlay`, `DialogContent`, `DialogTitle`, `DialogDescription`, `Button`; already exported)
- `@ramcar/features/adapters` (`useI18n()` port — works under `next-intl` on web and `react-i18next` on desktop without per-app forking)
- `@ramcar/i18n` (shared `accessEvents.feedback.*` strings — added in this feature)
- `lucide-react` (existing icon set — `CheckCircle2`, `AlertTriangle`, `X`)
- `tw-animate-css` (already installed for Sheet/Dialog animations — provides `animate-in`, `zoom-in-95`, `fade-in-0`, etc., with `motion-reduce:` Tailwind modifiers)
- `next-intl` v4 (web host wires the i18n adapter)
- `react-i18next` (desktop host wires the i18n adapter)
- TanStack Query v5 (existing `useCreateAccessEvent` hooks — unchanged; the new controller hook composes around their result)

**Storage**: N/A — this feature does not introduce or modify any persisted entity. No PostgreSQL change. No SQLite change. No outbox column. Acknowledgment state is ephemeral React state.
**Testing**: Vitest (`@ramcar/features` and per-app feature tests) + React Testing Library + axe-core for accessibility / contrast assertions. Existing `pnpm check:shared-features` continues to enforce no per-app duplicate.
**Target Platform**: `apps/desktop` (Electron 30 + Vite + React 18) and `apps/web` (Next.js 16 App Router on browser). The shared module is platform-neutral — no `next/*`, no `"use client"`, no `window.electron` references.
**Project Type**: Monorepo (Turborepo + pnpm workspaces). The shared primitive lives in `packages/features` (a workspace package), consumed by two apps.
**Performance Goals**:
- Acknowledgment in DOM ≤ 200 ms after `mutate.onSuccess` / `mutate.onError` (SC-001, SC-002).
- Auto-dismiss success within ≤ 3 s (covers 2 s display + exit-animation buffer; SC-004).
- 0 cumulative layout shift attributable to the acknowledgment (SC-009 — overlay portals to `document.body`, does not affect surface layout).
- 10× repeated open/close leaves no orphan DOM nodes, no leaked timers, no leaked focus traps (SC-011).

**Constraints**:
- MUST NOT introduce a per-app duplicate (FR-008, SC-008 — `pnpm check:shared-features`).
- MUST NOT stack with the existing Sonner corner toast for the same outcome (FR-009, SC-003).
- MUST NOT auto-dismiss on error (FR-006, SC-005).
- MUST respect `prefers-reduced-motion: reduce` with an instant fade — no scale, no translate (FR-004, SC-006).
- MUST be screen-reader accessible — success in polite live region, error in assertive live region (FR-010, SC-007).
- MUST be visually correct in both light and dark themes (FR-011, SC-012).
- MUST keep all user-facing strings in `@ramcar/i18n` (FR-013, SC-010) — no per-app message-file duplicates.
- The shared module MUST NOT import `next/*`, `"use client"`, `window.electron`, IPC, or Node-in-renderer APIs (CLAUDE.md "Cross-App Shared Feature Modules" — non-negotiable).

**Scale/Scope**:
- 7 call sites migrated (`packages/features/src/visitors/components/visitors-view.tsx`, `packages/features/src/visitors/components/visit-person-access-event-form.tsx`, `apps/desktop/src/features/residents/components/residents-page-client.tsx`, `apps/desktop/src/features/providers/components/providers-page-client.tsx`, `apps/web/src/features/residents/components/residents-page-client.tsx`, `apps/web/src/features/residents/components/access-event-form.tsx`, `apps/web/src/features/providers/components/providers-page-client.tsx`).
- 1 new shared module (`packages/features/src/access-event-feedback/`).
- 1 new i18n block (`accessEvents.feedback.*`) in `packages/i18n/src/messages/en.json` and `es.json`.
- 1 new entry in `shared-features.json` under `sharedPrimitives` (or `features` — see research.md decision).
- 0 DB migrations. 0 new API endpoints. 0 new DTOs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Verdict | Notes |
|-----------|---------|-------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | ✅ PASS | Pure presentation-layer feature. No DB query, no `tenant_id` scoping, no RLS surface introduced or modified. The mutation that resolves into the overlay (`useCreateAccessEvent`) already enforces tenant isolation upstream — unchanged. |
| **II. Feature-Based Architecture** | ✅ PASS | Shared primitive at `packages/features/src/access-event-feedback/` (controller hook + overlay component) — same vertical-slice pattern used by `tenant-selector` and `visitors`. Each call-site app continues to own its routing / shell wiring. |
| **III. Strict Import Boundaries (NON-NEGOTIABLE)** | ✅ PASS | The new module imports only from `@ramcar/ui` (Dialog primitives, Button) and `@ramcar/features/adapters` (i18n adapter, exported via the package's own root). It does NOT import any per-app code, any other `features/X/` directory, or `next/*`. Each consumer app imports it like any other shared module. |
| **IV. Offline-First Desktop (NON-NEGOTIABLE)** | ✅ PASS | The overlay reflects the resolution of the **existing** `useCreateAccessEvent` mutation. The desktop's existing online/offline / outbox semantics for that mutation are unchanged. No SQLite change, no outbox-column change, no SyncSlice change. Overlay treats success-from-API and success-reported-by-host-injected-transport identically (Spec A4, A9). |
| **V. Shared Validation via Zod** | ✅ PASS | No external input. The component receives a typed payload `{ personName, direction, accessMode }` from the controller hook — purely internal types. No Zod schema needed. |
| **VI. Role-Based Access Control** | ✅ PASS | Per FR-007, the overlay is invoked identically from every persona surface (Guard, Admin, Resident). No role gating on the primitive. The mutations the overlay reacts to remain RBAC-protected upstream — unchanged. |
| **VII. TypeScript Strict Mode** | ✅ PASS | All new code lives under `packages/features` and consuming `apps/*` directories, all of which already use `strict: true` (extended from `@ramcar/config`). No `any` introduced. |
| **VIII. API-First Data Access (NON-NEGOTIABLE)** | ✅ PASS | No data-access path is added. Frontend continues to call `/api/access-events` via the existing `useCreateAccessEvent` hook. The overlay only **reads** the mutation's resolution; it does not query, mutate, or open a Supabase client of its own. |

**Result**: All eight principles pass. No deviation. No `Complexity Tracking` entry required.

## Project Structure

### Documentation (this feature)

```text
specs/023-access-result-feedback/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── access-event-feedback.md   # Component + hook contract (no HTTP API)
└── tasks.md             # Phase 2 output (/speckit.tasks command — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/features/src/access-event-feedback/
├── index.ts                                          # public exports
├── types.ts                                          # OutcomeKind, FeedbackPayload, controller-hook return type
├── components/
│   ├── access-event-feedback-overlay.tsx            # Centered overlay (Radix Dialog wrapper)
│   └── access-event-feedback-overlay.test.tsx       # Vitest + RTL + axe-core (success, error, reduced motion, replace-not-stack, focus restore)
└── hooks/
    └── use-access-event-feedback.ts                  # controller (success/error state, retry closure, auto-dismiss, replace policy)

packages/i18n/src/messages/
├── en.json                                          # MODIFY — add `accessEvents.feedback.*` block
└── es.json                                          # MODIFY — add `accessEvents.feedback.*` block

packages/features/                                   # MODIFY top-level barrel exports
└── src/index.ts                                     # add `export * from "./access-event-feedback";` (or sub-path export)

shared-features.json                                 # MODIFY — register primitive (sharedPrimitives section, addedAt 2026-04-29)

# CALL SITES (migrate to consume the new primitive)
packages/features/src/visitors/components/
├── visitors-view.tsx                                 # MODIFY — replace toast.success at line 194; mount overlay or expose handler to host
└── visit-person-access-event-form.tsx                # MODIFY — remove inline toast.error at line 123 (the form re-throws so the controller hook handles error)

apps/desktop/src/features/residents/components/
└── residents-page-client.tsx                         # MODIFY — remove toast.success/error at lines 96/100; consume controller hook + overlay

apps/desktop/src/features/providers/components/
└── providers-page-client.tsx                         # MODIFY — remove toast.success at line 165; consume controller hook + overlay (no current error toast — controller hook adds it)

apps/web/src/features/residents/components/
├── residents-page-client.tsx                         # MODIFY — remove toast.success at line 105; consume controller hook + overlay
└── access-event-form.tsx                             # MODIFY — remove inline toast.error at line 131 (form re-throws; controller hook handles)

apps/web/src/features/providers/components/
└── providers-page-client.tsx                         # MODIFY — remove toast.success at line 174; consume controller hook + overlay
```

**Structure Decision**:
- **Shared primitive lives in `packages/features/src/access-event-feedback/`** (not `packages/ui`). Rationale captured in `research.md` (Decision 1): the module needs the `useI18n()` adapter for cross-app i18n (web → `next-intl`, desktop → `react-i18next`), it composes Radix Dialog primitives rather than introducing a new shadcn-style primitive, and the precedent set by `tenant-selector` (also a thin Dialog/Popover wrapper that needs the i18n adapter) places similar work under `packages/features`. The component is constructed from `@ramcar/ui` exports — no new shadcn primitive is added there.
- **No `apps/web/src/features/access-event-feedback/` or `apps/desktop/src/features/access-event-feedback/` directory is created** (FR-008 — per-app duplication is prohibited and would fail `pnpm check:shared-features`).
- **Mount strategy**: each call site (the two `*-page-client.tsx` files per app, plus `<VisitorsView />` for the visitors flow) consumes the controller hook and renders the overlay component locally — same pattern as the existing `<VisitPersonSidebar />`. The overlay portals to `document.body` (Radix Dialog default), so its visual placement is independent of the host's layout. No global / app-shell mount is required.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified.**

Not applicable — Constitution Check passes on all eight principles with no deviation.
