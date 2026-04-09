# Research: Testing Infrastructure, Coverage & Pre-Commit Quality Gates

**Feature**: 007-testing-coverage-husky  
**Date**: 2026-04-09

## R1: Unit Testing Framework for Frontend Workspaces

**Decision**: Vitest for all frontend workspaces (web, www, desktop) and shared packages (shared, store, ui). Keep Jest for apps/api.

**Rationale**:
- apps/api already has Jest configured with ts-jest, @nestjs/testing, and an existing spec test. NestJS ecosystem is heavily Jest-oriented. Migrating would add risk with no benefit.
- Frontend workspaces use Vite (desktop) or Next.js with React 19. Vitest has native ESM support, faster execution via Vite's transform pipeline, and first-class TypeScript support without ts-jest.
- Vitest API is Jest-compatible, reducing cognitive overhead when switching between workspaces.
- @testing-library/react works identically with both Jest and Vitest.

**Alternatives considered**:
- Jest everywhere: Would require ts-jest or @swc/jest for all workspaces, slower transforms, more config overhead for ESM-heavy frontend code.
- Vitest everywhere (including api): Would break existing NestJS testing patterns and require rewriting the test module setup.

## R2: Vitest Configuration Strategy

**Decision**: Use a shared Vitest config in `packages/config` with per-workspace overrides.

**Rationale**:
- Consistent defaults (coverage provider, reporters, test patterns) across all workspaces.
- Each workspace can override environment (jsdom for React, node for shared), include/exclude paths, and setup files.
- Coverage provider: `v8` (built-in, faster than Istanbul for Vitest, supported on Node 22).

**Alternatives considered**:
- Separate full configs per workspace: More duplication, harder to enforce consistency.
- Single root-level config: Doesn't work well with Turborepo's per-workspace task execution.

## R3: Playwright E2E Testing Setup

**Decision**: Playwright in `apps/web` only (initial scope). Separate `e2e/` directory within apps/web.

**Rationale**:
- apps/web is the primary authenticated portal with the most complex user flows.
- Playwright supports multiple browsers, auto-waits, built-in assertions, tracing, and screenshot capture on failure.
- Separate `e2e/` directory keeps E2E tests distinct from unit tests to avoid Vitest picking them up.
- webServer config in playwright.config can auto-start the Next.js dev server.

**Alternatives considered**:
- Root-level e2e/ directory: Would work but couples E2E tests away from the app they test. Harder for workspace-scoped CI.
- Cypress: Heavier, commercial model for parallel execution, Playwright has better performance and multi-browser support.

## R4: Pre-Commit Hook Strategy

**Decision**: Husky v9 + lint-staged. Pre-commit runs lint (on staged files) + typecheck (full workspace).

**Rationale**:
- Husky v9 uses native git hooks directory (`.husky/`), auto-installs via pnpm `prepare` script.
- lint-staged runs ESLint only on staged files (fast incremental checks).
- Typecheck must run on the full project (not just staged files) because type errors can cascade across files. Turbo's cache makes repeated typechecks fast.
- Unit tests are NOT included in pre-commit (too slow). They run in CI and on-demand locally.

**Alternatives considered**:
- lefthook: Simpler config but less ecosystem support and fewer examples for pnpm monorepos.
- Simple shell script in .husky/pre-commit without lint-staged: Would lint all files, not just staged ones — slower and noisier.
- Including tests in pre-commit: Would make commits take 30+ seconds, discouraging frequent commits.

## R5: Coverage Reporting

**Decision**: Terminal summary + lcov format for all workspaces. Coverage directory per workspace, gitignored.

**Rationale**:
- Terminal summary gives instant feedback during development.
- lcov format is the standard for CI tools (Codecov, Coveralls, SonarQube) if needed later.
- No coverage thresholds enforced initially — infrastructure is ready, thresholds can be added when baseline is established.
- Turbo's `test` task already has `"outputs": ["coverage/**"]` configured — caching works out of the box.

**Alternatives considered**:
- HTML reports: Nice for local exploration but adds complexity. Can be added later with a `test:cov` script variant.
- Enforcing thresholds from day one: Would block development on untested legacy code.

## R6: Testing Library Selection for React Components

**Decision**: @testing-library/react + @testing-library/jest-dom for React component testing in web, desktop, and ui packages.

**Rationale**:
- Testing Library promotes testing user behavior over implementation details.
- @testing-library/jest-dom provides custom matchers (toBeInTheDocument, toHaveTextContent) that work with both Jest and Vitest.
- React 19 is fully supported by @testing-library/react v16+.
- jsdom environment in Vitest provides the DOM simulation needed for component tests.

**Alternatives considered**:
- Enzyme: Deprecated, doesn't support React 19.
- React Testing Renderer directly: Lower-level API, more boilerplate, less ergonomic for UI assertions.

## R7: Test File Conventions

**Decision**: 
- Unit tests: `*.test.ts(x)` co-located with source files (frontend) or `*.spec.ts` in source (api, following NestJS convention).
- E2E tests: `*.spec.ts` in `apps/web/e2e/` (Playwright convention).

**Rationale**:
- Co-located tests reduce navigation overhead and make it obvious which files have tests.
- Preserving `.spec.ts` for NestJS follows the framework's generator convention and doesn't require reconfiguring the existing test regex.
- Playwright uses `.spec.ts` by convention — the separate `e2e/` directory avoids conflicts with Vitest.

**Alternatives considered**:
- Separate `__tests__/` directories: Adds directory depth, harder to see coverage gaps at a glance.
- Unified extension across all apps: Would require changing existing API test patterns for no benefit.
