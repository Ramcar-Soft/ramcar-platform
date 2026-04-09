-- Migration: users_module
-- Extends profiles table with additional fields, creates user_groups table,
-- and updates RLS policies for user management.

-- =============================================================================
-- 1. Alter public.profiles — Add new columns
-- =============================================================================
ALTER TABLE public.profiles
  ADD COLUMN address        text,
  ADD COLUMN username       text,
  ADD COLUMN phone          text,
  ADD COLUMN phone_type     text,
  ADD COLUMN status         text NOT NULL DEFAULT 'active',
  ADD COLUMN user_group_ids uuid[] DEFAULT '{}',
  ADD COLUMN observations   text;

-- Constraints
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_unique UNIQUE (username),
  ADD CONSTRAINT profiles_phone_type_check CHECK (phone_type IN ('house', 'cellphone', 'work', 'primary')),
  ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'inactive'));

-- Index for username lookups (login by username)
CREATE INDEX profiles_username_idx ON public.profiles (username) WHERE username IS NOT NULL;

-- Index for status filtering
CREATE INDEX profiles_status_idx ON public.profiles (status);

-- GIN index for user_group_ids array containment queries
CREATE INDEX profiles_user_group_ids_idx ON public.profiles USING GIN (user_group_ids);

-- =============================================================================
-- 2. Create public.user_groups
-- =============================================================================
CREATE TABLE public.user_groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER user_groups_updated_at
  BEFORE UPDATE ON public.user_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read user_groups
CREATE POLICY "Authenticated users can read user_groups"
  ON public.user_groups FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- 3. Seed user_groups initial data
-- =============================================================================
INSERT INTO public.user_groups (name) VALUES ('Moroso'), ('Cumplido');

-- =============================================================================
-- 4. RLS Policies — Profiles (additions for write operations)
-- =============================================================================

-- Admins and Super Admins can insert profiles in their tenant
CREATE POLICY "Admins can insert profiles in own tenant"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );

-- Admins and Super Admins can update profiles (scoped by tenant for admins)
-- Drop the existing user self-update policy first, then create broader admin policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update profiles in scope"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );

-- Update existing SELECT policy to include Super Admin cross-tenant access
DROP POLICY IF EXISTS "Users can read profiles in own tenant" ON public.profiles;
CREATE POLICY "Users can read profiles in scope"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );
