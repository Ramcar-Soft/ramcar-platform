# Quickstart: Testing Infrastructure, Coverage & Pre-Commit Quality Gates

**Feature**: 007-testing-coverage-husky  
**Date**: 2026-04-09

## Prerequisites

- Node.js 22 LTS
- pnpm 10.x
- Repository cloned and `pnpm install` completed (this auto-installs Husky hooks)

## Running Unit Tests

```bash
# Run all tests across the monorepo
pnpm test

# Run tests for a specific workspace
pnpm --filter @ramcar/web test
pnpm --filter @ramcar/api test
pnpm --filter @ramcar/shared test

# Run tests in watch mode (workspace-specific)
pnpm --filter @ramcar/web test:watch

# Run tests with coverage report
pnpm --filter @ramcar/web test:cov
pnpm --filter @ramcar/api test:cov
```

## Running E2E Tests

```bash
# Run Playwright E2E tests (auto-starts dev server)
pnpm --filter @ramcar/web test:e2e

# Run with visible browser (headed mode)
pnpm --filter @ramcar/web test:e2e -- --headed

# Run a specific test file
pnpm --filter @ramcar/web test:e2e -- e2e/login.spec.ts

# Open Playwright UI mode for debugging
pnpm --filter @ramcar/web test:e2e:ui

# View last test report
pnpm --filter @ramcar/web test:e2e:report
```

## Pre-Commit Hooks

Pre-commit hooks run automatically on `git commit`. No manual setup needed after `pnpm install`.

```bash
# What happens on commit:
# 1. lint-staged runs ESLint on staged .ts/.tsx files
# 2. turbo typecheck runs across affected workspaces
# 3. If either fails → commit is blocked with error output

# To bypass hooks (emergency only — CI will still catch issues):
git commit --no-verify -m "emergency: fix critical issue"
```

## Writing Tests

### Unit Test (Vitest — web, desktop, packages)

Create a `.test.ts` or `.test.tsx` file next to the source file:

```typescript
// src/features/auth/utils/validate-email.test.ts
import { describe, it, expect } from 'vitest'
import { validateEmail } from './validate-email'

describe('validateEmail', () => {
  it('accepts valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true)
  })

  it('rejects invalid email addresses', () => {
    expect(validateEmail('not-an-email')).toBe(false)
  })
})
```

### Unit Test (Jest — api)

Create a `.spec.ts` file next to the source file:

```typescript
// src/modules/auth/auth.service.spec.ts
import { Test } from '@nestjs/testing'
import { AuthService } from './auth.service'

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AuthService],
    }).compile()
    service = module.get(AuthService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
```

### E2E Test (Playwright — web)

Create a `.spec.ts` file in `apps/web/e2e/`:

```typescript
// apps/web/e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test('login page renders', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
})
```

## Coverage Reports

After running `pnpm test` or `pnpm --filter <workspace> test:cov`:

- **Terminal**: Coverage summary printed to stdout
- **Detailed report**: `{workspace}/coverage/lcov.info` (for CI tools)
- **Coverage directory** is gitignored — not committed to the repository
