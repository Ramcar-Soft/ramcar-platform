# Login Page Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the shadcn Mist/Green theme to the login page — muted background, white card with shadow, green primary button.

**Architecture:** Four small edits: root layout gets theme colors on body, new auth layout provides muted background + centering, login page simplifies (layout handles wrapper), login form card gets shadow-md and default button variant.

**Tech Stack:** Next.js App Router, Tailwind CSS, shadcn/ui theme tokens

---

### Task 1: Add theme colors to root layout body

**Files:**
- Modify: `apps/web/src/app/layout.tsx:29-31`

- [ ] **Step 1: Edit the body element**

In `apps/web/src/app/layout.tsx`, change the `<body>` className from:

```tsx
<body
  className={`${geistSans.variable} ${inter.variable} font-body antialiased`}
>
```

to:

```tsx
<body
  className={`${geistSans.variable} ${inter.variable} font-body antialiased bg-background text-foreground`}
>
```

- [ ] **Step 2: Verify dev server**

Run: `pnpm --filter @ramcar/web dev`

Open `http://localhost:3000/login` — the page should still look similar (background token and white are very close), but the body now uses the theme's background color variable.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "style(web): add theme bg/text colors to root layout body"
```

---

### Task 2: Create auth layout with muted background

**Files:**
- Create: `apps/web/src/app/(auth)/layout.tsx`

- [ ] **Step 1: Create the auth layout file**

Create `apps/web/src/app/(auth)/layout.tsx` with this content:

```tsx
import React from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
      {children}
    </main>
  );
}
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:3000/login` — the page background should now be a light gray/mist color. The card should appear against this background. Content may appear double-wrapped (the page still has its own `<main>` wrapper — fixed in Task 3).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(auth\)/layout.tsx
git commit -m "feat(web): add auth layout with muted background"
```

---

### Task 3: Simplify login page

**Files:**
- Modify: `apps/web/src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Replace the page content**

Replace the entire content of `apps/web/src/app/(auth)/login/page.tsx` with:

```tsx
import React from "react";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Ramcar Platform</h1>
      </div>
      <LoginForm />
    </div>
  );
}
```

The `<main>` wrapper, `min-h-screen`, centering, and padding are removed — the auth layout handles all of that.

- [ ] **Step 2: Verify in browser**

Open `http://localhost:3000/login` — the heading and card should be centered on the muted background with no double-wrapping. The card should show its border against the muted background.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(auth\)/login/page.tsx
git commit -m "refactor(web): simplify login page, auth layout handles wrapper"
```

---

### Task 4: Fix card shadow and button variant on login form

**Files:**
- Modify: `apps/web/src/features/auth/components/login-form.tsx:23,63`

- [ ] **Step 1: Add shadow-md to the Card**

In `apps/web/src/features/auth/components/login-form.tsx`, change line 23 from:

```tsx
<Card className="w-full max-w-sm">
```

to:

```tsx
<Card className="w-full max-w-sm shadow-md">
```

- [ ] **Step 2: Change button variant to default**

In the same file, change line 63 from:

```tsx
<Button type="submit" className="w-full" disabled={isPending} variant="outline">
```

to:

```tsx
<Button type="submit" className="w-full" disabled={isPending}>
```

(`variant="default"` is the default prop value, so omitting it is cleaner.)

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000/login`:
- The card should have a more pronounced shadow (shadow-md vs shadow-sm)
- The Sign In button should be green (primary color) instead of outline/ghost
- The card should have a visible border and sit on the muted background with clear contrast

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/auth/components/login-form.tsx
git commit -m "style(web): enhance login card shadow, use primary button"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| `bg-background text-foreground` on body | Task 1 |
| Auth layout with `bg-muted`, centering | Task 2 |
| Simplify login page (remove wrapper) | Task 3 |
| Card `shadow-md` override | Task 4, Step 1 |
| Button `variant="default"` | Task 4, Step 2 |
| No changes to Card component globally | Confirmed — no edits to `packages/ui` |

All spec requirements covered. No placeholders. Type/class names consistent across tasks.
