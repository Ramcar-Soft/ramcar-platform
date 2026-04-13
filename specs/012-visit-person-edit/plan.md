# Implementation Plan: Edit Visitor/Service Provider Records & Read-Only Access Events

**Branch**: `012-visit-person-edit` | **Date**: 2026-04-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-visit-person-edit/spec.md`

## Summary

Correct two UX defects introduced while implementing spec 011:

1. Split the visit-person edit workflow out of the access-event logging sidebar. Each row in the Visitantes and Proveedores tables gets a trailing actions column with an edit button that opens the existing `Sheet` in a new `edit` mode showing a person-record form (pre-populated from the current record) plus the image-management section — **no access-event form**. The existing row-click behavior (open sidebar in `view` mode to log a new access event) is unchanged.
2. Make access events fully immutable from the client perspective: remove the per-event edit affordance currently rendered in `recent-events-list.tsx` (web + desktop), delete `useUpdateAccessEvent` hooks, drop `updateAccessEventSchema`, remove `AccessEventsService.update` and the `PATCH /api/access-events/:id` controller route. The read-only rule applies uniformly to residents, visitors, and providers on both web and desktop.

The underlying `PATCH /api/visit-persons/:id` endpoint, `UpdateVisitPersonDto`, and `updateVisitPersonSchema` already exist (introduced for a different purpose in spec 011) and are sufficient — no backend schema changes, no DB migrations.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode across all workspaces), Node.js 22 LTS
**Primary Dependencies**: Next.js 16 (App Router), NestJS v11, TanStack Query v5, @ramcar/ui (shadcn/ui: Sheet, Button, Input, Select, Textarea, Dialog), Zod, next-intl v4 (web), react-i18next (desktop), Electron 30 + Vite + React 18 (desktop), better-sqlite3 (desktop offline cache)
**Storage**: PostgreSQL via Supabase — `visit_persons` and `visit_person_images` tables already exist; no schema changes. Desktop SQLite outbox — add `visit_person.update` operation kind.
**Testing**: Vitest (frontend + shared), Jest + ts-jest (api), Playwright (web e2e)
**Target Platform**: Web (Next.js, responsive), Desktop (Electron booth)
**Project Type**: Turborepo monorepo with web + desktop + api + shared packages
**Performance Goals**: Edit sidebar opens within 500 ms of click (SC-005); save round-trip < 1 s on a healthy connection; offline-edit round-trip indistinguishable from online from the guard's perspective
**Constraints**: Must not regress any spec 011 behavior; must not create any new access events as a side effect of editing a visit person record; drafts of the new-visit (`visit-person-create`) form and new edit drafts must not collide
**Scale/Scope**: Two frontend routes per app (web + desktop: Visitantes, Proveedores) × ~6 touched components each + removal of 2 hooks × 2 apps + 1 NestJS controller route + 1 service method + 1 shared Zod schema

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Multi-Tenant Isolation** | ✅ Pass | Edit path reuses `visit-persons.repository.update(id, dto, tenantId)` which already scopes by `tenant_id`. No new unscoped queries. |
| **II. Feature-Based Architecture** | ✅ Pass | Changes are localized to `apps/web/src/features/visitors`, `apps/web/src/features/providers`, mirrored in `apps/desktop/src/features/{visitors,providers}`, and to the existing `visit-persons` + `access-events` NestJS modules. |
| **III. Strict Import Boundaries** | ✅ Pass | The visitors and providers features do not cross-import. Any shared pieces (e.g., a generic `VisitPersonEditForm` variant per feature) live inside the respective feature folder. `shared/` is not touched except for Zod schemas (allowed). |
| **IV. Offline-First Desktop** | ✅ Pass | Desktop edit operations queue via the existing outbox pattern with UUID `event_id`. Conflict policy: last-write-wins (documented in research.md), consistent with spec 011 FR-026. |
| **V. Shared Validation via Zod** | ✅ Pass | Reuses existing `updateVisitPersonSchema` from `@ramcar/shared`. Removes `updateAccessEventSchema` (and its re-exports) as part of the read-only rule. |
| **VI. Role-Based Access Control** | ✅ Pass | Edit button hidden for `resident` role; backend already enforces `@Roles("super_admin","admin","guard")` on `PATCH /api/visit-persons/:id`. Access-event update route is deleted entirely — defense in depth: even a bypassed UI cannot reach it. |
| **VII. TypeScript Strict Mode** | ✅ Pass | All changes are in strict-mode workspaces. No new `any`. |
| **VIII. API-First Data Access** | ✅ Pass | Frontend continues to use TanStack Query → NestJS REST. No direct Supabase `.from()`, `.rpc()`, or `.storage` calls introduced. |

**Result**: No violations. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/012-visit-person-edit/
├── plan.md                 # This file (/speckit.plan command output)
├── research.md             # Phase 0 output (/speckit.plan command)
├── data-model.md           # Phase 1 output (/speckit.plan command)
├── quickstart.md           # Phase 1 output (/speckit.plan command)
├── contracts/
│   ├── visit-persons.api.md
│   └── access-events.api.md
├── checklists/
│   └── requirements.md
└── tasks.md                # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

Changes are **edits to existing files** — no new top-level directories. Touched paths:

```text
apps/web/src/features/visitors/
├── components/
│   ├── visitors-table-columns.tsx          # +actions column with edit button
│   ├── visitors-table.tsx                  # render trailing actions column
│   ├── visit-person-edit-form.tsx          # NEW — edit-mode person form
│   ├── visit-person-sidebar.tsx            # add mode: "edit"; route to edit form
│   ├── visitors-page-client.tsx            # +editingPerson state, openEdit handler, useUpdateVisitPerson wiring
│   ├── recent-events-list.tsx              # REMOVE onEdit prop + edit button
│   └── visit-person-access-event-form.tsx  # REMOVE editingEvent branch (create-only)
└── hooks/
    ├── use-update-visit-person.ts          # NEW — TanStack mutation
    └── use-update-access-event.ts          # DELETE

apps/web/src/features/providers/
└── (same set of edits as visitors/)

apps/web/src/features/residents/
└── components/
    └── access-event-sidebar.tsx            # audit: confirm no edit affordance (spec 011 comment verified none exists, but verify)

apps/desktop/src/features/visitors/
├── components/                             # mirror web edits
└── hooks/
    ├── use-update-visit-person.ts          # NEW (delegates to IPC → API + outbox)
    └── use-update-access-event.ts          # DELETE

apps/desktop/src/features/providers/
└── (same set of edits as visitors/)

apps/desktop/electron/
├── services/
│   └── sync-engine.ts                      # handle new outbox op kind "visit_person.update"
├── repositories/
│   └── visit-persons.repository.ts         # enqueue update into outbox when offline
└── ipc/
    └── visit-persons.ipc.ts                # add updateVisitPerson handler if not already present

apps/api/src/modules/access-events/
├── access-events.controller.ts             # REMOVE PATCH :id route
├── access-events.service.ts                # REMOVE update method
└── access-events.repository.ts             # REMOVE update method (if present)

packages/shared/src/validators/
└── access-event.ts                         # REMOVE updateAccessEventSchema + type export

packages/shared/src/index.ts                # REMOVE re-exports of updateAccessEventSchema / UpdateAccessEventInput

packages/shared/src/validators/visit-person.ts  # (no change — updateVisitPersonSchema already exists)

apps/web/messages/{en,es}.json               # +visitPersons.edit.* keys; remove accessEvents.form.edit key
apps/desktop/src/locales/{en,es}.json        # same
```

**Structure Decision**: Web + desktop + API + shared — this feature is a surgical refactor of existing `visitors` and `providers` features in `apps/web` and `apps/desktop`, plus corresponding removals in `apps/api/src/modules/access-events` and `packages/shared`.

## Phase 0: Outline & Research

See [research.md](./research.md) for decisions on:

- Sidebar mode model (`"view" | "create" | "edit"`)
- Edit form composition (new vs. reusing `VisitPersonForm`)
- Draft-key strategy for edit mode to avoid collision with create drafts
- Unsaved-changes warning pattern (inline confirm vs. modal)
- Desktop outbox op kind for visit-person update + conflict strategy
- Access-event update removal approach (full deletion vs. feature flag)
- i18n key rename for accessibility label

**Output**: `research.md` with all NEEDS CLARIFICATION resolved (none remain — all resolved by reading existing 011 implementation).

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md) and [contracts/](./contracts/).

### Entities

No new entities; touching `VisitPerson`, `VisitPersonImage`, and `AccessEvent` behavior. Full field inventory in [data-model.md](./data-model.md).

### Contracts

- `contracts/visit-persons.api.md` — `PATCH /api/visit-persons/:id` request/response contract (existing endpoint; contract ratified for this feature).
- `contracts/access-events.api.md` — documents the **removal** of `PATCH /api/access-events/:id` and lists the surface-area cleanup required.

### Agent context update

Will run `.specify/scripts/bash/update-agent-context.sh claude` after writing artifacts (this adds no new tech; it just refreshes the file).

**Output**: `data-model.md`, `contracts/*`, `quickstart.md`, refreshed agent context file.

## Complexity Tracking

> No constitution violations — table intentionally empty.
