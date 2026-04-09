# API Contracts: Catalog Users Management

**Feature**: 008-catalog-users | **Date**: 2026-04-09  
**Base Path**: `/users`  
**Auth**: All endpoints require `Authorization: Bearer <JWT>` (JwtAuthGuard + TenantGuard)

---

## GET /users

**Description**: List users with search, filter, sort, and pagination.  
**Roles**: `super_admin`, `admin`  
**Tenant Scoping**: Admin sees own tenant only. Super Admin sees all (optionally filtered by tenant_id).

**Query Parameters**:

| Param      | Type   | Required | Default     | Description                                       |
|------------|--------|----------|-------------|---------------------------------------------------|
| search     | string | No       | —           | Case-insensitive search across name, email, username, phone, role |
| tenant_id  | uuid   | No       | —           | Filter by tenant (Super Admin only; Admin auto-scoped) |
| status     | string | No       | —           | Filter by status: "active", "inactive", or omit for all |
| sort_by    | string | No       | "full_name" | Column to sort: full_name, email, role, status, created_at |
| sort_order | string | No       | "asc"       | Sort direction: "asc" or "desc"                   |
| page       | number | No       | 1           | Page number (1-based)                              |
| page_size  | number | No       | 20          | Items per page (max 100)                           |

**Response 200**:
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
      "phoneType": "house | cellphone | work | primary | null",
      "status": "active | inactive",
      "userGroupIds": ["uuid"],
      "userGroups": [{ "id": "uuid", "name": "string" }],
      "observations": "string | null",
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601",
      "canEdit": true,
      "canDeactivate": true
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Notes**:
- `canEdit` and `canDeactivate` are computed based on the requesting user's role vs the target user's role (role hierarchy).
- `userGroups` is the resolved group names from `userGroupIds`.
- `tenantName` is joined from the tenants table.

---

## GET /users/:id

**Description**: Get a single user's full profile.  
**Roles**: `super_admin`, `admin`  
**Tenant Scoping**: Admin can only access users in own tenant.

**Path Parameters**:

| Param | Type | Description          |
|-------|------|----------------------|
| id    | uuid | Profile ID           |

**Response 200**:
```json
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
  "phoneType": "house | cellphone | work | primary | null",
  "status": "active | inactive",
  "userGroupIds": ["uuid"],
  "userGroups": [{ "id": "uuid", "name": "string" }],
  "observations": "string | null",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601",
  "canEdit": true,
  "canDeactivate": true
}
```

**Response 404**: User not found or not in requester's tenant scope.

---

## POST /users

**Description**: Create a new user (auth account + profile).  
**Roles**: `super_admin`, `admin`  
**Role Restrictions**: Admin can only assign "guard" or "resident". Super Admin can assign any role.

**Request Body**:
```json
{
  "fullName": "string (required)",
  "email": "string (required, valid email)",
  "role": "super_admin | admin | guard | resident (required)",
  "tenantId": "uuid (required)",
  "address": "string (optional)",
  "username": "string (optional, unique)",
  "phone": "string (optional)",
  "phoneType": "house | cellphone | work | primary (optional)",
  "userGroupIds": ["uuid"] ,
  "observations": "string (optional)"
}
```

**Response 201**: Created user object (same shape as GET /users/:id).

**Response 400**: Validation errors.
```json
{
  "statusCode": 400,
  "message": ["email must be a valid email", "fullName should not be empty"],
  "error": "Bad Request"
}
```

**Response 409**: Duplicate email or username.
```json
{
  "statusCode": 409,
  "message": "A user with this email already exists",
  "error": "Conflict"
}
```

**Response 403**: Admin attempting to assign super_admin/admin role.

**Notes**:
- Status defaults to "active" on creation.
- Auth user is created with `email_confirm: true` and a temporary random password.
- A password reset link is generated for the new user.

---

## PUT /users/:id

**Description**: Update an existing user's profile.  
**Roles**: `super_admin`, `admin`  
**Role Restrictions**: Enforces role hierarchy — Admin cannot edit Super Admin profiles.  
**Tenant Scoping**: Admin can only edit users in own tenant.

**Path Parameters**:

| Param | Type | Description          |
|-------|------|----------------------|
| id    | uuid | Profile ID           |

**Request Body** (all fields optional — only provided fields are updated):
```json
{
  "fullName": "string",
  "email": "string",
  "role": "super_admin | admin | guard | resident",
  "tenantId": "uuid",
  "address": "string",
  "username": "string",
  "phone": "string",
  "phoneType": "house | cellphone | work | primary",
  "userGroupIds": ["uuid"],
  "observations": "string"
}
```

**Response 200**: Updated user object.

**Response 403**: Role hierarchy violation or Admin attempting to assign elevated role.

**Response 404**: User not found or not in scope.

**Response 409**: Duplicate email or username.

**Notes**:
- If `role` or `tenantId` is changed, auth user's `app_metadata` is also updated.
- If `email` is changed, auth user's email is also updated.

---

## PATCH /users/:id/status

**Description**: Deactivate or reactivate a user.  
**Roles**: `super_admin`, `admin`  
**Role Restrictions**: Enforces role hierarchy. Cannot deactivate self. Cannot deactivate last active super admin.

**Path Parameters**:

| Param | Type | Description          |
|-------|------|----------------------|
| id    | uuid | Profile ID           |

**Request Body**:
```json
{
  "status": "active | inactive"
}
```

**Response 200**: Updated user object.

**Response 403**: Self-deactivation, role hierarchy violation, or last super admin protection.
```json
{
  "statusCode": 403,
  "message": "Cannot deactivate your own account",
  "error": "Forbidden"
}
```

**Response 404**: User not found or not in scope.

**Notes**:
- Setting `inactive` also sets `auth.users.banned = true`.
- Setting `active` also sets `auth.users.banned = false`.

---

## GET /user-groups

**Description**: List all available user groups.  
**Roles**: `super_admin`, `admin`  
**Tenant Scoping**: None — user groups are global.

**Response 200**:
```json
{
  "data": [
    { "id": "uuid", "name": "Moroso" },
    { "id": "uuid", "name": "Cumplido" }
  ]
}
```

---

## GET /tenants

**Description**: List available tenants (for tenant selector in create/edit form).  
**Roles**: `super_admin` (all tenants), `admin` (own tenant only)  
**Note**: This endpoint may already exist. If not, add it to support the tenant selector dropdown.

**Response 200**:
```json
{
  "data": [
    { "id": "uuid", "name": "Residencial Demo", "slug": "demo" }
  ]
}
```
