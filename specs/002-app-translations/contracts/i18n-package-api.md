# Contract: @ramcar/i18n Package API

**Feature**: 002-app-translations  
**Date**: 2026-04-08

## Package Exports

### Entry point: `@ramcar/i18n`

```typescript
// Locale configuration
export const LOCALES: readonly ["es", "en"];
export type Locale = "es" | "en";
export const DEFAULT_LOCALE: Locale; // "es"

// Locale metadata for UI (language switcher)
export const LOCALE_LABELS: Record<Locale, string>;
// { es: "Español", en: "English" }

// Type representing the full translation message structure
export type Messages = typeof import("./messages/es.json");
```

### Entry point: `@ramcar/i18n/messages/es`

```typescript
// Spanish translations (default language)
declare const messages: Messages;
export default messages;
```

### Entry point: `@ramcar/i18n/messages/en`

```typescript
// English translations
declare const messages: Messages;
export default messages;
```

## Message JSON Structure

Both `es.json` and `en.json` must conform to this shape:

```json
{
  "common": {
    "appName": "string",
    "loading": "string",
    "error": "string"
  },
  "auth": {
    "login": {
      "title": "string",
      "description": "string",
      "emailLabel": "string",
      "emailPlaceholder": "string",
      "passwordLabel": "string",
      "passwordPlaceholder": "string",
      "submitButton": "string",
      "submittingButton": "string"
    },
    "logout": {
      "button": "string"
    }
  },
  "dashboard": {
    "welcome": "string (supports {name} interpolation)",
    "signedInMessage": "string",
    "emailLabel": "string",
    "roleLabel": "string"
  },
  "languageSwitcher": {
    "label": "string",
    "es": "string",
    "en": "string"
  }
}
```

## Consumers

| Consumer | Import Pattern | How Messages Are Used |
|----------|----------------|----------------------|
| `apps/web` (next-intl) | `import es from "@ramcar/i18n/messages/es"` | Passed to `getRequestConfig` → `NextIntlClientProvider` |
| `apps/desktop` (i18next) | `import es from "@ramcar/i18n/messages/es"` | Passed to `i18n.init({ resources: { es: { translation: es } } })` |

## Versioning

- New keys can be added to both JSON files (non-breaking)
- Keys must not be removed without updating all consumers (breaking)
- Key renames are breaking changes
