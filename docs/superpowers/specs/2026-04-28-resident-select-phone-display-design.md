# Resident Select — Phone Display & Search

**Date:** 2026-04-28
**Status:** Draft (pending user review)
**Owner:** Ivan
**Related prior work:** `specs/018-resident-select-combobox/` (the original combobox)

## Summary

Add the resident's phone number to each row of the existing `ResidentSelect`
combobox. The current row shows `fullName` (line 1) and `address` (line 2,
muted). The new row keeps that, plus a right-aligned, muted `Type · Number`
label on line 1 (e.g., `Celular · 555-1234`).

Phone is **already searchable** server-side: `users.repository.ts` has
`phone.ilike.%${search}%` in its OR clause. The visible search-input placeholder
stays unchanged. This design is display-only — no API, transport, schema, or
i18n-catalog changes.

## Motivation

Guards and admins picking a resident from this combobox want to confirm
identity at a glance. Two residents can share an address (same household, two
units, etc.) but rarely share a phone. Surfacing the phone in the row makes
disambiguation faster and removes the need to open a detail page.

## Scope

### In scope

- Row markup change inside `packages/features/src/shared/resident-select/index.tsx`.
- Inline phone-formatting helper (`formatPhoneWithType`) in the same file.
- Three new test cases in `packages/features/src/shared/resident-select/resident-select.test.tsx`.

### Out of scope

- Trigger label (closed combobox button). It stays as `Name — Address`.
- Search-input placeholder copy. It stays as `t("residents.select.searchPlaceholder")`.
- Backend behavior. `phone` is already returned and already searchable.
- New i18n keys. The phone-type labels reuse `users.phoneTypes.{house,cellphone,work,primary}`.
- Other consumers of the same shared package (no breaking API change).

## Detailed design

### 1. Row layout

Replace the current `CommandItem` body with a two-row layout where line 1 holds
the name on the left and the phone label on the right:

```tsx
<CommandItem
  key={resident.id}
  value={resident.id}
  onSelect={() => commit(resident.id)}
>
  <div className="flex flex-col w-full min-w-0 gap-0.5">
    <div className="flex items-center justify-between gap-2 min-w-0">
      <span className="truncate">{resident.fullName}</span>
      {phoneLabel && (
        <span className="text-muted-foreground text-xs shrink-0 tabular-nums">
          {phoneLabel}
        </span>
      )}
    </div>
    {resident.address && (
      <span className="text-muted-foreground text-xs truncate">
        {resident.address}
      </span>
    )}
  </div>
</CommandItem>
```

Layout decisions:

- `min-w-0` on the flex parent so `truncate` works inside flex children.
- `tabular-nums` on phone for visual column alignment row-to-row.
- `shrink-0` on phone — when the row is narrow, the **name** truncates first,
  not the phone. Rationale: phone is the disambiguator; truncating it would
  defeat the purpose of adding it.
- When `phone` is `null`, the right-side `<span>` is omitted entirely (not
  replaced with a placeholder). Name takes the full first line.
- `address` line continues to render only when present (existing behavior).

### 2. Phone-formatting helper

Add at the top of `index.tsx` (not exported from the package):

```ts
import type { PhoneType } from "@ramcar/shared";

function formatPhoneWithType(
  phone: string | null,
  phoneType: PhoneType | null,
  t: (key: string) => string,
): string | null {
  if (!phone) return null;
  if (!phoneType) return phone;
  return `${t(`users.phoneTypes.${phoneType}`)} · ${phone}`;
}
```

Behavior matrix:

| `phone`        | `phoneType`   | Result                              |
| -------------- | ------------- | ----------------------------------- |
| `null` or `""` | any           | `null` (right-side span omitted)    |
| `"555-1234"`   | `null`        | `"555-1234"` (no prefix)            |
| `"555-1234"`   | `"cellphone"` | `"Celular · 555-1234"` (es locale)  |
| `"555-1234"`   | `"house"`     | `"Casa · 555-1234"` (es locale)     |

Used inside the `.map()`:

```tsx
{residents.map((resident) => {
  const phoneLabel = formatPhoneWithType(resident.phone, resident.phoneType, t);
  return (
    <CommandItem ...>
      ...
    </CommandItem>
  );
})}
```

### 3. i18n

No catalog changes. The helper reads existing keys:

- `users.phoneTypes.house` → `Casa` / `House`
- `users.phoneTypes.cellphone` → `Celular` / `Cellphone`
- `users.phoneTypes.work` → `Trabajo` / `Work`
- `users.phoneTypes.primary` → `Principal` / `Primary`

These are defined in `packages/i18n/src/messages/{es,en}.json` (lines 152–157
in both files at time of writing).

A small cross-namespace reach: this is a `residents` component reading
`users.*` keys. Acceptable because `phoneType` is a property of the user
profile, not specific to the residents view, so the value belongs in the
`users` namespace canonically.

### 4. Search behavior

No code change. Confirmation only:

- `apps/api/src/modules/users/users.repository.ts:41` already includes
  `phone.ilike.%${search}%` in the OR clause used by the residents list
  endpoint (the residents service delegates to `usersService.list`).
- The placeholder `t("residents.select.searchPlaceholder")` stays as-is.
  Phone search works silently.

### 5. Tests

Extend `packages/features/src/shared/resident-select/resident-select.test.tsx`
with three new cases. The test file already mocks `useI18n`, `useTransport`,
`useRole` and exercises the open → search → select flow.

1. **Both phone and phoneType present** — fixture: `phone: "555-1234"`,
   `phoneType: "cellphone"`. Open the popover, assert that the row text
   contains `Celular · 555-1234` (or whichever value the test's `t` mock
   returns for `users.phoneTypes.cellphone`; if the mock echoes keys, assert
   on the exact string `users.phoneTypes.cellphone · 555-1234`).
2. **Phone present, phoneType null** — fixture: `phone: "555-1234"`,
   `phoneType: null`. Assert the row contains `555-1234` and does **not**
   contain a `·` separator.
3. **Phone null** — fixture: `phone: null`. Assert the row renders the name
   and address but no right-aligned phone span (query the right-aligned
   `<span>` by role/text and expect it to be absent).

No backend tests added. `users.repository.ts` phone-search coverage is owned
by spec 008/009.

## Non-changes (explicit)

To prevent scope creep at implementation:

- No change to `ResidentSelectProps`. The component's contract with callers is
  identical.
- No change to `ExtendedUserProfile`, `PhoneType`, or any Zod schema in
  `@ramcar/shared`.
- No change to `apps/api`. Routes, DTOs, repositories, RLS — all untouched.
- No change to `apps/web` or `apps/desktop` host wiring. Both apps consume
  `ResidentSelect` from `@ramcar/features` and need no edits.
- No change to the trigger button. Trigger renders `Name — Address` exactly
  as today.
- No change to the search-input placeholder.
- No change to the desktop offline path. Phone is part of the existing
  resident payload; if a desktop cache layer exists, it already stores it.

## Files touched

- `packages/features/src/shared/resident-select/index.tsx` — new helper, new row markup.
- `packages/features/src/shared/resident-select/resident-select.test.tsx` — three new cases.

## Risks / open questions

- **Long phone strings could push name truncation aggressively** on narrow
  popover widths. Mitigation: `shrink-0` on phone is intentional, see Section
  1. If feedback from real use says the name truncates too soon, revisit by
  giving phone a `max-w-[12ch]` cap.
- **Locale mismatch for `phoneType` values not in the enum** is impossible —
  `PhoneType` is a closed union (`"house" | "cellphone" | "work" | "primary"`),
  and the i18n catalog covers all four.
- **Test mock of `t`** — depends on how the existing test stubs `useI18n`. If
  the mock returns the key unchanged, assertions should match
  `users.phoneTypes.cellphone · 555-1234`. If it returns mapped values,
  assertions should match `Celular · 555-1234`. Implementation step: read the
  existing test's `t` mock first and write assertions to match.

## Acceptance criteria

1. Opening the resident selector and looking at any row with a phone shows
   the phone, right-aligned on line 1, in the muted style.
2. Rows for residents with no phone show the name on the full first line and
   the address (if present) on line 2.
3. Rows for residents with a phone but no `phoneType` show just the number
   on the right (no `·` prefix).
4. Typing a phone number fragment into the search input still returns
   matching residents (existing server behavior, regression-only).
5. The combobox trigger (closed state) renders identically to today.
6. All three new tests pass; existing tests for this component still pass.
7. `pnpm --filter @ramcar/features test` passes.
8. `pnpm typecheck` passes for the workspace.
