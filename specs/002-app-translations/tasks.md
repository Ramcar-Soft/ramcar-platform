# Tasks: App Translations (i18n)

**Input**: Design documents from `/specs/002-app-translations/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the `@ramcar/i18n` shared translations package that serves as the single source of truth for all translations across web and desktop apps.

- [x] T001 Create package directory and initialize `packages/i18n/package.json` with name `@ramcar/i18n`, exports for `"."` and `"./messages/es"`, `"./messages/en"`, following `@ramcar/shared` source-export pattern
- [x] T002 Create `packages/i18n/tsconfig.json` extending `@ramcar/config` shared tsconfig with `resolveJsonModule: true`
- [x] T003 Create Spanish translation file `packages/i18n/src/messages/es.json` with all initial keys covering: `common` (appName, loading, error), `auth.login` (title, description, emailLabel, emailPlaceholder, passwordLabel, passwordPlaceholder, submitButton, submittingButton), `auth.logout` (button), `dashboard` (welcome with `{name}` interpolation, signedInMessage, emailLabel, roleLabel), `languageSwitcher` (label, es, en)
- [x] T004 Create English translation file `packages/i18n/src/messages/en.json` with the same key structure as `es.json`, containing English translations for all keys
- [x] T005 [P] Create `packages/i18n/src/messages/es.ts` re-exporting the JSON default and `packages/i18n/src/messages/en.ts` doing the same for English
- [x] T006 [P] Create `packages/i18n/src/locales.ts` exporting `LOCALES` (`["es", "en"] as const`), `Locale` type, `DEFAULT_LOCALE` constant (`"es"`), and `LOCALE_LABELS` record (`{ es: "Español", en: "English" }`)
- [x] T007 Create `packages/i18n/src/index.ts` re-exporting everything from `locales.ts`, plus `messages` object (`{ es, en } as const`), and `Messages` type (inferred from `es.json`)
- [x] T008 Register `packages/i18n` in root `pnpm-workspace.yaml` (verify it is covered by existing `packages/*` glob) and run `pnpm install` to link the workspace package

**Checkpoint**: `@ramcar/i18n` package is importable from any app in the monorepo. Run `pnpm typecheck` to verify.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Install i18n libraries in both consumer apps and configure the infrastructure that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T009 Add `next-intl` dependency to `apps/web/package.json` and add `@ramcar/i18n` as workspace dependency, then run `pnpm install`
- [x] T010 Add `i18next` and `react-i18next` dependencies to `apps/desktop/package.json` and add `@ramcar/i18n` as workspace dependency, then run `pnpm install`
- [x] T011 Update `apps/web/next.config.ts` to wrap config with `createNextIntlPlugin("./src/i18n/request.ts")` from `next-intl/plugin`, preserving existing `transpilePackages` — add `@ramcar/i18n` to transpilePackages array
- [x] T012 Create `apps/web/src/i18n/routing.ts` with `defineRouting({ locales: ["es", "en"], defaultLocale: "es", localePrefix: "as-needed" })` and export `Link`, `redirect`, `usePathname`, `useRouter` from `createNavigation(routing)`
- [x] T013 Create `apps/web/src/i18n/request.ts` with `getRequestConfig` that loads messages from `@ramcar/i18n/messages/es` and `@ramcar/i18n/messages/en` based on resolved locale
- [x] T014 Create `apps/web/src/types/next-intl.d.ts` with global `IntlMessages` interface extending `Messages` type from `@ramcar/i18n` for type-safe `useTranslations()`
- [x] T015 Create `apps/desktop/src/i18n/index.ts` initializing i18next with `initReactI18next` plugin, loading `es` and `en` resources from `@ramcar/i18n`, setting `lng: "es"`, `fallbackLng: "es"`, `interpolation: { escapeValue: false }`
- [x] T016 Create `apps/desktop/src/types/i18next.d.ts` with module augmentation for `i18next` `CustomTypeOptions` mapping `resources.translation` to `Messages` type from `@ramcar/i18n`
- [x] T017 Add `import "./i18n"` at the top of `apps/desktop/src/main.tsx` (before App render) to initialize i18next on startup

**Checkpoint**: Both apps have i18n libraries configured. `pnpm typecheck` passes. Translation functions (`useTranslations` in web, `useTranslation` in desktop) are available and typed.

---

## Phase 3: User Story 1 — Spanish-Speaking User Navigates the Web App (Priority: P1) 🎯 MVP

**Goal**: All web app interface text displays in Spanish by default when accessed without a language prefix in the URL.

**Independent Test**: Navigate to `http://localhost:3000/` and `http://localhost:3000/login` — all visible text (nav labels, form labels, buttons, headings) is in Spanish. No English strings remain in the UI.

### Implementation for User Story 1

- [x] T018 [US1] Restructure web app routes: move `apps/web/src/app/(auth)/` directory to `apps/web/src/app/[locale]/(auth)/` and move `apps/web/src/app/(protected)/` to `apps/web/src/app/[locale]/(protected)/`
- [x] T019 [US1] Create `apps/web/src/app/[locale]/layout.tsx` with `NextIntlClientProvider`, `<html lang={locale}>`, locale validation against routing config, and font/body setup (move from current root layout)
- [x] T020 [US1] Simplify `apps/web/src/app/layout.tsx` to a minimal shell: just `<html>` with fonts import, `globals.css`, and `{children}` — remove `<html lang>` since it moves to `[locale]/layout.tsx`
- [x] T021 [US1] Create `apps/web/src/middleware.ts` composing next-intl middleware with Supabase auth middleware: run `createIntlMiddleware(routing)` first for locale resolution, then call `updateSession()` for auth — update path checks in `updateSession` to be locale-aware (strip locale prefix before checking `/login`)
- [x] T022 [US1] Update `apps/web/src/features/auth/components/login-form.tsx` to use `useTranslations("auth.login")` — replace hardcoded "RamcarSoft", "Enter your credentials...", "Email", "Password", "Sign In", "Signing in..." with `t()` calls
- [x] T023 [US1] Update `apps/web/src/app/[locale]/(protected)/page.tsx` to use `getTranslations("dashboard")` — replace hardcoded "Welcome, {fullName}", "You are signed in...", "Email", "Role", "Sign Out" with `t()` calls; use locale-aware `redirect` from `@/i18n/routing` instead of `next/navigation`
- [x] T024 [US1] Update `apps/web/src/features/auth/actions/login.ts` to use `redirect` from `@/i18n/routing` instead of `next/navigation`, and update `revalidatePath` call
- [x] T025 [US1] Update `apps/web/src/features/auth/actions/logout.ts` to use `redirect` from `@/i18n/routing` instead of `next/navigation`
- [x] T026 [US1] Update `apps/web/src/app/[locale]/(protected)/layout.tsx` to use `redirect` from `@/i18n/routing` for the auth guard redirect to `/login`
- [x] T027 [US1] Update `apps/web/src/app/[locale]/(auth)/login/page.tsx` imports if path aliases changed during restructure
- [x] T028 [US1] Set `<html lang={locale}>` in `apps/web/src/app/[locale]/layout.tsx` and update metadata `title`/`description` using `getTranslations("metadata")` — add `metadata` namespace to translation JSON files with `title` and `description` keys

**Checkpoint**: Navigate to `/` — all interface text is in Spanish. No hardcoded English strings remain. `pnpm typecheck` and `pnpm build --filter @ramcar/web` pass.

---

## Phase 4: User Story 2 — English-Speaking User Navigates via /en Prefix (Priority: P2)

**Goal**: All web app pages are accessible in English when the URL includes the `/en` prefix. Internal navigation preserves the language prefix.

**Independent Test**: Navigate to `http://localhost:3000/en` and `http://localhost:3000/en/login` — all visible text is in English. Click internal links and confirm `/en` prefix is preserved.

### Implementation for User Story 2

- [x] T029 [US2] Verify all internal `<Link>` and `<a>` elements in web app use `Link` from `@/i18n/routing` (not `next/link`) to preserve locale prefix — update `apps/web/src/app/[locale]/(protected)/page.tsx` and any other components with navigation links
- [x] T030 [US2] Verify that the `apps/web/src/middleware.ts` correctly handles `/en/*` routes — test that `/en`, `/en/login` resolve to English locale and serve English translations
- [x] T031 [US2] Verify that the 404 page (if any) respects the locale prefix — if a user navigates to `/en/nonexistent`, the error should be in English
- [x] T032 [US2] Verify that auth redirects (login → dashboard, dashboard → login) preserve the `/en` prefix when user is browsing in English — test the full login flow starting from `/en/login`

**Checkpoint**: Navigate to `/en/login`, complete login flow — all text is English, redirects stay within `/en/*`. Navigate to `/login`, complete login flow — all text is Spanish, redirects have no prefix.

---

## Phase 5: User Story 3 — User Switches Language on the Web App (Priority: P3)

**Goal**: A visible language switcher allows users to switch between Spanish and English from any page, redirecting to the equivalent page in the selected language.

**Independent Test**: On any page, click the language switcher — URL changes (adds/removes `/en` prefix), all content updates to the selected language, current page location is preserved.

### Implementation for User Story 3

- [x] T033 [US3] Create `apps/web/src/shared/components/language-switcher.tsx` — a client component using `useRouter`, `usePathname` from `@/i18n/routing` and `LOCALES`, `LOCALE_LABELS` from `@ramcar/i18n` to render a toggle/dropdown showing current language and available alternative
- [x] T034 [US3] Add the `LanguageSwitcher` component to `apps/web/src/app/[locale]/(auth)/layout.tsx` in an accessible position (e.g., top-right corner of the auth layout)
- [x] T035 [US3] Add the `LanguageSwitcher` component to `apps/web/src/app/[locale]/(protected)/layout.tsx` or the `[locale]/layout.tsx` in a consistent header/navigation position visible on all protected pages
- [x] T036 [US3] Verify that switching from `/login` (Spanish) redirects to `/en/login` (English) and vice versa, and that switching from `/` (Spanish dashboard) redirects to `/en` (English dashboard)

**Checkpoint**: Language switcher is visible on all pages. Clicking it switches language and preserves current location. Both directions work (es→en and en→es).

---

## Phase 6: User Story 4 — Guard Uses Desktop App in Preferred Language (Priority: P4)

**Goal**: The desktop app displays interface text in the user's preferred language (Spanish by default) with a setting to switch to English that persists across app restarts.

**Independent Test**: Open the desktop app — UI is in Spanish. Change language setting to English — UI updates immediately. Close and reopen the app — UI loads in English (persisted).

### Implementation for User Story 4

- [x] T037 [P] [US4] Create `apps/desktop/electron/repositories/settings-repository.ts` — implements reading/writing a `settings.json` file at `app.getPath("userData")` with `getLanguage(): string` (returns stored locale or `"es"` default) and `setLanguage(locale: string): void`
- [x] T038 [P] [US4] Create IPC handlers in `apps/desktop/electron/ipc/settings-handlers.ts` — register `ipcMain.handle("get-language", ...)` and `ipcMain.handle("set-language", ...)` delegating to `SettingsRepository`
- [x] T039 [US4] Update `apps/desktop/electron/main.ts` to import and register the settings IPC handlers on app ready
- [x] T040 [US4] Update `apps/desktop/electron/preload.ts` to expose `getLanguage()` and `setLanguage(locale)` via `contextBridge.exposeInMainWorld("api", { ... })` using `ipcRenderer.invoke`
- [x] T041 [US4] Update `apps/desktop/electron/preload.d.ts` to declare `getLanguage` and `setLanguage` on the `ElectronAPI` interface
- [x] T042 [US4] Update `apps/desktop/src/i18n/index.ts` to export a `initializeLanguage()` async function that reads the persisted language via `window.api.getLanguage()` and calls `i18n.changeLanguage()`; call this in `apps/desktop/src/main.tsx` before rendering
- [x] T043 [US4] Update `apps/desktop/src/features/auth/pages/login-page.tsx` to use `useTranslation()` hook — replace hardcoded "RamcarSoft", "Enter your credentials..." with `t()` calls
- [x] T044 [US4] Update `apps/desktop/src/features/auth/components/login-form.tsx` to use `useTranslation()` hook — replace hardcoded "Email", "Password", "Sign In", "Signing in...", "Login failed" with `t()` calls
- [x] T045 [US4] Create `apps/desktop/src/shared/components/language-switcher.tsx` — a React component using `useTranslation()` and `LOCALES`/`LOCALE_LABELS` from `@ramcar/i18n`, calling `i18n.changeLanguage()` and `window.api.setLanguage()` on selection
- [x] T046 [US4] Add the desktop `LanguageSwitcher` component to an accessible location in the desktop app layout (e.g., login page header or app settings area)

**Checkpoint**: Open desktop app — UI in Spanish. Switch to English — text updates instantly. Close and reopen — English persists. Switch back to Spanish — works correctly.

---

## Phase 7: User Story 5 — Translator Adds or Updates Translations (Priority: P5)

**Goal**: A developer/translator can add new translation keys in a single location (`@ramcar/i18n`) and have them reflected in both web and desktop apps after rebuild.

**Independent Test**: Add a new key to both `es.json` and `en.json` in `packages/i18n/src/messages/`, reference it in any component, rebuild — the new translation appears in both apps.

### Implementation for User Story 5

- [x] T047 [US5] Verify that adding a new key to `packages/i18n/src/messages/es.json` and `packages/i18n/src/messages/en.json` is automatically reflected in the `Messages` type without manual type updates
- [x] T048 [US5] Verify that `pnpm typecheck` catches missing translation keys — if a key exists in `es.json` but not in `en.json`, TypeScript or runtime should surface the discrepancy
- [x] T049 [US5] Update `specs/002-app-translations/quickstart.md` with verified workflow for adding translations, including examples for both web (server/client components) and desktop usage patterns

**Checkpoint**: The translation workflow documented in quickstart.md is validated end-to-end.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, fallback behavior, SEO metadata, and cleanup.

- [x] T050 [P] Verify fallback behavior: temporarily remove a key from `en.json`, navigate to `/en` — the Spanish fallback value should display instead of a blank or raw key
- [x] T051 [P] Verify SEO: check that `<html lang="es">` is set for Spanish pages and `<html lang="en">` for English pages; verify metadata (title, description) is translated per locale
- [x] T052 [P] Verify that unsupported locale prefixes (e.g., `/fr/login`) are handled gracefully — should result in 404 or redirect to default locale, not a translation error
- [x] T053 Run `pnpm lint`, `pnpm typecheck`, and `pnpm build` across all workspaces to confirm no regressions
- [x] T054 Verify desktop app works fully offline with both languages — disconnect network, switch languages, confirm all translations load from bundled resources

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — Web app locale routing + Spanish integration
- **US2 (Phase 4)**: Depends on US1 — Verifies English routing on top of US1 infrastructure
- **US3 (Phase 5)**: Depends on US1 — Adds language switcher to existing locale-routed web app
- **US4 (Phase 6)**: Depends on Foundational only — Desktop i18n is independent of web app stories
- **US5 (Phase 7)**: Depends on US1 + US4 — Validates end-to-end workflow across both apps
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (Phase 2). No other story dependencies. **MVP target.**
- **US2 (P2)**: Depends on US1 (locale routing infrastructure)
- **US3 (P3)**: Depends on US1 (locale routing infrastructure). Can run in parallel with US2.
- **US4 (P4)**: Depends on Foundational only. **Can run in parallel with US1/US2/US3.**
- **US5 (P5)**: Depends on US1 + US4 (needs both apps integrated)

### Within Each User Story

- Infrastructure changes before component updates
- Layouts and routing before page-level changes
- Server actions updated after routing changes
- Verification tasks last

### Parallel Opportunities

- **Phase 1**: T005 and T006 can run in parallel (separate files)
- **Phase 2**: T009 and T010 can run in parallel (separate apps); T014, T015, T016 can run in parallel (separate apps/files)
- **Phase 3 + Phase 6**: US1 (web) and US4 (desktop) can run in parallel after Foundational completes — they touch entirely different apps
- **Phase 4 + Phase 5**: US2 and US3 can run in parallel — US2 is verification, US3 adds a new component; no file conflicts
- **Phase 6**: T037 and T038 can run in parallel (separate files in main process)
- **Phase 8**: T050, T051, T052 can all run in parallel (independent verification tasks)

---

## Parallel Example: US1 (Web) + US4 (Desktop) After Foundational

```text
# After Phase 2 completes, launch web and desktop integration in parallel:

## Agent A (Web — US1):
Task T018: Restructure routes under [locale]
Task T019: Create [locale] layout
Task T020: Simplify root layout
Task T021: Create middleware
Task T022-T028: Replace hardcoded strings

## Agent B (Desktop — US4):
Task T037: Create settings repository (parallel with T038)
Task T038: Create IPC handlers (parallel with T037)
Task T039: Register IPC handlers in main.ts
Task T040-T041: Update preload
Task T042-T046: Replace hardcoded strings + language switcher
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`@ramcar/i18n` package)
2. Complete Phase 2: Foundational (i18n libraries installed + configured)
3. Complete Phase 3: User Story 1 (web app fully in Spanish by default)
4. **STOP and VALIDATE**: Navigate `/` and `/login` — all text is in Spanish
5. Deploy/demo if ready — English routing already works via `/en` prefix

### Incremental Delivery

1. Setup + Foundational → Shared package ready, libraries configured
2. US1 → Spanish default web app (**MVP!**) — `/en` also works but not yet validated
3. US2 → English routing verified, auth flow tested end-to-end
4. US3 → Language switcher added — users can discover and switch languages
5. US4 → Desktop app fully translated with persistence
6. US5 → Translator workflow validated, quickstart updated
7. Polish → Fallback, SEO, edge cases verified

### Parallel Team Strategy

With two developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - **Developer A**: US1 → US2 → US3 (web app track)
   - **Developer B**: US4 (desktop track)
3. Both join for US5 + Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US4 can be fully parallelized (different apps, no shared files)
- US2 and US3 can be parallelized (verification vs. new component)
- No test tasks generated — tests were not explicitly requested in the spec
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
