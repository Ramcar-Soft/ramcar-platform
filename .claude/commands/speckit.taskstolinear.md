---
description: Sync tasks.md to Linear — creates new issues, updates existing ones. Tracks mapping in .linear-sync.json.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Prerequisites

Before starting, verify:

1. **LINEAR_API_KEY** — Run `dotenvx get LINEAR_API_KEY -f .env` to retrieve the decrypted value. If empty or the command fails, stop and tell the user:
   > Set `LINEAR_API_KEY` in `.env` via `dotenvx set LINEAR_API_KEY <value> -f .env`. Generate one at **Linear → Settings → API → Personal API keys**.

2. **LINEAR_TEAM_ID** — Run `dotenvx get LINEAR_TEAM_ID -f .env` to retrieve the decrypted value. If empty or the command fails, fetch teams and prompt the user to choose:

```bash
dotenvx run -f .env -- bash -c 'curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '"'"'{"query": "{ teams { nodes { id name key } } }"}'"'"' | jq '"'"'.data.teams.nodes[] | "\(.key) — \(.name) (ID: \(.id))"'"'"''
```

Show the list and ask the user to pick a team. Once chosen, use that team ID for all issues.

> **Note:** All `curl` commands in this document that reference `$LINEAR_API_KEY` or `$LINEAR_TEAM_ID` must be run via `dotenvx run -f .env -- bash -c '...'` so the encrypted env vars are decrypted and available. Alternatively, capture the decrypted values once at the start:
>
> ```bash
> export LINEAR_API_KEY=$(dotenvx get LINEAR_API_KEY -f .env)
> export LINEAR_TEAM_ID=$(dotenvx get LINEAR_TEAM_ID -f .env)
> ```
>
> Then use them directly in subsequent commands for the rest of the session.

3. **tasks.md** — Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root. Extract `FEATURE_DIR` and the path to **tasks.md**. If the script fails or tasks.md is missing, stop and tell the user to run `/speckit.tasks` first.

## Sync Mapping File

This command maintains a mapping file at `FEATURE_DIR/.linear-sync.json` that tracks the relationship between task IDs and Linear issue IDs. Format:

```json
{
  "teamId": "uuid",
  "teamKey": "RCP",
  "syncedAt": "2026-03-16T12:00:00Z",
  "tasks": {
    "T001": {
      "issueId": "linear-uuid",
      "identifier": "RCP-123",
      "url": "https://linear.app/...",
      "title": "T001: Create project structure",
      "priority": 3,
      "labelIds": ["label-uuid-1"],
      "descriptionHash": "sha256-of-description",
      "status": "created"
    }
  }
}
```

If the file exists, read it to determine which tasks need creation vs. update.

## Execution

### Step 1: Parse tasks.md

Read the tasks.md file. Extract every task line matching the pattern:

```
- [ ] TXXX [P?] [US?] Description
- [x] TXXX [P?] [US?] Description   (completed tasks)
```

For each task, capture:
- **ID** (e.g., `T001`)
- **Completed** (`[x]` = true, `[ ]` = false)
- **Parallel flag** (`[P]` if present)
- **User story** (e.g., `[US1]` if present)
- **Description** (the rest of the line)
- **Phase** (the `## Phase N: ...` heading the task falls under)
- **Dependencies** (inferred from "depends on TXXX" in description, or from phase ordering)

### Step 2: Load sync mapping

Read `FEATURE_DIR/.linear-sync.json` if it exists. This tells us:
- Which tasks already have Linear issues (update path)
- Which tasks are new (create path)
- Which Linear issues have tasks that were removed from tasks.md (report as orphaned — do NOT delete)

### Step 3: Classify tasks

For each parsed task, classify into one of three buckets:

| Bucket | Condition | Action |
|--------|-----------|--------|
| **Create** | Task ID not in sync mapping | Create new Linear issue |
| **Update** | Task ID in sync mapping AND (title, description, priority, completion status, or labels changed) | Update existing Linear issue |
| **Skip** | Task ID in sync mapping AND nothing changed | No action needed |
| **Orphaned** | Task ID in sync mapping but NOT in tasks.md | Report to user (do NOT delete from Linear) |

To detect changes, compare the current task data against the stored sync mapping fields (title, descriptionHash, priority).

### Step 4: Fetch existing labels

Query Linear for existing labels so we can reuse them instead of creating duplicates:

```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ issueLabels { nodes { id name } } }"}' | jq '.data.issueLabels.nodes'
```

### Step 5: Create labels if needed

Create these labels if they don't already exist (match by name, case-insensitive):

- **Phase label** per phase (e.g., `phase:setup`, `phase:foundational`, `phase:us1`, `phase:polish`)
- **`parallel`** — for tasks marked `[P]`
- **`speckit`** — to tag all auto-created issues

```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { issueLabelCreate(input: { teamId: \"'$LINEAR_TEAM_ID'\", name: \"LABEL_NAME\" }) { success issueLabel { id name } } }"}'
```

### Step 6: Map priority

| Phase | Linear Priority |
|-------|----------------|
| Setup | 3 (Medium) |
| Foundational | 1 (Urgent) |
| User Story P1 | 2 (High) |
| User Story P2 | 3 (Medium) |
| User Story P3+ | 4 (Low) |
| Polish | 4 (Low) |

If user input specifies different priority mapping, use that instead.

### Step 7: Process CREATE bucket

For each new task (in order from tasks.md), create a Linear issue:

```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url title } } }",
    "variables": {
      "input": {
        "teamId": "LINEAR_TEAM_ID_VALUE",
        "title": "TASK_ID: TASK_DESCRIPTION",
        "description": "MARKDOWN_BODY",
        "priority": PRIORITY_NUMBER,
        "labelIds": ["LABEL_ID_1", "LABEL_ID_2"]
      }
    }
  }'
```

**Issue title format:** `T001: Create project structure per implementation plan`

**Issue description format:**

```markdown
## Task Details

- **ID**: T001
- **Phase**: Phase 1: Setup
- **User Story**: US1 (or N/A)
- **Parallel**: Yes/No
- **Dependencies**: T002, T003 (or None)

## Description

[Full task description from tasks.md]

---
*Synced by speckit `/speckit.taskstolinear`*
```

After creation, record the issue in the sync mapping.

### Step 8: Process UPDATE bucket

For each changed task, update the existing Linear issue:

```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success issue { id identifier url title } } }",
    "variables": {
      "id": "EXISTING_ISSUE_ID",
      "input": {
        "title": "UPDATED_TITLE",
        "description": "UPDATED_DESCRIPTION",
        "priority": UPDATED_PRIORITY,
        "labelIds": ["LABEL_ID_1", "LABEL_ID_2"]
      }
    }
  }'
```

**Completion sync:** If a task is marked `[x]` in tasks.md, update the Linear issue state to "Done":

```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { issueUpdate(id: \"ISSUE_ID\", input: { stateId: \"DONE_STATE_ID\" }) { success } }"
  }'
```

To get the "Done" state ID, query workflow states once:

```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ team(id: \"'$LINEAR_TEAM_ID'\") { states { nodes { id name type } } } }"}' | jq '.data.team.states.nodes[] | select(.type == "completed")'
```

After update, refresh the sync mapping entry.

### Step 9: Add dependency relations for new issues

After all creates/updates, for any newly created issue with explicit dependencies (e.g., "depends on T012, T013"), look up the dependency's Linear issue ID from the sync mapping and add a relation:

```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { issueRelationCreate(input: { issueId: \"BLOCKER_ISSUE_ID\", relatedIssueId: \"DEPENDENT_ISSUE_ID\", type: blocks }) { success } }"}'
```

Skip if the relation already exists (Linear returns an error for duplicates — catch and ignore).

### Step 10: Write sync mapping

Write the updated `.linear-sync.json` back to `FEATURE_DIR/.linear-sync.json`.

### Step 11: Summary report

Output a summary table:

```
## Linear Sync Report

| Task | Linear Issue | Action | Priority | Status | URL |
|------|-------------|--------|----------|--------|-----|
| T001 | RCP-123 | created | Medium | Todo | https://linear.app/... |
| T002 | RCP-124 | updated | Urgent | Done | https://linear.app/... |
| T003 | RCP-125 | skipped | High | Todo | (no changes) |
...

### Orphaned Issues (in Linear but removed from tasks.md)
| Linear Issue | Original Task | URL |
|-------------|--------------|-----|
| RCP-130 | T015 | https://linear.app/... |

Total: X created, Y updated, Z skipped, W orphaned.
Sync mapping saved to: FEATURE_DIR/.linear-sync.json
```

## Important

- **Rate limiting**: Add a 200ms delay between API calls if processing more than 10 tasks.
- **Idempotency**: The sync mapping file is the source of truth for which tasks have been synced. If the file is deleted, the command falls back to searching Linear by title prefix (`TXXX:`) to avoid duplicates.
- **Never delete Linear issues** — orphaned tasks are reported but never removed.
- **Never create issues in a team the user did not select.**
- **Sync mapping file** (`.linear-sync.json`) SHOULD be gitignored — it contains Linear UUIDs specific to your workspace. Add `**/.linear-sync.json` to `.gitignore` if not already present.
