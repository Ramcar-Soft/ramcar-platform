# Form Field Format Validation

**Date:** 2026-04-23
**Status:** Design approved, ready for planning
**Owner:** Ivan Eusebio

## Problem

Forms across the platform accept phone numbers, emails, and usernames with inconsistent (or absent) format rules:

- **Phone** is stored as an arbitrary string (`z.string().max(20)` for users, `z.string().max(30)` for visit persons). Users can type anything — `555 1234`, `cel de Juan`, leading/trailing spaces — and it persists to the database. No normalization on the way in; no way to rely on the format on the way out. There is also no phone validation at all in the provider and visit-person forms (the user form has a `max(20)` length rule via the user schema but no format rule).
- **Email** has `z.string().email()` on the user schema but the web `user-form` redoes validation inline with a homegrown regex, and submitted values are not trimmed or lower-cased, opening the door to duplicate-user bugs where `Juan@Foo.com` and `juan@foo.com` are treated as different accounts.
- **Username** has `[a-zA-Z0-9_]+` in the user schema, min 3, max 50, but the form duplicates this regex inline. It also has a latent bug at `apps/web/src/features/users/components/user-form.tsx:176` where `submitData.username = submitData.phone` — the form overwrites username with the phone value on submit.

The goal is a single set of authoritative format rules that every relevant form and every API endpoint enforce consistently, with phone values normalized to E.164 before hitting the database.

## Decisions

1. **Phone scope:** Mexico-default + international. Accept either (a) a 10-digit MX number with any combination of `(`, `)`, `-`, space as separators, or (b) a `+`-prefixed international number. In both cases, validity is determined by `libphonenumber-js` (`parsePhoneNumber(input, "MX")` → `.isValid()`). Values are normalized to E.164 (`+52...` for MX, original country code for international) before save. Library: `libphonenumber-js/min`.
2. **Phone UX:** Free-form typing — no live input mask. Validate on blur and on submit. Normalize on submit. Placeholder `(555) 123-4567`; helper text reads "Mexican 10-digit number or international with + prefix" (i18n).
3. **Email UX:** Standard `<input type="email">`, validate on blur and submit, `trim()` + `toLowerCase()` on submit before API call.
4. **Username rules:** 3–30 characters, `[a-zA-Z0-9._-]`, must start with alphanumeric, no consecutive `.`, `_`, or `-`, cannot end with `.`, `_`, or `-`. Soft-filter in the input (strip disallowed chars as the user types) in addition to Zod validation.
5. **Migration strategy:** Hard switch — validate on write only. No backfill of existing data. Forms that load a legacy phone value display it as-is; on next save, it gets normalized.

## Architecture

### Shared schemas — single source of truth

All format rules live in `packages/shared/src/validators/` as reusable Zod schemas. The API's validation pipe and every form consume the same schemas. No inline regex in any form component.

**New files:**

- `packages/shared/src/validators/phone.ts`
  - `phoneSchema: z.ZodEffects<z.ZodString, string, string>` — accepts raw input, normalizes to E.164, rejects invalid input.
  - `normalizePhone(input: string): string | null` — pure utility for form submit code paths that need to send the E.164 value to the API without re-running the full Zod parse.
  - `phoneOptionalSchema` — `z.union([z.literal(""), phoneSchema])` for optional fields (most of our forms).
- `packages/shared/src/validators/username.ts`
  - `usernameSchema` — regex + `.refine()` for consecutive-char rule.
  - `usernameOptionalSchema` — `z.union([z.literal(""), usernameSchema])`.
  - `stripUsernameChars(input: string): string` — pure utility for the soft-filter onChange handler.
- `packages/shared/src/validators/email.ts`
  - `emailSchema` — `z.string().trim().toLowerCase().email(...)`.

**Existing files updated to import these:**

- `packages/shared/src/validators/user.ts` — replace the local `usernameWhenProvided` + inline email validator with imports. Replace `z.string().max(20)` for phone with `phoneOptionalSchema`. Re-export types unchanged.
- `packages/shared/src/validators/visit-person.ts` — replace `z.string().max(30)` for phone with `phoneOptionalSchema` on both create and update schemas.

### Dependency

Add `libphonenumber-js` (`^1.x`) to `packages/shared` `dependencies`. Use the `/min` entrypoint (metadata for MX + international, tree-shaken). Approx 70 KB min+gzipped. Workspace consumers (`apps/api`, `apps/web`, `apps/desktop`, `packages/features`) pick it up transitively.

### Form-level behavior

| Form                                                                 | Changes                                                                                                                                  |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/features/users/components/user-form.tsx`               | Replace inline regex w/ shared schemas. Soft-filter username onChange via `stripUsernameChars`. Normalize phone + email on submit. **Fix bug at line 176** where `submitData.username = submitData.phone`. Placeholder + helper text for phone and username. |
| `apps/web/src/features/providers/components/provider-form.tsx`       | Add phone blur/submit validation via `phoneOptionalSchema`. Normalize on submit. Placeholder + helper text.                              |
| `apps/web/src/features/providers/components/provider-edit-form.tsx`  | Same as above.                                                                                                                           |
| `apps/desktop/src/features/providers/components/provider-form.tsx`   | Same as above (per-app duplicate; awaits `providers` migration to `@ramcar/features`).                                                   |
| `apps/desktop/src/features/providers/components/provider-edit-form.tsx` | Same as above.                                                                                                                        |
| `packages/features/src/visitors/components/visit-person-form.tsx`    | **Add phone field** (schema already allows it — rendering it closes the gap). Same validation/normalization pattern.                     |
| `packages/features/src/visitors/components/visit-person-edit-form.tsx` | Same — add phone field + validation.                                                                                                  |

**Out of scope:**

- `login-form.tsx` (web + desktop) — email there is passed to Supabase Auth, which has its own validation. Low value to double up.
- `tenant-form.tsx` — no phone/email/username fields.
- `access-event-form.tsx` — no phone/email/username fields.

### Validation timing

- **onBlur:** run `schema.safeParse(value)` for the field, set per-field error if invalid. Immediate feedback without distracting keystroke-by-keystroke errors.
- **onSubmit:** run full form validation; if valid, transform values (`normalizePhone(phone)`, `email.trim().toLowerCase()`) and call the mutation.
- **onChange (username only):** `setUsername(stripUsernameChars(e.target.value))` — disallowed chars are simply dropped as the user types. Zod remains the ultimate check.

### i18n keys

Add to `@ramcar/i18n` (both `en` and `es` catalogs):

- `forms.phoneHelp` — "Mexican 10-digit number or international with + prefix"
- `forms.phoneInvalid` — "Invalid phone number"
- `forms.emailInvalid` — "Invalid email address"
- `users.form.usernameHelp` — "3–30 characters. Letters, numbers, and `. _ -`. Must start with a letter or number."
- `users.validation.usernameInvalid` — "Invalid username format"
- `users.validation.usernameTooShort` — "Username must be at least 3 characters"
- `users.validation.usernameTooLong` — "Username must be at most 30 characters"

Existing Zod error strings that reference message keys (e.g., `"users.validation.primaryMustBeSelected"`) follow the same i18n-key-in-Zod-message pattern — the new validators will do the same.

## Migration & existing data

Hard switch. No backfill migration. Forms that load a legacy unnormalized phone (e.g., `555 123 4567`) display it as-is; when the user next saves, the value is normalized to `+525551234567` (or rejected if invalid). Rejections surface as a blur error — users can fix the field before saving.

**Consumer check:** grep of the repo shows no SMS/WhatsApp sending code, no phone-based exports, no reports that assume a phone format. If one appears later, it will read the now-E.164 values cleanly.

## Testing

### Unit tests (new)

- `packages/shared/src/validators/phone.test.ts` — table-driven:
  - Valid MX: `5551234567`, `(555) 123-4567`, `555-123-4567`, `555 123 4567` → `+525551234567`.
  - Valid international: `+14155551234` → `+14155551234`, `+525551234567` → `+525551234567`.
  - Invalid: `""` (via `phoneSchema` alone — allowed via `phoneOptionalSchema`), `123` (too short), `abc1234567`, `555123456` (9 digits), `55512345678` (11 digits without `+`), `+1234` (too short international).
- `packages/shared/src/validators/username.test.ts` — valid: `juan.perez`, `maria-lopez`, `admin_1`, `a1b`. Invalid: `.juan`, `juan.`, `ju`, `a`.repeat(31), `juan..perez`, `juan perez`, `juan@perez`, `_juan`, `-juan`.
- `packages/shared/src/validators/email.test.ts` — valid roundtrip, trim + lowercase behavior, invalid format rejection.

### Form tests (updated)

- `apps/web/src/features/users/__tests__/user-form-*.tsx` — add cases for phone blur validation, username soft-filter (pasting invalid chars), and `submitData` carrying normalized E.164 phone + lower-cased email. Regression-guard the `username = phone` bug.
- `packages/features/src/visitors/__tests__/visit-person-form-validation.test.tsx` — add phone invalid/valid cases.
- New: `apps/web/src/features/providers/__tests__/provider-form-validation.test.tsx`, `apps/desktop/src/features/providers/__tests__/provider-form-validation.test.tsx`.

### API regression

Existing `packages/shared/src/validators/user.test.ts` and `packages/shared/src/validators/visit-person.test.ts` stay green after the refactor. Add cases asserting the new phone/username/email rules are enforced end-to-end through the union/superRefine schemas.

All covered by existing `pnpm test` and `pnpm test:cov`. No E2E changes.

## Rollout

1. Add dependency + shared schemas + unit tests.
2. Refactor `user.ts` and `visit-person.ts` schemas to use them.
3. Update forms in dependency order (shared package first, then web, then desktop).
4. Update i18n catalogs.
5. Verify typecheck + lint + tests across the monorepo.

No DB schema change. No NestJS controller/service change — the Zod pipe already validates against the schemas. Desktop outbox carries E.164 values through unchanged (already JSON).

## Non-goals

- International country-picker UI. If the MX-default + `+` prefix UX proves insufficient later, we add a `react-phone-number-input` component in a follow-up.
- Backfill of existing data.
- Changes to Supabase Auth email handling in login.
- Any change to phone storage column type (stays `TEXT`).
- Username uniqueness rules beyond what already exists in the DB.
