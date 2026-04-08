# Quickstart: Authentication — Web & Desktop

**Feature Branch**: `001-auth-login`

## Prerequisites

- Node.js 22 LTS (see `.nvmrc`)
- pnpm installed globally
- Docker running (for local Supabase)

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start local Supabase
pnpm db:start

# 3. Apply migrations and seed mock users
pnpm db:reset

# 4. Copy environment variables
cp apps/web/.env.example apps/web/.env.local
cp apps/desktop/.env.example apps/desktop/.env
cp apps/api/.env.example apps/api/.env

# 5. Start all apps
pnpm dev
```

## Environment Variables

### apps/web/.env.local
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase status>
```

### apps/desktop/.env
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<from supabase status>
```

### apps/api/.env
```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<from supabase status>
PORT=3001
```

Get keys by running `pnpm supabase status` from the repo root.

## Mock Users

| Email                 | Password     | Role     |
|----------------------|--------------|----------|
| admin@ramcar.dev     | password123  | admin    |
| guard@ramcar.dev     | password123  | guard    |
| resident@ramcar.dev  | password123  | resident |

All belong to tenant "Residencial Demo".

## Testing the Auth Flow

### Web (http://localhost:3000)
1. Visit `http://localhost:3000` — should redirect to `/login`
2. Log in with `admin@ramcar.dev` / `password123`
3. Should redirect to home page showing name and "Admin" role
4. Refresh — should remain authenticated
5. Click logout — should redirect to `/login`

### Desktop
1. Launch with `pnpm --filter @ramcar/desktop dev`
2. Login screen should appear
3. Log in with `guard@ramcar.dev` / `password123`
4. Should see home screen with "Guard" role
5. Close and reopen — should remain authenticated

### API (http://localhost:3001)
1. Get a token: log in via web or desktop, copy the access token from browser devtools (Application → Cookies or localStorage)
2. Call: `curl -H "Authorization: Bearer <token>" http://localhost:3001/auth/me`
3. Should return the user's profile JSON

## Verification Commands

```bash
pnpm lint          # ESLint across all workspaces
pnpm typecheck     # TypeScript across all workspaces
pnpm build         # Full build
```
