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
  const builder = new SignJWT(payload)
    .setProtectedHeader({ alg, kid: "test-kid" });
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

  describe("claim validity", () => {
    it("throws UnauthorizedException on an expired token", async () => {
      const guard = new JwtAuthGuard(makeConfig());
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
});
