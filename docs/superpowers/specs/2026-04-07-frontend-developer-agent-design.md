# Frontend Developer Agent — Design Spec

**Date**: 2026-04-07
**Status**: Approved

## Summary

A guidance-only Claude agent for React/Next.js/Tailwind frontend work in the Ramcar Platform monorepo. Modeled after the existing `ios-developer-agent.md` with frontend-specific sections added.

## Decisions

| Question | Decision |
|----------|----------|
| Target scope | `apps/web`, `apps/www`, `apps/desktop` (renderer), `packages/ui`, `packages/store`, `packages/shared` |
| Autonomy level | Guidance-only (patterns, snippets, steps — no full autonomous implementation) |
| Convention source | CLAUDE.md only — no extra invented rules |
| Prerequisites | Spec + plan must exist before the agent provides guidance |
| Desktop renderer | In scope (same React/feature-based patterns) |
| Electron main process | Out of scope |
| Approach | Mirror iOS agent structure + frontend-specific sections (Approach B) |

## Agent Structure

### Frontmatter
Standard agent frontmatter: name, expertise-domain, status, version, prerequisites, supported-tasks, escalates-to.

### Sections
1. **Role** — React/Next.js/Tailwind expert for Ramcar monorepo
2. **Activation** — Triggered by React/Next.js/Tailwind/shadcn/Zustand/TanStack Query questions
3. **Prerequisites** — CLAUDE.md reviewed, target app identified, spec + plan exist
4. **Constraints** — Guidance-only, frontend-only, no db-types changes, no import rule deviations, no cross-feature imports
5. **Responsibilities** — Feature-based architecture, Server/Client Components, TanStack Query, Zustand slices, shadcn/ui, Zod schemas, Tailwind styling
6. **Scope** — Explicit list of apps and packages covered
7. **Output Format** — Code snippets + CLAUDE.md compliance + numbered steps + spec references
8. **Honest Challenge** — Same framework as iOS agent, grounded in CLAUDE.md conventions
9. **Escalation** — Routes to code-reviewer, planner, or orchestrator

## Differences from iOS Agent

| Aspect | iOS Agent | Frontend Agent |
|--------|-----------|----------------|
| Stack | Swift/SwiftUI/Tuist | React/Next.js/Tailwind/shadcn |
| Layer system | Tuist module levels 0–4 | Feature-based + App Router |
| Constitution | `.specify/memory/constitution.md` | CLAUDE.md |
| Scope section | Implicit (ios-white-label/) | Explicit list of 6 apps/packages |
| Multi-app awareness | Single app | 3 apps + 3 packages |

## File Location

`.claude/agents/frontend-developer-agent.md`
