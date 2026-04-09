# Data Model: Catalog Users — API-First Refactor

**Date**: 2026-04-09  
**Branch**: `009-refactor-users-api-first`

> No database schema changes — the migration from 008 (`20260409000000_users_module.sql`) is retained as-is. This document describes the logical data model as consumed by the API and frontend.

## Entities

### Profile (profiles table)

Represents a user in the system. Extended in 008 with additional fields.

| Field | Type | Required (Create) | Required (Edit) | Notes |
|-------|------|-------------------|-----------------|-------|
| id | UUID | auto | read-only | Primary key |
| user_id | UUID | auto | read-only | FK to auth.users, set during creation |
| tenant_id | UUID | yes | yes | FK to tenants table |
| full_name | string | yes | yes | |
| email | string | yes | yes | Unique across all profiles |
| role | enum | yes | yes | `super_admin`, `admin`, `guard`, `resident` |
| address | string | yes | yes | Was optional in 008, now required |
| username | string | yes | yes | Unique, 3-50 chars, alphanumeric + underscore. Login identifier. |
| phone | string | yes | yes | Was optional in 008, now required |
| phone_type | enum | no | no | `house`, `cellphone`, `work`, `primary` |
| status | enum | no (defaults to `active`) | no | `active`, `inactive`. Pre-populated to "active" on create form. |
| user_group_ids | UUID[] | no (defaults to `[]`) | no | Array of FK refs to user_groups.id |
| observations | text | no | no | Free-form notes |
| created_at | timestamp | auto | read-only | |
| updated_at | timestamp | auto | read-only | |

**Uniqueness rules**:
- `email` is unique across all profiles
- `username` is unique across all profiles (when provided)

**State transitions**:
- `active` → `inactive` (deactivate: sets status, bans auth user)
- `inactive` → `active` (reactivate: sets status, unbans auth user)

**Auth account linkage**:
- On create: `supabase.auth.admin.createUser()` with optional password or recovery link
- On update: `supabase.auth.admin.updateUserById()` syncs role, tenant_id, email to app_metadata
- On deactivate: `supabase.auth.admin.updateUserById()` with `ban_duration: "876000h"` (ban)
- On reactivate: `supabase.auth.admin.updateUserById()` with `ban_duration: "none"` (unban)

### User Group (user_groups table)

Classification category for users. Read-only in this feature (no CRUD for groups themselves).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | auto | Primary key |
| name | string | yes | e.g., "Moroso", "Cumplido" |

**Seed data**: "Moroso", "Cumplido"

### Tenant (tenants table)

Residential community. Pre-existing table, no changes.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | auto | Primary key |
| name | string | yes | Community name |

## Relationships

```text
Profile >-- Tenant        (many-to-one: each profile belongs to one tenant)
Profile >-- auth.users     (one-to-one: linked via user_id)
Profile --- UserGroup      (many-to-many: via user_group_ids array on profiles)
```

## DTOs (Zod Schemas in @ramcar/shared)

### CreateUserDto (createUserSchema)

```text
Required: fullName, email, role, tenantId, address, username, phone
Optional: password, confirmPassword, phoneType, userGroupIds (default []), observations
Validation: if password provided, confirmPassword must match (Zod .refine())
```

### UpdateUserDto (updateUserSchema)

```text
Required: fullName, email, role, tenantId, address, username, phone
Optional: phoneType, userGroupIds, observations
No password fields on edit.
```

### UserFiltersDto (userFiltersSchema)

```text
Optional: search, tenantId, status, sortBy, sortOrder, page (default 1), pageSize (default 10)
No changes from 008.
```

### Extended Response (ExtendedUserProfile)

The API returns profiles enriched with:
- `tenantName`: resolved from tenants join
- `userGroups`: resolved from user_group_ids array → `[{ id, name }]`
- `canEdit`: boolean based on actor's role hierarchy vs target's role
- `canDeactivate`: boolean based on actor's role hierarchy vs target's role
