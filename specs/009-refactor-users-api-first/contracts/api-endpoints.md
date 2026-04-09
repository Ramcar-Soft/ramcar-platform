# API Endpoint Contracts: Catalog Users — API-First Refactor

**Date**: 2026-04-09  
**Branch**: `009-refactor-users-api-first`

> All endpoints require `Authorization: Bearer <supabase-jwt>` header.  
> All endpoints are protected by `JwtAuthGuard`, `TenantGuard`, `RolesGuard`.  
> Roles: `@Roles("super_admin", "admin")` unless noted otherwise.

---

## 1. GET /users — List Users (NO CHANGE)

**Controller**: `UsersController.list()`  
**Auth**: Super Admin, Admin  
**Tenant scoping**: Admin sees own tenant only; Super Admin sees all (or filtered by `tenantId`)

### Request

```text
Query Parameters:
  search?:    string    — filters across full_name, email, username, phone, role
  tenantId?:  string    — UUID, filter by tenant (Super Admin only)
  status?:    string    — "active" | "inactive"
  sortBy?:    string    — "full_name" | "email" | "role" | "status" | "created_at" (default: "full_name")
  sortOrder?: string    — "asc" | "desc" (default: "asc")
  page?:      number    — default: 1
  pageSize?:  number    — default: 10
```

### Response (200)

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "tenantId": "uuid",
      "tenantName": "string",
      "fullName": "string",
      "email": "string",
      "role": "super_admin | admin | guard | resident",
      "address": "string | null",
      "username": "string | null",
      "phone": "string | null",
      "phoneType": "string | null",
      "status": "active | inactive",
      "userGroupIds": ["uuid"],
      "userGroups": [{ "id": "uuid", "name": "string" }],
      "observations": "string | null",
      "createdAt": "iso-datetime",
      "updatedAt": "iso-datetime",
      "canEdit": true,
      "canDeactivate": true
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

---

## 2. GET /users/:id — Get User by ID (NO CHANGE)

**Controller**: `UsersController.getById()`  
**Auth**: Super Admin, Admin  
**Tenant scoping**: Admin can only fetch users in own tenant

### Request

```text
Path Parameters:
  id: string — Profile UUID
```

### Response (200)

Same shape as a single item in the list response (ExtendedUserProfile).

### Errors

- `404`: User not found or not in actor's tenant scope

---

## 3. POST /users — Create User (UPDATED: optional password)

**Controller**: `UsersController.create()`  
**Auth**: Super Admin, Admin  
**Tenant scoping**: Admin can only create in own tenant

### Request

```json
{
  "fullName": "string (required)",
  "email": "string (required, unique)",
  "role": "super_admin | admin | guard | resident (required)",
  "tenantId": "uuid (required)",
  "address": "string (required)",
  "username": "string (required, unique, 3-50 chars)",
  "phone": "string (required)",
  "password": "string (optional, min 8 chars)",
  "confirmPassword": "string (optional, must match password)",
  "phoneType": "house | cellphone | work | primary (optional)",
  "userGroupIds": ["uuid"] ,
  "observations": "string (optional)"
}
```

### Response (201)

```json
{
  "success": true,
  "user": { ...ExtendedUserProfile }
}
```

### Behavior

- If `password` provided: auth account created with that password
- If `password` omitted: auth account created with random password + recovery email sent
- Role enforcement: Admin can only assign `guard`, `resident`. Super Admin can assign all roles.
- Email uniqueness validated before creation
- Username uniqueness validated before creation (when provided)
- Auth account created via `supabase.auth.admin.createUser()`
- Profile inserted into `profiles` table
- On profile insert failure: auth account rolled back (deleted)

### Errors

- `400`: Validation error (missing required fields, password mismatch, invalid role)
- `403`: Cannot assign role (Admin trying to set admin/super_admin)
- `403`: Cannot create in another tenant (Admin)
- `409`: Email already exists
- `409`: Username already exists

---

## 4. PUT /users/:id — Update User (NO CHANGE to endpoint, schema updates)

**Controller**: `UsersController.update()`  
**Auth**: Super Admin, Admin  
**Tenant scoping**: Admin can only update users in own tenant with equal or lower role

### Request

```json
{
  "fullName": "string (required)",
  "email": "string (required)",
  "role": "super_admin | admin | guard | resident (required)",
  "tenantId": "uuid (required)",
  "address": "string (required)",
  "username": "string (required, 3-50 chars)",
  "phone": "string (required)",
  "phoneType": "house | cellphone | work | primary (optional)",
  "userGroupIds": ["uuid"],
  "observations": "string (optional)"
}
```

No password fields on edit.

### Response (200)

```json
{
  "success": true,
  "user": { ...ExtendedUserProfile }
}
```

### Behavior

- Role hierarchy enforced: Admin cannot edit users with higher role
- If role or tenant_id changes: auth JWT metadata updated via `supabase.auth.admin.updateUserById()`
- Email uniqueness revalidated if changed

### Errors

- `400`: Validation error
- `403`: Cannot edit user with higher role
- `404`: User not found

---

## 5. PATCH /users/:id/status — Toggle User Status (NO CHANGE)

**Controller**: `UsersController.toggleStatus()`  
**Auth**: Super Admin, Admin  

### Request

```json
{
  "status": "active | inactive (required)"
}
```

### Response (200)

```json
{
  "success": true,
  "user": { ...ExtendedUserProfile }
}
```

### Behavior

- Deactivate: sets `status = "inactive"`, bans auth user (`ban_duration: "876000h"`)
- Reactivate: sets `status = "active"`, unbans auth user (`ban_duration: "none"`)
- Self-deactivation prevented (API checks if target ID matches actor ID)
- Role hierarchy enforced
- Last super admin protection (prevents deactivating if only 1 active super admin remains)

### Errors

- `400`: Self-deactivation attempt
- `403`: Cannot deactivate user with higher role
- `409`: Cannot deactivate last active super admin

---

## 6. GET /user-groups — List User Groups (NO CHANGE)

**Controller**: `UserGroupsController.findAll()`  
**Auth**: Super Admin, Admin  

### Request

No parameters.

### Response (200)

```json
{
  "data": [
    { "id": "uuid", "name": "Moroso" },
    { "id": "uuid", "name": "Cumplido" }
  ]
}
```

---

## 7. GET /tenants — List Tenants (NEW ENDPOINT)

**Controller**: `TenantsController.findAll()`  
**Auth**: Super Admin, Admin  
**Tenant scoping**: Admin sees only their own tenant; Super Admin sees all tenants

### Request

No parameters.

### Response (200)

```json
{
  "data": [
    { "id": "uuid", "name": "Residencial Las Palmas" },
    { "id": "uuid", "name": "Condominio Jardines" }
  ]
}
```

### Behavior

- Results ordered alphabetically by name
- Admin receives array with single entry (their tenant)
- Super Admin receives all tenants
