# Visit-Person Default Status `flagged` + Guard Role Read-Only

**Date:** 2026-04-28
**Author:** Ivan Eusebio (with Claude)
**Status:** Spec — pending implementation

## Summary

Change the default `visit_persons.status` from `"allowed"` to `"flagged"` for every newly created visitor / service-provider, and make the status field read-only for the `guard` role in both the create and edit forms. Enforce the role rule server-side in the visit-persons module so a guard cannot bypass the UI.

The user-facing wording referred to "access events," but in this codebase `status` lives only on `visit_persons` and is surfaced on access-event listings via the join. No `status` column is added to `access_events`.

## Goals

1. Every new visit-person record (visitor or service-provider) starts at `status = "flagged"` regardless of the creator's role. Admins / super-admins can change it before saving; guards cannot.
2. The shared `VisitPersonStatusSelect` is rendered for guards but `disabled` — they always see the badge / current value but cannot open the dropdown.
3. API rejects guard attempts to *change* `status` on update with `403 Forbidden`. On create, any `status` sent by a guard is silently coerced to `"flagged"` (the UI already enforces it; the silent coerce avoids needless 4xx for clients that send the whole object back).
4. Admin / super-admin behavior is unchanged end-to-end.

## Non-goals

- **No `status` column added to `access_events`.** Only the joined `visit_persons.status` is involved.
- No data migration — existing visit-persons keep whatever `status` they have today. Admins can re-flag any record manually via the catalog.
- No label / i18n string changes to "Flagged" / "Marcado".
- No changes to the access-event creation flow itself, the access-event list, CSV export, or the status badge / filter.
- No outbox / desktop offline path changes — `POST /visit-persons` already goes through the existing transport.
- No restriction on visit-person fields other than `status` (name, phone, notes, etc., remain editable per existing rules).

## Background

`visit_persons.status: "allowed" | "flagged" | "denied"` is the gate-entry signal: `allowed` means "let in," `flagged` means "stop and verify," `denied` means "do not admit." Today the Zod schema defaults `status` to `"allowed"` on create, and the shared `VisitPersonStatusSelect` is rendered enabled to every role. Guards at the booth can therefore admit any new visitor without admin oversight.

The Guard-Vehicle-Permissions spec from earlier today (`2026-04-28-guard-vehicle-permissions-design.md`) established the pattern this spec reuses: extend `useRole()` to expose `role`, gate UI by role, and enforce in the API service as defense-in-depth. That spec also adds a `@CurrentUserRole()` decorator (`apps/api/src/common/decorators/current-user-role.decorator.ts`) which this spec consumes.

## Architecture

### `@ramcar/shared` — Zod default flip

`packages/shared/src/validators/visit-person.ts`:

```ts
export const createVisitPersonSchema = z.object({
  // ...
  status: visitPersonStatusEnum.default("flagged"),  // was: .default("allowed")
  // ...
});
```

Single-line change. `updateVisitPersonSchema.status` stays optional and ungated at the schema layer — the role check is in the service.

### API (`apps/api/src/modules/visit-persons/`)

No new endpoints, no DTO additions. Two existing endpoints get a service-level role check.

#### `@CurrentUserRole()` decorator

Reuse the decorator added by the Guard-Vehicle-Permissions spec. If that spec lands first, this spec just imports it. If this spec lands first, this spec adds it and the Vehicle spec consumes it. Reads `request.authUser?.app_metadata?.role`, the same source `RolesGuard` uses.

#### Service-level role check

```ts
// VisitPersonsService.create
async create(dto: CreateVisitPersonInput, scope: TenantScope, role: Role) {
  // Defense-in-depth: even if a guard sends status === "allowed" via direct API call,
  // coerce to "flagged". UI already enforces; this protects the data.
  const safeDto = role === "guard" ? { ...dto, status: "flagged" as const } : dto;
  return this.repository.create(safeDto, scope);
}

// VisitPersonsService.update
async update(id: string, dto: UpdateVisitPersonInput, scope: TenantScope, role: Role) {
  if (role === "guard" && dto.status !== undefined) {
    throw new ForbiddenException("Guards cannot change visit-person status");
  }
  // ... existing logic
}
```

Controller-level `@Roles("super_admin","admin","guard")` stays permissive — guards still need to *create* visit-persons at the booth and update non-status fields like phone or notes. The `update` branch only fires when `dto.status !== undefined`, so guard PATCHes that omit `status` are unaffected.

The silent coerce on create is intentional and is documented inline in the service so future readers don't read it as a bug.

### Shared package — `VisitPersonStatusSelect`

`packages/features/src/shared/visit-person-status-select/index.tsx`. Add one optional prop:

```ts
interface VisitPersonStatusSelectProps {
  value: VisitPersonStatus;
  onValueChange: (value: VisitPersonStatus) => void;
  id?: string;
  disabled?: boolean;   // NEW — passed through to <Select disabled>
}
```

`<Select disabled={disabled}>` from `@ramcar/ui` (Radix-backed shadcn) supports the prop natively. The visual treatment — dot + label — stays identical so guards still see the current status clearly; they just can't open the dropdown.

### Shared package — `useRole()` adapter

Depends on the Guard-Vehicle-Permissions spec extending the adapter port from `{ tenantId }` to `{ tenantId, role }`. If that spec lands first, this spec just consumes it. If this spec lands first, this spec adds the `role` field to the adapter port and updates the web and desktop adapter implementations to source `role` from the `@ramcar/store` authSlice. Whichever lands first, the implementation plan resolves the order.

### Shared package — visit-person forms

`packages/features/src/visitors/components/visit-person-form.tsx`:

```ts
const { role } = useRole();
const [status, setStatus] = useState<VisitPersonStatus>(
  initialDraft?.status ?? "flagged",   // was: ?? "allowed"
);
// ...
<VisitPersonStatusSelect
  value={status}
  onValueChange={setStatus}
  disabled={role === "guard"}
/>
```

`packages/features/src/visitors/components/visit-person-edit-form.tsx`:

```ts
const { role } = useRole();
// initial state already seeds from `person.status` — no default change needed
<VisitPersonStatusSelect
  value={state.status}
  onValueChange={(v) => setState((s) => ({ ...s, status: v }))}
  disabled={role === "guard"}
/>
```

The `useFormPersistence` draft restoration on the web side is unaffected — when a guard reopens a draft that somehow contains `status: "allowed"`, the field still renders disabled and the API coerces on submit.

### What does NOT change

- `VisitPersonStatusBadge` — still renders the current status everywhere it appears.
- `access_events` table, repository, controller, service.
- CSV export of access events.
- i18n strings.
- Visit-person status filter dropdown (still lets any role *filter* by any status).
- Resident vehicle / access-event flows (covered by the Guard-Vehicle-Permissions spec).

## Data flows

### Admin creates a visitor from the catalog

```
1. Admin opens the visitor sidebar in "create" mode.
2. useRole() → { tenantId, role: "admin" }.
3. visit-person-form.tsx initial status = "flagged" (new default).
4. VisitPersonStatusSelect renders enabled — admin can change to "allowed" or keep "flagged".
5. Admin picks "allowed", submits.
6. transport.post("/visit-persons", { ..., status: "allowed" }).
7. API: VisitPersonsService.create receives role = "admin" → no coercion → repository inserts with status = "allowed".
```

### Guard creates a visitor at the booth

```
1. Guard opens the visitor sidebar from the access-event flow.
2. useRole() → { tenantId, role: "guard" }.
3. Form initial status = "flagged".
4. VisitPersonStatusSelect renders disabled — guard sees "Marcado" with the warning dot, cannot open dropdown.
5. Guard fills name/phone/notes, submits.
6. transport.post("/visit-persons", { ..., status: "flagged" }).
7. API: role = "guard" → coerce status to "flagged" (no-op here, already flagged).
8. Repository inserts with status = "flagged". Admin reviews and approves later.
```

### Guard tries to bypass via direct API call (create)

```
1. Guard hits POST /visit-persons with body { status: "allowed", ... } via devtools / curl.
2. Service sees role = "guard" → silently overwrites status to "flagged".
3. Record is created flagged. No error to the client (no UI relies on this path).
```

### Guard tries to bypass via direct API call (update)

```
1. Guard hits PATCH /visit-persons/:id with body { status: "allowed" }.
2. Service sees role = "guard" + dto.status !== undefined → throws ForbiddenException.
3. Client receives 403 { message: "Guards cannot change visit-person status" }.
```

### Guard updates non-status fields (e.g., adds a phone)

```
1. Guard opens an existing visitor's edit sidebar.
2. Edit form renders with VisitPersonStatusSelect disabled.
3. Guard edits phone, leaves status untouched. Form submit excludes status from the patch body
   (only sends fields that changed — already the existing pattern in visit-person-edit-form.tsx).
4. API: role = "guard", dto.status === undefined → guard branch is a no-op.
5. Repository updates phone normally.
```

This last flow is the reason for choosing "reject only when `status` is present in the patch body" rather than "reject any guard PATCH that touches a record." It preserves the guard's ability to fix typos / phone numbers during a live registration without blowing up.

## Error handling

- **Frontend:** `disabled` select is purely visual — no error path. The form's existing `onError` toast remains for any API-side rejection.
- **API `ForbiddenException`** (status 403) on guard PATCH-with-status → frontend transport already maps non-2xx to thrown errors → mutation `onError` shows a forbidden toast. Reuse an existing generic forbidden message key if one exists; otherwise add `visitPersons.messages.forbidden` in `@ramcar/i18n`. The implementation plan resolves which.
- **Silent coerce on create** (guard + status sent via direct API call) is intentional: no error is shown, the record is created `flagged`. This is the only case where the server overrides client input without telling the client; documented inline in the service so future readers don't read it as a bug.
- **Existing records with `status = "allowed"`** continue to work — they are not migrated. Guards opening them see the disabled select rendering "Permitido" / "Allowed". Admins can still adjust.

## Testing

### API (`apps/api/src/modules/visit-persons/__tests__/`)

`visit-persons.service.spec.ts` — new tests alongside the existing ones:

- `create` — guard sending `status: "allowed"` → repository called with `status: "flagged"`.
- `create` — admin sending `status: "allowed"` → repository called with `status: "allowed"`.
- `update` — guard sending `status` in body → throws `ForbiddenException`, repository not called.
- `update` — guard sending only `phone` → succeeds, repository called.
- `update` — admin sending `status` → succeeds.

`visit-persons.controller.spec.ts`:

- `@CurrentUserRole()` injection wired into both `create` and `update` handlers, sourced from `request.authUser.app_metadata.role`.

### `@ramcar/shared` — `validators/visit-person.test.ts`

- `createVisitPersonSchema.parse({ type: "visitor", fullName: "X" })` → `status === "flagged"` (new default).
- Existing test `status: "allowed" as const` still passes (explicit override still allowed at the schema layer; the role coerce is in the service).

### Shared package — `packages/features/src/shared/visit-person-status-select/__tests__/`

New test file:

- Renders enabled when `disabled` prop is omitted; clicking the trigger opens the menu.
- Renders disabled when `disabled === true`; clicking the trigger does NOT open the menu; the current label and dot stay visible.

### Shared package — `packages/features/src/visitors/components/__tests__/`

`visit-person-form.test.tsx` (extend existing):

- With `role: "guard"` → initial `status === "flagged"`, status select rendered with `disabled`.
- With `role: "admin"` → initial `status === "flagged"`, status select rendered enabled.

`visit-person-edit-form.test.tsx` (extend existing):

- With `role: "guard"` and a record at `status: "allowed"` → select shows "Allowed" but is disabled; submitting other field changes does not include `status` in the patch body.
- With `role: "admin"` → select enabled, can change.

### E2E (Playwright, `apps/web/tests/`)

Mirrors the Vehicle-Permissions spec's coverage:

- One test confirming a guard's visitor sidebar shows status disabled and a created record persists with `status = "flagged"`.
- One test confirming an admin can create a visitor and choose `allowed`.

## Implementation order (sketch — refined in the implementation plan)

1. `@ramcar/shared` — flip Zod default to `"flagged"`; update validator test.
2. `@ramcar/features` shared package — add `disabled` prop to `VisitPersonStatusSelect`; add unit test.
3. `useRole()` adapter — if the Guard-Vehicle-Permissions spec hasn't landed, add the `role` field to the adapter port and update web + desktop adapter implementations. Otherwise consume the existing extended adapter.
4. `visit-person-form.tsx` — flip `useState` initial to `"flagged"`, wire `disabled={role === "guard"}`. Tests.
5. `visit-person-edit-form.tsx` — wire `disabled={role === "guard"}`. Tests.
6. API — `VisitPersonsService.create` (silent coerce), `update` (`ForbiddenException`); inject `@CurrentUserRole()` in the controller. Tests.
7. Playwright E2E.
8. Manual QA pass for guard, admin, super_admin in both web and the desktop booth.

## Open considerations (flagged, not blocking)

- **Dependency on the Guard-Vehicle-Permissions spec.** That spec already extends `useRole()` to expose `role` and adds the `@CurrentUserRole()` decorator. Implementation order mostly assumes it lands first. If both ship in parallel, whichever lands second imports the existing adapter shape — the implementation plan resolves the order.
- **Should guards be barred from *all* visit-person updates?** Out of scope here; current behavior preserves their ability to fix typos / phone numbers during registration. If stricter rules are needed later, that's a follow-up spec.
- **i18n key for the forbidden toast.** Reuse an existing generic forbidden message if one exists in `@ramcar/i18n`; otherwise add `visitPersons.messages.forbidden`. Resolved in the implementation plan, not here.
