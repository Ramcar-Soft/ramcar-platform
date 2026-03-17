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

Always output the PR description as **plain markdown** (no extra prose, no code fences wrapping the whole block) so it can be copied and pasted directly into GitHub.

Use the following template:

## 🎯 Summary

<!-- Brief overview of what this PR does (1-2 sentences) -->

## ✨ What's New / What Changed

<!-- List key changes. Be specific about features/fixes. Mention breaking changes. -->

-
-
-

## 🧪 Testing

<!-- How to test this change. What scenarios were covered. Any edge cases to watch for. -->

-
-
-

## 📝 Technical Details

<!-- Optional: Implementation notes, design decisions, performance considerations -->

## 🔗 Related

- Linear: {RCP}-XXX

## 📸 Screenshots / Videos

<!-- Add screenshots or videos here for UI changes -->

---

### ✅ Checklist

- [ ] Ran `pnpm run lint:fix && pnpm run typecheck`
- [ ] All tests pass (`pnpm test`)
- [ ] PR title follows format: `type({WC|WA|WE}-XXX): description`
- [ ] Added screenshots/videos for UI changes
- [ ] Updated documentation if needed

## 4. Filling in each section

**Summary** — One or two sentences describing the overall goal of the PR (not a list of files).

**What's New / What Changed** — Bullet each meaningful change. Group related items (e.g. new component + its sub-components together). Call out breaking changes explicitly. Include bug fixes that landed in the same PR.

**Testing** — List the test scenarios that were added grouped by file or component. Mention edge cases explicitly (e.g. invalid input, empty state, unmount cleanup).

**Technical Details** — Only include this section if there is a non-obvious decision worth explaining (e.g. why a specific hook pattern was chosen, a performance trade-off, a workaround for a framework limitation). Skip it if the changes are self-explanatory.

**Related** — Extract the ticket number from the branch name or commit message. Leave Figma and Storyblok as placeholder comments if not known.

**Screenshots / Videos** — Leave as a placeholder comment; the author fills this in.


## 5. Final formatting:

- Convert the output text to markdown format available to be copied and pasted to PR description field in github.

