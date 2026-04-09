# Feature Specification: Testing Infrastructure, Coverage & Pre-Commit Quality Gates

**Feature Branch**: `007-testing-coverage-husky`  
**Created**: 2026-04-09  
**Status**: Draft  
**Input**: User description: "I want to implement playwright tests and unit tests for the project, add coverage and add husky to avoid commit if lint and typecheck is not passing"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Runs Unit Tests Across the Monorepo (Priority: P1)

A developer working on any workspace (web, api, desktop, shared packages) can run unit tests locally to verify their changes don't break existing functionality. Tests run fast, provide clear pass/fail output, and generate coverage reports showing which code paths are exercised.

**Why this priority**: Unit tests are the foundation of code quality. Without them, developers have no fast feedback loop to catch regressions before code reaches review or production.

**Independent Test**: Can be fully tested by running `pnpm test` from the repo root and verifying that tests execute across all workspaces, producing pass/fail results and coverage reports.

**Acceptance Scenarios**:

1. **Given** a developer has made changes to a workspace, **When** they run the test command for that workspace, **Then** all unit tests execute and report pass/fail results within a reasonable time.
2. **Given** unit tests have been run, **When** the developer checks the output, **Then** a coverage report is generated showing line, branch, and function coverage percentages.
3. **Given** the monorepo root, **When** the developer runs the global test command, **Then** tests for all workspaces that have tests execute in sequence via the task runner.

---

### User Story 2 - Pre-Commit Quality Gate Blocks Bad Commits (Priority: P1)

A developer attempts to commit code. Before the commit is finalized, an automated check runs linting and type-checking across the affected code. If either check fails, the commit is rejected with a clear error message indicating what needs to be fixed.

**Why this priority**: Preventing broken code from entering the repository is equally critical to having tests. This enforces code quality standards team-wide without relying on individual discipline.

**Independent Test**: Can be fully tested by attempting to commit code with a deliberate lint error or type error and verifying the commit is blocked.

**Acceptance Scenarios**:

1. **Given** a developer has staged files with lint errors, **When** they attempt to commit, **Then** the commit is rejected and the lint errors are displayed.
2. **Given** a developer has staged files with type errors, **When** they attempt to commit, **Then** the commit is rejected and the type errors are displayed.
3. **Given** a developer has staged files that pass all checks, **When** they attempt to commit, **Then** the commit succeeds normally.
4. **Given** a new developer clones the repository, **When** they run the package install command, **Then** the pre-commit hooks are automatically configured without manual setup.

---

### User Story 3 - Developer Runs End-to-End Tests for the Web Application (Priority: P2)

A developer or CI pipeline runs end-to-end tests against the web application using a browser automation tool. These tests simulate real user interactions (navigation, form submission, authentication flows) and verify the application works correctly from the user's perspective.

**Why this priority**: E2E tests catch integration issues that unit tests miss — broken routes, missing API connections, UI rendering problems. However, they require a running application and are slower, making them secondary to unit tests and pre-commit hooks.

**Independent Test**: Can be fully tested by starting the web application and running the E2E test suite, verifying that browser-based tests execute and report results.

**Acceptance Scenarios**:

1. **Given** the web application is running locally, **When** the developer runs the E2E test command, **Then** browser-based tests execute against the running app and report pass/fail results.
2. **Given** E2E tests are configured, **When** a developer adds a new test file following the established pattern, **Then** it is automatically discovered and executed with the test suite.
3. **Given** an E2E test fails, **When** the developer reviews the output, **Then** they see a clear error message, screenshots of the failure state, and a trace file for debugging.

---

### User Story 4 - Developer Reviews Coverage Reports (Priority: P2)

After running tests, a developer can review coverage reports to identify untested code paths. Coverage thresholds can be configured to ensure minimum coverage levels are maintained as the project grows.

**Why this priority**: Coverage reporting provides visibility into testing gaps and helps teams make informed decisions about where to invest testing effort.

**Independent Test**: Can be fully tested by running tests with coverage enabled and verifying that reports are generated in a readable format.

**Acceptance Scenarios**:

1. **Given** tests have been run with coverage enabled, **When** the developer opens the coverage report, **Then** they see per-file and per-workspace coverage statistics.
2. **Given** coverage thresholds are configured, **When** tests run and coverage falls below the threshold, **Then** the test run reports a warning (not a failure, to allow gradual adoption).

---

### Edge Cases

- What happens when a developer bypasses the pre-commit hook (e.g., `--no-verify`)? The hook can be bypassed intentionally, but CI should catch issues as a second safety net.
- What happens when a workspace has no tests? The test command should succeed (skip gracefully) rather than fail for workspaces with no test files.
- What happens when E2E tests run without the application server? The test runner should provide a clear error message indicating the app must be running, or optionally start the dev server automatically.
- What happens when a new package is added to the monorepo? It should automatically participate in the lint/typecheck pre-commit checks without additional configuration.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support running unit tests for each workspace (web, api, desktop, shared packages) independently.
- **FR-002**: The system MUST support running all unit tests across the monorepo from the root with a single command.
- **FR-003**: The system MUST generate code coverage reports when unit tests are run, showing line, branch, and function coverage.
- **FR-004**: The system MUST block commits when linting checks fail on staged files.
- **FR-005**: The system MUST block commits when type-checking fails on the project.
- **FR-006**: Pre-commit hooks MUST be automatically installed when a developer runs the package install command (no manual setup required).
- **FR-007**: The system MUST support running end-to-end browser tests against the web application.
- **FR-008**: E2E tests MUST capture screenshots and trace files on test failure for debugging purposes.
- **FR-009**: Coverage reports MUST be output in a format that is both human-readable (terminal output) and machine-parseable (for potential CI integration).
- **FR-010**: The pre-commit hook MUST complete within a reasonable time to not disrupt developer workflow (checks should target staged/affected code, not the entire monorepo).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can run unit tests for any workspace and receive pass/fail results within 30 seconds for an average test suite.
- **SC-002**: 100% of commits go through automated lint and type-check validation before being accepted into the repository.
- **SC-003**: Coverage reports are generated for every test run, providing per-file visibility into tested vs. untested code.
- **SC-004**: E2E tests can simulate a complete user flow (e.g., login, navigate, interact) and report results with failure artifacts (screenshots, traces).
- **SC-005**: New developers can clone the repo, run the install command, and have pre-commit hooks active without any manual configuration steps.
- **SC-006**: Pre-commit quality gate checks complete within 60 seconds for a typical commit to avoid disrupting developer workflow.

## Assumptions

- The existing NestJS API workspace already has Jest configured for unit testing — this will be preserved and extended.
- Frontend workspaces (web, www, desktop) do not currently have any test infrastructure — this needs to be set up from scratch.
- The E2E tests will initially target the web application (`apps/web`) only, as it is the primary authenticated portal. Desktop and www can be added later.
- Coverage thresholds will start at 0% (no enforcement) to allow gradual adoption, with the infrastructure in place to increase thresholds over time.
- The pre-commit hook will run lint and typecheck but NOT unit tests (to keep commit times fast). Tests are expected to run separately or in CI.
- The monorepo uses pnpm, so the `prepare` lifecycle script in root `package.json` will handle automatic hook installation.
