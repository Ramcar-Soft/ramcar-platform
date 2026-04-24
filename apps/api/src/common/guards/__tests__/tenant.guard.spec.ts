import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TenantGuard } from "../tenant.guard";
import {
  ActiveTenantRequiredException,
  TenantAccessRevokedException,
} from "../../filters/tenant-errors";

const TENANT_A = "3d8b2fbc-0000-0000-0000-000000000001";
const TENANT_B = "3d8b2fbc-0000-0000-0000-000000000002";

function makeReflector(skipTenant = false): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(skipTenant),
  } as unknown as Reflector;
}

function makeContext(opts: {
  headers?: Record<string, string>;
  query?: Record<string, string>;
  path?: string;
  appMeta?: Record<string, unknown>;
  skipTenant?: boolean;
}): ExecutionContext {
  const request = {
    headers: opts.headers ?? {},
    query: opts.query ?? {},
    path: opts.path ?? "/users",
    authUser: {
      id: "user-1",
      app_metadata: opts.appMeta ?? {
        role: "admin",
        tenant_ids: [TENANT_A, TENANT_B],
      },
    },
  };

  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("TenantGuard", () => {
  describe("header validation", () => {
    it("throws 400 ACTIVE_TENANT_REQUIRED when header is missing", () => {
      const guard = new TenantGuard(makeReflector());
      const ctx = makeContext({ headers: {} });
      expect(() => guard.canActivate(ctx)).toThrow(ActiveTenantRequiredException);
    });

    it("throws 403 TENANT_ACCESS_REVOKED when header value not in tenant_ids", () => {
      const guard = new TenantGuard(makeReflector());
      const ctx = makeContext({
        headers: { "x-active-tenant-id": "ffffffff-0000-0000-0000-000000000000" },
        appMeta: { role: "admin", tenant_ids: [TENANT_A, TENANT_B] },
      });
      expect(() => guard.canActivate(ctx)).toThrow(TenantAccessRevokedException);
    });

    it("populates request.tenantScope and returns true when header is valid", () => {
      const guard = new TenantGuard(makeReflector());
      const ctx = makeContext({
        headers: { "x-active-tenant-id": TENANT_A },
        appMeta: { role: "admin", tenant_ids: [TENANT_A, TENANT_B] },
      });
      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
      const req = (ctx.switchToHttp().getRequest() as Record<string, unknown>);
      expect(req.tenantScope).toMatchObject({
        tenantId: TENANT_A,
        tenantIds: [TENANT_A, TENANT_B],
        role: "admin",
      });
    });

    it("allows super_admin with any tenant in header", () => {
      const guard = new TenantGuard(makeReflector());
      const ctx = makeContext({
        headers: { "x-active-tenant-id": "arbitrary-uuid-0000-0000-0000000000" },
        appMeta: { role: "super_admin", tenant_ids: "*" },
      });
      expect(() => guard.canActivate(ctx)).not.toThrow();
    });
  });

  describe("@SkipTenant() decorator", () => {
    it("skips header validation and returns true", () => {
      const guard = new TenantGuard(makeReflector(true));
      const ctx = makeContext({ headers: {} });
      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
    });
  });

  describe("Bitacora exception (access-events with tenant_id query param)", () => {
    it("allows access-events with tenant_id query param in tenant_ids (no header)", () => {
      const guard = new TenantGuard(makeReflector());
      const ctx = makeContext({
        headers: {},
        path: "/access-events",
        query: { tenant_id: TENANT_A },
        appMeta: { role: "admin", tenant_ids: [TENANT_A, TENANT_B] },
      });
      expect(() => guard.canActivate(ctx)).not.toThrow();
      const req = (ctx.switchToHttp().getRequest() as Record<string, unknown>);
      expect((req.tenantScope as { tenantId: string }).tenantId).toBe(TENANT_A);
    });

    it("blocks access-events with tenant_id=ALL for non-super-admin", () => {
      const guard = new TenantGuard(makeReflector());
      const ctx = makeContext({
        headers: {},
        path: "/access-events",
        query: { tenant_id: "ALL" },
        appMeta: { role: "admin", tenant_ids: [TENANT_A, TENANT_B] },
      });
      expect(() => guard.canActivate(ctx)).toThrow(TenantAccessRevokedException);
    });
  });
});
