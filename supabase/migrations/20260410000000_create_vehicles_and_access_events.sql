-- Migration: create_vehicles_and_access_events
-- Creates vehicles and access_events tables for the resident access log feature.
-- Vehicles stores resident-owned (and future visitor/provider) vehicles.
-- Access events is an append-only log of entry/exit through community gates.

-- =============================================================================
-- 1. Create public.vehicles — Universal Vehicle Registry
-- =============================================================================
CREATE TABLE public.vehicles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id),

  -- Ownership: exactly one must be set
  user_id           uuid REFERENCES public.profiles(id),
  visit_person_id   uuid,  -- FK added when visit_persons table is created

  vehicle_type      varchar(20) NOT NULL
                        CHECK (vehicle_type IN (
                            'car', 'motorcycle', 'pickup_truck',
                            'truck', 'bicycle', 'scooter', 'other'
                        )),
  brand             varchar(100),
  model             varchar(100),
  plate             varchar(20),
  color             varchar(50),
  notes             text,

  -- Blacklist fields (future use)
  is_blacklisted    boolean NOT NULL DEFAULT false,
  blacklist_scope   varchar(10) CHECK (blacklist_scope IN ('local', 'global')),
  blacklist_reason  text,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- Exactly one owner must be set (relaxed: visit_person_id check added later)
  CONSTRAINT chk_vehicle_owner CHECK (
    (user_id IS NOT NULL AND visit_person_id IS NULL) OR
    (user_id IS NULL AND visit_person_id IS NOT NULL) OR
    -- Allow user_id only (current feature) until visit_persons table exists
    (user_id IS NOT NULL)
  )
);

-- Updated_at trigger
CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX idx_vehicles_tenant        ON public.vehicles (tenant_id);
CREATE INDEX idx_vehicles_user          ON public.vehicles (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_vehicles_visit_person  ON public.vehicles (visit_person_id) WHERE visit_person_id IS NOT NULL;
CREATE INDEX idx_vehicles_plate         ON public.vehicles (tenant_id, plate) WHERE plate IS NOT NULL;
CREATE INDEX idx_vehicles_blacklisted   ON public.vehicles (tenant_id) WHERE is_blacklisted = true;

-- RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Guards, Admins, Super Admins can read vehicles in their tenant
CREATE POLICY "Users can read vehicles in scope"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- Guards, Admins, Super Admins can insert vehicles in their tenant
CREATE POLICY "Staff can insert vehicles in own tenant"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );

-- Admins and Super Admins can update vehicles
CREATE POLICY "Admins can update vehicles in scope"
  ON public.vehicles FOR UPDATE
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

-- =============================================================================
-- 2. Create public.access_events — Entry/Exit Log
-- =============================================================================
CREATE TABLE public.access_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id),

  -- Who: exactly one person reference must be set
  person_type     varchar(20) NOT NULL
                      CHECK (person_type IN ('visitor', 'service_provider', 'resident')),
  visit_person_id uuid,  -- FK added when visit_persons table is created
  user_id         uuid REFERENCES public.profiles(id),

  -- What happened
  direction       varchar(5) NOT NULL CHECK (direction IN ('entry', 'exit')),
  access_mode     varchar(15) NOT NULL DEFAULT 'pedestrian'
                      CHECK (access_mode IN ('vehicle', 'pedestrian')),
  vehicle_id      uuid REFERENCES public.vehicles(id),

  -- Metadata
  registered_by   uuid NOT NULL REFERENCES public.profiles(id),
  notes           text,
  evidence_urls   jsonb DEFAULT '[]'::jsonb,
  source          varchar(10) NOT NULL DEFAULT 'desktop'
                      CHECK (source IN ('web', 'desktop', 'mobile')),
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Integrity constraints
  CONSTRAINT uq_access_event_idempotent UNIQUE (tenant_id, event_id),
  CONSTRAINT chk_access_person CHECK (
    (person_type IN ('visitor', 'service_provider') AND visit_person_id IS NOT NULL AND user_id IS NULL) OR
    (person_type = 'resident' AND user_id IS NOT NULL AND visit_person_id IS NULL)
  ),
  CONSTRAINT chk_access_vehicle CHECK (
    access_mode = 'pedestrian' OR (access_mode = 'vehicle' AND vehicle_id IS NOT NULL)
  )
);

-- Indexes (optimized for queries)
CREATE INDEX idx_access_events_tenant_date      ON public.access_events (tenant_id, created_at DESC);
CREATE INDEX idx_access_events_tenant_type_date ON public.access_events (tenant_id, person_type, created_at DESC);
CREATE INDEX idx_access_events_user             ON public.access_events (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_access_events_visit_person     ON public.access_events (visit_person_id) WHERE visit_person_id IS NOT NULL;
CREATE INDEX idx_access_events_vehicle          ON public.access_events (vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX idx_access_events_guard            ON public.access_events (registered_by);

-- RLS
ALTER TABLE public.access_events ENABLE ROW LEVEL SECURITY;

-- Guards, Admins, Super Admins can read access events in their tenant
CREATE POLICY "Users can read access events in scope"
  ON public.access_events FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- Guards, Admins, Super Admins can insert access events in their tenant
CREATE POLICY "Staff can insert access events in own tenant"
  ON public.access_events FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'guard')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );
