# Tasks: Testing Infrastructure, Coverage & Pre-Commit Quality Gates

**Input**: Design documents from `/specs/007-testing-coverage-husky/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the feature specification. Smoke/example tests are included as verification tasks within each user story.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create shared Vitest base configuration and test utilities in packages/config

- [x] T001 Install Vitest and testing-library devDependencies in `packages/config/package.json`
- [x] T002 Create shared Vitest base configuration in `packages/config/vitest.config.ts` (v8 coverage provider, text + lcov reporters, include `**/*.test.{ts,tsx}`, exclude node_modules/dist/.next/coverage)
- [x] T003 [P] Create shared test setup file in `packages/config/vitest.setup.ts` (import @testing-library/jest-dom/vitest matchers)
- [x] T004 [P] Add vitest config and setup exports to `packages/config/package.json` exports field

**Checkpoint**: Shared testing config is ready for consumption by workspaces

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: ESLint configuration for test files — MUST be complete before any test files can pass lint

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Update shared ESLint config in `packages/config/eslint.config.mjs` to add test file overrides (recognize `*.test.ts`, `*.test.tsx`, `*.spec.ts` patterns; allow devDependency imports in test files; configure vitest globals if needed)

**Checkpoint**: Foundation ready — test files will pass lint checks

---

## Phase 3: User Story 1 — Developer Runs Unit Tests Across the Monorepo (Priority: P1) 🎯 MVP

**Goal**: Every workspace has a functioning unit test runner with coverage reporting. `pnpm test` runs all tests from the root.

**Independent Test**: Run `pnpm test` from the repo root and verify tests execute across all workspaces, producing pass/fail results and coverage summaries.

### Vitest Configuration Per Workspace

- [x] T006 [P] [US1] Create Vitest config for `apps/web/vitest.config.ts` (jsdom env, extends shared config, exclude e2e/ directory) and add test/test:watch/test:cov scripts to `apps/web/package.json`
- [x] T007 [P] [US1] Install Vitest + @testing-library/react + @testing-library/jest-dom + @testing-library/user-event as devDependencies in `apps/web/package.json`
- [x] T008 [P] [US1] Create Vitest config for `apps/www/vitest.config.ts` (jsdom env, extends shared config) and add test/test:watch/test:cov scripts to `apps/www/package.json`
- [x] T009 [P] [US1] Install Vitest + @testing-library/react + @testing-library/jest-dom as devDependencies in `apps/www/package.json`
- [x] T010 [P] [US1] Create Vitest config for `apps/desktop/vitest.config.ts` (jsdom env, extends shared config) and add test/test:watch/test:cov scripts to `apps/desktop/package.json`
- [x] T011 [P] [US1] Install Vitest + @testing-library/react + @testing-library/jest-dom + @testing-library/user-event as devDependencies in `apps/desktop/package.json`
- [x] T012 [P] [US1] Create Vitest config for `packages/shared/vitest.config.ts` (node env, extends shared config) and add test/test:watch/test:cov scripts to `packages/shared/package.json`
- [x] T013 [P] [US1] Install Vitest as devDependency in `packages/shared/package.json`
- [x] T014 [P] [US1] Create Vitest config for `packages/store/vitest.config.ts` (jsdom env, extends shared config) and add test/test:watch/test:cov scripts to `packages/store/package.json`
- [x] T015 [P] [US1] Install Vitest + @testing-library/react + @testing-library/jest-dom as devDependencies in `packages/store/package.json`
- [x] T016 [P] [US1] Create Vitest config for `packages/ui/vitest.config.ts` (jsdom env, extends shared config) and add test/test:watch/test:cov scripts to `packages/ui/package.json`
- [x] T017 [P] [US1] Install Vitest + @testing-library/react + @testing-library/jest-dom as devDependencies in `packages/ui/package.json`

### Jest Coverage Enhancement (apps/api)

- [x] T018 [P] [US1] Update `apps/api/package.json` Jest config to add `coverageReporters: ["text", "lcov"]` and verify test:cov script generates lcov output

### Smoke Unit Tests (Verification)

- [x] T019 [US1] Create smoke unit test in `packages/shared/src/validators/auth.test.ts` — test loginSchema Zod validation (valid + invalid input)
- [x] T020 [P] [US1] Create smoke unit test in `apps/web/src/smoke.test.ts` — basic test verifying Vitest runs in this workspace
- [x] T021 [P] [US1] Create smoke unit test in `apps/desktop/src/smoke.test.ts` — basic test verifying Vitest runs in the desktop workspace

### Turbo Pipeline for Unit Tests

- [x] T022 [US1] Verify `turbo.json` test task configuration works — run `pnpm test` from root and confirm all workspace tests execute via Turborepo

**Checkpoint**: `pnpm test` runs unit tests across all workspaces with coverage output. User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 — Pre-Commit Quality Gate Blocks Bad Commits (Priority: P1)

**Goal**: Every `git commit` is automatically checked for lint and type errors. Failing commits are blocked.

**Independent Test**: Stage a file with a deliberate lint error, attempt `git commit`, and verify the commit is rejected with lint error output.

### Husky + lint-staged Setup

- [x] T023 [US2] Install husky and lint-staged as root devDependencies in `package.json`
- [x] T024 [US2] Add `"prepare": "husky"` script to root `package.json` for automatic hook installation on `pnpm install`
- [x] T025 [US2] Run `pnpm exec husky init` to create `.husky/` directory and initialize git hooks
- [x] T026 [US2] Create `.husky/pre-commit` hook script that runs: (1) `npx lint-staged` for staged file linting, then (2) `pnpm typecheck` for full type-checking
- [x] T027 [US2] Add lint-staged configuration to root `package.json` (or `.lintstagedrc.json`): run `eslint --max-warnings 0` on staged `*.{ts,tsx}` files

### Verification

- [x] T028 [US2] Verify pre-commit hook blocks commit with lint error — create a temp file with `any` type usage, stage it, attempt commit, confirm rejection
- [x] T029 [US2] Verify pre-commit hook blocks commit with type error — create a temp file with type mismatch, stage it, attempt commit, confirm rejection
- [x] T030 [US2] Verify pre-commit hook allows clean commit — stage a valid file, attempt commit, confirm success

**Checkpoint**: All commits pass through automated lint + typecheck validation. Hooks auto-install on `pnpm install`.

---

## Phase 5: User Story 3 — Developer Runs End-to-End Tests for the Web App (Priority: P2)

**Goal**: Playwright E2E tests can be run against apps/web with automatic dev server startup, screenshot/trace capture on failure.

**Independent Test**: Run `pnpm --filter @ramcar/web test:e2e` and verify browser tests execute against the running app.

### Playwright Setup

- [x] T031 [US3] Install @playwright/test as devDependency in `apps/web/package.json`
- [x] T032 [US3] Run Playwright browser installation command (`pnpm exec playwright install --with-deps chromium`)
- [x] T033 [US3] Create Playwright config at `apps/web/e2e/playwright.config.ts` — configure: baseURL localhost:3000, webServer auto-start (`pnpm dev`), screenshot on failure (`only-on-failure`), trace on first retry (`on-first-retry`), HTML reporter, test directory (`e2e/`), output directory (`e2e/test-results/`)
- [x] T034 [US3] Add E2E scripts to `apps/web/package.json`: `test:e2e` (playwright test), `test:e2e:ui` (playwright test --ui), `test:e2e:report` (playwright show-report)
- [x] T035 [P] [US3] Update `apps/web/.gitignore` to add `playwright-report/`, `test-results/`, `blob-report/`

### Turbo Pipeline for E2E

- [x] T036 [US3] Add `test:e2e` task to `turbo.json` (cache: false, persistent: false) so it can be run via `pnpm --filter @ramcar/web test:e2e`

### Smoke E2E Test

- [x] T037 [US3] Create smoke E2E test at `apps/web/e2e/smoke.spec.ts` — navigate to the app root URL and verify the page loads (check for a visible element or page title)

**Checkpoint**: `pnpm --filter @ramcar/web test:e2e` runs browser tests with auto-server, screenshots on failure, and trace files.

---

## Phase 6: User Story 4 — Developer Reviews Coverage Reports (Priority: P2)

**Goal**: Coverage reports are generated in readable format with configurable thresholds ready for future enforcement.

**Independent Test**: Run `pnpm --filter @ramcar/shared test:cov` and verify coverage report shows per-file line/branch/function stats.

### Coverage Configuration

- [x] T038 [US4] Verify Vitest coverage output in `packages/shared` — run `test:cov`, confirm terminal shows text summary with line/branch/function percentages and `coverage/lcov.info` is generated
- [x] T039 [P] [US4] Verify Jest coverage output in `apps/api` — run `test:cov`, confirm terminal shows text summary and `coverage/lcov.info` is generated
- [x] T040 [US4] Add `test:cov` script to root `package.json` that runs `dotenvx run -f .env.local -- turbo test:cov` to generate coverage across all workspaces
- [x] T041 [US4] Add `test:cov` task to `turbo.json` (dependsOn: ["^build"], outputs: ["coverage/**"])

**Checkpoint**: Coverage reports generated for all workspaces in both text and lcov format.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, documentation, and gitignore updates

- [x] T042 [P] Update root `.gitignore` to ensure `coverage/`, `playwright-report/`, `test-results/`, `blob-report/` are all listed
- [x] T043 [P] Update `CLAUDE.md` — add testing commands to the Commands section, update Active Technologies with Vitest/Playwright/Husky/lint-staged, add entry to Recent Changes
- [x] T044 Run full verification: `pnpm install` (verify hooks install), `pnpm test` (verify all unit tests pass), `pnpm typecheck` (verify no type errors), `pnpm lint` (verify no lint errors)
- [x] T045 Clean up any smoke test files that were only needed for verification (keep them if they provide ongoing value as example tests)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (Phase 2) — can start after ESLint config is ready
- **US2 (Phase 4)**: Depends on Foundational (Phase 2) only — independent of US1
- **US3 (Phase 5)**: Depends on Foundational (Phase 2) only — independent of US1 and US2
- **US4 (Phase 6)**: Depends on US1 (Phase 3) — coverage requires test infrastructure to be set up
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — No dependencies on other stories
- **US2 (P1)**: Can start after Phase 2 — No dependencies on other stories (fully independent)
- **US3 (P2)**: Can start after Phase 2 — No dependencies on other stories (fully independent)
- **US4 (P2)**: Depends on US1 — needs test infrastructure to verify coverage output

### Within Each User Story

- Config/installation tasks before implementation tasks
- Smoke tests after config is complete
- Verification tasks are the final step

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 can run in parallel
- **Phase 3 (US1)**: T006–T018 can ALL run in parallel (different workspaces, independent configs)
- **Phase 3 (US1)**: T019, T020, T021 can run in parallel after configs are done
- **Phase 4 (US2)**: T023–T027 are sequential (each depends on the previous)
- **Phase 5 (US3)**: T031–T035 are mostly sequential except T035 (gitignore) which is parallel
- **Phase 3 + Phase 4 + Phase 5**: Can run in parallel since they touch different files
- **Phase 7**: T042 and T043 can run in parallel

---

## Parallel Example: Phase 3 (US1) — Workspace Configurations

```text
# All workspace Vitest configs can be created in parallel (different files):
T006: apps/web/vitest.config.ts + apps/web/package.json
T008: apps/www/vitest.config.ts + apps/www/package.json
T010: apps/desktop/vitest.config.ts + apps/desktop/package.json
T012: packages/shared/vitest.config.ts + packages/shared/package.json
T014: packages/store/vitest.config.ts + packages/store/package.json
T016: packages/ui/vitest.config.ts + packages/ui/package.json
T018: apps/api/package.json (Jest coverage update)
```

## Parallel Example: US1 + US2 + US3 Simultaneously

```text
# After Phase 2 (Foundational) completes, three developers could work on:
Developer A: Phase 3 (US1) — Vitest configs + smoke tests
Developer B: Phase 4 (US2) — Husky + lint-staged hooks
Developer C: Phase 5 (US3) — Playwright E2E setup
```

---

## Implementation Strategy

### MVP First (US1 + US2 — Both P1)

1. Complete Phase 1: Setup (shared config)
2. Complete Phase 2: Foundational (ESLint test overrides)
3. Complete Phase 3: US1 — Unit tests across all workspaces
4. Complete Phase 4: US2 — Pre-commit hooks
5. **STOP and VALIDATE**: `pnpm test` works, commits are gated by lint + typecheck
6. Deploy/demo if ready — this covers the core value proposition

### Incremental Delivery

1. Setup + Foundational → Shared config ready
2. Add US1 → Unit tests work across all workspaces (MVP!)
3. Add US2 → Commits are quality-gated → Deploy/Demo
4. Add US3 → E2E tests for web app → Deploy/Demo
5. Add US4 → Coverage reporting polished → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers after Phase 2 is complete:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (unit tests — 12 parallel workspace configs)
   - Developer B: US2 (Husky + lint-staged — sequential tasks)
   - Developer C: US3 (Playwright E2E — sequential tasks)
3. US4 starts after US1 completes (depends on test infrastructure)
4. Polish phase after all stories are done

---

## Notes

- [P] tasks = different files, no dependencies — safe to parallelize
- [Story] label maps task to specific user story for traceability
- US1 and US2 are both P1 priority — implement both for MVP
- US3 and US4 are P2 — implement after MVP is validated
- Smoke tests are included as verification, not as a TDD requirement
- Commit after each task or logical group
- The existing Jest setup in apps/api is preserved — only coverage reporter config is updated
