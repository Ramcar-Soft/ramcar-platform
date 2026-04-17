# Implementation Plan: Visitor Form Image Capture UX

**Branch**: `013-visitor-form-images` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-visitor-form-images/spec.md`

## Summary

Expose the existing image capture UI (grid + type selector + upload) inside the "Create new visitor / service provider" form in both the web portal and the desktop app, alongside three UX fixes already targeted at the existing edit form: square image tiles, a prominent Replace action that opens the file picker in one click and auto-selects the matching image type, and an instructional heading above the type selector. All new strings are localized in English and Spanish.

Technical approach: stage images client-side during creation (no new endpoint, no orphan storage objects); after the existing `POST /visit-persons` succeeds, flush staged images through the existing `POST /visit-persons/:id/images` endpoint sequentially. For the Replace-one-click behavior, lift the hidden `<input type="file">` from `ImageUpload` into `ImageSection` so tile clicks and the Upload button share the same input via ref. For visuals, switch grid tiles to `aspect-square` with `object-cover` and emphasize the Replace control with an accent/weight change within existing design tokens.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode across the monorepo)
**Primary Dependencies**: Next.js 16 (App Router) + next-intl v4 (web); Electron 30 + Vite + React 18 + react-i18next (desktop); NestJS v11 (API — unchanged); TanStack Query v5; shadcn/ui (Sheet, Button, Input, Select, Label, Skeleton) from `@ramcar/ui`; Zod via `@ramcar/shared` (unchanged schemas)
**Storage**: PostgreSQL via Supabase — no schema changes. Supabase Storage private bucket — no bucket changes. SQLite/outbox (desktop) — not touched; creation remains online-only, matching current behavior.
**Testing**: Vitest (web + desktop renderer component tests); Jest + ts-jest (api — no new tests required, no API changes); Playwright E2E for the web create-with-images flow
**Target Platform**: Web browsers (apps/web), Electron desktop (apps/desktop main + renderer). No mobile changes.
**Project Type**: Turborepo monorepo — multi-surface web + desktop + backend
**Performance Goals**: Creation flow with up to 4 staged images must complete in ≤ 2 seconds on a typical broadband connection after the user presses Save. UI interactions (Replace click → file picker open) must be perceptually instant (< 100 ms).
**Constraints**: API-first data access — NO direct `supabase.from()` / `.rpc()` / `.storage` calls from frontend. Images reuse the existing `POST /visit-persons/:id/images` multipart endpoint. No new endpoints, no new DTOs, no migrations. All user-facing strings MUST exist in both `en` and `es` locale files.
**Scale/Scope**: Two frontend surfaces (web + desktop), ~6 component files changed, 4 translation keys added per locale (×2 locales ×2 apps), no backend changes. Bounded scope — no new data model.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|------------|--------|
| I. Multi-Tenant Isolation | Reuses existing tenant-scoped endpoints (`POST /visit-persons`, `POST /visit-persons/:id/images`). No new queries, no unscoped access. | ✅ Pass |
| II. Feature-Based Architecture | All frontend changes live inside `features/visitors/` and `features/providers/`, plus shared `shared/components/image-capture/`. No cross-feature imports. | ✅ Pass |
| III. Strict Import Boundaries | `ImageGrid` and `ImageUpload` remain in `shared/components/image-capture/`. `ImageSection` stays per-feature. No `features/A ↔ features/B` imports introduced. | ✅ Pass |
| IV. Offline-First Desktop | Creation flow is already online-only in the current code (hooks call `apiClient.post` directly, not the outbox). This feature keeps that behavior; it does not regress offline capability anywhere else. The spec's FR-011 is interpreted as "no regression vs. today." | ✅ Pass |
| V. Shared Validation via Zod | No new DTOs. Existing `CreateVisitPersonSchema` in `@ramcar/shared` is reused unchanged. File validation (MIME + size) applies on both Upload and Replace paths in a single shared helper. | ✅ Pass |
| VI. Role-Based Access Control | No endpoint additions. Existing role protections on `/visit-persons` and `/visit-persons/:id/images` apply. | ✅ Pass |
| VII. TypeScript Strict Mode | All new/changed code is strict-mode clean. No new `any`. | ✅ Pass |
| VIII. API-First Data Access | All frontend data ops go through NestJS endpoints already listed in the spec's Data Access Architecture table. No direct Supabase DB / Storage usage introduced. | ✅ Pass |

**Result**: All constitution gates pass — no violations to justify. No entries required in the Complexity Tracking section.

## Project Structure

### Documentation (this feature)

```text
specs/013-visitor-form-images/
├── plan.md              # This file
├── research.md          # Phase 0 — resolved design questions
├── data-model.md        # Phase 1 — (no schema change; state-model only)
├── quickstart.md        # Phase 1 — manual test walkthrough for both apps
├── contracts/
│   └── ui-contracts.md  # Phase 1 — component props & interaction contracts (UI only; no new API)
└── checklists/
    └── requirements.md  # Spec-level checklist (already created by /speckit.specify)
```

### Source Code (repository root)

```text
apps/web/src/
├── features/
│   ├── visitors/components/
│   │   ├── visit-person-form.tsx         # MODIFY — embed ImageSection (create mode with staged images)
│   │   ├── visit-person-sidebar.tsx      # MODIFY — pass staging props to create form
│   │   └── image-section.tsx             # MODIFY — one-click Replace; header label; stage-or-upload API
│   └── providers/components/             # same pattern if distinct components exist (verify in tasks)
└── shared/components/image-capture/
    ├── image-grid.tsx                    # MODIFY — aspect-square + prominent Replace control
    └── image-upload.tsx                  # MODIFY — expose imperative openFilePicker() via ref OR hoist input

apps/desktop/src/
├── features/visitors/components/
│   ├── visit-person-form.tsx             # MODIFY — mirror web changes (react-i18next)
│   ├── visit-person-sidebar.tsx          # MODIFY — pass staging props to create form
│   └── image-section.tsx                 # MODIFY — same behavior as web
└── shared/components/image-capture/
    ├── image-grid.tsx                    # MODIFY — aspect-square + prominent Replace control
    └── image-upload.tsx                  # MODIFY — imperative openFilePicker()

packages/i18n/src/messages/
├── en.json                               # MODIFY — add images.*, visitPersons.form.imagesHint keys
└── es.json                               # MODIFY — Spanish equivalents
```

**Structure Decision**: Monorepo (Turborepo). Changes span three surfaces — `apps/web`, `apps/desktop`, `packages/i18n` — following the existing Feature-Based architecture. No `apps/api` changes. Shared image-capture primitives live in each app's `shared/components/image-capture/`; per-feature orchestration (`ImageSection`) stays in `features/visitors/components/` (and `features/providers/` where the component exists independently — to be confirmed in Phase 2 tasks).

## Complexity Tracking

No constitution violations. This section intentionally left empty.

---

## Phase 0 Output Location

See [research.md](./research.md) for resolved design questions (staging vs. transactional create, Replace one-click mechanic, tile aspect handling, translation routing).

## Phase 1 Output Location

- [data-model.md](./data-model.md) — state model for staged images; no schema changes
- [contracts/ui-contracts.md](./contracts/ui-contracts.md) — component prop contracts for `ImageSection`, `ImageGrid`, `ImageUpload`, `VisitPersonForm`
- [quickstart.md](./quickstart.md) — manual verification walkthrough on web and desktop
