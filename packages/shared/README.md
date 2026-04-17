# @ramcar/shared

Cross-cutting **types, Zod validators, and pure utilities** for the Ramcar platform. The single source of truth for DTOs that must agree between the NestJS API and every frontend (web, desktop, `@ramcar/features`).

## Why this package exists

Ramcar's architecture requires that the **same** validation rule enforced by the API be the one a form validates against on the client — otherwise the two drift and users see errors the server didn't allow for (or vice-versa). Constitution **Principle V (Shared Validation via Zod) is NON-NEGOTIABLE**: every DTO is defined once in this package and reused by:

- `apps/api` — at the NestJS controller boundary via the Zod validation pipe.
- `apps/web`, `apps/desktop`, `@ramcar/features` — at the form layer (`react-hook-form` + `zodResolver`) and at the TanStack Query mutation boundary.
- `apps/www` — where public-form validation (e.g., contact) is needed.

A single Zod schema here compiles into both a runtime validator and a TypeScript type (`z.infer<typeof Schema>`), so client and server cannot diverge on shape without a type error.

## What this package owns

```
src/
├── types/         # Pure TypeScript types for domain entities
│   ├── access-event.ts
│   ├── auth.ts
│   ├── user.ts
│   ├── vehicle.ts
│   ├── visit-person.ts
│   └── visit-person-image.ts
├── validators/    # Zod schemas (DTOs) — reused by API and frontend
│   ├── access-event.ts
│   ├── auth.ts
│   ├── user.ts
│   ├── vehicle.ts
│   ├── visit-person.ts
│   └── visit-person-image.ts
├── navigation/    # Shared sidebar / navigation config (spec 003)
│   └── sidebar-config.ts
├── utils/         # Pure utilities safe to use on both client and server
│   └── extract-user-profile.ts
└── index.ts
```

Each validator file typically exports:

- `CreateXSchema`, `UpdateXSchema`, `XSchema` — the Zod shapes.
- `CreateXDto`, `UpdateXDto`, `X` — inferred TypeScript types.

## What does NOT belong here

- **No React components, hooks, or JSX.** This package is consumed by the NestJS API; adding React would pull React into the server build.
- **No Supabase, TanStack Query, Zustand, or NestJS imports.** This is a leaf dependency.
- **No i18n strings.** Those live in `@ramcar/i18n`. Validation error messages that are user-facing are keyed, not hard-coded.
- **No platform APIs** — no `next/*`, no `window.electron`, no Node-only APIs in files that the frontend consumes. Utilities must be isomorphic.
- **No auto-generated Supabase row types** — those live in `@ramcar/db-types`. `@ramcar/shared` holds the DTO-level abstractions we hand-author and control.

## Usage patterns

### API (NestJS) — validate incoming requests

```ts
import { CreateVisitPersonSchema } from "@ramcar/shared";
@Post()
create(@Body(new ZodValidationPipe(CreateVisitPersonSchema)) dto: CreateVisitPersonDto) { ... }
```

### Frontend — drive a form and infer the type

```ts
import { CreateVisitPersonSchema, type CreateVisitPersonDto } from "@ramcar/shared";
const form = useForm<CreateVisitPersonDto>({
  resolver: zodResolver(CreateVisitPersonSchema),
});
```

### Shared feature hooks (`@ramcar/features`) — type the mutation payload

```ts
import { type CreateVisitPersonDto } from "@ramcar/shared";
function useCreateVisitPerson(): UseMutationResult<VisitPerson, Error, CreateVisitPersonDto> { ... }
```

Both host apps wire the same mutation to different transports (web: online HTTP; desktop: outbox). The DTO type is the same one the API enforces.

## Dependencies

- `zod` ^3

No runtime peers. No `@ramcar/*` runtime dependencies (leaf package).

## Position in the package graph

```
apps/api ─────────┐
apps/web ─────────┤
apps/desktop ─────┼──→ @ramcar/shared ──→ zod
apps/www ─────────┤
@ramcar/features ─┤
@ramcar/store ────┘
```

Everyone depends on `@ramcar/shared`. `@ramcar/shared` depends on nothing in the workspace (except `@ramcar/config` for dev tooling).

## Scripts

```bash
pnpm --filter @ramcar/shared typecheck
pnpm --filter @ramcar/shared test
pnpm --filter @ramcar/shared test:cov
```

## See also

- Constitution **Principle V — Shared Validation via Zod (NON-NEGOTIABLE)** in [`CLAUDE.md`](../../CLAUDE.md).
- Generated row types (not here): [`@ramcar/db-types`](../db-types/).
