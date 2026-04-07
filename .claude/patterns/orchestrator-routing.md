# Orchestrator Routing Table

| User Intent Signal | Routes To | Via Command |
|---|---|---|
| "create spec", "new feature", "write spec", "feature description" | `spec-writer-agent` | `/speckit.specify` |
| "clarify", "ambiguities", "unclear", "questions", "gaps in spec" | `clarifier-agent` | `/speckit.clarify` |
| "plan", "design", "technical plan", "implementation plan" | `planner-agent` | `/speckit.plan` |
| "checklist", "validate requirements", "requirements quality", "unit test spec" | `checklist-author-agent` | `/speckit.checklist` |
| "tasks", "break down", "task list", "decompose", "what do I implement" | `task-decomposer-agent` | `/speckit.tasks` |
| "implement", "execute tasks", "start coding", "run tasks" | (direct execution) | `/speckit.implement` |
| "analyze", "consistency check", "cross-artifact", "spec quality audit" | (direct execution) | `/speckit.analyze` |
| "issues", "GitHub issues", "convert tasks to issues", "create issues" | (direct execution) | `/speckit.taskstoissues` |
| "constitution", "principles", "project principles", "update constitution" | (direct execution) | `/speckit.constitution` |
| "review code", "PR review", "check code", "compliance" | `code-reviewer-agent` | → agent (no speckit command) |
| "React", "Next.js", "Tailwind", "shadcn", "Zustand", "TanStack Query", "frontend component", "page guidance" | `frontend-developer-agent` | → agent (no speckit command) |
| "NestJS", "API endpoint", "Supabase", "migration", "RLS", "repository", "guard", "tenant", "RBAC", "backend module", "database schema" | `backend-developer-agent` | → agent (no speckit command) |
| "Electron", "desktop app", "IPC", "preload", "SQLite", "SyncEngine", "offline-first", "auto-updater", "guard booth", "main process" | `desktop-developer-agent` | → agent (no speckit command) |

## Disambiguation Rules

When intent is ambiguous between agents, apply these rules:

| Ambiguous Signal | Disambiguation |
|---|---|
| "architecture" (standalone) | → `planner-agent` (architecture design is planning) |
| "backend architecture" | → `planner-agent` if designing/planning; → `backend-developer-agent` if implementing an existing plan |
| "frontend architecture" | → `planner-agent` if designing/planning; → `frontend-developer-agent` if implementing an existing plan |
| "desktop architecture" | → `planner-agent` if designing/planning; → `desktop-developer-agent` if implementing an existing plan |
| "review" + "plan" | → `planner-agent` (plan review, not code review) |
| "review" + "code"/"PR"/"diff" | → `code-reviewer-agent` |

When disambiguation is unclear, ask one clarifying question before routing.

## Output Format

**For speckit commands:**
```
→ Route: /speckit.<command>

<one-sentence rationale>

Run: /speckit.<command> <args if any>
```

**For direct agent invocations:**
```
→ Route: <agent-name>

<one-sentence rationale>
```
