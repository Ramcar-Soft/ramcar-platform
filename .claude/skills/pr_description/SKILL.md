---
name: pr-description
description: Create a PR description from the existing changes, using a pre existing template
---

When creating the PR description follow these steps:

## 1. Gather context

- If a specific commit is provided (e.g. `e09afcf0`), run `git show <sha> --stat` to understand the files changed and the commit message.
- Check any uncommitted changes with `git status --short` and `git diff HEAD` for files that were modified after the last commit.
- If no commit is provided, first check for uncommitted changes with `git status --short` and `git diff HEAD`. Then detect the base branch: run `git log --oneline --decorate HEAD` and check if the branch was created from an epic branch by running `git log --oneline <candidate>..HEAD` for any `main` branches returned by `git branch -a | grep main`. If an epic branch exists with fewer commits ahead than `main`, use it as the base. Otherwise fall back to `main`. Then run `git diff <base-branch>...HEAD --stat` and `git log <base-branch>..HEAD --format="%h %s"` to scope the diff and history to only the commits on the current branch.
- Extract the ticket number from the branch name (`git branch --show-current`) or the commit message.

## 2. Understand the changes

Read the relevant changed files to understand:
- What new components, hooks, or utilities were added
- What existing behavior was modified or fixed
- What tests were added or updated
- Any bug fixes included alongside the feature work

## 3. Output format

**Read** `.github/pull_request_template.md` — output must follow that structure and headings (emoji sections included).

## 4. Filling in each section

**Summary** — One or two sentences describing the overall goal of the PR (not a list of files).

**What's New / What Changed** — Bullet each meaningful change. Group related items (e.g. new component + its sub-components together). Call out breaking changes explicitly. Include bug fixes that landed in the same PR.

**Testing** — List the test scenarios that were added grouped by file or component. Mention edge cases explicitly (e.g. invalid input, empty state, unmount cleanup).

**Technical Details** — Only include this section if there is a non-obvious decision worth explaining (e.g. why a specific hook pattern was chosen, a performance trade-off, a workaround for a framework limitation). Skip it if the changes are self-explanatory.

**Related** — Extract the ticket number from the branch name or commit message. Leave Figma and Storyblok as placeholder comments if not known.

**Screenshots / Videos** — Leave as a placeholder comment; the author fills this in.


## 5. Formatting:

- Single **markdown code block** (fenced) containing the **full** PR body so the user can copy one block into GitHub.
- Replace every `<!-- ... -->` with real content; remove HTML comments from the final text inside the block.
- Use `-` bullet lists under each section; no empty placeholder sections—write concrete bullets or write "N/A" with one line why.
