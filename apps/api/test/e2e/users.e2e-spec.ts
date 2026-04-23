/**
 * Feature 020 — Phase 8 (T117): NestJS e2e matrix covering multi-tenant
 * user create/update scenarios.
 *
 * These tests require a live Supabase (test) project so the auth admin APIs,
 * RLS policies, and the `public.sync_user_tenants` RPC are exercised
 * end-to-end. They are skipped unless the E2E_SUPABASE env vars are set —
 * this keeps `pnpm test` green in isolated CI environments while preserving
 * the test plan in-repo.
 *
 * To enable, export before running:
 *   E2E_SUPABASE_URL, E2E_SUPABASE_SECRET_KEY,
 *   E2E_TENANT_A, E2E_TENANT_B, E2E_TENANT_C,
 *   E2E_SUPERADMIN_TOKEN, E2E_ADMIN_A_TOKEN
 */
import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppModule } from "../../src/app.module";

const e2eEnabled =
  !!process.env.E2E_SUPABASE_URL &&
  !!process.env.E2E_SUPABASE_SECRET_KEY &&
  !!process.env.E2E_TENANT_A &&
  !!process.env.E2E_TENANT_B &&
  !!process.env.E2E_TENANT_C &&
  !!process.env.E2E_SUPERADMIN_TOKEN &&
  !!process.env.E2E_ADMIN_A_TOKEN;

const describeOrSkip = e2eEnabled ? describe : describe.skip;

describeOrSkip("Users API — multi-tenant (e2e)", () => {
  let app: INestApplication<App>;
  let supabase: SupabaseClient;

  const tenantA = process.env.E2E_TENANT_A!;
  const tenantB = process.env.E2E_TENANT_B!;
  const tenantC = process.env.E2E_TENANT_C!;
  const superAdminToken = process.env.E2E_SUPERADMIN_TOKEN!;
  const adminAToken = process.env.E2E_ADMIN_A_TOKEN!;

  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    supabase = createClient(
      process.env.E2E_SUPABASE_URL!,
      process.env.E2E_SUPABASE_SECRET_KEY!,
    );
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await supabase.auth.admin.deleteUser(id).catch(() => undefined);
    }
    await app.close();
  });

  function basePayload(suffix: string) {
    return {
      fullName: `E2E User ${suffix}`,
      email: `e2e-${suffix}-${Date.now()}@example.com`,
      address: "123 Test St",
      username: `e2e_${suffix}_${Date.now()}`,
      phone: "555-0000",
      userGroupIds: [],
    };
  }

  it("super_admin creates a guard assigned to 3 tenants and app_metadata.tenant_ids matches", async () => {
    const body = {
      ...basePayload("SA"),
      role: "guard" as const,
      tenant_ids: [tenantA, tenantB, tenantC],
      primary_tenant_id: tenantB,
    };

    const res = await request(app.getHttpServer())
      .post("/users")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send(body)
      .expect(201);

    createdUserIds.push(res.body.userId);

    const { data } = await supabase.auth.admin.getUserById(res.body.userId);
    const ids = (data.user?.app_metadata?.tenant_ids ?? []) as string[];
    expect(new Set(ids)).toEqual(new Set([tenantA, tenantB, tenantC]));
    expect(data.user?.app_metadata?.tenant_id).toBe(tenantB);
  });

  it("admin scoped to tenantA can only assign guards within tenantA (403 otherwise)", async () => {
    const body = {
      ...basePayload("admin-oo"),
      role: "guard" as const,
      tenant_ids: [tenantA, tenantB],
      primary_tenant_id: tenantA,
    };

    await request(app.getHttpServer())
      .post("/users")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send(body)
      .expect(403);
  });

  it("rejects primary_tenant_id not in tenant_ids with 422", async () => {
    const body = {
      ...basePayload("bad-primary"),
      role: "guard" as const,
      tenant_ids: [tenantA, tenantB],
      primary_tenant_id: tenantC,
    };

    await request(app.getHttpServer())
      .post("/users")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send(body)
      .expect((res) => {
        if (![400, 422].includes(res.status)) {
          throw new Error(`Expected 400/422, got ${res.status}`);
        }
      });
  });

  it("rejects admin-creating-admin with 403 (FR-056)", async () => {
    const body = {
      ...basePayload("admin-by-admin"),
      role: "admin" as const,
      tenant_ids: [tenantA],
      primary_tenant_id: tenantA,
    };

    await request(app.getHttpServer())
      .post("/users")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send(body)
      .expect(403);
  });

  it("edit that removes a tenant shrinks app_metadata.tenant_ids accordingly", async () => {
    const createBody = {
      ...basePayload("edit-remove"),
      role: "guard" as const,
      tenant_ids: [tenantA, tenantB, tenantC],
      primary_tenant_id: tenantA,
    };

    const created = await request(app.getHttpServer())
      .post("/users")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send(createBody)
      .expect(201);

    createdUserIds.push(created.body.userId);

    await request(app.getHttpServer())
      .put(`/users/${created.body.id}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        role: "guard" as const,
        tenant_ids: [tenantA, tenantB],
        primary_tenant_id: tenantA,
      })
      .expect(200);

    const { data } = await supabase.auth.admin.getUserById(created.body.userId);
    const ids = (data.user?.app_metadata?.tenant_ids ?? []) as string[];
    expect(new Set(ids)).toEqual(new Set([tenantA, tenantB]));
    expect(ids).not.toContain(tenantC);
  });
});
