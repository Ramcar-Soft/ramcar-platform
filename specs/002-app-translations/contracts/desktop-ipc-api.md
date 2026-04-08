# Contract: Desktop IPC Language API

**Feature**: 002-app-translations  
**Date**: 2026-04-08

## Context Bridge API

Exposed via `contextBridge.exposeInMainWorld("api", { ... })` in `electron/preload.ts`.

### `getLanguage`

Returns the persisted language preference.

```typescript
api.getLanguage(): Promise<string>
```

**Returns**: A locale code string (`"es"` or `"en"`). Defaults to `"es"` if no preference is stored or the stored value is invalid.

**Errors**: Never throws. Returns default on any failure.

### `setLanguage`

Persists the language preference.

```typescript
api.setLanguage(locale: string): Promise<void>
```

**Parameters**:
- `locale`: A valid locale code (`"es"` or `"en"`)

**Behavior**:
- Writes the preference to `{userData}/settings.json`
- Returns after the file is successfully written
- If `locale` is not a valid value, it is silently ignored and no write occurs

**Errors**: Never throws. Silently fails on write errors (language will reset to default on next launch).

## IPC Channels

| Channel | Direction | Payload | Response |
|---------|-----------|---------|----------|
| `get-language` | Renderer → Main | None | `string` (locale code) |
| `set-language` | Renderer → Main | `string` (locale code) | `void` |

## Type Declaration

```typescript
// electron/preload.d.ts (additions)
interface ElectronAPI {
  ping: () => Promise<string>;
  getLanguage: () => Promise<string>;
  setLanguage: (locale: string) => Promise<void>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
```
