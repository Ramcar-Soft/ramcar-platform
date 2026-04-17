# i18n Audit — Cross-App Shared Feature Modules

**Audited**: 2026-04-17

## Finding

Both `apps/web` and `apps/desktop` already consume message catalogs exclusively from `@ramcar/i18n`:

- **Web** (`apps/web/src/i18n/request.ts`): imports `messages` from `@ramcar/i18n`, no per-app overrides.
- **Desktop** (`apps/desktop/src/i18n/index.ts`): imports `es` and `en` from `@ramcar/i18n/messages/*`, no per-app overrides.

## All visitor-related namespaces verified present in `@ramcar/i18n`

| Namespace | Keys verified |
|-----------|--------------|
| `visitPersons.*` | title, searchPlaceholder, registerNew, columns, status, sidebar, form, edit, actions, empty, emptySearch, errorLoading, messages |
| `accessEvents.*` | title, direction, accessMode, lastEvent, vehicleSelect, notes, form, messages |
| `images.*` | title, upload, uploading, replace, replaceAria, uploadStarted, invalidFile, selectTypeHint, stagedBadge, types |
| `vehicles.*` | title, vehicleType, brand, model, plate, color, notes, form, messages, noVehicles |
| `common.*` | appName, loading, error, draftRestored, discardDraft |

## Action Required

None. T027-T029 are complete — no keys need to be added or removed from either app.
The i18n adapter (`I18nPort`) surfaces the shared catalog to `@ramcar/features` without any per-app duplication.
