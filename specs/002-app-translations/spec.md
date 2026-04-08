# Feature Specification: App Translations (i18n)

**Feature Branch**: `002-app-translations`  
**Created**: 2026-04-08  
**Status**: Draft  
**Input**: User description: "Implement language translations for web and desktop apps, default language and routes should be spanish, the other should be english, in the web app the content should be translated if the path has the proper language slug, for example /en for home, or /en/visits for visits page or /visits for spanish page, there should be a single source of truth for translation values that are shared across the web and desktop apps to avoid duplication and duplicated effort to translate content"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Spanish-Speaking User Navigates the Web App (Priority: P1)

A Spanish-speaking user opens the web application at the root URL (e.g., `/`, `/visitas`, `/residentes`). All interface text — navigation labels, button text, form labels, headings, error messages, and informational content — is displayed in Spanish without requiring any action from the user. The user interacts with the platform entirely in Spanish as the default experience.

**Why this priority**: Spanish is the default language and the primary audience for this residential security platform. The majority of users (residents, guards, admins) are Spanish-speaking, so the default experience must be fully localized in Spanish.

**Independent Test**: Can be fully tested by navigating to any page without a language prefix and verifying all visible text is in Spanish.

**Acceptance Scenarios**:

1. **Given** a user navigates to `/`, **When** the page loads, **Then** all interface text (navigation, headings, buttons, labels) is displayed in Spanish.
2. **Given** a user navigates to `/visitas`, **When** the page loads, **Then** all content specific to the visits feature is displayed in Spanish.
3. **Given** a user navigates to any page without a language prefix, **When** the page loads, **Then** no English text appears in the interface (excluding proper nouns, brand names, or technical terms that remain untranslated by convention).

---

### User Story 2 - English-Speaking User Navigates the Web App via Language Slug (Priority: P2)

An English-speaking user navigates to the web application using the `/en` language prefix in the URL (e.g., `/en`, `/en/visits`, `/en/residents`). All interface text is displayed in English. The user can browse all pages and features with English translations by maintaining the `/en` prefix in their navigation.

**Why this priority**: English support broadens the platform's accessibility for non-Spanish-speaking residents, administrators, or visitors. URL-based language switching ensures clean, shareable, and bookmarkable links in the desired language.

**Independent Test**: Can be fully tested by navigating to `/en` and any sub-route and verifying all visible text is in English.

**Acceptance Scenarios**:

1. **Given** a user navigates to `/en`, **When** the page loads, **Then** all interface text is displayed in English.
2. **Given** a user navigates to `/en/visits`, **When** the page loads, **Then** all visits-related content is displayed in English.
3. **Given** a user is on an English page and clicks an internal navigation link, **When** the link navigates, **Then** the `/en` prefix is preserved and the destination page is displayed in English.
4. **Given** a user navigates to `/en/some-nonexistent-page`, **When** the 404 page loads, **Then** the error message is displayed in English.

---

### User Story 3 - User Switches Language on the Web App (Priority: P3)

A user viewing the web application in one language wants to switch to the other language. They use a language switcher control (e.g., a dropdown or toggle in the header/navigation area). When they switch, they are redirected to the equivalent page in the selected language, preserving their current location within the app.

**Why this priority**: Users need an intuitive way to discover and switch between available languages without manually editing the URL.

**Independent Test**: Can be fully tested by clicking the language switcher on any page and verifying the URL updates and content changes to the selected language.

**Acceptance Scenarios**:

1. **Given** a user is on `/visitas` (Spanish), **When** they switch the language to English, **Then** they are redirected to `/en/visits` and all content is in English.
2. **Given** a user is on `/en/visits` (English), **When** they switch the language to Spanish, **Then** they are redirected to `/visitas` and all content is in Spanish.
3. **Given** a user is on the home page `/`, **When** they switch to English, **Then** they are redirected to `/en`.
4. **Given** a language switcher control is present, **When** viewing any page, **Then** the switcher clearly indicates the currently active language and the available alternative.

---

### User Story 4 - Guard Uses the Desktop App in Their Preferred Language (Priority: P4)

A guard using the desktop application at the guard booth can view the application interface in either Spanish or English. Since the desktop app does not use URL-based routing, the language preference is selected through an in-app setting. The selected language persists across sessions.

**Why this priority**: Guards at the booth may have different language preferences. The desktop app must support the same translations as the web app for a consistent experience.

**Independent Test**: Can be fully tested by changing the language setting in the desktop app and verifying all interface text updates to the selected language, and that the preference persists after restarting the app.

**Acceptance Scenarios**:

1. **Given** a guard opens the desktop app for the first time, **When** the app loads, **Then** the interface is displayed in Spanish (default language).
2. **Given** a guard changes the language setting to English, **When** the setting is saved, **Then** all interface text updates to English immediately.
3. **Given** a guard previously selected English, **When** they close and reopen the desktop app, **Then** the interface loads in English (preference persisted).
4. **Given** a guard is using the app in English, **When** they switch back to Spanish, **Then** all interface text updates to Spanish immediately.

---

### User Story 5 - Translator Adds or Updates Translations (Priority: P5)

A developer or translator needs to add new translation keys or update existing translation values. They modify the translation files in the shared translation source (single source of truth). After updating, both the web and desktop apps reflect the changes without needing to update translations in multiple locations.

**Why this priority**: A single source of truth for translations eliminates duplication, reduces errors, and ensures consistency across all applications.

**Independent Test**: Can be tested by adding a new translation key to the shared source, then verifying it appears correctly in both the web and desktop apps.

**Acceptance Scenarios**:

1. **Given** a translation key exists in the shared translation source, **When** the web app renders a component using that key, **Then** the correct translated value is displayed for the active language.
2. **Given** the same translation key is used in the desktop app, **When** the desktop app renders the corresponding component, **Then** the same translated value is displayed.
3. **Given** a translator updates a translation value in the shared source, **When** the apps are rebuilt, **Then** both web and desktop apps show the updated value.
4. **Given** a new translation key is added to the shared source, **When** it is referenced in any app, **Then** it displays the correct translation for the active language.

---

### Edge Cases

- What happens when a user navigates to an unsupported language prefix (e.g., `/fr/visits`)? The system should treat it as a regular route (likely resulting in a 404), not attempt to load French translations.
- What happens when a translation key is missing for one language? The system should fall back to the default language (Spanish) to avoid blank text.
- What happens when the desktop app is offline and the language preference changes? The language switch should work entirely offline since translations are bundled locally.
- What happens when a URL path exists in Spanish but the user adds `/en` prefix? The system should map the same content to the English version regardless of the path segment naming convention (e.g., `/visitas` and `/en/visits` show the same page).
- What happens when search engines index the site? Each language version should be independently indexable with proper language metadata for SEO.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support two languages: Spanish (default) and English.
- **FR-002**: The web application MUST display all interface text in Spanish when accessed without a language prefix in the URL path.
- **FR-003**: The web application MUST display all interface text in English when accessed with the `/en` prefix in the URL path.
- **FR-004**: All internal navigation links within the web app MUST preserve the current language context (i.e., maintain or omit the `/en` prefix consistently).
- **FR-005**: The web application MUST provide a visible language switcher control accessible from all pages.
- **FR-006**: The language switcher MUST redirect the user to the equivalent page in the selected language, preserving their current location within the app.
- **FR-007**: The desktop application MUST display all interface text in Spanish by default on first launch.
- **FR-008**: The desktop application MUST provide a language setting that allows the user to switch between Spanish and English.
- **FR-009**: The desktop application MUST persist the selected language preference across application restarts.
- **FR-010**: All translation values MUST be maintained in a single shared source accessible to both the web and desktop applications.
- **FR-011**: When a translation key is missing for the active language, the system MUST fall back to the Spanish (default) translation.
- **FR-012**: The web application MUST serve each language version at a distinct, bookmarkable URL.
- **FR-013**: The web application MUST include appropriate language metadata (e.g., `lang` attribute on the HTML element) matching the active language.
- **FR-014**: The system MUST handle unsupported language prefixes gracefully (e.g., `/fr/visits` should not produce translation errors; it should be treated as a standard route).
- **FR-015**: The desktop application language switching MUST work fully offline, with all translations bundled locally.

### Key Entities

- **Translation Key**: A unique identifier used to reference a translatable string (e.g., `auth.login.title`). Organized hierarchically by feature domain.
- **Translation Value**: The localized text for a given translation key in a specific language. Each key has one value per supported language.
- **Language**: A supported locale with its display name, code (`es`, `en`), and default status. Spanish is the default.
- **Language Preference** (Desktop): A persisted user setting indicating the selected language for the desktop application.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of user-facing interface text in both web and desktop apps is translatable (no hardcoded strings remain in the UI).
- **SC-002**: Users can switch between Spanish and English in under 2 seconds with no page reload failures.
- **SC-003**: A translator can add a new translation key and value for both languages in a single location, and it is reflected in all apps after rebuild.
- **SC-004**: All web app pages are accessible in both languages via their respective URL patterns (no language prefix for Spanish, `/en` prefix for English).
- **SC-005**: The desktop app correctly remembers the user's language preference across 100% of application restarts.
- **SC-006**: When a translation is missing, the fallback language (Spanish) is displayed instead of blank text or raw translation keys, with zero instances of visible raw keys in production.
- **SC-007**: Each language version of the web app has proper language metadata for search engine discoverability.

## Assumptions

- The platform currently has hardcoded English text in the UI that will need to be extracted into translation keys.
- The shared translation source will be a package within the existing monorepo (`@ramcar/` scope) to maintain the single-source-of-truth principle.
- URL path segments for routes (e.g., `/visits`, `/visitas`) may differ between languages or may use the same English path names for both languages — this spec does not prescribe the URL naming convention beyond the language prefix requirement.
- The `apps/www` landing page is out of scope for this feature unless explicitly requested, as it is a separate public-facing marketing site.
- Translation covers UI interface text only; user-generated content (e.g., visitor names, notes, addresses) is not translated.
- The mobile app (`ramcar-mobile`) is in a separate repository and is out of scope for this feature, though the shared translation source should be designed to be consumable by it in the future.
- Right-to-left (RTL) language support is not needed since both Spanish and English are left-to-right languages.

## Scope

### In Scope

- Translation infrastructure setup (shared translation source, integration with web and desktop apps)
- Spanish and English translation support
- URL-based language routing for the web app (`apps/web`)
- Language switcher UI component for the web app
- Language preference setting for the desktop app (`apps/desktop`)
- Fallback mechanism for missing translations(Spanish fallback)
- Extraction of existing hardcoded strings into translation keys

### Out of Scope

- Landing page (`apps/www`) translations
- Mobile app translations (separate repository)
- Backend API response translations (API returns data, not UI text)
- Support for additional languages beyond Spanish and English
- Automated translation services or machine translation
- User-generated content translation
- RTL layout support

## Dependencies

- Existing UI components in `apps/web` and `apps/desktop` that contain hardcoded text
- The `packages/ui` shared component library (shared components may also contain translatable text)
- The monorepo build system (Turborepo) must support the new shared translations package
