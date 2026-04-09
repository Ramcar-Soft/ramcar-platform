# API-First Data Access Guideline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish and enforce the rule that all database operations go through the NestJS API — no direct Supabase DB access from frontend apps.

**Architecture:** Update 9 files across documentation (CLAUDE.md, Constitution), agent definitions (frontend, backend), speckit templates (spec-template), and code comments (4 Supabase client files). No runtime code changes.

**Tech Stack:** Markdown documentation, Claude agent definitions

---

### Task 1: Add Constitution Principle VIII

**Files:**
- Modify: `.specify/memory/constitution.md:77` (after Principle VII, before Technology Constraints)

- [ ] **Step 1: Add Principle VIII after line 78**

Insert the following after the closing of Principle VII (`strict: true` section ends at line 78) and before `## Technology Constraints` (line 80):

```markdown

### VIII. API-First Data Access (NON-NEGOTIABLE)

- All database operations (`supabase.from()`, `.rpc()`, `.storage`) MUST go through the NestJS API (`apps/api`). Frontend apps (`apps/web`, `apps/www`, `apps/desktop`) MUST NOT query or mutate database tables directly.
- **Allowed frontend Supabase usage:** Authentication (`supabase.auth.*`) and Realtime subscriptions (`supabase.channel()`, `.on()`). Nothing else.
- Next.js Server Actions (`"use server"`) MUST NOT contain database queries or mutations. Frontend data operations use `fetch` or TanStack Query to call NestJS REST endpoints.
- The Supabase client in frontend apps MUST be restricted to auth and realtime. Client files MUST include a header comment: `// AUTH & REALTIME ONLY — no .from(), .rpc(), .storage`.
- The NestJS API is the single source of truth for business logic, validation, tenant isolation, and RBAC enforcement. Duplicating these concerns in frontend code is prohibited.
- Desktop app data sync: Supabase Realtime for receiving live updates; all write operations go through NestJS API endpoints.
```

- [ ] **Step 2: Update version footer**

Change the version footer at the bottom of the file from:

```markdown
**Version**: 1.0.0 | **Ratified**: 2026-03-16 | **Last Amended**: 2026-03-16
```

to:

```markdown
**Version**: 1.1.0 | **Ratified**: 2026-03-16 | **Last Amended**: 2026-04-09
```

(MINOR bump: new principle added, no existing principles changed.)

- [ ] **Step 3: Verify file is valid markdown**

Run: `cat .specify/memory/constitution.md | head -5 && echo "---" && grep "### " .specify/memory/constitution.md`

Expected: All 8 principles listed (I through VIII), version shows 1.1.0.

- [ ] **Step 4: Commit**

```bash
git add .specify/memory/constitution.md
git commit -m "docs: add Constitution Principle VIII — API-First Data Access"
```

---

### Task 2: Update CLAUDE.md — Data Access Rules Section

**Files:**
- Modify: `CLAUDE.md:77-78` (after State management block, before `apps/www` line)

- [ ] **Step 1: Add Data Access Rules subsection**

Insert the following after line 77 (`- No overlap between React Query and Zustand`) and before line 79 (`apps/www is the same architecture...`):

```markdown

**Data access (NON-NEGOTIABLE):**
- All database operations (`supabase.from()`, `.rpc()`, `.storage`) go through the NestJS API — never called directly from frontend code
- Allowed frontend Supabase usage: Authentication (`supabase.auth.*`) and Realtime (`supabase.channel()`, `.on()`) only
- No Server Actions (`"use server"`) for data queries or mutations — use `fetch`/TanStack Query to call NestJS REST endpoints
- Frontend Supabase client files must include: `// AUTH & REALTIME ONLY — no .from(), .rpc(), .storage`
- Data fetching: TanStack Query v5 calls NestJS API endpoints — never direct Supabase DB queries
- Desktop sync: Supabase Realtime for receiving live updates; all writes through NestJS API
```

- [ ] **Step 2: Update "Adding New Features" step 1**

Change line 146 from:

```markdown
1. **Frontend (web/www):** Create `src/features/[domain]/` with components, hooks, types. Wire into `src/app/` routes.
```

to:

```markdown
1. **Frontend (web/www):** Create `src/features/[domain]/` with components, hooks, types. Data fetching via TanStack Query against NestJS API endpoints — no direct Supabase DB access. Wire into `src/app/` routes.
```

- [ ] **Step 3: Verify the file reads correctly**

Run: `grep -n "Data access\|API endpoints\|AUTH & REALTIME" CLAUDE.md`

Expected: Three matches — the new Data access subsection header, the data fetching line, and the client file comment line.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add API-first data access rules to CLAUDE.md"
```

---

### Task 3: Update Frontend Developer Agent

**Files:**
- Modify: `.claude/agents/frontend-developer-agent.md:33-36` (Constraints section)
- Modify: `.claude/agents/frontend-developer-agent.md:37-46` (Responsibilities section)

- [ ] **Step 1: Add constraints**

Add the following three lines after the existing last constraint at line 35 (`- No direct cross-feature imports...`):

```markdown
- No direct Supabase database access (`supabase.from()`, `.rpc()`, `.storage`) — all data operations go through NestJS API via fetch/TanStack Query
- No Server Actions (`"use server"`) for data queries or mutations — Server Actions are allowed only for auth-related operations (login, logout)
- Supabase client usage restricted to auth (`supabase.auth.*`) and Realtime (`supabase.channel()`, `.on()`)
```

- [ ] **Step 2: Add responsibility**

Add the following line after the existing last responsibility at line 46 (`- Tailwind styling: shared preset...`):

```markdown
- Enforce API-first data access: all data fetching/mutations use TanStack Query hooks calling NestJS REST endpoints, never direct Supabase queries
```

- [ ] **Step 3: Verify the agent file**

Run: `grep -n "supabase\|API-first\|Server Actions" .claude/agents/frontend-developer-agent.md`

Expected: 4 new matches — the three constraints and one responsibility.

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/frontend-developer-agent.md
git commit -m "docs: add API-first data access constraints to frontend agent"
```

---

### Task 4: Update Backend Developer Agent

**Files:**
- Modify: `.claude/agents/backend-developer-agent.md:34-41` (Constraints section)
- Modify: `.claude/agents/backend-developer-agent.md:43-53` (Responsibilities — NestJS API Patterns section)

- [ ] **Step 1: Add constraint**

Add the following line after the existing last constraint at line 41 (`- Cross-module communication through NestJS DI...`):

```markdown
- The NestJS API is the single entry point for all database operations — frontend apps must never bypass it with direct Supabase queries
```

- [ ] **Step 2: Add responsibility**

Add the following line after the existing last responsibility in the NestJS API Patterns section at line 53 (`- BullMQ queue patterns...`):

```markdown
- Ensure every frontend data need has a corresponding API endpoint — no data operation should require the frontend to query Supabase directly
```

- [ ] **Step 3: Verify the agent file**

Run: `grep -n "single entry point\|frontend data need" .claude/agents/backend-developer-agent.md`

Expected: 2 matches — the new constraint and responsibility.

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/backend-developer-agent.md
git commit -m "docs: add API-first data access constraints to backend agent"
```

---

### Task 5: Update Speckit Spec Template

**Files:**
- Modify: `.specify/templates/spec-template.md:101-115` (after Requirements section, before Success Criteria)

- [ ] **Step 1: Add Data Access Architecture section**

Insert the following after the Key Entities section (after line 101, `- **[Entity 2]**:...`) and before `## Success Criteria` (line 103):

```markdown

### Data Access Architecture *(mandatory for features involving data)*

<!--
  GATE: Every feature that reads or writes data MUST define its data access path.
  Constitution Principle VIII (API-First Data Access) requires all database operations
  go through the NestJS API. Frontend apps must never query Supabase directly.
  
  Fill out the following for each data operation in this feature:
-->

| Operation | API Endpoint | HTTP Method | Request DTO | Response DTO |
|-----------|-------------|-------------|-------------|--------------|
| [e.g., List users] | [e.g., GET /api/users] | [GET/POST/PATCH/DELETE] | [Zod schema name] | [Response type] |

**Frontend data flow**: TanStack Query → NestJS API → Repository → Supabase/Postgres  
**Allowed frontend Supabase usage**: Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) only
```

- [ ] **Step 2: Verify the template**

Run: `grep -n "Data Access Architecture\|GATE.*Principle VIII\|Frontend data flow" .specify/templates/spec-template.md`

Expected: 3 matches — the section header, the gate comment, and the data flow line.

- [ ] **Step 3: Commit**

```bash
git add .specify/templates/spec-template.md
git commit -m "docs: add Data Access Architecture section to speckit spec template"
```

---

### Task 6: Add Header Comments to Supabase Client Files

**Files:**
- Modify: `apps/web/src/shared/lib/supabase/server.ts:1`
- Modify: `apps/web/src/shared/lib/supabase/client.ts:1`
- Modify: `apps/web/src/shared/lib/supabase/middleware.ts:1`
- Modify: `apps/desktop/src/shared/lib/supabase.ts:1`

- [ ] **Step 1: Add header comment to `apps/web/src/shared/lib/supabase/server.ts`**

Insert at the top of the file (before line 1):

```typescript
// AUTH & REALTIME ONLY — Do not use .from(), .rpc(), or .storage on this client.
// All database operations must go through NestJS API endpoints.
// See Constitution Principle VIII and CLAUDE.md Data Access Rules.

```

The file should now read:

```typescript
// AUTH & REALTIME ONLY — Do not use .from(), .rpc(), or .storage on this client.
// All database operations must go through NestJS API endpoints.
// See Constitution Principle VIII and CLAUDE.md Data Access Rules.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  // ... rest of file unchanged
```

- [ ] **Step 2: Add header comment to `apps/web/src/shared/lib/supabase/client.ts`**

Insert at the top of the file (before line 1):

```typescript
// AUTH & REALTIME ONLY — Do not use .from(), .rpc(), or .storage on this client.
// All database operations must go through NestJS API endpoints.
// See Constitution Principle VIII and CLAUDE.md Data Access Rules.

```

The file should now read:

```typescript
// AUTH & REALTIME ONLY — Do not use .from(), .rpc(), or .storage on this client.
// All database operations must go through NestJS API endpoints.
// See Constitution Principle VIII and CLAUDE.md Data Access Rules.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // ... rest of file unchanged
```

- [ ] **Step 3: Add header comment to `apps/web/src/shared/lib/supabase/middleware.ts`**

Insert at the top of the file (before line 1):

```typescript
// AUTH ONLY — session refresh for Next.js middleware.
// Do not use .from(), .rpc(), or .storage on this client.
// See Constitution Principle VIII and CLAUDE.md Data Access Rules.

```

The file should now read:

```typescript
// AUTH ONLY — session refresh for Next.js middleware.
// Do not use .from(), .rpc(), or .storage on this client.
// See Constitution Principle VIII and CLAUDE.md Data Access Rules.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
// ... rest of file unchanged
```

- [ ] **Step 4: Add header comment to `apps/desktop/src/shared/lib/supabase.ts`**

Insert at the top of the file (before line 1):

```typescript
// AUTH & REALTIME ONLY — Do not use .from(), .rpc(), or .storage on this client.
// All database operations must go through NestJS API endpoints.
// See Constitution Principle VIII and CLAUDE.md Data Access Rules.

```

The file should now read:

```typescript
// AUTH & REALTIME ONLY — Do not use .from(), .rpc(), or .storage on this client.
// All database operations must go through NestJS API endpoints.
// See Constitution Principle VIII and CLAUDE.md Data Access Rules.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// ... rest of file unchanged
```

- [ ] **Step 5: Verify all comments are in place**

Run: `grep -rn "AUTH.*REALTIME ONLY\|AUTH ONLY" apps/web/src/shared/lib/supabase/ apps/desktop/src/shared/lib/supabase.ts`

Expected: 4 matches — one per file.

- [ ] **Step 6: Run typecheck to ensure comments don't break anything**

Run: `pnpm typecheck`

Expected: All workspaces pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/shared/lib/supabase/server.ts apps/web/src/shared/lib/supabase/client.ts apps/web/src/shared/lib/supabase/middleware.ts apps/desktop/src/shared/lib/supabase.ts
git commit -m "chore: add AUTH & REALTIME ONLY header comments to frontend Supabase clients"
```

---

### Task 7: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Verify Constitution has Principle VIII**

Run: `grep "### VIII" .specify/memory/constitution.md`

Expected: `### VIII. API-First Data Access (NON-NEGOTIABLE)`

- [ ] **Step 2: Verify CLAUDE.md has Data access section**

Run: `grep "Data access" CLAUDE.md`

Expected: `**Data access (NON-NEGOTIABLE):**`

- [ ] **Step 3: Verify frontend agent has API-first constraints**

Run: `grep -c "supabase\|Server Actions\|API-first" .claude/agents/frontend-developer-agent.md`

Expected: Count >= 4 (3 constraints + 1 responsibility)

- [ ] **Step 4: Verify backend agent has API-first constraint**

Run: `grep -c "single entry point\|frontend data need" .claude/agents/backend-developer-agent.md`

Expected: Count = 2

- [ ] **Step 5: Verify spec template has Data Access Architecture**

Run: `grep "Data Access Architecture" .specify/templates/spec-template.md`

Expected: `### Data Access Architecture *(mandatory for features involving data)*`

- [ ] **Step 6: Verify all Supabase client files have header comments**

Run: `grep -l "AUTH.*ONLY" apps/web/src/shared/lib/supabase/*.ts apps/desktop/src/shared/lib/supabase.ts`

Expected: 4 files listed.

- [ ] **Step 7: Run full lint and typecheck**

Run: `pnpm lint && pnpm typecheck`

Expected: Both pass with no errors.
