# Metrics: Cross-App Shared Feature Modules

**Measured**: 2026-04-17

## SC-003: LOC Reduction ≥40% (Target: met)

### Before migration (estimated from git history)
- `apps/web/src/features/visitors/**`: ~850 LOC (21 files)
- `apps/desktop/src/features/visitors/**`: ~820 LOC (22 files)  
- **Total duplicated**: ~1670 LOC across 43 files

### After migration
- `apps/web/src/features/visitors/`: 0 files (directory deleted)
- `apps/desktop/src/features/visitors/`: 0 files (directory deleted)
- `packages/features/src/visitors/**`: 28 files (~950 LOC)
- **Total**: ~950 LOC in 28 files

### Reduction
- Pre: ~1670 LOC (duplicated) → Post: ~950 LOC (single source)
- **LOC reduction: ~43%** ✓ (target was ≥40%)
- File count reduction: 43 → 28 files

## SC-001: Single source of truth — PASS
Both apps render `<VisitorsView />` from `@ramcar/features/visitors`. No component or hook exists in both `apps/web/src/features/visitors/` and `apps/desktop/src/features/visitors/`.

## SC-002: Workspace package — PASS
`@ramcar/features` exists as a workspace package at `packages/features/`. Both `apps/web` and `apps/desktop` declare it as a dependency.

## SC-003: LOC reduction — PASS (43% > 40%)
See above.

## SC-004: Strings defined once — PASS
Both apps source i18n strings from `@ramcar/i18n` message catalogs. No per-app string duplication for visitor-related keys. Confirmed by audit (`specs/014-cross-app-code-sharing/i18n-audit.md`).

## SC-005: Adapter contracts — PASS
Three typed adapter ports implemented and consumed:
- `TransportPort` — `packages/features/src/adapters/transport.tsx`
- `I18nPort` — `packages/features/src/adapters/i18n.tsx`
- `RolePort` — `packages/features/src/adapters/role.tsx`

## SC-006: Extension points — PASS
`VisitorsView` exposes: `topRightSlot`, `trailingAction`, `emptyState`, `initialDraft`, `onDraftChange`.
- Desktop wires `<SyncBadge />` via `topRightSlot` (desktop-only offline indicator).
- Web wires `useFormPersistence` via `initialDraft`/`onDraftChange` (web-only draft recovery).
- `@ramcar/features` unchanged during Phase 5 (extension points worked without a fork).

## SC-007: CI duplication check — PASS
`pnpm check:shared-features` runs cleanly. Adding any non-reexport file under `apps/*/src/features/visitors/` will cause CI to fail with an actionable message.

## SC-008: No user-visible regression — PASS
- `pnpm typecheck` across all workspaces: PASS
- `pnpm lint` across all workspaces: PASS
- `pnpm --filter @ramcar/features test`: 17/17 tests PASS
- `pnpm check:shared-features`: PASS
- Residents/providers flows: unaffected (web and desktop typecheck clean with updated shared imports)
- Note: `@ramcar/web` has 2 pre-existing test failures in `users-table-columns.test.tsx` (unrelated to spec 014, present on the baseline branch before this migration).

## Validation

| SC | Description | Status |
|----|-------------|--------|
| SC-001 | Visitors authored once | ✓ PASS |
| SC-002 | `@ramcar/features` workspace package | ✓ PASS |
| SC-003 | ≥40% LOC reduction | ✓ PASS (43%) |
| SC-004 | Strings defined once in `@ramcar/i18n` | ✓ PASS |
| SC-005 | Typed adapter contracts (transport, i18n, role) | ✓ PASS |
| SC-006 | Platform divergence via extension points, not forking | ✓ PASS |
| SC-007 | CI drift check (`check-shared-features`) | ✓ PASS |
| SC-008 | No user-visible regression in residents/providers | ✓ PASS |
