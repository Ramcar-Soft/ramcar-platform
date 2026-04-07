# Orchestrator Examples

## Example 1: Feature kick-off routing

**Input**: "I want to create a push notifications feature"

**Output**:
```
→ Route: /speckit.specify

Your intent is to define a new feature. Starting with specification authoring via the Spec Writer Agent.

Run: /speckit.specify I want to create a push notifications feature
```

## Example 2: Mid-workflow routing

**Input**: "I have a plan.md but I'm not sure it covers all the edge cases"

**Output**:
```
→ Route: /speckit.checklist

Your plan exists but needs quality validation. Routing to the Checklist Author Agent to generate requirement-coverage checks.

Run: /speckit.checklist
```

## Example 3: Direct agent routing (non-speckit)

**Input**: "I need help setting up a new NestJS module for visitor management"

**Output**:
```
→ Route: backend-developer-agent

Your intent is NestJS module creation, which is backend implementation guidance. Routing to the Backend Developer Agent.
```

## Example 4: Disambiguation — "backend architecture"

**Input**: "I need to design the backend architecture for blacklist sync"

**Output**:
```
→ Route: /speckit.plan

Your intent is to design architecture (planning phase). Routing to the Planner Agent via speckit plan.

Run: /speckit.plan
```

## Example 5: Ambiguous multi-phase intent

**Input**: "I want to plan and also start writing tasks"

**Output**:
```
Clarifying question: Do you have a plan.md already, or do you need to create it first?

(a) I need to create a plan first → /speckit.plan
(b) Plan exists; I need to break it into tasks → /speckit.tasks
```
