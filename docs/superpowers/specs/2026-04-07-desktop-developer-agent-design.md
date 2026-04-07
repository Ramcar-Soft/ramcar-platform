# Desktop Developer Agent — Design Spec

**Date**: 2026-04-07
**Status**: Approved

## Summary

A guidance-only Claude agent for Electron main process, SQLite, and offline/sync work in the Ramcar Platform desktop guard booth app. Mirrors the `backend-developer-agent.md` structure with responsibilities grouped into two domains: Electron Main Process patterns and Offline/Sync patterns.

## Decisions

| Question | Decision |
|----------|----------|
| Target scope | `apps/desktop` Electron main process only (`electron/` directory) |
| Renderer process | Out of scope (covered by frontend-developer-agent) |
| Sync ownership | Desktop agent owns sync end-to-end (SyncEngine, outbox, conflict resolution). Escalates to backend-developer-agent when Supabase side needs changes. |
| Autonomy level | Guidance-only (patterns, snippets, steps — no full autonomous implementation) |
| Convention source | CLAUDE.md only — no extra invented rules |
| Prerequisites | Spec + plan must exist before the agent provides guidance |
| Responsibility grouping | Two groups within one agent: Electron Main Process patterns + Offline/Sync patterns |
| Escalation | code-reviewer, planner, backend-developer-agent, frontend-developer-agent, orchestrator |
| Approach | Single agent with grouped responsibilities (Approach B) |

## Agent Structure

### Frontmatter

Standard agent frontmatter: name, expertise-domain (`desktop-development`), status, version, prerequisites, supported-tasks, escalates-to.

### Sections

1. **Role** — Electron/SQLite/offline-first expert for Ramcar Platform desktop guard booth app
2. **Activation** — Triggered by Electron main process, IPC, preload, SQLite, SyncEngine, offline-first, auto-updater, guard booth questions
3. **Prerequisites** — CLAUDE.md reviewed, target area identified (services/repositories/ipc/preload), spec + plan exist
4. **Constraints** — Guidance-only, main process only, no renderer code, no frontend packages, no NestJS/Supabase, IPC delegates only, SQLite through repositories only, preload is sole contract
5. **Responsibilities — Electron Main Process Patterns** — Services, repositories, IPC handlers, preload bridge, auto-updater, two-process architecture
6. **Responsibilities — Offline/Sync Patterns** — SyncEngine, outbox pattern, idempotent sync, SyncSlice states, SQLite schema, connectivity detection
7. **Scope** — Explicit list of directories covered and excluded
8. **Output Format** — Code snippets + CLAUDE.md compliance + numbered steps + spec references
9. **Honest Challenge** — Same framework as other agents, grounded in CLAUDE.md conventions
10. **Escalation** — Routes to code-reviewer, planner, backend-developer-agent, frontend-developer-agent, or orchestrator

## Scope Boundaries

### In Scope

- `apps/desktop` — Electron main process only (`electron/` directory):
  - `electron/services/` — Business logic, SyncEngine, auto-updater
  - `electron/repositories/` — SQLite data access (ONLY point of contact with SQLite)
  - `electron/ipc/` — IPC handlers (delegate to services/repos, no business logic)
  - `electron/preload.ts` — Context Bridge contract between main and renderer

### Out of Scope

- `apps/desktop` renderer process (`src/features/`, `src/shared/`) — covered by frontend-developer-agent
- `apps/web`, `apps/www` — covered by frontend-developer-agent
- `apps/api`, `supabase/` — covered by backend-developer-agent
- `packages/ui`, `packages/store`, `packages/db-types` — other agents' domains
- `packages/shared` — shared across agents, but this agent doesn't own it

## Constraints

- Guidance-only — provides patterns/snippets/steps, not full autonomous implementation
- No renderer process code (no React components, no `src/features/`, no `src/shared/`)
- No frontend packages (`packages/ui`, `packages/store`)
- No NestJS API or Supabase infrastructure code
- No deviations from CLAUDE.md architecture without explicit justification
- IPC handlers delegate to services/repositories — NO business logic in `electron/ipc/`
- SQLite access ONLY through `electron/repositories/` — no direct SQLite calls from services or IPC
- Preload (`electron/preload.ts`) is the ONLY contract between main and renderer — if a function is not declared there, the renderer cannot call it

## Responsibilities — Electron Main Process Patterns

- Guide service creation in `electron/services/` for business logic
- Repository patterns in `electron/repositories/` — SQLite schema, queries, data access
- IPC handler wiring in `electron/ipc/` — delegation to services/repos, no business logic
- Preload bridge design: Context Bridge API surface, typed contracts in `electron/preload.ts`
- Auto-updater patterns (update checking, download, install lifecycle)
- Two-process architecture enforcement: main <-> renderer communication only via IPC

## Responsibilities — Offline/Sync Patterns

- SyncEngine guidance (`electron/services/`) — sync lifecycle, retry logic, error handling
- Outbox pattern: queuing mutations locally, processing on connectivity
- Idempotent sync with UUID `event_id` — deduplication, conflict resolution
- SyncSlice states: `idle | syncing | error | offline` — state transitions, edge cases
- SQLite schema design for offline data and outbox tables
- Connectivity detection and sync trigger strategies

## Escalation Paths

- → `code-reviewer-agent`: Review existing desktop code for convention violations
- → `planner-agent`: Architectural decisions spanning multiple apps
- → `backend-developer-agent`: Desktop change has Supabase sync implications (SyncEngine endpoint changes, new sync entities)
- → `frontend-developer-agent`: Main process change affects renderer (new IPC handler needs useIpc hook, preload.ts contract change)
- → `orchestrator`: Task requires speckit workflow guidance

## Orchestrator Routing Entry

| User Intent Signal | Routes To | Via Command |
|---|---|---|
| "Electron", "desktop app", "IPC", "preload", "SQLite", "SyncEngine", "offline-first", "auto-updater", "guard booth", "main process" | `desktop-developer-agent` | (direct invocation) |

## Differences from Backend Agent

| Aspect | Backend Agent | Desktop Agent |
|--------|--------------|---------------|
| Stack | NestJS/Supabase/PostgreSQL | Electron/SQLite/Node.js |
| Architecture | Modular monolith + Repository pattern | Two-process (main/renderer) + Service/Repository |
| Data layer | Supabase/PostgreSQL via RLS | SQLite (offline-first) + outbox sync |
| Responsibility groups | NestJS API + Supabase | Electron Main Process + Offline/Sync |
| Scope | 1 app + supabase/ + 2 packages | 1 app (electron/ directory only) |
| Cross-agent escalation | code-reviewer, planner, frontend-developer, orchestrator | code-reviewer, planner, backend-developer, frontend-developer, orchestrator |

## File Location

`.claude/agents/desktop-developer-agent.md`
