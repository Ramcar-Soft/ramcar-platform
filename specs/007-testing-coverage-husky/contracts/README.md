# Contracts: Testing Infrastructure

No external API contracts for this feature. This is internal development tooling.

## Internal Contracts (Developer-Facing)

### Test Script Convention

Every workspace with tests MUST expose these npm scripts:

| Script | Description | Required |
| ------ | ----------- | -------- |
| `test` | Run all unit tests | Yes |
| `test:watch` | Run tests in watch mode | Yes |
| `test:cov` | Run tests with coverage report | Yes |
| `test:e2e` | Run E2E tests (web only) | apps/web only |

### Test File Naming Convention

| Workspace | Pattern | Extension | Location |
| --------- | ------- | --------- | -------- |
| apps/web, apps/www, apps/desktop | `*.test.ts(x)` | .test.ts / .test.tsx | Co-located with source |
| apps/api | `*.spec.ts` | .spec.ts | Co-located with source |
| packages/* | `*.test.ts(x)` | .test.ts / .test.tsx | Co-located with source |
| E2E (web) | `*.spec.ts` | .spec.ts | `apps/web/e2e/` |

### Coverage Output Convention

All workspaces output coverage to `{workspace}/coverage/` in both text (terminal) and lcov formats.
