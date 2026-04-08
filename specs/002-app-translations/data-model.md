# Data Model: App Translations (i18n)

**Feature**: 002-app-translations  
**Date**: 2026-04-08

## Overview

This feature does not introduce database entities. All translation data is static (JSON files bundled at build time). The "data model" here describes the structure of translation messages and configuration entities used at the application layer.

## Entities

### 1. Locale

Represents a supported language in the platform.

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | ISO 639-1 language code (`"es"`, `"en"`) |
| `label` | `string` | Display name for the language switcher (`"Español"`, `"English"`) |
| `isDefault` | `boolean` | Whether this is the fallback/default language |

**Constants** (defined in `@ramcar/i18n`):

```typescript
export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";
```

**Validation rules**:
- Only values in `LOCALES` array are accepted
- `DEFAULT_LOCALE` is always `"es"`

### 2. Translation Messages

Nested key-value structure representing all translatable UI strings for a given locale.

**Structure**: Organized by feature domain (namespace), then by component/context.

```typescript
// Type derived from es.json (source of truth)
type Messages = {
  common: {
    appName: string;
    loading: string;
    error: string;
    // ...shared strings
  };
  auth: {
    login: {
      title: string;
      description: string;
      emailLabel: string;
      emailPlaceholder: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      submitButton: string;
      submittingButton: string;
    };
    logout: {
      button: string;
    };
  };
  dashboard: {
    welcome: string;        // Supports interpolation: "Bienvenido, {name}"
    signedInMessage: string;
    emailLabel: string;
    roleLabel: string;
  };
  languageSwitcher: {
    label: string;
    es: string;
    en: string;
  };
};
```

**Relationships**:
- Each `Locale` has exactly one `Messages` object (one JSON file per locale)
- The Spanish (`es.json`) messages file is the source of truth — English (`en.json`) must have the same keys
- If a key exists in `es.json` but not in `en.json`, the Spanish value is used as fallback

### 3. Language Preference (Desktop only)

Persisted user setting for the desktop guard booth application.

| Field | Type | Storage | Description |
|-------|------|---------|-------------|
| `language` | `Locale` | JSON file (`app.getPath('userData')/settings.json`) | Selected language code, defaults to `"es"` |

**State transitions**:
- On first launch: no settings file exists → use `DEFAULT_LOCALE` ("es")
- On language change: write `{ "language": "<locale>" }` to settings file
- On subsequent launches: read settings file → apply stored locale

**Validation rules**:
- Must be a valid `Locale` value (`"es"` or `"en"`)
- If stored value is invalid or file is corrupted, fall back to `DEFAULT_LOCALE`

## Entity Relationships

```
Locale (es, en)
  └── Messages (es.json, en.json)
        └── Used by: Web App (next-intl), Desktop App (i18next)

LanguagePreference (desktop only)
  └── References: Locale.code
  └── Storage: Local JSON file (main process)
  └── Exposed via: IPC (preload Context Bridge)
```

## Key Constraints

1. **No database tables**: All translation data is static and bundled at build time
2. **No user-level language preference in DB**: Web app language is determined by URL; desktop uses local file
3. **Schema parity**: `en.json` must have the same key structure as `es.json` (enforced at build/lint time)
4. **Immutable at runtime**: Translations cannot be modified by users at runtime
