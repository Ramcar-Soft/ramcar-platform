# Data Model: Testing Infrastructure, Coverage & Pre-Commit Quality Gates

**Feature**: 007-testing-coverage-husky  
**Date**: 2026-04-09

## Overview

This feature does not introduce new database entities or persistent data models. It adds development tooling (testing frameworks, coverage reporters, pre-commit hooks) that operate on the codebase itself.

## Configuration Entities

### Test Configuration (per workspace)

Each workspace that supports testing has a configuration defining:
- **Test runner**: Which framework executes tests (Vitest or Jest)
- **Test environment**: Runtime simulation (jsdom for browser, node for server)
- **Coverage provider**: How code coverage is measured (v8 or istanbul)
- **Include/exclude patterns**: Which files are tested and which are skipped
- **Setup files**: Global test setup (DOM matchers, mock configuration)

### Pre-Commit Hook Configuration

- **Hook type**: pre-commit (runs before git commit is finalized)
- **Lint scope**: Staged files only (incremental, fast)
- **Typecheck scope**: Full workspace (required for correctness, cached by Turbo)
- **Exit behavior**: Non-zero exit code blocks the commit

### Coverage Report

- **Format**: Terminal summary (human-readable) + lcov (machine-parseable)
- **Metrics**: Line coverage, branch coverage, function coverage (per file)
- **Output location**: `coverage/` directory within each workspace (gitignored)
- **Thresholds**: None enforced initially (0% minimum)

## File Artifacts Produced

| Artifact | Location | Purpose |
| -------- | -------- | ------- |
| Unit test results | Terminal stdout | Pass/fail feedback |
| Coverage report (text) | Terminal stdout | Quick coverage overview |
| Coverage report (lcov) | `{workspace}/coverage/lcov.info` | CI integration |
| E2E screenshots | `apps/web/e2e/test-results/` | Failure debugging |
| E2E traces | `apps/web/e2e/test-results/` | Step-by-step replay |
| Playwright HTML report | `apps/web/e2e/playwright-report/` | Visual test report |
