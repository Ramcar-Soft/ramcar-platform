-- Feature 020: tenants extensions + user_tenants + RLS rewrites + storage bucket + auth hook

-- =============================================================================
-- T009: Extend public.tenants with new columns and indexes
-- =============================================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS address   text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status    text        NOT NULL DEFAULT 'active'
                                       CHECK (status IN ('active', 'inactive')),
  ADD COLUMN IF NOT EXISTS config    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS image_path text       NULL;

CREATE INDEX IF NOT EXISTS tenants_status_idx          ON public.tenants (status);
CREATE INDEX IF NOT EXISTS tenants_created_at_desc_idx ON public.tenants (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_name_lower_unique ON public.tenants (lower(name));

-- =============================================================================
-- T010: Create public.user_tenants join table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_tenants (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assigned_by uuid        NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS user_tenants_user_id_idx   ON public.user_tenants (user_id);
CREATE INDEX IF NOT EXISTS user_tenants_tenant_id_idx ON public.user_tenants (tenant_id);

ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- T011: Backfill user_tenants from existing admin/guard profiles
-- assigned_by = user_id is the legacy-row sentinel (user is their own assigner)
-- =============================================================================

INSERT INTO public.user_tenants (user_id, tenant_id, assigned_by)
SELECT p.user_id, p.tenant_id, p.user_id
FROM public.profiles p
WHERE p.role IN ('admin', 'guard')
  AND p.tenant_id IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- =============================================================================
-- T012: RLS policies for user_tenants
-- =============================================================================

-- super_admin: full CRUD
CREATE POLICY "User_tenants superadmin full"
  ON public.user_tenants FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- admin: read own rows + rows inside their assigned tenants
CREATE POLICY "User_tenants admin read"
  ON public.user_tenants FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND (
      user_id = auth.uid()
      OR tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  );

-- admin: insert rows linking guard/new-admin users to tenants inside their assigned set
CREATE POLICY "User_tenants admin insert"
  ON public.user_tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND tenant_id IN (
      SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
    )
  );

-- admin: delete assignments inside their assigned tenants
CREATE POLICY "User_tenants admin delete"
  ON public.user_tenants FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND tenant_id IN (
      SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
    )
  );

-- guards and residents: deny by default (no policy enables them)

-- =============================================================================
-- T013: Rewrite tenants RLS
-- =============================================================================

DROP POLICY IF EXISTS "Users can read own tenant" ON public.tenants;

CREATE POLICY "Tenants read by role+scope"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'guard')
      AND id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'resident'
      AND id = (
        SELECT p.tenant_id FROM public.profiles p WHERE p.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Tenants insert by super_admin and admin"
  ON public.tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
  );

CREATE POLICY "Tenants update by role+scope"
  ON public.tenants FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      AND id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      AND id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- T014: Rewrite profiles RLS
-- =============================================================================

DROP POLICY IF EXISTS "Users can read profiles in own tenant"   ON public.profiles;
DROP POLICY IF EXISTS "Users can read profiles in scope"        ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles in own tenant" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles in scope"     ON public.profiles;
-- "Users can update own profile" is kept unchanged

CREATE POLICY "Profiles read by role+scope"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'guard')
      AND tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'resident'
      AND tenant_id = (
        SELECT p.tenant_id FROM public.profiles p WHERE p.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Profiles insert by role+scope"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      AND tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Profiles update by role+scope"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      AND tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      AND tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- T015: Rewrite vehicles RLS
-- =============================================================================

DROP POLICY IF EXISTS "Users can read vehicles in scope"       ON public.vehicles;
DROP POLICY IF EXISTS "Staff can insert vehicles in own tenant" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can update vehicles in scope"    ON public.vehicles;

CREATE POLICY "Vehicles read by role+scope"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'guard')
      AND tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'resident'
      AND tenant_id = (
        SELECT p.tenant_id FROM public.profiles p WHERE p.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Vehicles insert by role+scope"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Vehicles update by role+scope"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- T016: Rewrite access_events RLS
-- =============================================================================

DROP POLICY IF EXISTS "Users can read access events in scope"       ON public.access_events;
DROP POLICY IF EXISTS "Staff can insert access events in own tenant" ON public.access_events;
DROP POLICY IF EXISTS "Staff can update access events in scope"     ON public.access_events;

CREATE POLICY "Access events read by role+scope"
  ON public.access_events FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'guard')
      AND tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'resident'
      AND tenant_id = (
        SELECT p.tenant_id FROM public.profiles p WHERE p.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Access events insert by role+scope"
  ON public.access_events FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Access events update by role+scope"
  ON public.access_events FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- T017: Rewrite visit_persons RLS
-- =============================================================================

DROP POLICY IF EXISTS "Users can read visit persons in scope"       ON public.visit_persons;
DROP POLICY IF EXISTS "Staff can insert visit persons in own tenant" ON public.visit_persons;
DROP POLICY IF EXISTS "Staff can update visit persons in scope"     ON public.visit_persons;

CREATE POLICY "Visit persons read by role+scope"
  ON public.visit_persons FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'guard')
      AND tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'resident'
      AND tenant_id = (
        SELECT p.tenant_id FROM public.profiles p WHERE p.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Visit persons insert by role+scope"
  ON public.visit_persons FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Visit persons update by role+scope"
  ON public.visit_persons FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- T018: Rewrite visit_person_images RLS
-- =============================================================================

DROP POLICY IF EXISTS "Users can read visit person images in scope" ON public.visit_person_images;
DROP POLICY IF EXISTS "Staff can insert visit person images"        ON public.visit_person_images;
DROP POLICY IF EXISTS "Staff can delete visit person images"        ON public.visit_person_images;

CREATE POLICY "Visit person images read by role+scope"
  ON public.visit_person_images FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'guard')
      AND tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'resident'
      AND tenant_id = (
        SELECT p.tenant_id FROM public.profiles p WHERE p.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Visit person images insert by role+scope"
  ON public.visit_person_images FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Visit person images delete by role+scope"
  ON public.visit_person_images FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id IN (
        SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- T019: Create tenant-images Supabase Storage bucket with policies
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-images',
  'tenant-images',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Tenant images: public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'tenant-images');

CREATE POLICY "Tenant images: write by super_admin"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'tenant-images'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    bucket_id = 'tenant-images'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

CREATE POLICY "Tenant images: write by admin within assigned tenants"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'tenant-images'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'tenant-images'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
    )
  );

-- =============================================================================
-- T020: Create custom access token hook function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role    text;
  user_tenant  uuid;
  tenant_ids   jsonb;
  claims       jsonb;
BEGIN
  SELECT role, tenant_id
    INTO user_role, user_tenant
    FROM public.profiles
   WHERE user_id = (event ->> 'user_id')::uuid;

  IF user_role = 'super_admin' THEN
    tenant_ids := '"*"'::jsonb;
  ELSIF user_role = 'resident' THEN
    tenant_ids := jsonb_build_array(user_tenant);
  ELSE
    -- admin or guard: aggregate from user_tenants
    SELECT COALESCE(jsonb_agg(ut.tenant_id ORDER BY ut.created_at), '[]'::jsonb)
      INTO tenant_ids
      FROM public.user_tenants ut
     WHERE ut.user_id = (event ->> 'user_id')::uuid;
  END IF;

  claims := COALESCE(event -> 'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{app_metadata}',
    COALESCE(claims -> 'app_metadata', '{}'::jsonb)
    || jsonb_build_object(
        'role',       user_role,
        'tenant_id',  user_tenant,
        'tenant_ids', tenant_ids
      )
  );

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
