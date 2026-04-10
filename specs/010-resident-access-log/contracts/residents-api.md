# API Contract: Residents

**Base path**: `/api/residents`  
**Guards**: JwtAuthGuard, TenantGuard, RolesGuard  
**Allowed roles**: guard, admin, super_admin

---

## GET /api/residents

List residents (users with role "resident") for the current tenant.

**Query Parameters** (ResidentFiltersDto):

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| search | string | No | - | Free-text search across full_name, email, phone, address |
| status | "active" \| "inactive" | No | - | Filter by user status |
| sortBy | "full_name" \| "email" \| "created_at" | No | "full_name" | Sort field |
| sortOrder | "asc" \| "desc" | No | "asc" | Sort direction |
| page | number | No | 1 | Page number (1-based) |
| pageSize | number | No | 20 | Items per page (max 100) |

**Response** `200 OK`:

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "tenantId": "uuid",
      "fullName": "string",
      "email": "string",
      "phone": "string | null",
      "phoneType": "house | cellphone | work | primary | null",
      "address": "string | null",
      "status": "active | inactive",
      "observations": "string | null",
      "createdAt": "ISO 8601"
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

**Error responses**:
- `401 Unauthorized` — Missing or invalid JWT
- `403 Forbidden` — Role not in [guard, admin, super_admin]

---

## GET /api/residents/:id/vehicles

List vehicles registered to a specific resident.

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| id | UUID | Resident's profile ID |

**Response** `200 OK`:

```json
[
  {
    "id": "uuid",
    "tenantId": "uuid",
    "userId": "uuid",
    "vehicleType": "car | motorcycle | pickup_truck | truck | bicycle | scooter | other",
    "brand": "string | null",
    "model": "string | null",
    "plate": "string | null",
    "color": "string | null",
    "notes": "string | null",
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
]
```

**Error responses**:
- `401 Unauthorized` — Missing or invalid JWT
- `403 Forbidden` — Role not in [guard, admin, super_admin]
- `404 Not Found` — Resident ID does not exist or belongs to a different tenant
