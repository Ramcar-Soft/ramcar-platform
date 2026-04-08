# Data Model: Authentication — Web & Desktop

**Feature Branch**: `001-auth-login`  
**Date**: 2026-04-07

## Entity Relationship

```
auth.users (Supabase-managed)
    │
    │ 1:1 (id → user_id)
    ▼
profiles
    │
    │ N:1 (tenant_id → id)
    ▼
tenants
```

---

## Table: `tenants`

Represents a residential community (condominium, gated community, etc.) that is the top-level isolation boundary.

| Column       | Type          | Constraints                          | Notes                          |
|-------------|---------------|--------------------------------------|--------------------------------|
| id          | uuid          | PK, default gen_random_uuid()       |                                |
| name        | text          | NOT NULL                             | Display name                   |
| slug        | text          | NOT NULL, UNIQUE                     | URL-safe identifier            |
| created_at  | timestamptz   | NOT NULL, default now()             |                                |
| updated_at  | timestamptz   | NOT NULL, default now()             | Updated via trigger            |

**RLS Policies:**
- `SELECT`: Authenticated users can read the tenant they belong to (via `profiles.tenant_id`).
- `INSERT/UPDATE/DELETE`: Restricted to service-role (admin operations).

---

## Table: `profiles`

Extends Supabase `auth.users` with application-specific data. One profile per user.

| Column       | Type          | Constraints                          | Notes                              |
|-------------|---------------|--------------------------------------|------------------------------------|
| id          | uuid          | PK, default gen_random_uuid()       |                                    |
| user_id     | uuid          | NOT NULL, UNIQUE, FK → auth.users(id) ON DELETE CASCADE | Links to Supabase auth           |
| tenant_id   | uuid          | NOT NULL, FK → tenants(id)          | Tenant isolation                   |
| full_name   | text          | NOT NULL                             | Display name                       |
| role        | text          | NOT NULL, CHECK (role IN ('super_admin', 'admin', 'guard', 'resident')) | Application role    |
| email       | text          | NOT NULL                             | Denormalized from auth.users       |
| created_at  | timestamptz   | NOT NULL, default now()             |                                    |
| updated_at  | timestamptz   | NOT NULL, default now()             | Updated via trigger                |

**Indexes:**
- `profiles_user_id_key` (UNIQUE on `user_id`)
- `profiles_tenant_id_idx` (on `tenant_id` — most queries filter by tenant)

**RLS Policies:**
- `SELECT`: Users can read profiles within their own tenant (`tenant_id = auth.jwt() -> app_metadata ->> 'tenant_id'`).
- `INSERT`: Restricted to service-role (user creation is admin-only).
- `UPDATE`: Users can update their own profile (`user_id = auth.uid()`). Admins can update profiles within their tenant.
- `DELETE`: Restricted to service-role.

---

## Supabase Auth: `app_metadata` Shape

Set during user creation (seed or admin API). Mirrored from `profiles` for JWT availability.

```json
{
  "tenant_id": "uuid",
  "role": "admin | guard | resident"
}
```

The JWT payload (`auth.jwt()`) includes `app_metadata`, so guards can extract `tenant_id` and `role` without a DB query.

---

## Seed Data (Local Development Only)

### Test Tenant

| name                  | slug          |
|----------------------|---------------|
| Residencial Demo     | demo          |

### Mock Users

| Email                        | Password     | Role     | Full Name       |
|-----------------------------|--------------|----------|-----------------|
| admin@ramcar.dev            | password123  | admin    | Admin Demo      |
| guard@ramcar.dev            | password123  | guard    | Guard Demo      |
| resident@ramcar.dev         | password123  | resident | Resident Demo   |

All mock users belong to the "Residencial Demo" tenant.

**Important**: These credentials are for local development only. The seed.sql must never run in production.

---

## State Transitions

### Session Lifecycle

```
[No Session] → signInWithPassword() → [Active Session]
[Active Session] → token expires → auto-refresh via refresh_token → [Active Session]
[Active Session] → signOut() → [No Session]
[Active Session] → refresh_token expires → [No Session] (redirect to login)
```

No custom state machine needed — Supabase SDK manages this internally.
