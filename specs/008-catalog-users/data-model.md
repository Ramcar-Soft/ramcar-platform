# Data Model: Catalog Users Management

**Feature**: 008-catalog-users | **Date**: 2026-04-09

## Entity Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ auth.users (Supabase-managed)                                    │
│─────────────────────────────────────────────────────────────────│
│ id            uuid PK                                            │
│ email         text                                               │
│ banned        boolean (used for soft-delete)                     │
│ app_metadata  jsonb { tenant_id, role }                          │
│ ...                                                              │
└─────────┬───────────────────────────────────────────────────────┘
          │ 1:1 (user_id FK)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ public.profiles (EXTENDED)                                       │
│─────────────────────────────────────────────────────────────────│
│ id              uuid PK default gen_random_uuid()                │
│ user_id         uuid FK → auth.users(id) UNIQUE ON DELETE CASCADE│
│ tenant_id       uuid FK → public.tenants(id) NOT NULL            │
│ full_name       text NOT NULL                                    │
│ role            text NOT NULL CHECK (super_admin|admin|guard|     │
│                                       resident)                  │
│ email           text NOT NULL                                    │
│ address         text                                     [NEW]   │
│ username        text UNIQUE                              [NEW]   │
│ phone           text                                     [NEW]   │
│ phone_type      text CHECK (house|cellphone|work|primary)[NEW]   │
│ status          text NOT NULL DEFAULT 'active'           [NEW]   │
│                 CHECK (active|inactive)                           │
│ user_group_ids  uuid[]                                   [NEW]   │
│ observations    text                                     [NEW]   │
│ created_at      timestamptz NOT NULL DEFAULT now()                │
│ updated_at      timestamptz NOT NULL DEFAULT now()                │
└─────────────────────────────────────────────────────────────────┘
          │ user_group_ids references (application-level)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ public.user_groups (NEW)                                         │
│─────────────────────────────────────────────────────────────────│
│ id              uuid PK default gen_random_uuid()                │
│ name            text NOT NULL                                    │
│ created_at      timestamptz NOT NULL DEFAULT now()                │
│ updated_at      timestamptz NOT NULL DEFAULT now()                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ public.tenants (EXISTING — no changes)                           │
│─────────────────────────────────────────────────────────────────│
│ id              uuid PK                                          │
│ name            text NOT NULL                                    │
│ slug            text NOT NULL UNIQUE                             │
│ created_at      timestamptz                                      │
│ updated_at      timestamptz                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Migration: `YYYYMMDD000000_users_module.sql`

### 1. Alter `public.profiles` — Add new columns

```sql
ALTER TABLE public.profiles
  ADD COLUMN address        text,
  ADD COLUMN username       text,
  ADD COLUMN phone          text,
  ADD COLUMN phone_type     text,
  ADD COLUMN status         text NOT NULL DEFAULT 'active',
  ADD COLUMN user_group_ids uuid[] DEFAULT '{}',
  ADD COLUMN observations   text;

-- Constraints
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_unique UNIQUE (username),
  ADD CONSTRAINT profiles_phone_type_check CHECK (phone_type IN ('house', 'cellphone', 'work', 'primary')),
  ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'inactive'));

-- Index for username lookups (login by username)
CREATE INDEX profiles_username_idx ON public.profiles (username) WHERE username IS NOT NULL;

-- Index for status filtering
CREATE INDEX profiles_status_idx ON public.profiles (status);

-- GIN index for user_group_ids array containment queries
CREATE INDEX profiles_user_group_ids_idx ON public.profiles USING GIN (user_group_ids);
```

### 2. Create `public.user_groups`

```sql
CREATE TABLE public.user_groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER user_groups_updated_at
  BEFORE UPDATE ON public.user_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read user_groups
CREATE POLICY "Authenticated users can read user_groups"
  ON public.user_groups FOR SELECT
  TO authenticated
  USING (true);
```

### 3. Seed `user_groups` initial data

```sql
INSERT INTO public.user_groups (name) VALUES ('Moroso'), ('Cumplido');
```

### 4. RLS Policies — Profiles (additions for write operations)

```sql
-- Admins and Super Admins can insert profiles in their tenant
CREATE POLICY "Admins can insert profiles in own tenant"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );

-- Admins and Super Admins can update profiles (scoped by tenant for admins)
CREATE POLICY "Admins can update profiles in scope"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );

-- Update existing SELECT policy to include Super Admin cross-tenant access
DROP POLICY IF EXISTS "Users can read profiles in own tenant" ON public.profiles;
CREATE POLICY "Users can read profiles in scope"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );
```

## Validation Rules

| Field          | Required | Validation                                                      |
|----------------|----------|-----------------------------------------------------------------|
| full_name      | Yes      | Non-empty string, max 255 chars                                 |
| email          | Yes      | Valid email format, unique across all profiles                   |
| role           | Yes      | One of: super_admin, admin, guard, resident                     |
| tenant_id      | Yes      | Valid UUID, must reference existing tenant                       |
| address        | No       | Max 500 chars                                                   |
| username       | No       | Alphanumeric + underscores, 3-50 chars, unique if provided      |
| phone          | No       | Max 20 chars                                                    |
| phone_type     | No       | One of: house, cellphone, work, primary. Required if phone set  |
| status         | No       | One of: active, inactive. Defaults to "active" on create        |
| user_group_ids | No       | Array of valid UUIDs. Defaults to empty array                   |
| observations   | No       | Max 1000 chars                                                  |

## State Transitions

```
User Lifecycle:
  [Created] → status: "active"
       │
       ▼ (Deactivate action)
  [Inactive] → status: "inactive", auth.users.banned = true
       │
       ▼ (Reactivate action)
  [Active] → status: "active", auth.users.banned = false
```

No permanent deletion. Users cycle between active and inactive states.

## Key Relationships

- **Profile → Auth User**: 1:1 via `user_id`. Profile is created alongside auth user. Cascade delete on auth user deletion (though deletion is not exposed in this feature).
- **Profile → Tenant**: N:1 via `tenant_id`. Each profile belongs to exactly one tenant.
- **Profile → User Groups**: N:M via `user_group_ids` array. Application-level reference (no FK constraint). Filter out invalid IDs at query time.
- **Tenant → Profiles**: 1:N. A tenant has many profiles/users.
