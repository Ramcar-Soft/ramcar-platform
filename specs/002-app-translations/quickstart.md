# Quickstart: App Translations (i18n)

**Feature**: 002-app-translations  
**Date**: 2026-04-08

## Prerequisites

- Node.js 22 LTS
- pnpm installed
- Repository cloned and dependencies installed (`pnpm install`)

## Development Workflow

### 1. Adding a New Translation Key

1. Open `packages/i18n/src/messages/es.json` and add the key with the Spanish value:
   ```json
   {
     "myFeature": {
       "newLabel": "Etiqueta nueva"
     }
   }
   ```

2. Open `packages/i18n/src/messages/en.json` and add the same key with the English value:
   ```json
   {
     "myFeature": {
       "newLabel": "New label"
     }
   }
   ```

3. Both files must have the same key structure. The `Messages` type is derived from `es.json` via `typeof es` in `packages/i18n/src/index.ts`, so adding a key to `es.json` automatically updates the type for both apps.

4. Run `pnpm typecheck` to verify all translation key usages are valid.

### 2. Using Translations in Web App (`apps/web`)

**Server Component**:
```typescript
import { getTranslations } from "next-intl/server";

export default async function MyPage() {
  const t = await getTranslations("myFeature");
  return <h1>{t("newLabel")}</h1>;
}
```

**Client Component**:
```typescript
"use client";
import { useTranslations } from "next-intl";

export function MyComponent() {
  const t = useTranslations("myFeature");
  return <button>{t("newLabel")}</button>;
}
```

### 3. Using Translations in Desktop App (`apps/desktop`)

```typescript
import { useTranslation } from "react-i18next";

export function MyComponent() {
  const { t } = useTranslation();
  return <button>{t("myFeature.newLabel")}</button>;
}
```

**Note**: In i18next, namespaces are accessed via dot notation from the root. In next-intl, you pass the namespace to `useTranslations("namespace")` and then use the key.

### 4. Testing Language Switching

**Web app**:
- Visit `http://localhost:3000/` → Spanish
- Visit `http://localhost:3000/en` → English
- Click the language switcher in the header

**Desktop app**:
- Open the app → Spanish (default)
- Change language in settings → English
- Restart the app → Language preference persisted

### 5. Running Development Servers

```bash
# All apps
pnpm dev

# Web app only
pnpm --filter @ramcar/web dev

# Desktop app only
pnpm --filter @ramcar/desktop dev
```

### 6. Key Conventions

- **Key naming**: `camelCase`, nested by feature domain → `auth.login.title`
- **Interpolation**: Use `{variableName}` syntax (works in both next-intl and i18next)
  - Example: `"welcome": "Bienvenido, {name}"` → `t("welcome", { name: "Ivan" })`
- **Spanish is source of truth**: Always add Spanish first, then English
- **No HTML in translations**: Keep translations as plain text; use components for markup
