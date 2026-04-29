-- Development seed data
-- Run with: pnpm db:reset
-- This file is executed after all migrations when resetting the local database.
-- WARNING: These credentials are for LOCAL DEVELOPMENT ONLY. Never use in production.

-- =============================================================================
-- Test Tenant
-- =============================================================================
insert into public.tenants (id, name, slug)
values ('a0000000-0000-0000-0000-000000000001', 'Residencial Demo', 'demo');

-- =============================================================================
-- Mock Users
--
-- Password for all users: password123
-- bcrypt hash generated with cost factor 10 (Supabase default)
-- =============================================================================

-- Super Admin user
insert into auth.users (
  instance_id, id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new,
  email_change,
  is_sso_user
) values (
  '00000000-0000-0000-0000-000000000000',
  'b0000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'superadmin@ramcar.dev',
  crypt('password123', gen_salt('bf')),
  now(), now(), now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'tenant_ids', array['a0000000-0000-0000-0000-000000000001'], 'role', 'super_admin'),
  jsonb_build_object('full_name', 'Super Admin Demo'),
  '', '', '',
  '',
  false
);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  'b0000000-0000-0000-0000-000000000000',
  'superadmin@ramcar.dev',
  jsonb_build_object('sub', 'b0000000-0000-0000-0000-000000000000', 'email', 'superadmin@ramcar.dev', 'email_verified', true, 'phone_verified', false),
  'email',
  now(), now(), now()
);

insert into public.profiles (user_id, tenant_id, full_name, role, email, status)
values (
  'b0000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000001',
  'Super Admin Demo', 'super_admin', 'superadmin@ramcar.dev', 'active'
);

-- Admin user
insert into auth.users (
  instance_id, id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new,
  email_change,
  is_sso_user
) values (
  '00000000-0000-0000-0000-000000000000',
  'b0000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated',
  'admin@ramcar.dev',
  crypt('password123', gen_salt('bf')),
  now(), now(), now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'tenant_ids', array['a0000000-0000-0000-0000-000000000001'], 'role', 'admin'),
  jsonb_build_object('full_name', 'Admin Demo'),
  '', '', '',
  '',
  false
);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  'b0000000-0000-0000-0000-000000000001',
  'admin@ramcar.dev',
  jsonb_build_object('sub', 'b0000000-0000-0000-0000-000000000001', 'email', 'admin@ramcar.dev', 'email_verified', true, 'phone_verified', false),
  'email',
  now(), now(), now()
);

insert into public.profiles (user_id, tenant_id, full_name, role, email, status)
values (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Admin Demo', 'admin', 'admin@ramcar.dev', 'active'
);

-- Guard user
insert into auth.users (
  instance_id, id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new,
  email_change,
  is_sso_user
) values (
  '00000000-0000-0000-0000-000000000000',
  'b0000000-0000-0000-0000-000000000002',
  'authenticated', 'authenticated',
  'guard@ramcar.dev',
  crypt('password123', gen_salt('bf')),
  now(), now(), now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'tenant_id', 'a0000000-0000-0000-0000-000000000001', 'role', 'guard'),
  jsonb_build_object('full_name', 'Guard Demo'),
  '', '', '',
  '',
  false
);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  'b0000000-0000-0000-0000-000000000002',
  'guard@ramcar.dev',
  jsonb_build_object('sub', 'b0000000-0000-0000-0000-000000000002', 'email', 'guard@ramcar.dev', 'email_verified', true, 'phone_verified', false),
  'email',
  now(), now(), now()
);

insert into public.profiles (user_id, tenant_id, full_name, role, email, status)
values (
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Guard Demo', 'guard', 'guard@ramcar.dev', 'active'
);

-- Resident user
insert into auth.users (
  instance_id, id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new,
  email_change,
  is_sso_user
) values (
  '00000000-0000-0000-0000-000000000000',
  'b0000000-0000-0000-0000-000000000003',
  'authenticated', 'authenticated',
  'resident@ramcar.dev',
  crypt('password123', gen_salt('bf')),
  now(), now(), now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'tenant_ids', array['a0000000-0000-0000-0000-000000000001'], 'role', 'resident'),
  jsonb_build_object('full_name', 'Resident Demo'),
  '', '', '',
  '',
  false
);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  'b0000000-0000-0000-0000-000000000003',
  'resident@ramcar.dev',
  jsonb_build_object('sub', 'b0000000-0000-0000-0000-000000000003', 'email', 'resident@ramcar.dev', 'email_verified', true, 'phone_verified', false),
  'email',
  now(), now(), now()
);

insert into public.profiles (user_id, tenant_id, full_name, role, email, status)
values (
  'b0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Resident Demo', 'resident', 'resident@ramcar.dev', 'active'
);

-- =============================================================================
-- User ↔ Tenant assignments
--
-- Only admin/guard roles read tenant_ids from public.user_tenants via the
-- custom_access_token_hook. super_admin gets '*' and resident reads from
-- profiles.tenant_id, so they do not need rows here.
-- assigned_by = user_id is the self-assigned sentinel (matches the backfill
-- block in 20260423000000_tenants_catalog_multitenant.sql).
-- =============================================================================

-- Admin with zero tenants (spec 024 E2E fixture — tests the first-tenant Sheet flow)
insert into auth.users (
  instance_id, id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new,
  email_change,
  is_sso_user
) values (
  '00000000-0000-0000-0000-000000000000',
  'b0000000-0000-0000-0000-000000000010',
  'authenticated', 'authenticated',
  'admin_with_zero_tenants@test.com',
  crypt('Test123!', gen_salt('bf')),
  now(), now(), now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'tenant_ids', array[]::text[], 'role', 'admin'),
  jsonb_build_object('full_name', 'Admin Zero Tenants'),
  '', '', '',
  '',
  false
);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  'b0000000-0000-0000-0000-000000000010',
  'admin_with_zero_tenants@test.com',
  jsonb_build_object('sub', 'b0000000-0000-0000-0000-000000000010', 'email', 'admin_with_zero_tenants@test.com', 'email_verified', true, 'phone_verified', false),
  'email',
  now(), now(), now()
);

-- profiles.tenant_id is NOT NULL (legacy column). The JWT hook reads tenant_ids
-- from public.user_tenants for admin role; with no user_tenants rows below, this
-- user effectively has tenant_ids = [] in the access token. profiles.tenant_id
-- here is a harmless placeholder pointing at the demo tenant.
insert into public.profiles (user_id, tenant_id, full_name, role, email, status)
values (
  'b0000000-0000-0000-0000-000000000010',
  'a0000000-0000-0000-0000-000000000001',
  'Admin Zero Tenants', 'admin', 'admin_with_zero_tenants@test.com', 'active'
);

-- Admin with one tenant (spec 024 E2E fixture — tests ContactSupportDialog gating)
insert into auth.users (
  instance_id, id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new,
  email_change,
  is_sso_user
) values (
  '00000000-0000-0000-0000-000000000000',
  'b0000000-0000-0000-0000-000000000011',
  'authenticated', 'authenticated',
  'admin_with_one_tenant@test.com',
  crypt('Test123!', gen_salt('bf')),
  now(), now(), now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'tenant_ids', array['a0000000-0000-0000-0000-000000000001'], 'role', 'admin'),
  jsonb_build_object('full_name', 'Admin One Tenant'),
  '', '', '',
  '',
  false
);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  'b0000000-0000-0000-0000-000000000011',
  'admin_with_one_tenant@test.com',
  jsonb_build_object('sub', 'b0000000-0000-0000-0000-000000000011', 'email', 'admin_with_one_tenant@test.com', 'email_verified', true, 'phone_verified', false),
  'email',
  now(), now(), now()
);

insert into public.profiles (user_id, tenant_id, full_name, role, email, status)
values (
  'b0000000-0000-0000-0000-000000000011',
  'a0000000-0000-0000-0000-000000000001',
  'Admin One Tenant', 'admin', 'admin_with_one_tenant@test.com', 'active'
);

-- =============================================================================
-- User ↔ Tenant assignments
-- =============================================================================

insert into public.user_tenants (user_id, tenant_id, assigned_by) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000011');
-- Note: admin_with_zero_tenants (b0000000-0000-0000-0000-000000000010) intentionally has no user_tenants row.
