# JWT Claims Sync — Fix `tenant_ids` Never Reaching the API

**Date:** 2026-04-22
**Branch context:** `020-tenants-catalog`
**Status:** Approved design, ready for implementation plan.

---

## Problem

After an admin creates a new tenant via `POST /api/tenants`:

- The tenant row is created.
- A `user_tenants(user_id=admin, tenant_id=new)` row is inserted.
- The web client (`useCreateTenant.onSuccess`) calls `supabase.auth.refreshSession()` and invalidates the tenants query.

But the admin's subsequent requests still behave as if the new tenant does not exist — `GET /api/tenants` omits it, the TopBar selector does not show it, and `TenantGuard` never includes it in `tenantScope`. `TenantGuard` logs *"legacy JWT without tenant_ids claim — awaiting refresh"* on every request, even after refresh.

## Root Cause

Two independent systems, only one of them wired into the API.

1. The `public.custom_access_token_hook` Postgres function (enabled in `supabase/config.toml`) is the **single source of truth** for the `tenant_ids` claim. It runs on every access-token issue and injects `{ role, tenant_id, tenant_ids }` into the **JWT's claims** — not into the DB.
2. `apps/api/src/common/guards/jwt-auth.guard.ts:24` calls `supabase.auth.getUser(token)`. That call verifies the JWT signature but returns a User object whose `app_metadata` is sourced from `auth.users.raw_app_meta_data` — the DB column. The hook never writes there.

Result: the API reads from the DB, the hook writes to the JWT, the two never meet. RLS is fine because RLS reads `auth.jwt() -> 'app_metadata'` directly. Only the Nest API layer is deaf to the hook.

The 020 cutover updated RLS and the hook but kept the pre-hook `auth.getUser(token)` pattern in `JwtAuthGuard`. The bug is latent for any admin with more than a single-tenant legacy scope.

## Goal

Align the API layer with RLS — both read `app_metadata` from the JWT's claims, which the hook has already populated. No hook changes, no DB changes, no frontend changes.

## Non-Goals

- Mirroring `tenant_ids` into `auth.users.raw_app_meta_data` (option B from the brainstorm).
- Database triggers that duplicate the hook's logic (option C).
- Changing the hook, `user_tenants`, RLS, or the `useCreateTenant` refresh flow.
- Letting admins activate/deactivate tenants (FR-015 keeps status changes SuperAdmin-only; see Known Limitations).
- Short-window token revocation / deny-lists.

---

## Design

### Architecture

Replace the Supabase round-trip in `JwtAuthGuard` with local JWT verification against Supabase's JWKS endpoint (asymmetric signing keys — see https://supabase.com/blog/jwt-signing-keys). Extract `app_metadata` from the verified payload and expose it as `request.authUser`. Every downstream consumer (`TenantGuard`, `RolesGuard`, `@CurrentUser`, `@CurrentTenant`, controllers, services) keeps its existing contract because the shape of `request.authUser` does not change.

```
Before:
  request → JwtAuthGuard → supabase.auth.getUser(token) → DB row's raw_app_meta_data
                                                         ↳ no tenant_ids (hook doesn't write here)

After:
  request → JwtAuthGuard → jwtVerify(token, jwks, { algorithms: ['ES256', 'RS256'] })
                          (jwks = createRemoteJWKSet(SUPABASE_URL + '/auth/v1/.well-known/jwks.json'))
                        → payload.app_metadata (hook's output: role, tenant_id, tenant_ids)
                        → request.authUser = { id: sub, email, app_metadata, user_metadata }
```

Why JWKS + asymmetric over HS256 shared secret: per Supabase's [JWT signing keys](https://supabase.com/blog/jwt-signing-keys) guidance, projects should verify tokens against the project's JWKS endpoint. The API never holds private key material — it can only verify, not mint. Key rotation becomes a no-op on the API side (jose caches the JWKS and refreshes on `kid` miss). No per-environment secret to distribute.

### Components

| File | Change |
|---|---|
| `apps/api/src/common/guards/jwt-auth.guard.ts` | Replace `supabase.auth.getUser(token)` with `jose`'s `jwtVerify` against a `createRemoteJWKSet` resolver pointed at `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`. Algorithm allowlist: `['ES256', 'RS256']` (Supabase's current signing algorithms for asymmetric keys). Synthesize `request.authUser` from payload. Throw `UnauthorizedException` on malformed, expired, bad-signature, wrong-algorithm, missing-`kid`-in-JWKS, or missing-`sub` tokens. |
| `apps/api/package.json` | Add `jose` (`^5.10.0`). No `@types/*` needed — `jose` ships its own types. |
| `apps/api/.env.example` | No new variable. The guard reuses the existing `SUPABASE_URL` entry to derive the JWKS URL. |
| `apps/api/src/common/guards/__tests__/jwt-auth.guard.spec.ts` (new) | Unit tests with an in-memory JWKS (see Testing). |

`ConfigService.getOrThrow<string>('SUPABASE_URL')` runs in the guard's constructor — missing URL crashes the app at boot, no silent per-request failure. The JWKS resolver is built once per instance and reused.

`SupabaseService` and the service-role Supabase client are untouched; the admin client used for DB/storage operations remains a separate concern.

### Guard internals

```ts
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

type SupabaseJwtPayload = JWTPayload & {
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

type JwksResolver = ReturnType<typeof createRemoteJWKSet>;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwks: JwksResolver;

  constructor(config: ConfigService) {
    const supabaseUrl = config.getOrThrow<string>("SUPABASE_URL");
    this.jwks = createRemoteJWKSet(
      new URL("/auth/v1/.well-known/jwks.json", supabaseUrl),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException();

    let payload: SupabaseJwtPayload;
    try {
      const result = await jwtVerify<SupabaseJwtPayload>(token, this.jwks, {
        algorithms: ["ES256", "RS256"],
      });
      payload = result.payload;
    } catch {
      throw new UnauthorizedException();
    }

    if (!payload.sub) throw new UnauthorizedException();

    request.authUser = {
      id: payload.sub,
      email: payload.email,
      app_metadata: payload.app_metadata ?? {},
      user_metadata: payload.user_metadata ?? {},
    };
    request.authToken = token;
    return true;
  }

  private extractToken(request: { headers: Record<string, string> }): string | null {
    const authorization = request.headers["authorization"];
    if (!authorization) return null;
    const [type, token] = authorization.split(" ");
    return type === "Bearer" ? token : null;
  }
}
```

Note: `canActivate` is `async` because `jwtVerify` returns a promise (JWKS lookup by `kid` may trigger a remote fetch on first use or after rotation). `jose` caches the JWKS in-process after the first successful resolve.

### Payload shape

Already what the hook emits — unchanged:

```json
{
  "role": "admin",
  "tenant_id": "uuid-primary",
  "tenant_ids": ["uuid-a", "uuid-b", "uuid-new"]
}
```

- `super_admin` → `"tenant_ids": "*"` (string).
- `resident` → `"tenant_ids": ["<single-uuid>"]`.
- `admin` / `guard` → array from `user_tenants`.

`TenantGuard` already handles all three shapes via `toScope()`.

### Backwards compatibility during rollout

- Tokens issued after the 020 migration already carry hook-populated claims. They work immediately after deploy.
- A token issued before the 020 migration (legacy, no `tenant_ids`) still carries `tenant_id`. `TenantGuard`'s existing `legacyTenantId` fallback path handles them until their next refresh (≤ access-token TTL, default 1h). The "awaiting refresh" warn log becomes meaningful — today it fires on every request; after the fix it only fires for genuine pre-hook tokens.
- No forced re-auth. No broken sessions.

### Error handling

All paths collapse to `401 Unauthorized`; error messages do not leak token contents or key material.

| Condition | Behavior |
|---|---|
| Missing `Authorization` header or non-`Bearer` scheme | `UnauthorizedException` |
| Malformed token | `UnauthorizedException` — `jose` throws `JWSInvalid` / `JWTInvalid` |
| Bad signature / token signed with a key not in the JWKS | `UnauthorizedException` — `JWSSignatureVerificationFailed` |
| Token `kid` not found in JWKS | `UnauthorizedException` — `JWKSNoMatchingKey` |
| Expired (`exp` past) | `UnauthorizedException` — `JWTExpired`. Client SDK handles refresh + retry. |
| Wrong algorithm (e.g. `alg: none`, `HS256`) | `UnauthorizedException` — explicit `algorithms: ['ES256', 'RS256']` allowlist blocks algorithm-confusion. |
| Missing `sub` | `UnauthorizedException` |
| `SUPABASE_URL` not set | App fails to boot (`ConfigService.getOrThrow`) |
| JWKS endpoint unreachable on first verify | `UnauthorizedException` for that request; subsequent requests retry. A persistent outage would be observable via a spike in 401s on the API. |

Logs stay at `warn` level and include only `{ reason, sub? }` — never the token.

### Testing

**Unit tests** (new file `apps/api/src/common/guards/__tests__/jwt-auth.guard.spec.ts`). The test mocks `jose.createRemoteJWKSet` so it returns an in-memory `createLocalJWKSet` built from a test keypair — no network, no Supabase. Tokens are minted with `SignJWT` against the matching private key:

1. Valid ES256 token with `app_metadata.tenant_ids = ["t1","t2"]` → `request.authUser.app_metadata.tenant_ids` equals `["t1","t2"]`, returns `true`.
2. Valid super_admin token with `"tenant_ids": "*"` → preserved as string, not coerced to array.
3. Valid legacy token with `tenant_id` only (no `tenant_ids`) → passes; `TenantGuard` fallback still works downstream.
4. Missing `Authorization` header → `UnauthorizedException`.
5. Non-`Bearer` scheme → `UnauthorizedException`.
6. Malformed token string → `UnauthorizedException`.
7. Token signed by a different keypair (not in the JWKS) → `UnauthorizedException`.
8. Token with `alg: none` → `UnauthorizedException` (verifies the algorithm allowlist).
9. Expired token → `UnauthorizedException`.
10. Token missing `sub` claim → `UnauthorizedException`.

**Integration check**: existing specs (`residents.controller.spec.ts`, `users.service.spec.ts`, `access-events.*.spec.ts`, `create-tenant.use-case.spec.ts`) mock `authUser` at or above the guard and should stay green without changes. Run and confirm before claiming done.

**Manual verification** (one-time after deploy):

1. Sign in as admin with two tenants, decode the JWT on jwt.io, confirm `app_metadata.tenant_ids` has both ids and the token header's `alg` is `ES256` or `RS256` (asymmetric).
2. `GET /api/tenants` returns both tenants (today returns only the legacy primary — this is the concrete regression proving the fix).
3. Create a new tenant. After `useCreateTenant.onSuccess` refreshes the session, `GET /api/tenants` returns three rows and the TopBar selector shows the new one.
4. Decode the post-refresh JWT, confirm `tenant_ids` grew by one.
5. `TenantGuard`'s "legacy JWT without tenant_ids claim — awaiting refresh" warn log stops firing in steady state.

### Rollout

1. Confirm every environment already has `SUPABASE_URL` set — it does, it is reused by `SupabaseService`. No new env var to distribute.
2. Confirm the target Supabase project has JWT signing keys enabled (Project Settings → API → JWT Keys). Local Supabase CLI ≥ the version that ships JWKS exposes the endpoint at `http://127.0.0.1:54321/auth/v1/.well-known/jwks.json`.
3. Deploy API with new guard + `jose` dep. Missing `SUPABASE_URL` → app fails to boot; caught in staging.
4. No database migration. No frontend release coupled to this.

### Risks

| Risk | Mitigation |
|---|---|
| `SUPABASE_URL` not set in an env | `ConfigService.getOrThrow` crashes at boot — impossible to deploy silently broken. |
| JWKS endpoint unreachable (Supabase outage or network partition) | Requests fail closed with 401 until the endpoint recovers. `jose` retries on the next call; no restart required. Severe Supabase Auth outages already break sign-in; this is the same failure surface. |
| Supabase rotates signing keys | `jose`'s JWKS cache refreshes on unknown `kid`, so new tokens verify automatically without deploy. Old tokens (signed by a now-retired key) fail; clients re-auth via the existing Supabase SDK refresh flow. No new exposure. |
| Project is still on the legacy HS256 shared secret (not yet migrated to JWT signing keys) | Token header `alg` will be `HS256` and verification fails under the `['ES256', 'RS256']` allowlist. Operator action: enable JWT signing keys in the Supabase dashboard. Document in rollout step 2. |
| Deleted/disabled user keeps working until `exp` | Accepted. Max window = access-token TTL (default 1h). Today's `auth.getUser(token)` would have blocked them immediately; local verify does not. If hard revocation is ever required, add a separate spec. |
| Algorithm-confusion attack | `algorithms: ['ES256', 'RS256']` allowlist blocks `HS256` and `alg: none`. Test #8 verifies. |
| `jose` CVE future | Standard dependency-update lane (Dependabot/renovate). `jose` is actively maintained and is the library Supabase's own examples use. |

### Success criteria

1. Admin with two existing tenants → `GET /api/tenants` returns both. Today returns only the legacy primary.
2. Admin creates a third tenant → after refresh, `GET /api/tenants` returns three rows and the TopBar selector reflects it.
3. `TenantGuard`'s "awaiting refresh" warn log stops firing in steady state.
4. All existing API test suites remain green.

### Known limitations (intentional, not bugs introduced here)

- Admins still cannot activate/deactivate tenants they created. Status changes remain SuperAdmin-only per spec 020 FR-015 (`tenants.repository.ts:99–100`). If this product rule should change, it's a separate spec against FR-015 — not bundled.
- Deleted/disabled users have up to one access-token TTL of continued access. Documented and accepted.

---

## Trade-offs Considered

| Option | Verdict |
|---|---|
| A — Local JWT verify in `JwtAuthGuard` via JWKS (`jose`, asymmetric) | **Chosen.** One file, zero new env vars (reuses `SUPABASE_URL`). Single source of truth (hook + JWT). API holds no key material. Key rotation is automatic. Aligned with Supabase's current [JWT signing keys](https://supabase.com/blog/jwt-signing-keys) guidance. |
| A′ — Local JWT verify via HS256 shared secret (`jsonwebtoken`) | Rejected. Requires distributing `SUPABASE_JWT_SECRET` to every deploy target; API holds symmetric key material (can mint, not just verify); a leak of that secret forges tokens. Works today but not the recommended path. |
| B — Hydrate `auth.users.raw_app_meta_data` via admin API after every `user_tenants` change | Rejected. Duplicates the hook's logic in TypeScript, must be called from 4+ code sites, defeats "hook is source of truth." |
| C — Database trigger on `user_tenants` that syncs `raw_app_meta_data` | Rejected. Duplicates claim logic at a second layer. Defense-in-depth benefit not worth the complexity for v1. |

---

## References

- Supabase — [JWT signing keys](https://supabase.com/blog/jwt-signing-keys) (the asymmetric/JWKS approach this design adopts).
- `jose` documentation — https://github.com/panva/jose (`createRemoteJWKSet`, `jwtVerify`).
- `specs/020-tenants-catalog/plan.md` — cutover plan; introduced the hook and `tenant_ids` claim.
- `specs/020-tenants-catalog/spec.md` FR-024 through FR-030 — hook semantics, `TenantGuard` contract.
- `supabase/migrations/20260423000000_tenants_catalog_multitenant.sql` lines 507–548 — hook definition.
- `apps/api/src/common/guards/jwt-auth.guard.ts` — current guard, to be rewritten.
- `apps/api/src/common/guards/tenant.guard.ts` — downstream consumer, unchanged.
- `apps/web/src/features/tenants/hooks/use-create-tenant.ts` — client refresh flow, unchanged.
