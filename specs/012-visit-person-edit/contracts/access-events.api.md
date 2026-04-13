# API Contract: Access Events — Removal of Update Endpoint

**Feature**: `012-visit-person-edit`
**Status**: **Removal contract.** This document specifies an endpoint that **must no longer exist** after this feature ships.

## Removed endpoint

```text
PATCH /api/access-events/:id
```

After this feature, this route **must return 404** (because the handler is deleted, not because of a deny rule). This is the observable proof of the removal.

## Retained endpoints (untouched)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/access-events` | Create a new access event |
| `GET` | `/api/access-events/recent/:userId` | Recent events for a resident |
| `GET` | `/api/access-events/recent-visit-person/:visitPersonId` | Recent events for a visitor / provider |
| `GET` | `/api/access-events/last/:userId` | Last event for a resident |

None of these are modified by this feature.

## Server-side cleanup surface

Deletions required in `apps/api`:

1. `access-events.controller.ts` — delete the `@Patch(":id") async update(...)` handler entirely.
2. `access-events.service.ts` — delete the `update(...)` method (and any private helper only used by it).
3. `access-events.repository.ts` — delete the `update(...)` method if present.
4. Any unit tests (`*.spec.ts`) exclusively exercising the removed path are deleted alongside the code they cover.

## Shared schema cleanup

`packages/shared/src/validators/access-event.ts`:

- Remove `updateAccessEventSchema` export.
- Remove `UpdateAccessEventInput` type alias.

`packages/shared/src/index.ts`:

- Remove `updateAccessEventSchema` re-export.
- Remove `UpdateAccessEventInput` re-export.

The TypeScript build is the enforcement mechanism: any dangling import of these names will break the build and surface the call site for cleanup.

## Frontend cleanup surface

Deletions required in `apps/web` and `apps/desktop`:

| Path | Action |
|------|--------|
| `apps/web/src/features/visitors/hooks/use-update-access-event.ts` | Delete file |
| `apps/web/src/features/providers/hooks/use-update-access-event.ts` | Delete file |
| `apps/desktop/src/features/visitors/hooks/use-update-access-event.ts` | Delete file |
| `apps/desktop/src/features/providers/hooks/use-update-access-event.ts` | Delete file |
| `apps/web/src/features/{visitors,providers}/components/recent-events-list.tsx` | Remove `onEdit` prop + the edit `<button>` element + `t("form.edit")` call |
| `apps/desktop/src/features/{visitors,providers}/components/recent-events-list.tsx` | Same |
| `apps/{web,desktop}/src/features/{visitors,providers}/components/visit-person-sidebar.tsx` | Remove `editingEvent` local state, `handleSaveOrUpdate`, `onUpdateEvent` prop; stop forwarding it to `<RecentEventsList>` and `<VisitPersonAccessEventForm>` |
| `apps/{web,desktop}/src/features/{visitors,providers}/components/visit-person-access-event-form.tsx` | Remove `editingEvent`, `onCancelEdit` props and the edit-mode branches within — reverts to create-only |
| `apps/{web,desktop}/src/features/{visitors,providers}/components/visitors-page-client.tsx` and `providers-page-client.tsx` | Remove `useUpdateAccessEvent` import, the `updateAccessEvent` hook call, the `handleUpdateEvent` callback, and drop `updateAccessEvent.isPending` from `isSaving` |

## i18n cleanup

`apps/web/messages/{en,es}.json` and `apps/desktop/src/locales/{en,es}.json`:

- Remove `accessEvents.form.edit`.
- Remove `accessEvents.messages.updated` (or move semantics to `visitPersons.messages.updated`).

## Verification (acceptance)

After the feature ships, the following observations must hold:

1. `rg "useUpdateAccessEvent|updateAccessEventSchema|UpdateAccessEventInput"` in the repository returns **zero** matches outside of this spec's documentation files.
2. `curl -X PATCH .../api/access-events/<any-uuid>` returns HTTP `404 Not Found`.
3. `pnpm --filter @ramcar/api build` and `pnpm --filter @ramcar/web build` complete without errors.
4. The spec 011 acceptance tests for User Stories 1–4 continue to pass unchanged (SC-004).
