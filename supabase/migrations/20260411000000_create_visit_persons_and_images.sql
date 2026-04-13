-- Migration: create_visit_persons_and_images
-- Creates visit_persons master registry, visit_person_images metadata table,
-- adds FK constraints on vehicles.visit_person_id and access_events.visit_person_id,
-- tightens chk_vehicle_owner constraint, adds UPDATE RLS on access_events,
-- and creates visit-person-images storage bucket.

-- =============================================================================
-- 1. Create public.visit_persons — Non-Resident Person Registry
-- =============================================================================
CREATE TABLE public.visit_persons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id),
  code            varchar(20) NOT NULL,
  type            varchar(20) NOT NULL CHECK (type IN ('visitor', 'service_provider')),
  status          varchar(20) NOT NULL DEFAULT 'allowed'
                      CHECK (status IN ('allowed', 'flagged', 'denied')),
  full_name       varchar(255) NOT NULL,
  phone           varchar(30),
  company         varchar(255),
  resident_id     uuid REFERENCES public.profiles(id),
  notes           text,
  registered_by   uuid NOT NULL REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_visit_person_code UNIQUE (tenant_id, code)
);

-- Updated_at trigger
CREATE TRIGGER visit_persons_updated_at
  BEFORE UPDATE ON public.visit_persons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX idx_visit_persons_tenant_type ON public.visit_persons (tenant_id, type);
CREATE INDEX idx_visit_persons_tenant_name ON public.visit_persons (tenant_id, full_name);
CREATE INDEX idx_visit_persons_resident    ON public.visit_persons (resident_id)
  WHERE resident_id IS NOT NULL;

-- RLS
ALTER TABLE public.visit_persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read visit persons in scope"
  ON public.visit_persons FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY "Staff can insert visit persons in own tenant"
  ON public.visit_persons FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY "Staff can update visit persons in scope"
  ON public.visit_persons FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );

-- =============================================================================
-- 2. Code auto-generation trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_visit_person_code()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  seq_num INT;
BEGIN
  IF NEW.type = 'visitor' THEN
    prefix := 'VIS';
  ELSE
    prefix := 'PRV';
  END IF;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(code FROM LENGTH(prefix) + 2) AS INT)
  ), 0) + 1
  INTO seq_num
  FROM public.visit_persons
  WHERE tenant_id = NEW.tenant_id AND type = NEW.type;

  NEW.code := prefix || '-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER visit_persons_generate_code
  BEFORE INSERT ON public.visit_persons
  FOR EACH ROW EXECUTE FUNCTION public.generate_visit_person_code();

-- =============================================================================
-- 3. Create public.visit_person_images — Image Metadata
-- =============================================================================
CREATE TABLE public.visit_person_images (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id),
  visit_person_id  uuid NOT NULL REFERENCES public.visit_persons(id) ON DELETE CASCADE,
  image_type       varchar(20) NOT NULL
                       CHECK (image_type IN ('face', 'id_card', 'vehicle_plate', 'other')),
  storage_path     varchar(500) NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_visit_person_images_person ON public.visit_person_images (visit_person_id);

-- RLS
ALTER TABLE public.visit_person_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read visit person images in scope"
  ON public.visit_person_images FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY "Staff can insert visit person images"
  ON public.visit_person_images FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY "Staff can delete visit person images"
  ON public.visit_person_images FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );

-- =============================================================================
-- 4. Add FK constraints on existing tables
-- =============================================================================

-- Add FK on vehicles.visit_person_id → visit_persons(id)
ALTER TABLE public.vehicles
  ADD CONSTRAINT fk_vehicles_visit_person
  FOREIGN KEY (visit_person_id) REFERENCES public.visit_persons(id);

-- Tighten the chk_vehicle_owner constraint (drop relaxed, add strict)
ALTER TABLE public.vehicles DROP CONSTRAINT chk_vehicle_owner;
ALTER TABLE public.vehicles ADD CONSTRAINT chk_vehicle_owner CHECK (
  (user_id IS NOT NULL AND visit_person_id IS NULL) OR
  (user_id IS NULL AND visit_person_id IS NOT NULL)
);

-- Add FK on access_events.visit_person_id → visit_persons(id)
ALTER TABLE public.access_events
  ADD CONSTRAINT fk_access_events_visit_person
  FOREIGN KEY (visit_person_id) REFERENCES public.visit_persons(id);

-- =============================================================================
-- 5. Add UPDATE RLS policy on access_events (for PATCH support)
-- =============================================================================
CREATE POLICY "Staff can update access events in scope"
  ON public.access_events FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );

-- =============================================================================
-- 6. Create Supabase Storage bucket for visit-person-images
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visit-person-images',
  'visit-person-images',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;
