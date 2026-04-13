# API Contract: Visit Persons

**Base path**: `/visit-persons`  
**Auth**: JWT (Bearer token) — all endpoints  
**Guards**: JwtAuthGuard, TenantGuard, RolesGuard  
**Roles**: super_admin, admin, guard

---

## GET /visit-persons

List visit persons with filtering, search, and pagination.

**Query parameters**:

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| type | `visitor` \| `service_provider` | no | - | Filter by person type |
| search | string | no | - | Free-text search across full_name, code, phone, company |
| status | `allowed` \| `flagged` \| `denied` | no | - | Filter by status |
| sortBy | `full_name` \| `code` \| `created_at` | no | `full_name` | Sort field |
| sortOrder | `asc` \| `desc` | no | `asc` | Sort direction |
| page | number | no | 1 | Page number |
| pageSize | number | no | 20 | Items per page (max 100) |

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "code": "VIS-00001",
      "type": "visitor",
      "status": "allowed",
      "fullName": "Juan Perez",
      "phone": "+52 555 1234",
      "company": null,
      "residentId": "uuid",
      "residentName": "Maria Garcia",
      "notes": "Frequent visitor",
      "registeredBy": "uuid",
      "createdAt": "2026-04-10T12:00:00Z",
      "updatedAt": "2026-04-10T12:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

**Notes**: The `residentName` field is a joined display field (from profiles table) for convenience. It is not stored in `visit_persons`.

---

## GET /visit-persons/:id

Get a single visit person by ID.

**Response** `200 OK`: Single VisitPerson object (same shape as list item).  
**Response** `404 Not Found`: Person not found in this tenant.

---

## POST /visit-persons

Create a new visit person.

**Request body**:
```json
{
  "type": "visitor",
  "fullName": "Juan Perez",
  "status": "allowed",
  "phone": "+52 555 1234",
  "company": null,
  "residentId": "uuid",
  "notes": "First time visitor"
}
```

**Validation**:
- `type`: required, must be `visitor` or `service_provider`
- `fullName`: required, max 255 chars
- `status`: optional, defaults to `allowed`
- `phone`: optional, max 30 chars
- `company`: optional, max 255 chars
- `residentId`: optional, must be valid UUID if provided
- `notes`: optional

**Response** `201 Created`: Created VisitPerson (includes auto-generated `code`).

---

## PATCH /visit-persons/:id

Update an existing visit person.

**Request body** (all fields optional):
```json
{
  "fullName": "Juan Perez Lopez",
  "status": "flagged",
  "phone": "+52 555 5678",
  "company": "Delivery Inc",
  "residentId": "uuid",
  "notes": "Updated notes"
}
```

**Response** `200 OK`: Updated VisitPerson.  
**Response** `404 Not Found`: Person not found.

**Note**: `type` and `code` cannot be changed after creation.

---

## GET /visit-persons/:id/images

List images for a visit person.

**Response** `200 OK`:
```json
[
  {
    "id": "uuid",
    "visitPersonId": "uuid",
    "imageType": "face",
    "storagePath": "tenant-uuid/visit-persons/person-uuid/face_1712750400.jpg",
    "signedUrl": "https://supabase-url/storage/v1/object/sign/...",
    "createdAt": "2026-04-10T12:00:00Z"
  }
]
```

**Note**: `signedUrl` is a time-limited URL (60 min TTL) generated server-side for secure image access.

---

## POST /visit-persons/:id/images

Upload an image for a visit person. If an image of the same type already exists, it is replaced (old file deleted from storage).

**Request**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File (binary) | yes | Image file (JPEG/PNG, max 5MB) |
| imageType | string | yes | `face`, `id_card`, `vehicle_plate`, `other` |

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "visitPersonId": "uuid",
  "imageType": "face",
  "storagePath": "...",
  "signedUrl": "...",
  "createdAt": "2026-04-10T12:00:00Z"
}
```

**Response** `400 Bad Request`: Invalid file type or size.

---

## DELETE /visit-person-images/:id

Delete a specific image record and its storage file.

**Response** `204 No Content`: Image deleted.  
**Response** `404 Not Found`: Image not found.

**Note**: This endpoint is available for the image replacement flow. The frontend should call POST (upload) which handles replacement automatically. Direct DELETE is available for admin cleanup.
