# Desktop Login Fix & Visual Update

## Problem

The Electron desktop app displays a blank white screen. The root cause is that dotenvx sets `process.env.SUPABASE_URL` and `process.env.SUPABASE_PUBLISHABLE_KEY` at the process level, but Vite only exposes `VITE_`-prefixed vars to the renderer via `import.meta.env`. The desktop's Supabase client reads `import.meta.env.VITE_SUPABASE_URL` which is `undefined`, causing `supabase.auth.getSession()` to fail silently and the React tree to never render.

Additionally, the desktop login screen's visual design has diverged from the web app's login screen and needs to be updated to match.

## Scope

Two changes within `apps/desktop/`:

1. **Env bridging fix** — make root dotenvx vars available to Vite renderer
2. **Login visual update** — match the web app's login screen appearance

No changes to shared packages, web app, API, or root config.

## Design

### 1. Env Bridging (Vite `define`)

**File:** `apps/desktop/vite.config.ts`

Add a `define` block that maps `process.env.*` (populated by dotenvx before Vite starts) into the `import.meta.env.VITE_*` namespace that the renderer code expects:

```ts
define: {
  'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL),
  'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(process.env.SUPABASE_PUBLISHABLE_KEY),
}
```

**Why this approach:** Zero duplication. The root `.env.local` / `.env.development` files (managed by dotenvx) remain the single source of truth. No extra `.env` file needed in the desktop app. The renderer code (`src/shared/lib/supabase.ts`) and type declarations (`src/env.d.ts`) stay unchanged.

**File:** `apps/desktop/.env.example`

Update to clarify that env vars come from the root dotenvx config, not a local file.

### 2. Login Screen Visual Update

Update the desktop login to match the web app's current design:

**File:** `apps/desktop/src/features/auth/pages/login-page.tsx`

- Background: emerald gradient (`bg-linear-to-br from-emerald-600 to-emerald-100`)
- Card: `w-full sm:w-[450px] shadow-md`
- Title: "RamcarSoft"
- Subtitle: "Enter your credentials to access the platform."
- Button in `CardFooter` with `pt-12` spacing

**File:** `apps/desktop/src/features/auth/components/login-form.tsx`

- The form renders inside `CardContent` / `CardFooter` (owned by the page, not the form)
- Button uses `variant="default"` (primary color)
- Email placeholder: `you@example.com`
- Error message stays above the button (matches web pattern)
- Preserve controlled form + Zod validation (correct for Electron — no server actions)

**File:** `apps/desktop/src/App.tsx`

- Update loading state background to emerald gradient to prevent white flash on startup

### What stays the same

- `LoginForm` remains a controlled component with `useState` + `onSubmit` callback (Electron doesn't have server actions)
- Zod client-side validation via `loginSchema` stays
- `HomePage` is untouched
- Supabase client code, store integration, auth state flow — all unchanged
- Electron main process (`electron/main.ts`) — unchanged
- Preload script — unchanged

## Files Changed

| File | Change |
|------|--------|
| `apps/desktop/vite.config.ts` | Add `define` block for env bridging |
| `apps/desktop/.env.example` | Update comments |
| `apps/desktop/src/features/auth/pages/login-page.tsx` | Emerald gradient, card shadow, title, subtitle |
| `apps/desktop/src/features/auth/components/login-form.tsx` | CardContent/CardFooter structure, primary button, placeholder |
| `apps/desktop/src/App.tsx` | Loading state gradient background |
