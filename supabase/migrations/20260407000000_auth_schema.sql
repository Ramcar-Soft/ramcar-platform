-- Migration: auth_schema
-- Creates tenants and profiles tables for multi-tenant authentication

-- =============================================================================
-- Utility: updated_at trigger function
-- =============================================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =============================================================================
-- Table: tenants
-- =============================================================================
create table public.tenants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tenants_updated_at
  before update on public.tenants
  for each row execute function public.handle_updated_at();

alter table public.tenants enable row level security;

-- =============================================================================
-- Table: profiles
-- =============================================================================
create table public.profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  tenant_id  uuid not null references public.tenants(id),
  full_name  text not null,
  role       text not null check (role in ('super_admin', 'admin', 'guard', 'resident')),
  email      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_tenant_id_idx on public.profiles(tenant_id);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

alter table public.profiles enable row level security;

-- =============================================================================
-- RLS Policies (both tables exist now)
-- =============================================================================

-- Tenants: authenticated users can read their own tenant
create policy "Users can read own tenant"
  on public.tenants for select
  to authenticated
  using (
    id in (
      select tenant_id from public.profiles
      where user_id = auth.uid()
    )
  );

-- Profiles: users can read profiles within their own tenant
create policy "Users can read profiles in own tenant"
  on public.profiles for select
  to authenticated
  using (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- Profiles: users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
