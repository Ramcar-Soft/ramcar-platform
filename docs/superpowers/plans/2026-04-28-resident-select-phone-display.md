# Resident Select — Phone Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface each resident's phone number on the right side of line 1 of every row in the existing `ResidentSelect` combobox, formatted as `Type · Number`, with no API/schema/i18n-catalog changes.

**Architecture:** Display-only change scoped to the shared feature module at `packages/features/src/shared/resident-select/index.tsx`. Add a private `formatPhoneWithType` helper at the top of the file, then replace the existing `CommandItem` body with a two-row layout: line 1 = name (left, truncates) + phone label (right, tabular, never truncates); line 2 = address (muted, existing behavior). The helper consumes `useI18n()`'s existing `t` and the existing `users.phoneTypes.*` catalog keys (no new keys). Tests live next to the component and use the existing vitest harness, whose mocked `t` echoes its input key — so assertions must match the **key concatenated with the number** (e.g. `users.phoneTypes.cellphone · 555-1234`), not the localized string.

**Tech Stack:** TypeScript (strict), React 18, `@ramcar/features` (Vite-built shared package, vitest), `@ramcar/ui` (`Command*`/`Popover*` from shadcn/Radix), `@ramcar/shared` (`PhoneType`, `ExtendedUserProfile`), `@ramcar/i18n` (`users.phoneTypes.{house,cellphone,work,primary}`), Tailwind CSS 4, `@testing-library/react` + `@testing-library/user-event`.

**Reference spec:** `docs/superpowers/specs/2026-04-28-resident-select-phone-display-design.md`

**Out-of-scope reminders (do NOT touch in any task):**
- The trigger button label (closed combobox). It must keep rendering `Name — Address`.
- The `CommandInput` placeholder. Stays as `t("residents.select.searchPlaceholder")`.
- `apps/api/**` (phone search is already implemented at `users.repository.ts:41`).
- `packages/i18n/src/messages/{es,en}.json` (no new keys).
- `apps/web/**` and `apps/desktop/**` host wiring.
- `ResidentSelectProps` (the public component contract).

**Git policy for this repo:** `CLAUDE.md` says *"Do NOT commit or push unless explicitly asked by the user."* This plan therefore contains **no commit steps**. After Task 3, hand changes back to the user — they will commit.

---

## File map

- **Modify** — `packages/features/src/shared/resident-select/index.tsx`
  - Add `import type { PhoneType } from "@ramcar/shared"` (extend the existing import).
  - Add private helper `formatPhoneWithType(phone, phoneType, t): string | null`.
  - Replace the `CommandItem` body (currently a `<div className="flex flex-col">` with name + address).
- **Modify** — `packages/features/src/shared/resident-select/resident-select.test.tsx`
  - Append a new `describe("ResidentSelect — phone display", …)` block with three test cases.
  - No changes to existing fixtures or helpers; new tests build their own residents via the existing `makeResident({...})` factory.

No other files, packages, or apps are touched.

---

## Pre-flight context (verified — engineer can rely on these)

- `ExtendedUserProfile` already declares `phone: string | null` and `phoneType: PhoneType | null` (`packages/shared/src/types/user.ts:23-24`).
- `PhoneType` is the closed union `"house" | "cellphone" | "work" | "primary"` exported from `@ramcar/shared` (`packages/shared/src/types/user.ts:3` + re-exported via `packages/shared/src/index.ts:3`).
- The test harness at `packages/features/src/test/harness.tsx:17-20` uses `mockI18n.t = (key) => key`. **All test assertions in this plan are written against the echoed key**, e.g. `users.phoneTypes.cellphone · 555-1234`.
- The default `makeResident()` factory in the test file already sets `phone: null, phoneType: null` — so existing tests will not regress when phones are conditionally rendered.
- The repo's catalog `users.phoneTypes.{house,cellphone,work,primary}` is present in both `packages/i18n/src/messages/es.json:152-157` and the matching `en.json` — no key is missing.

---

## Task 1: Write three failing tests for phone display

**Files:**
- Modify: `packages/features/src/shared/resident-select/resident-select.test.tsx` — append a new `describe` block at the bottom of the file.

**Goal of the task:** Express the three behaviors from the spec's acceptance matrix as failing tests before the component is touched.

- [ ] **Step 1.1: Open the test file and locate the insertion point**

The new `describe` block goes at the very end of the file, after the existing `ResidentSelect — US4: loading state` block (currently the last `describe`, ending around line 374). All three new tests share the same shape: render `ResidentSelect`, supply a custom transport that returns a single resident with the desired `phone` / `phoneType`, click the trigger to open the popover, and assert on the rendered row.

- [ ] **Step 1.2: Append the new `describe` block with all three tests**

Add this block verbatim at the end of `resident-select.test.tsx` (after the closing `});` of the `US4: loading state` describe):

```tsx
// ─── Phone display in row (spec 2026-04-28) ──────────────────────────────────

describe("ResidentSelect — phone display", () => {
  it("renders 'phoneType key · number' on the row when both are present", async () => {
    const user = userEvent.setup();
    const ana = makeResident({ phone: "555-1234", phoneType: "cellphone" });
    const getFn = vi.fn(async (url: string) => {
      if (url === "/residents") {
        return {
          data: [ana],
          meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
        };
      }
      throw new Error(`unexpected: ${url}`);
    });
    renderWithHarness(<ResidentSelect value="" onChange={() => {}} />, {
      transport: transport(getFn),
    });
    await user.click(screen.getByRole("combobox"));
    expect(
      await screen.findByText("users.phoneTypes.cellphone · 555-1234"),
    ).toBeInTheDocument();
  });

  it("renders just the number (no '·' separator) when phoneType is null", async () => {
    const user = userEvent.setup();
    const ana = makeResident({ phone: "555-1234", phoneType: null });
    const getFn = vi.fn(async (url: string) => {
      if (url === "/residents") {
        return {
          data: [ana],
          meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
        };
      }
      throw new Error(`unexpected: ${url}`);
    });
    renderWithHarness(<ResidentSelect value="" onChange={() => {}} />, {
      transport: transport(getFn),
    });
    await user.click(screen.getByRole("combobox"));
    const phoneNode = await screen.findByText("555-1234");
    expect(phoneNode).toBeInTheDocument();
    expect(phoneNode.textContent ?? "").not.toContain("·");
    expect(screen.queryByText(/users\.phoneTypes\./)).not.toBeInTheDocument();
  });

  it("renders no phone span when phone is null", async () => {
    const user = userEvent.setup();
    const ana = makeResident({
      fullName: "Ana García",
      phone: null,
      phoneType: null,
    });
    const getFn = vi.fn(async (url: string) => {
      if (url === "/residents") {
        return {
          data: [ana],
          meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
        };
      }
      throw new Error(`unexpected: ${url}`);
    });
    renderWithHarness(<ResidentSelect value="" onChange={() => {}} />, {
      transport: transport(getFn),
    });
    await user.click(screen.getByRole("combobox"));
    await screen.findByText("Ana García");
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
    expect(screen.queryByText(/users\.phoneTypes\./)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d{3}-\d{4}/)).not.toBeInTheDocument();
  });
});
```

Notes for the engineer:
- The `getFn` only needs the `/residents` branch because the test passes `value=""`, which disables the resolver query (it's gated on `Boolean(value && !currentPageContainsValue)`).
- The first test asserts the literal string with the key embedded, because `mockI18n.t = (key) => key` (see harness.tsx:18). Do NOT change the harness.
- The second test asserts that no key prefix leaked through (catches a regression where the helper would always concatenate `t(...)` even when `phoneType` is null).
- The third test asserts (a) no `·`, (b) no key leakage, (c) no `\d{3}-\d{4}` digits in the rendered text — i.e. nothing phone-shaped at all.

- [ ] **Step 1.3: Run the new tests and confirm they FAIL**

Run from the repo root:

```bash
pnpm --filter @ramcar/features test -- resident-select.test.tsx
```

Expected: the three new tests in the `ResidentSelect — phone display` describe all fail, with errors of the form *"Unable to find an element with the text: users.phoneTypes.cellphone · 555-1234"* (test 1) and *"Unable to find an element with the text: 555-1234"* (test 2). Test 3 may pass spuriously today (the component currently renders no phone at all), but leave it in — it becomes meaningful as a regression guard once Task 2 ships, and asserts the absence properties the spec requires.

If test 1 or test 2 passes here, STOP — something is wrong with the harness setup. Investigate before continuing.

If existing (pre-task) tests fail, that is unrelated; investigate separately and do not silently merge fixes into this work.

---

## Task 2: Implement `formatPhoneWithType` helper and update the row markup

**Files:**
- Modify: `packages/features/src/shared/resident-select/index.tsx`
  - Extend the existing type-only import on line 16 to include `PhoneType`.
  - Insert a private helper above the component (between the imports and `export interface ResidentSelectProps`).
  - Replace the body of the `CommandItem` inside the `residents.map(...)` (currently `index.tsx:151-166`).

**Goal of the task:** Make all three failing tests from Task 1 pass, while preserving every other behavior of the component (trigger label, search, resolver, loading/empty/error states, prop contract).

- [ ] **Step 2.1: Extend the `@ramcar/shared` import to bring in `PhoneType`**

Find this line at `packages/features/src/shared/resident-select/index.tsx:16`:

```tsx
import type { PaginatedResponse, ExtendedUserProfile } from "@ramcar/shared";
```

Replace it with:

```tsx
import type { PaginatedResponse, ExtendedUserProfile, PhoneType } from "@ramcar/shared";
```

Do NOT touch the value imports above it (`useState`, `useEffect`, `useQuery`, `ChevronDown`, `X`, the `@ramcar/ui` named imports, or the adapter import).

- [ ] **Step 2.2: Add the private helper above the component**

Insert this block immediately after the import block and immediately before `export interface ResidentSelectProps {` (i.e. between current lines 17 and 19):

```tsx
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

Behavioral contract (must match the spec's matrix):

| `phone`        | `phoneType`   | Return                                |
| -------------- | ------------- | ------------------------------------- |
| `null` or `""` | any           | `null`                                |
| `"555-1234"`   | `null`        | `"555-1234"`                          |
| `"555-1234"`   | `"cellphone"` | `"<t('users.phoneTypes.cellphone')> · 555-1234"` |

Do NOT export the helper. It is an implementation detail of this file.

- [ ] **Step 2.3: Replace the `CommandItem` body inside `residents.map(...)`**

Find this block at `packages/features/src/shared/resident-select/index.tsx:151-166`:

```tsx
                  {residents.map((resident) => (
                    <CommandItem
                      key={resident.id}
                      value={resident.id}
                      onSelect={() => commit(resident.id)}
                    >
                      <div className="flex flex-col">
                        <span className="truncate">{resident.fullName}</span>
                        {resident.address && (
                          <span className="text-muted-foreground text-xs truncate">
                            {resident.address}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
```

Replace it with:

```tsx
                  {residents.map((resident) => {
                    const phoneLabel = formatPhoneWithType(
                      resident.phone,
                      resident.phoneType,
                      t,
                    );
                    return (
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
                    );
                  })}
```

Layout invariants (do not deviate from the spec — these classes were chosen deliberately):
- Outer wrapper: `flex flex-col w-full min-w-0 gap-0.5` — `min-w-0` allows the truncate utilities below to actually truncate inside flex children.
- Line 1 row: `flex items-center justify-between gap-2 min-w-0` — pushes phone to the right and lets the name take remaining space.
- Name span: `truncate` — name truncates first when the popover is narrow.
- Phone span (only rendered when `phoneLabel` is truthy): `text-muted-foreground text-xs shrink-0 tabular-nums` — `shrink-0` is intentional and required by the spec (phone is the disambiguator; truncating it defeats the purpose).
- Address span: unchanged — `text-muted-foreground text-xs truncate`, and still gated on `resident.address && ...`.

- [ ] **Step 2.4: Run the full test file and confirm everything passes**

```bash
pnpm --filter @ramcar/features test -- resident-select.test.tsx
```

Expected: every test in the file passes, including:
- All three new tests in `ResidentSelect — phone display`.
- All pre-existing tests (`trigger rendering`, `US3: resolver`, `US1: popover interaction`, `US2: debounced search`, `empty and error states`, `US3: stale-response guard`, `regression guard`, `US4: loading state`).

If a pre-existing test now fails, the most likely culprit is a structural regression in the markup (e.g. an unintended unwrap of the address span, a stray closing tag). Re-read Step 2.3 carefully and compare against the diff before re-running.

If `findByText("Ana García — Calle 1 #10")` fails (the address-on-trigger test, line 82), note that this assertion is on the **trigger** button, which we did NOT change. If it fails, you broke `getTriggerLabel` somehow — revert and try again.

---

## Task 3: Final verification — full feature-package test + workspace typecheck

**Files:** none modified.

**Goal of the task:** Confirm acceptance criteria 6, 7, 8 from the spec.

- [ ] **Step 3.1: Run the full `@ramcar/features` test suite**

```bash
pnpm --filter @ramcar/features test
```

Expected: all tests in the package pass, with no skipped/pending suites introduced by this work.

- [ ] **Step 3.2: Run workspace-wide typecheck**

```bash
pnpm typecheck
```

Expected: zero TypeScript errors. If you see a `PhoneType` import error, double-check Step 2.1 — `PhoneType` must be added to the `import type { ... } from "@ramcar/shared"` line, not as a separate value import. If you see an unused-import error for `PhoneType`, it means Step 2.2 didn't land correctly (the helper signature is the only consumer in this file).

- [ ] **Step 3.3: Hand off to the user**

Per repo policy in `CLAUDE.md`, do NOT run `git add`, `git commit`, or `git push`. Surface the diff to the user (`git diff packages/features/src/shared/resident-select/`) and let them stage/commit. Note in the handoff message:
- Two files changed: `index.tsx` (helper + markup) and `resident-select.test.tsx` (3 new cases).
- All package tests green; workspace typecheck green.
- Visual confirmation in a running app is recommended but not blocking — the spec is display-only and the test harness exercises the rendered output via DOM queries.

---

## Spec → task traceability

| Spec acceptance criterion | Task / step that satisfies it |
| ------------------------- | ----------------------------- |
| 1. Phone right-aligned on line 1 in muted style | Task 2 Step 2.3 (markup with `text-muted-foreground text-xs shrink-0 tabular-nums`); Task 1 Step 1.2 test 1 |
| 2. Rows w/o phone show name + address normally | Task 1 Step 1.2 test 3 (asserts no `·`, no key leak, no digits) |
| 3. Phone present, no `phoneType` → number alone, no prefix | Task 1 Step 1.2 test 2; Task 2 Step 2.2 helper branch `if (!phoneType) return phone` |
| 4. Phone-fragment search still works (regression) | No change required — `users.repository.ts:41` already searches `phone.ilike.%${search}%`. Pre-existing US2 debounce tests guard the client-side debounce path. |
| 5. Trigger renders identically to today | `getTriggerLabel` is untouched; pre-existing trigger tests at lines 71-95 still run in Task 3 Step 3.1 |
| 6. New tests pass; existing tests still pass | Task 2 Step 2.4 + Task 3 Step 3.1 |
| 7. `pnpm --filter @ramcar/features test` passes | Task 3 Step 3.1 |
| 8. `pnpm typecheck` passes | Task 3 Step 3.2 |
