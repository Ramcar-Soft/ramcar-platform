---
description: "Task list for feature 013-visitor-form-images"
---

# Tasks: Visitor Form Image Capture UX

**Input**: Design documents from `/specs/013-visitor-form-images/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ui-contracts.md ✅, quickstart.md ✅

**Tests**: NOT requested in spec. No automated test tasks are generated. Verification is done via `quickstart.md` manual walkthroughs and the existing `pnpm lint` / `pnpm typecheck` gates.

**Organization**: Tasks are grouped by user story. User stories are drawn from `spec.md` and mapped to the contracts in `contracts/ui-contracts.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All file paths are absolute-style monorepo paths from the repo root

## Path Conventions

- Web app: `apps/web/src/…`
- Desktop app (renderer): `apps/desktop/src/…`
- Shared i18n: `packages/i18n/src/messages/{en,es}.json`
- No `apps/api` changes; no migrations

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No scaffolding required — all target files already exist.

- [X] T001 Confirm current branch is `013-visitor-form-images` and the tree is clean: run `git status` and `git branch --show-current`; resolve any unrelated in-progress edits before starting

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Translation keys and the small shared helper all three user stories need. No user story work should begin until these land.

**⚠️ CRITICAL**: Every story references `images.selectTypeHint`, `images.replaceAria`, `images.stagedBadge`, or `visitPersons.form.imagesSectionLabel`. Ship these keys first to avoid runtime `t()` warnings in later tasks.

- [X] T002 [P] Add English translation keys (`images.selectTypeHint`, `images.replaceAria`, `images.stagedBadge`, `visitPersons.form.imagesSectionLabel`) to `packages/i18n/src/messages/en.json` using the wording in `specs/013-visitor-form-images/contracts/ui-contracts.md` Translation-key contract
- [X] T003 [P] Add Spanish translation keys (same four keys) to `packages/i18n/src/messages/es.json` using the wording in `specs/013-visitor-form-images/contracts/ui-contracts.md`
- [X] T004 Run `pnpm --filter @ramcar/i18n build` (or the package's build/export command) to ensure both apps pick up the new keys; run `pnpm typecheck` from repo root and confirm no errors

**Checkpoint**: Shared i18n keys published; stories can begin in parallel.

---

## Phase 3: User Story 1 — Capture photos while registering a new visitor (Priority: P1) 🎯 MVP

**Goal**: Display the image section inside the "Register new visitor / service provider" form in both web and desktop apps, stage selected images client-side, and flush them to the existing upload endpoint after the create mutation succeeds. No orphan images on cancel.

**Independent Test**: Per `quickstart.md` Tests A and B — open the Register sidebar, fill identity fields, stage two images, click Save: the visitor is created and both images appear in its grid. Reopen Register, stage images, click Cancel: no new records and no new storage objects.

### Implementation for User Story 1 — Web

- [X] T005 [P] [US1] Update `apps/web/src/features/visitors/components/image-section.tsx` to accept new optional props `mode`, `stagedImages`, `onStageImage` per contract in `specs/013-visitor-form-images/contracts/ui-contracts.md`; when `mode === "create"`, route file selection to `onStageImage` instead of `onUpload`, synthesize `VisitPersonImage[]`-shaped tiles from `stagedImages` via a local `stagedToImages(...)` helper (see `data-model.md`), make `visitPersonId` / `onUpload` optional; keep edit/view behavior unchanged
- [X] T006 [US1] Update `apps/web/src/features/visitors/components/visit-person-form.tsx` to hold a `Map<ImageType, { file: File; previewUrl: string }>` in local state, render `<ImageSection mode="create" stagedImages={...} onStageImage={...} isLoading={false} isUploading={isUploadingStagedImages} />` above the action buttons, exclude staged images from `useFormPersistence` (text fields only), revoke all `previewUrl`s on cancel and on unmount, and extend `onSave` to pass `stagedImages` up to the parent
- [X] T007 [US1] Update `apps/web/src/features/visitors/components/visit-person-sidebar.tsx` to own the create-then-flush orchestration: after `useCreateVisitPerson` resolves, iterate staged entries sequentially through `useUploadVisitPersonImage` (reuse existing hook in `apps/web/src/features/visitors/hooks/use-upload-visit-person-image.ts`), track `isUploadingStagedImages` and pass it to `<VisitPersonForm>`, close the sheet on full success, show a `sonner` error toast for any failed uploads while keeping the created person
- [X] T008 [P] [US1] Mirror T005 in providers: update `apps/web/src/features/providers/components/provider-sidebar.tsx` (if it forks `ImageSection`) or confirm the existing cross-feature import from `@/features/visitors/components/image-section` still compiles; either way, update `apps/web/src/features/providers/components/provider-form.tsx` to embed the same staged-create flow as T006 and orchestrate create-then-upload in `provider-sidebar.tsx` using `apps/web/src/features/providers/hooks/use-create-visit-person.ts` + `apps/web/src/features/providers/hooks/use-upload-visit-person-image.ts`

### Implementation for User Story 1 — Desktop

- [X] T009 [P] [US1] Update `apps/desktop/src/features/visitors/components/image-section.tsx` to accept the same new optional props as T005 (use `react-i18next` `t()` instead of `next-intl`)
- [X] T010 [US1] Update `apps/desktop/src/features/visitors/components/visit-person-form.tsx` to add staged-images state, embed `<ImageSection mode="create" … />`, handle cleanup/cancel — mirroring T006 with react-i18next
- [X] T011 [US1] Update `apps/desktop/src/features/visitors/components/visit-person-sidebar.tsx` to orchestrate create-then-flush using `apps/desktop/src/features/visitors/hooks/use-create-visit-person.ts` + `apps/desktop/src/features/visitors/hooks/use-upload-visit-person-image.ts` — mirroring T007
- [X] T012 [P] [US1] Update `apps/desktop/src/features/providers/components/provider-form.tsx` and `apps/desktop/src/features/providers/components/provider-sidebar.tsx` to apply the same staged-create flow using `apps/desktop/src/features/providers/hooks/use-create-visit-person.ts` + `apps/desktop/src/features/providers/hooks/use-upload-visit-person-image.ts`

### Verification for User Story 1

- [ ] T013 [US1] Run `quickstart.md` Test A (web visitor create-with-images) and Test B (cancel-no-orphans) on `apps/web`; spot-check Supabase Studio Storage + `visit_person_images` table after cancel
- [ ] T014 [US1] Run `quickstart.md` Tests A and B on `apps/desktop`; run Test D (providers) on both apps
- [X] T015 [US1] Run `pnpm lint` and `pnpm typecheck` from repo root; fix any findings in touched files

**Checkpoint**: User Story 1 shippable as an MVP — images can be captured during visitor/service-provider registration in both apps, with no orphan objects on cancel.

---

## Phase 4: User Story 2 — Replace an existing image in one click (Priority: P1)

**Goal**: Clicking Replace on a tile auto-selects that image type AND opens the file picker in the same user-gesture, for both web and desktop.

**Independent Test**: Per `quickstart.md` Test C — on a visitor that already has a Face image, click Replace on the Face tile: the type selector jumps to Face and the OS file picker opens with no second click; picking a file uploads as Face only; canceling the picker leaves the previous image untouched; oversized/wrong-type files trigger the same validation error as the Upload button.

### Implementation for User Story 2 — Web

- [X] T016 [US2] Refactor `apps/web/src/shared/components/image-capture/image-upload.tsx` to `forwardRef<ImageUploadHandle, ImageUploadProps>` exposing `openFilePicker()` via `useImperativeHandle`; extract the MIME + size check into a local `isValidImageFile(file)` helper and call it from both the file-input `onChange` and the imperative path (shared validation satisfies FR-010)
- [X] T017 [US2] Update `apps/web/src/features/visitors/components/image-section.tsx` to hold a `useRef<ImageUploadHandle>(null)` on `<ImageUpload>`, then change `handleReplace(imageType)` to `flushSync(() => setSelectedType(imageType))` followed by `uploadRef.current?.openFilePicker()`; import `flushSync` from `react-dom`
- [X] T018 [P] [US2] Verify providers path: if `apps/web/src/features/providers/components/provider-sidebar.tsx` still imports `ImageSection` from visitors, no additional change is needed beyond T017; if providers has its own `image-section` variant, apply T017 there as well

### Implementation for User Story 2 — Desktop

- [X] T019 [US2] Refactor `apps/desktop/src/shared/components/image-capture/image-upload.tsx` identically to T016 (forwardRef + `openFilePicker()` + shared `isValidImageFile`)
- [X] T020 [US2] Update `apps/desktop/src/features/visitors/components/image-section.tsx` mirroring T017 (ref + `flushSync` + `openFilePicker()`)
- [X] T021 [P] [US2] Apply the same ref + flushSync logic to the desktop providers image-section path if it exists as a separate file; otherwise it inherits from visitors

### Verification for User Story 2

- [ ] T022 [US2] Run `quickstart.md` Test C on `apps/web` and `apps/desktop` visitors and providers; confirm a single click opens the picker, cancel is a no-op, and 6 MB / wrong-MIME files trigger the same validation toast
- [ ] T023 [US2] Manually keyboard-test Replace (focus, Enter) to confirm the picker still opens — browsers retain the user-gesture only if the open call is synchronous; `flushSync` must keep it synchronous (Test H in `quickstart.md`)

**Checkpoint**: User Story 2 shippable independently of US3 — one-click Replace works in both apps.

---

## Phase 5: User Story 3 — Clear, prominent image grid and upload guidance (Priority: P2)

**Goal**: Image tiles render square, Replace control is clearly distinct from the gray footer label, and the image section shows an instructional label above the type selector in both create and edit modes.

**Independent Test**: Per `quickstart.md` Test A step 7 + Test F — tiles are square, Replace is visually emphasized, hint text is visible above the selector, and all new labels render in English and Spanish.

### Implementation for User Story 3 — Web

- [X] T024 [P] [US3] Update `apps/web/src/shared/components/image-capture/image-grid.tsx` tile root to `aspect-square rounded-md overflow-hidden border relative group`, replace `h-24` with `w-full h-full` on the inner `<img>` and placeholder, keep `object-cover` on the image (FR-004)
- [X] T025 [US3] In the same file, restyle the Replace button: `font-semibold`, `bg-white/15 hover:bg-white/25`, `backdrop-blur-sm`, `px-2 py-0.5`, `rounded`, `focus-visible:ring-2 ring-white/70 outline-none`; add a leading `RefreshCw` icon from `lucide-react` (`h-3 w-3`) before the text; add an `aria-label` using the translated `images.replaceAria` key with the image type interpolated (FR-005)
- [X] T026 [P] [US3] Update `apps/web/src/features/visitors/components/image-section.tsx` to render the instructional hint — e.g. `<p className="text-sm text-muted-foreground">{t("selectTypeHint")}</p>` — directly below the existing `<h4>{t("title")}</h4>` and above the type selector (FR-008); verify provider sidebar picks this up via shared import

### Implementation for User Story 3 — Desktop

- [X] T027 [P] [US3] Update `apps/desktop/src/shared/components/image-capture/image-grid.tsx` with the same `aspect-square` + `w-full h-full` + `object-cover` layout as T024
- [X] T028 [US3] Apply the same Replace-button styling + `RefreshCw` icon + `aria-label` to the desktop grid file as in T025
- [X] T029 [P] [US3] Add the instructional hint `<p>` to `apps/desktop/src/features/visitors/components/image-section.tsx` under the title (react-i18next: `t("images.selectTypeHint")`); verify provider sidebar picks this up

### Verification for User Story 3

- [ ] T030 [US3] Run `quickstart.md` Test A step 7 (square tile visual check using a portrait-aspect image), Test F (Spanish labels), and Test H (focus ring on Replace) on `apps/web` and `apps/desktop`
- [X] T031 [US3] Run the translation-key audit in `quickstart.md` Test F step 4: `grep -E '(images\.(selectTypeHint|replaceAria|stagedBadge)|visitPersons\.form\.imagesSectionLabel)' packages/i18n/src/messages/{en,es}.json` — all four keys must be present in both files

**Checkpoint**: All three user stories independently functional. Visual polish shipped.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, full quickstart run-through, and repo-level gates.

- [ ] T032 [P] Run full `quickstart.md` walkthrough (Tests A–H) on web and desktop as a final regression pass; capture any findings as follow-up issues, not as scope creep
- [X] T033 [P] Run `pnpm lint` and `pnpm typecheck` from repo root one more time — both must be green
- [X] T034 [P] Run `pnpm --filter @ramcar/web test` and `pnpm --filter @ramcar/desktop test` (Vitest) to confirm no existing component test regressed due to the `ImageUpload` forwardRef refactor or the `ImageSection` prop extension
- [ ] T035 Review the diff against `spec.md` FR-001 through FR-012 one-by-one; ensure every FR has code that satisfies it (cross-reference the table at the bottom of `contracts/ui-contracts.md`)
- [ ] T036 Delete the `console.log(tCommon("draftRestored", { time: "" }))` calls in the visit-person form only if they were introduced by this branch; otherwise leave existing dev logs untouched
- [ ] T037 Optional: open a follow-up ticket noting out-of-scope items from `research.md` (offline create + outbox support, transactional create-with-images endpoint) so they are not lost

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: none
- **Phase 2 (Foundational)**: depends on Phase 1; **BLOCKS** all user stories (keys must exist before any `t()` call references them)
- **Phase 3 (US1)**: depends on Phase 2 — independent of US2 and US3
- **Phase 4 (US2)**: depends on Phase 2 — independent of US1 and US3 (modifies different code paths: shared `ImageUpload` + `handleReplace` in `ImageSection`)
- **Phase 5 (US3)**: depends on Phase 2 — independent of US1 and US2 (pure visual + instructional text changes in `ImageGrid` and `ImageSection`)
- **Phase 6 (Polish)**: depends on whichever user stories are in scope

### Within-Story Dependencies

- **US1**: `image-section.tsx` extension (T005/T009) must precede form integration (T006/T010); form integration must precede sidebar orchestration (T007/T011); verification tasks (T013–T015) run last
- **US2**: `image-upload.tsx` forwardRef refactor (T016/T019) must precede `image-section.tsx` ref wiring (T017/T020); verification (T022/T023) runs last
- **US3**: grid layout change (T024/T027) and grid button-styling change (T025/T028) touch the same file and must run sequentially per app, not in parallel; hint label in section (T026/T029) is independent of the grid; verification (T030/T031) runs last

### Parallel Opportunities

Across stories (once Phase 2 is done, if three developers are available):

```text
Developer A → Phase 3 (US1)        # create-flow staging
Developer B → Phase 4 (US2)        # one-click Replace
Developer C → Phase 5 (US3)        # visual polish
```

Inside Phase 2:

```text
T002 (en.json) and T003 (es.json) can run in parallel  — different files
```

Inside Phase 3 (US1):

```text
Same developer, same app:
  Web lane  : T005 → T006 → T007; T008 [P after T005]
  Desktop   : T009 → T010 → T011; T012 [P after T009]
Web lane and Desktop lane are independent and can be parallelized across developers.
```

Inside Phase 4 (US2):

```text
Web lane  : T016 → T017; T018 [P after T017]
Desktop   : T019 → T020; T021 [P after T020]
Web and Desktop lanes can be parallelized.
```

Inside Phase 5 (US3):

```text
Web lane  : T024 → T025; T026 [P — different file]
Desktop   : T027 → T028; T029 [P — different file]
Web and Desktop lanes can be parallelized.
```

---

## Parallel Example: User Story 1

```bash
# After Phase 2 completes, launch the two app lanes in parallel:

# Web lane:
Task: "Update apps/web/src/features/visitors/components/image-section.tsx for create-mode staging (T005)"
Task: "Update apps/web/src/features/visitors/components/visit-person-form.tsx to embed ImageSection and stage images (T006)"
Task: "Update apps/web/src/features/visitors/components/visit-person-sidebar.tsx for create-then-flush orchestration (T007)"
Task: "Apply the same staged-create flow to apps/web/src/features/providers/* (T008)"

# Desktop lane (run in parallel with web lane — different files):
Task: "Update apps/desktop/src/features/visitors/components/image-section.tsx (T009)"
Task: "Update apps/desktop/src/features/visitors/components/visit-person-form.tsx (T010)"
Task: "Update apps/desktop/src/features/visitors/components/visit-person-sidebar.tsx (T011)"
Task: "Apply the same flow to apps/desktop/src/features/providers/* (T012)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001)
2. Complete Phase 2 (T002–T004) — blocks everything else
3. Complete Phase 3 — User Story 1 (T005–T015)
4. **STOP and validate**: run Tests A + B + D from `quickstart.md`
5. Ship — guards can now capture photos at registration time in both apps. This is the single highest-value slice.

### Incremental Delivery (recommended)

1. Setup + Foundational → keys published
2. US1 → deploy → MVP demo (create-with-images)
3. US2 → deploy → incremental UX win (one-click Replace)
4. US3 → deploy → visual polish + instructional label
5. Polish → final regression pass

### Parallel Team Strategy

With three developers: after Phase 2, split US1/US2/US3 across three contributors. All three stories touch different code paths (create flow vs. shared `ImageUpload` vs. `ImageGrid` layout) and only intersect at `image-section.tsx`, where the three edits can be merged by landing them in this order: US1 first (adds create-mode props), then US2 (adds `handleReplace` ref wiring), then US3 (adds hint label). US1 and US2 both modify `image-section.tsx` non-trivially, so prefer sequencing over true parallel for that file.

---

## Summary

- **Total tasks**: 37 (T001 setup; T002–T004 foundational; T005–T015 US1; T016–T023 US2; T024–T031 US3; T032–T037 polish)
- **Per-story counts**: US1 = 11 tasks; US2 = 8 tasks; US3 = 8 tasks; Setup = 1; Foundational = 3; Polish = 6
- **No backend work**: zero `apps/api` tasks, zero migrations
- **No new API endpoints**: reuses existing `POST /visit-persons` + `POST /visit-persons/:id/images`
- **Parallel opportunities**: web/desktop lanes within every user story; two i18n locales in Phase 2; multiple polish tasks in Phase 6
- **MVP**: User Story 1 alone delivers the primary user value (capture photos at registration time)
- **Independent test gates**: `quickstart.md` Tests A+B (US1), Test C+H (US2), Tests A-step7 + F + H (US3)

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps each task to its spec user story for traceability
- No automated test tasks generated — tests were not requested in the spec; `pnpm lint`, `pnpm typecheck`, and the `quickstart.md` walkthroughs are the verification gates
- Commit after each logical group (e.g., after T004, after T015, after T023, after T031)
- Stop at any checkpoint to validate the story independently before moving on
- Avoid: editing `shared/components/image-capture/image-upload.tsx` and `image-section.tsx` in parallel across stories — always land US1's section changes before US2's ref wiring touches the same file
