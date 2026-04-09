# Research: Catalog Users Management

**Feature**: 008-catalog-users | **Date**: 2026-04-09

## R1: Supabase Admin API for User Creation

**Decision**: Use Supabase Admin API (`supabase.auth.admin.createUser`) from the NestJS API using the service-role key.

**Rationale**: Creating auth users requires elevated privileges. The service-role key is already configured in the API's `SupabaseService` (via `SUPABASE_SECRET_KEY`). The admin API allows setting `email`, `password`, `email_confirm`, and `app_metadata` (role, tenant_id) in a single call. This avoids the need for the new user to go through sign-up flow.

**Alternatives considered**:
- `supabase.auth.signUp()` — Requires end-user interaction (email confirmation flow). Not suitable for admin-initiated user creation.
- Direct PostgreSQL insert into `auth.users` — Bypasses Supabase auth hooks and password hashing. Fragile and unsupported.

## R2: User Deactivation (Soft Delete) via Auth + Profile

**Decision**: Implement soft delete by (1) setting `profiles.status = 'inactive'` and (2) calling `supabase.auth.admin.updateUserById(userId, { banned: true })` to prevent login at the auth layer.

**Rationale**: Setting only the profile status would still allow the user to authenticate via Supabase Auth. The `banned` flag on the auth user prevents JWT issuance entirely. Reactivation reverses both: `status = 'active'` and `banned = false`.

**Alternatives considered**:
- Profile status only — User could still get a valid JWT and access API endpoints that don't check profile status. Security gap.
- Delete auth user + recreate on reactivation — Destroys user history and generates new UUID. Not viable for soft delete.
- Custom middleware to check profile status on every request — Adds latency and complexity to every API call.

## R3: user_group_ids Storage Strategy

**Decision**: Use PostgreSQL `uuid[]` (native array) column on the profiles table, referencing `user_groups.id` values.

**Rationale**: The user explicitly described `user_group_ids` as "a list of ids" on the profile table. PostgreSQL native arrays support indexing (GIN), querying (`@>`, `&&` operators), and are well-supported by Supabase. The number of groups per user is small (typically 1-3), making a join table unnecessary overhead. Supabase JS handles arrays natively.

**Alternatives considered**:
- JSONB array — Less type-safe, harder to index, no referential integrity hints.
- Join table (profile_user_groups) — More normalized but adds complexity for a simple tagging use case. User spec explicitly puts field on profiles table.

**Trade-off note**: No FK constraint on array elements. Orphan references must be handled at the application layer (filter out invalid group IDs when displaying). This is acceptable since group deletion is out of scope.

## R4: Role Hierarchy Enforcement

**Decision**: Define a role hierarchy map in `@ramcar/shared` and enforce it at both the API service layer and frontend UI layer.

**Rationale**: The role hierarchy `SuperAdmin > Admin > Guard > Resident` determines what actions each role can perform. A shared constant (e.g., `ROLE_HIERARCHY: Record<Role, number>`) allows both API and frontend to compute `canEditUser(actorRole, targetRole)` consistently.

**Implementation approach**:
```
ROLE_HIERARCHY = { super_admin: 4, admin: 3, guard: 2, resident: 1 }
canModifyUser(actor, target) = ROLE_HIERARCHY[actor] >= ROLE_HIERARCHY[target]
```

- API: Service layer checks before allowing update/deactivate. Returns 403 if violation.
- Frontend: Disables edit/deactivate controls for users above the current user's role level.

**Alternatives considered**:
- Hardcoded if/else checks per role — Error-prone, duplicated, hard to maintain.
- Database-level enforcement via RLS — RLS can't easily express "admin can't edit super_admin" without complex policies. Better handled in application layer with RLS as baseline tenant isolation.

## R5: Search and Filtering Strategy

**Decision**: Server-side search, filter, and sort via API query parameters. The API builds a dynamic Supabase query with `ilike`, `eq`, and `order` clauses.

**Rationale**: As user counts grow, client-side filtering becomes impractical. Server-side filtering leverages PostgreSQL indexes and returns only matching rows. Pagination is required for scalability.

**Query parameters**: `?search=term&tenant_id=uuid&status=active&sort_by=full_name&sort_order=asc&page=1&page_size=20`

**Alternatives considered**:
- Client-side filtering (fetch all, filter in browser) — Does not scale. Unacceptable for tenants with hundreds of users.
- Full-text search (PostgreSQL tsvector) — Overkill for this feature. Simple `ilike` on concatenated fields is sufficient for the expected dataset size.

## R6: New User Password Handling

**Decision**: Use Supabase Admin API's `createUser` with `email_confirm: true` (auto-confirms email). Set a temporary random password. Then immediately call `generateLink({ type: 'recovery', email })` to generate a password-reset link. The admin receives this link to share with the new user.

**Rationale**: This avoids requiring the admin to set the user's password (security best practice). The new user sets their own password via the reset link. The temporary password ensures the auth record is valid but never exposed.

**Alternatives considered**:
- Admin sets initial password — Security risk; password known to creator.
- Magic link (passwordless) — Requires user's email to be accessible immediately. Not always the case in residential contexts.
- Auto-generated password shown once — Acceptable but less secure than reset link approach.

## R7: Testing Strategy

**Decision**: Three-layer testing approach aligned with existing project patterns.

**Unit tests**:
- `packages/shared`: Zod schema validation (user.test.ts) — Vitest
- `apps/api`: Controller, service, repository isolation tests — Jest + @nestjs/testing
- `apps/web`: Component rendering, form validation, hook behavior — Vitest + testing-library

**Integration tests (API)**:
- NestJS TestingModule with mocked Supabase service
- Test CRUD endpoints with different role contexts
- Verify role hierarchy enforcement (Admin can't edit Super Admin)
- Verify tenant isolation (Admin can't see other tenant's users)

**E2E tests (Web)**:
- Playwright tests for: navigate to users list, create user, edit user, deactivate/reactivate
- Role-based scenarios: Admin vs Super Admin role options
- Search and filter behavior

**Desktop**: Shared package unit tests only (Zod validators, store slices if applicable).

**Naming conventions**: `*.test.ts` (unit/Vitest), `*.spec.ts` (NestJS/Playwright).

## R8: Navigation — Catalogs Sub-Items

**Decision**: Add `subItems` to the existing "catalogs" sidebar item with "users" as the first sub-item. The catalogs page will serve as a parent that redirects to or lists sub-modules.

**Rationale**: The spec says Users is a "submodule" of Catalogs. The sidebar already supports `subItems` (see logbook, access-log). This pattern is consistent with the existing navigation architecture.

**Implementation**: Update `sidebar-config.ts` to add `subItems: [{ key: "users", route: "/catalogs/users" }]` to the catalogs item. Add i18n keys for the sub-item label.
