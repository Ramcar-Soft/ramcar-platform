# JWT Claims `tenant_ids` Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the NestJS API layer read auth claims from the JWT (where Supabase's `custom_access_token_hook` writes `tenant_ids`) instead of from `auth.users.raw_app_meta_data` (where the hook never writes), so admins immediately see every tenant they belong to after a session refresh.

**Architecture:** Replace `supabase.auth.getUser(token)` in `JwtAuthGuard` with local JWT verification via `jose` against Supabase's JWKS endpoint — asymmetric ES256/RS256 keys fetched from `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, per Supabase's [JWT signing keys](https://supabase.com/blog/jwt-signing-keys) guidance. Synthesize `request.authUser` from the verified payload. `TenantGuard`, `RolesGuard`, `@CurrentUser`, `@CurrentTenant`, controllers, and services are unchanged — the shape of `request.authUser` is preserved.

**Tech Stack:** NestJS v11, `@nestjs/config` (already in deps, ConfigModule is global), `jose` v5 (new dep, ships its own types), Jest + ts-jest for testing.

---

## File Structure

- **Create** `apps/api/src/common/guards/__tests__/jwt-auth.guard.spec.ts` — unit tests that mock `jose.createRemoteJWKSet` to return an in-memory JWKS built from a generated test keypair; no network, no Supabase.
- **Modify** `apps/api/src/common/guards/jwt-auth.guard.ts` — rewrite to use `jose`'s `jwtVerify` against a `createRemoteJWKSet` resolver; drop `SupabaseService` dependency; read `SUPABASE_URL` via `ConfigService.getOrThrow` in the constructor so a missing URL crashes at boot.
- **Modify** `apps/api/package.json` — add the `jose` dependency.
- `apps/api/.env.example` — **unchanged.** The guard reuses the existing `SUPABASE_URL` entry to derive the JWKS URL; no new env var.

Nothing else is touched. No DB migration, no frontend change, no module reshuffling (`ConfigModule.forRoot({ isGlobal: true })` already exists in `app.module.ts:18`).

### Reference: current guard (`apps/api/src/common/guards/jwt-auth.guard.ts`)

```ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    const {
      data: { user },
      error,
    } = await this.supabase.getClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException();
    }

    request.authUser = user;
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

### Reference: `request.authUser` shape the downstream guards expect

`TenantGuard` (`apps/api/src/common/guards/tenant.guard.ts:21-25`) reads:

```ts
const appMeta = request.authUser?.app_metadata ?? {};
const role = (appMeta.role ?? "resident") as Role;
const tenantIds = appMeta.tenant_ids as "*" | string[] | undefined;
const legacyTenantId = appMeta.tenant_id as string | undefined;
```

And at `tenant.guard.ts:27-33`, `request.authUser?.id` must exist. So the guard MUST set at minimum:

```ts
request.authUser = {
  id: string,
  email?: string,
  app_metadata: { role?, tenant_id?, tenant_ids?, ... },
  user_metadata: { ... },
};
```

### Reference: hook-emitted payload (`supabase/migrations/20260423000000_tenants_catalog_multitenant.sql` lines 507–548)

```json
{
  "sub": "<user-uuid>",
  "email": "...",
  "app_metadata": {
    "role": "admin",
    "tenant_id": "<uuid-primary>",
    "tenant_ids": ["<uuid-a>", "<uuid-b>", "<uuid-new>"]
  },
  "user_metadata": { ... },
  "exp": 1712345678,
  "iat": 1712342078
}
```

Variants:
- `super_admin`: `"tenant_ids": "*"` (string, preserved verbatim)
- `resident`: `"tenant_ids": ["<single-uuid>"]`
- Legacy pre-hook token: no `tenant_ids`, only `tenant_id` — `TenantGuard.legacyTenantId` path handles this.

---

## Task 1: Add `jose` dependency

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install runtime dep**

Run from repo root:

```bash
pnpm --filter @ramcar/api add jose@^5.10.0
```

Expected: `apps/api/package.json` now has `"jose": "^5.10.0"` under `dependencies`. `pnpm-lock.yaml` updated at repo root. No `@types/*` is needed — `jose` ships its own types.

- [ ] **Step 2: Verify the workspace is clean**

Run from repo root:

```bash
pnpm --filter @ramcar/api typecheck
```

Expected: exits 0. (No code touches the dep yet; this just proves the install didn't break type resolution.)

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore(api): add jose dependency for local JWT verify via JWKS"
```

---

## Task 2: Confirm `SUPABASE_URL` in `.env.example` (no change required)

**Files:**
- (none — verification only)

The guard reuses the existing `SUPABASE_URL` env var to derive the JWKS URL (`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`). `apps/api/.env.example` already declares it on line 1; no new entry is needed.

- [ ] **Step 1: Sanity check**

Run:

```bash
grep '^SUPABASE_URL=' apps/api/.env.example
```

Expected: prints `SUPABASE_URL=http://127.0.0.1:54321`. If the line is missing, something regressed unrelated to this task — stop and investigate before proceeding.

- [ ] **Step 2: No commit for this task**

There is intentionally no commit here; this task exists only to make the "no new env var" decision explicit in the plan.

---

## Task 3: Write the failing guard spec — valid-token happy paths

**Files:**
- Create: `apps/api/src/common/guards/__tests__/jwt-auth.guard.spec.ts`

- [ ] **Step 1: Create the spec file with the first three happy-path tests**

This spec intercepts `jose.createRemoteJWKSet` so the guard never hits the network. A generated ES256 keypair is exposed through `createLocalJWKSet`; tokens are minted with the matching private key using `SignJWT`.

Exact file contents:

```ts
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  SignJWT,
  createLocalJWKSet,
  createRemoteJWKSet,
  exportJWK,
  generateKeyPair,
  type JWK,
  type KeyLike,
} from "jose";
import { JwtAuthGuard } from "../jwt-auth.guard";

// Intercept jose.createRemoteJWKSet so the guard never tries to fetch a real JWKS endpoint.
// The returned resolver is set in beforeAll() once test keys are generated.
jest.mock("jose", () => {
  const actual = jest.requireActual("jose");
  return {
    ...actual,
    createRemoteJWKSet: jest.fn(),
  };
});

const SUPABASE_URL = "http://127.0.0.1:54321";

function makeConfig(url: string | undefined = SUPABASE_URL): ConfigService {
  return {
    getOrThrow: (key: string) => {
      if (key !== "SUPABASE_URL") {
        throw new Error(`unexpected key: ${key}`);
      }
      if (url === undefined) {
        throw new Error('Config key "SUPABASE_URL" does not exist');
      }
      return url;
    },
  } as unknown as ConfigService;
}

function makeContext(headers: Record<string, string> = {}): {
  context: ExecutionContext;
  request: { headers: Record<string, string>; authUser?: unknown; authToken?: unknown };
} {
  const request: { headers: Record<string, string>; authUser?: unknown; authToken?: unknown } = {
    headers,
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

let privateKey: KeyLike;
let publicJwk: JWK;
// A second keypair used to simulate "token signed with a different key".
let otherPrivateKey: KeyLike;

async function sign(
  payload: Record<string, unknown>,
  options: { alg?: string; expiresIn?: string | false; key?: KeyLike } = {},
): Promise<string> {
  const alg = options.alg ?? "ES256";
  const key = options.key ?? privateKey;
  const builder = new SignJWT(payload).setProtectedHeader({ alg, kid: "test-kid" });
  if (typeof payload.iat === "number") {
    builder.setIssuedAt(payload.iat as number);
  } else {
    builder.setIssuedAt();
  }
  if (options.expiresIn !== false) {
    if (typeof payload.exp === "number") {
      builder.setExpirationTime(payload.exp as number);
    } else {
      builder.setExpirationTime(options.expiresIn ?? "1h");
    }
  }
  return builder.sign(key);
}

describe("JwtAuthGuard", () => {
  beforeAll(async () => {
    const primary = await generateKeyPair("ES256", { extractable: true });
    privateKey = primary.privateKey;
    publicJwk = await exportJWK(primary.publicKey);
    publicJwk.alg = "ES256";
    publicJwk.use = "sig";
    publicJwk.kid = "test-kid";

    const other = await generateKeyPair("ES256", { extractable: true });
    otherPrivateKey = other.privateKey;

    const localSet = createLocalJWKSet({ keys: [publicJwk] });
    (createRemoteJWKSet as jest.Mock).mockReturnValue(localSet);
  });

  describe("valid tokens", () => {
    it("accepts an admin token and exposes tenant_ids array on request.authUser", async () => {
      const guard = new JwtAuthGuard(makeConfig());
      const token = await sign({
        sub: "user-1",
        email: "admin@example.com",
        app_metadata: {
          role: "admin",
          tenant_id: "t1",
          tenant_ids: ["t1", "t2"],
        },
        user_metadata: { full_name: "Admin" },
      });
      const { context, request } = makeContext({ authorization: `Bearer ${token}` });

      const allowed = await guard.canActivate(context);

      expect(allowed).toBe(true);
      expect(request.authUser).toMatchObject({
        id: "user-1",
        email: "admin@example.com",
        app_metadata: {
          role: "admin",
          tenant_id: "t1",
          tenant_ids: ["t1", "t2"],
        },
        user_metadata: { full_name: "Admin" },
      });
      expect(request.authToken).toBe(token);
    });

    it("preserves super_admin wildcard tenant_ids as a string (not coerced to array)", async () => {
      const guard = new JwtAuthGuard(makeConfig());
      const token = await sign({
        sub: "user-sa",
        app_metadata: { role: "super_admin", tenant_ids: "*" },
      });
      const { context, request } = makeContext({ authorization: `Bearer ${token}` });

      await guard.canActivate(context);

      expect(request.authUser).toMatchObject({
        app_metadata: { role: "super_admin", tenant_ids: "*" },
      });
    });

    it("accepts a legacy token with tenant_id only (no tenant_ids)", async () => {
      const guard = new JwtAuthGuard(makeConfig());
      const token = await sign({
        sub: "user-legacy",
        app_metadata: { role: "admin", tenant_id: "t-legacy" },
      });
      const { context, request } = makeContext({ authorization: `Bearer ${token}` });

      const allowed = await guard.canActivate(context);

      expect(allowed).toBe(true);
      expect(request.authUser).toMatchObject({
        id: "user-legacy",
        app_metadata: { role: "admin", tenant_id: "t-legacy" },
      });
      expect(
        (request.authUser as { app_metadata: Record<string, unknown> }).app_metadata.tenant_ids,
      ).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run the spec — expect compile/resolution failure**

Run from repo root:

```bash
pnpm --filter @ramcar/api test -- --testPathPattern jwt-auth.guard.spec
```

Expected: tests fail. Likely failures: "Nest can't resolve dependencies" (guard still wants `SupabaseService`, not `ConfigService`) and/or the guard never calls `jose.jwtVerify`. The point: the current guard is incompatible with this test setup, proving we need the rewrite.

---

## Task 4: Rewrite `JwtAuthGuard` to use `jose` + JWKS

**Files:**
- Modify: `apps/api/src/common/guards/jwt-auth.guard.ts`

- [ ] **Step 1: Replace the file contents**

Exact new contents of `apps/api/src/common/guards/jwt-auth.guard.ts`:

```ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: SupabaseJwtPayload;
    try {
      const result = await jwtVerify<SupabaseJwtPayload>(token, this.jwks, {
        algorithms: ["ES256", "RS256"],
      });
      payload = result.payload;
    } catch {
      throw new UnauthorizedException();
    }

    if (!payload.sub) {
      throw new UnauthorizedException();
    }

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

Notes on what changed vs. the previous file:
- Constructor dep switched from `SupabaseService` to `ConfigService`.
- `getOrThrow("SUPABASE_URL")` runs at construction → app boot fails if it is not set.
- `canActivate` is `async` — `jwtVerify` returns a promise, and the JWKS resolver may perform a one-time network fetch.
- Algorithm allowlist is `['ES256', 'RS256']` — matches Supabase's JWT signing keys output and blocks algorithm-confusion (e.g. `alg: none`, `HS256`).
- `createRemoteJWKSet` builds the resolver once per instance; `jose` caches the JWKS in-process and re-fetches on unknown `kid` (automatic handling of key rotation).
- `request.authUser` is synthesized explicitly — no longer the opaque Supabase `User` object.

- [ ] **Step 2: Run the three happy-path tests — expect PASS**

Run from repo root:

```bash
pnpm --filter @ramcar/api test -- --testPathPattern jwt-auth.guard.spec
```

Expected: 3 tests pass.

- [ ] **Step 3: Run the full API typecheck**

Run from repo root:

```bash
pnpm --filter @ramcar/api typecheck
```

Expected: exits 0. (Controllers and specs that previously overrode `JwtAuthGuard` with an `allowAllGuard` still compile; the guard's public shape is unchanged.)

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/common/guards/jwt-auth.guard.ts \
        apps/api/src/common/guards/__tests__/jwt-auth.guard.spec.ts
git commit -m "feat(api): verify Supabase JWT locally via JWKS so tenant_ids claim reaches guards"
```

---

## Task 5: Add error-path tests — transport errors (missing / malformed header)

**Files:**
- Modify: `apps/api/src/common/guards/__tests__/jwt-auth.guard.spec.ts`

- [ ] **Step 1: Append a new `describe` block after the `"valid tokens"` block**

Add just above the final closing `});` of the top-level `describe("JwtAuthGuard", ...)` — i.e. after the `"valid tokens"` block — the following block. Note `canActivate` is `async`, so tests must `await expect(...).rejects.toThrow(...)`:

```ts
  describe("missing / malformed authorization header", () => {
    it("throws UnauthorizedException when no Authorization header is present", async () => {
      const guard = new JwtAuthGuard(makeConfig());
      const { context } = makeContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when the scheme is not Bearer", async () => {
      const guard = new JwtAuthGuard(makeConfig());
      const token = await sign({ sub: "user-1", app_metadata: {} });
      const { context } = makeContext({ authorization: `Basic ${token}` });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException on a malformed token string", async () => {
      const guard = new JwtAuthGuard(makeConfig());
      const { context } = makeContext({ authorization: "Bearer not-a-real-jwt" });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
```

- [ ] **Step 2: Run the suite — expect all existing + 3 new tests to PASS**

Run:

```bash
pnpm --filter @ramcar/api test -- --testPathPattern jwt-auth.guard.spec
```

Expected: 6 tests pass.

---

## Task 6: Add error-path tests — signature / algorithm

**Files:**
- Modify: `apps/api/src/common/guards/__tests__/jwt-auth.guard.spec.ts`

- [ ] **Step 1: Append a new `describe` block**

Append immediately after the `"missing / malformed authorization header"` block. "Token signed by a different key" uses the second ES256 keypair generated in `beforeAll` — the JWKS only contains the primary public key, so verification must fail:

```ts
  describe("signature and algorithm enforcement", () => {
    it("throws UnauthorizedException when the token is signed by a different key", async () => {
      const guard = new JwtAuthGuard(makeConfig());
      const token = await sign(
        { sub: "user-1", app_metadata: {} },
        { key: otherPrivateKey },
      );
      const { context } = makeContext({ authorization: `Bearer ${token}` });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException on an unsigned token (alg: none)", async () => {
      const guard = new JwtAuthGuard(makeConfig());
      // jose refuses to sign with alg:none — hand-craft the token instead.
      const b64url = (obj: object) =>
        Buffer.from(JSON.stringify(obj))
          .toString("base64")
          .replace(/=+$/, "")
          .replace(/\+/g, "-")
          .replace(/\//g, "_");
      const header = b64url({ alg: "none", typ: "JWT" });
      const payload = b64url({ sub: "user-1", app_metadata: {} });
      const token = `${header}.${payload}.`;
      const { context } = makeContext({ authorization: `Bearer ${token}` });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
```

- [ ] **Step 2: Run the suite**

Run:

```bash
pnpm --filter @ramcar/api test -- --testPathPattern jwt-auth.guard.spec
```

Expected: 8 tests pass. The `alg: none` test is the critical algorithm-confusion guardrail — the `algorithms: ['ES256', 'RS256']` allowlist in the guard is what makes this test pass.

---

## Task 7: Add error-path tests — claim validity (expiry + missing `sub`)

**Files:**
- Modify: `apps/api/src/common/guards/__tests__/jwt-auth.guard.spec.ts`

- [ ] **Step 1: Append a new `describe` block**

Append immediately after the `"signature and algorithm enforcement"` block:

```ts
  describe("claim validity", () => {
    it("throws UnauthorizedException on an expired token", async () => {
      const guard = new JwtAuthGuard(makeConfig());
      // Issue a token that already expired 60s ago.
      const now = Math.floor(Date.now() / 1000);
      const token = await sign(
        { sub: "user-1", app_metadata: {}, iat: now - 120, exp: now - 60 },
      );
      const { context } = makeContext({ authorization: `Bearer ${token}` });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when sub claim is missing", async () => {
      const guard = new JwtAuthGuard(makeConfig());
      const token = await sign({ app_metadata: { role: "admin" } });
      const { context } = makeContext({ authorization: `Bearer ${token}` });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
```

- [ ] **Step 2: Run the suite**

Run:

```bash
pnpm --filter @ramcar/api test -- --testPathPattern jwt-auth.guard.spec
```

Expected: 10 tests pass.

- [ ] **Step 3: Commit the full spec**

```bash
git add apps/api/src/common/guards/__tests__/jwt-auth.guard.spec.ts
git commit -m "test(api): cover JwtAuthGuard signature, algorithm, and claim errors"
```

---

## Task 8: Regression check — full API test suite

**Files:**
- (no code change)

- [ ] **Step 1: Run every API spec**

Run from repo root:

```bash
pnpm --filter @ramcar/api test
```

Expected: all suites pass. The per-module controller specs (`residents.controller.spec.ts`, `access-events.controller.spec.ts`, etc.) already use `.overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })`, so they skip the real guard and never touched `SupabaseService` through it — dropping the guard's Supabase dep should not ripple.

- [ ] **Step 2: Run the full typecheck + lint at the repo level**

Run from repo root:

```bash
pnpm --filter @ramcar/api typecheck
pnpm --filter @ramcar/api lint
```

Expected: both exit 0.

- [ ] **Step 3: If any suite fails, stop and diagnose before proceeding**

If a spec that mocks `authUser` is now failing, the likely culprit is a test that instantiated `JwtAuthGuard` directly (rather than overriding it) and is missing the `ConfigService` dep. Search with:

```bash
rg "new JwtAuthGuard\(" apps/api/src
```

Expected: 0 matches (the guard is always DI-wired). If you find any, update that test to pass a `ConfigService` mock shaped like `makeConfig` from the new spec (returning `SUPABASE_URL`), and make sure `jose.createRemoteJWKSet` is mocked in that file too.

---

## Task 9: Local-environment sanity check

**Files:**
- (no code change; `apps/api/.env` is gitignored — NEVER commit)

- [ ] **Step 1: Start local Supabase**

Run from repo root:

```bash
pnpm db:start
```

Expected: Supabase comes up and the `API URL` (`http://127.0.0.1:54321`) is reachable. Sanity-check the JWKS endpoint:

```bash
curl -sS http://127.0.0.1:54321/auth/v1/.well-known/jwks.json | head -c 200
```

Expected: a JSON object with a `keys` array containing at least one key whose `alg` is `ES256` or `RS256`. If the payload is empty or 404s, the local Supabase build predates JWT signing keys — update the Supabase CLI before continuing.

- [ ] **Step 2: Confirm `apps/api/.env` has `SUPABASE_URL`**

Run:

```bash
grep '^SUPABASE_URL=' apps/api/.env || echo "SUPABASE_URL missing"
```

Expected: prints a line like `SUPABASE_URL=http://127.0.0.1:54321`. If missing, copy it from `.env.example` and fill in the local value. **Do not commit `.env`.**

- [ ] **Step 3: Boot the API and confirm it starts**

Run from repo root:

```bash
pnpm --filter @ramcar/api dev
```

Expected: Nest boots cleanly. If `SUPABASE_URL` is missing or empty you'll see `Config key "SUPABASE_URL" does not exist` and the process exits — this is the boot-time failure contract from the spec's Risks table.

Stop the dev server (`Ctrl-C`) once you've verified it boots.

---

## Task 10: End-to-end manual verification (one-time)

**Files:**
- (no code change)

These checks prove the regression described in the spec is actually fixed in a running system. They are the "success criteria" from `docs/superpowers/specs/2026-04-22-jwt-claims-tenant-ids-sync-design.md`.

- [ ] **Step 1: Sign in as an admin with two existing tenants**

In the web app, sign in with an admin account that has rows in `user_tenants` for at least two tenants. Open DevTools → Application → Cookies/LocalStorage, copy the Supabase `access_token`, and paste it into [jwt.io](https://jwt.io).

Expected: decoded header has `alg: ES256` or `alg: RS256` (Supabase's JWT signing keys — asymmetric), and decoded payload contains `app_metadata.tenant_ids` as an array of at least two UUIDs. (Before this fix, that same JWT already contained the claim — but the API threw it away.) If `alg` is `HS256`, the Supabase project has not yet migrated to JWT signing keys; fix that in the dashboard before continuing.

- [ ] **Step 2: Call `GET /api/tenants` and confirm both tenants return**

From the app (TopBar tenants selector or the tenants catalog page), or via curl:

```bash
curl -H "Authorization: Bearer <access_token>" http://127.0.0.1:3001/api/tenants
```

Expected: JSON array with both tenant rows. **Before this fix: only the legacy primary tenant is returned.** This is the concrete regression being fixed.

- [ ] **Step 3: Create a third tenant via `POST /api/tenants`**

Use the existing `useCreateTenant` flow in the web UI (Tenants catalog → "Create tenant"). `useCreateTenant.onSuccess` calls `supabase.auth.refreshSession()` + invalidates the tenants query.

Expected after the flow completes:
- `GET /api/tenants` returns 3 rows.
- The TopBar tenant selector shows the new tenant.
- Decoded post-refresh JWT has `tenant_ids` with 3 UUIDs (the new one appended).

- [ ] **Step 4: Confirm the steady-state warn log stops firing**

Tail the API logs for ~10 requests after step 3:

```bash
# in the terminal running `pnpm --filter @ramcar/api dev`
# make a few requests from the signed-in web client
```

Expected: `TenantGuard`'s `"legacy JWT without tenant_ids claim — awaiting refresh"` warn line does NOT appear. (Before this fix it fired on every request because the API never saw the claim.)

- [ ] **Step 5: If every check passes, you are done**

If any check fails, do not claim done. Capture the failing request + response, compare against the spec's Success Criteria section, and diagnose.

---

## Task 11: Finalize branch state

**Files:**
- (no code change)

- [ ] **Step 1: Verify working tree is clean**

Run:

```bash
git status
```

Expected: branch `020-tenants-catalog` with no uncommitted changes. The changes introduced by this plan live in these commits:

1. `chore(api): add jose dependency for local JWT verify via JWKS`
2. `feat(api): verify Supabase JWT locally via JWKS so tenant_ids claim reaches guards`
3. `test(api): cover JwtAuthGuard signature, algorithm, and claim errors`

(Task 2 intentionally did not produce a commit — no `.env.example` change was needed because the guard reuses the existing `SUPABASE_URL` entry.)

- [ ] **Step 2: Summarize for the user**

Report:
- What changed: `JwtAuthGuard` now verifies tokens locally with `jose` against Supabase's JWKS endpoint (`ES256`/`RS256` allowlist); `request.authUser` shape unchanged; `TenantGuard`/`RolesGuard`/controllers untouched.
- No new env var: the guard reuses `SUPABASE_URL`, which every deploy target already sets.
- Tests added: 10 unit tests in `jwt-auth.guard.spec.ts` covering happy paths, missing/malformed header, bad signature (different keypair), `alg: none`, expiry, missing `sub`.
- Manual verification done: link back to the checklist items from Task 10.
- Known carry-overs intentionally not addressed: admin-scope status changes (spec 020 FR-015) and hard revocation of disabled users — both are out-of-scope per the spec's Non-Goals and Known Limitations.

---

## Self-Review Notes

- **Spec coverage:** every success criterion (#1 two-tenant list, #2 post-create third tenant, #3 warn log stops, #4 existing suites green) has a corresponding task (Task 10 steps 2/3/4 and Task 8). Every test case in the spec's Testing section (#1–#10) is covered by a step in Tasks 3, 5, 6, or 7 — with a deliberate consolidation: the spec's "valid legacy with tenant_id only" is Task 3 test 3, "non-Bearer scheme" is Task 5 test 2, "malformed token" is Task 5 test 3, and `alg: none` is Task 6 test 2. All rollout steps (reuse existing `SUPABASE_URL`, deploy, no DB migration) surface in Tasks 2, 9, and 11.
- **Placeholder scan:** no "TBD"/"implement later"/"similar to above" phrases; every code step shows the exact code; every shell step shows the exact command plus expected output.
- **Type/name consistency:** guard class is `JwtAuthGuard` everywhere; env var is `SUPABASE_URL` everywhere (no new var); type alias is `SupabaseJwtPayload` in the guard and referenced consistently; test helpers (`makeConfig`, `makeContext`, `sign`) are defined in Task 3 and reused verbatim in Tasks 5, 6, 7 (they live in the same file). `request.authUser` shape matches what `TenantGuard` reads (`id`, `app_metadata.role`, `app_metadata.tenant_id`, `app_metadata.tenant_ids`).
- **JWKS caching / rotation:** `jose`'s `createRemoteJWKSet` caches the key set in-process and re-fetches on unknown `kid`. The guard builds the resolver once in the constructor and reuses it across requests; no per-request network call in the hot path once the cache is primed.
- **Sync → async:** `canActivate` is `Promise<boolean>` in the new guard (the previous plan draft had it synchronous under `jsonwebtoken`). Every spec test that calls `canActivate` therefore `await`s and uses `rejects.toThrow` for error cases — this is reflected in Tasks 5, 6, 7.
