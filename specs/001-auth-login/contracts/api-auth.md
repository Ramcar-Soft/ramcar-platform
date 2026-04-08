# API Contract: Auth Endpoints

**Feature Branch**: `001-auth-login`  
**Date**: 2026-04-07  
**Base URL**: `http://localhost:3001` (local development)

---

## GET /auth/me

Returns the authenticated user's profile. Used to validate the auth chain works end-to-end and to hydrate client-side user state.

### Request

**Headers:**
```
Authorization: Bearer <supabase_access_token>
```

No query parameters or body.

### Response — 200 OK

```json
{
  "id": "uuid",
  "userId": "uuid",
  "tenantId": "uuid",
  "email": "admin@ramcar.dev",
  "fullName": "Admin Demo",
  "role": "admin"
}
```

### Response — 401 Unauthorized

Returned when token is missing, expired, or invalid.

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## POST /auth/logout

Server-side session invalidation. Optional complement to client-side `signOut()`. Revokes the refresh token on the server to prevent reuse.

### Request

**Headers:**
```
Authorization: Bearer <supabase_access_token>
```

No body.

### Response — 200 OK

```json
{
  "message": "Logged out successfully"
}
```

### Response — 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## Authentication Flow

Authentication is handled **client-side** via Supabase Auth SDK (`signInWithPassword`). The API does not have a login endpoint — clients authenticate directly with Supabase, receive a JWT, and include it in API requests.

```
Client                    Supabase Auth              API
  │                            │                      │
  │── signInWithPassword() ──▶│                      │
  │◀── { session, user } ─────│                      │
  │                            │                      │
  │── GET /auth/me ───────────────────────────────────▶│
  │   Authorization: Bearer <token>                    │
  │                            │     verify JWT ◀──────│
  │                            │     ──────────▶       │
  │◀── { profile } ──────────────────────────────────── │
```

---

## Common Headers (All Protected Endpoints)

| Header          | Required | Description                              |
|----------------|----------|------------------------------------------|
| Authorization  | Yes      | `Bearer <supabase_access_token>`         |
| Content-Type   | Varies   | `application/json` for POST/PUT/PATCH    |

---

## Error Codes

| Status | When                                      |
|--------|------------------------------------------|
| 200    | Success                                   |
| 401    | Missing, expired, or invalid token        |
| 403    | Valid token but insufficient role/tenant   |
| 500    | Internal server error                     |
