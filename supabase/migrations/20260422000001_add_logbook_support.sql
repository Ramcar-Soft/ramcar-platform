-- Migration: Add logbook support (tenants.time_zone + search_access_events RPC)
-- Feature: 019-logbook-bitacora

-- 1) Add time_zone column to tenants table (defaults to 'UTC' for existing rows)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'UTC';

-- 2) Create the search_access_events RPC used by the logbook API
CREATE OR REPLACE FUNCTION public.search_access_events(
  p_tenant_ids uuid[],
  p_person_type text,
  p_date_from timestamptz,
  p_date_to_exclusive timestamptz,
  p_resident_id uuid,
  p_search text,
  p_limit int,
  p_offset int
)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  person_type text,
  direction text,
  access_mode text,
  notes text,
  created_at timestamptz,
  visit_person_id uuid,
  user_id uuid,
  vehicle_id uuid,
  registered_by uuid,
  vp_code text,
  vp_full_name text,
  vp_phone text,
  vp_company text,
  vp_status text,
  vp_resident_id uuid,
  vp_resident_full_name text,
  res_full_name text,
  res_address text,
  vehicle_plate text,
  vehicle_brand text,
  vehicle_model text,
  guard_full_name text,
  tenant_name text,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH filtered AS (
    SELECT
      ae.id,
      ae.tenant_id,
      ae.person_type,
      ae.direction,
      ae.access_mode,
      ae.notes,
      ae.created_at,
      ae.visit_person_id,
      ae.user_id,
      ae.vehicle_id,
      ae.registered_by,
      vp.code        AS vp_code,
      vp.full_name   AS vp_full_name,
      vp.phone       AS vp_phone,
      vp.company     AS vp_company,
      vp.status      AS vp_status,
      vp.resident_id AS vp_resident_id,
      vp_res.full_name AS vp_resident_full_name,
      res.full_name   AS res_full_name,
      res.address     AS res_address,
      v.plate         AS vehicle_plate,
      v.brand         AS vehicle_brand,
      v.model         AS vehicle_model,
      guard.full_name AS guard_full_name,
      t.name          AS tenant_name
    FROM public.access_events ae
    LEFT JOIN public.visit_persons vp ON vp.id = ae.visit_person_id
    LEFT JOIN public.profiles vp_res  ON vp_res.id = vp.resident_id
    LEFT JOIN public.profiles res     ON res.id = ae.user_id
    LEFT JOIN public.vehicles v       ON v.id = ae.vehicle_id
    INNER JOIN public.profiles guard  ON guard.id = ae.registered_by
    INNER JOIN public.tenants t       ON t.id = ae.tenant_id
    WHERE ae.tenant_id = ANY(p_tenant_ids)
      AND ae.person_type = p_person_type
      AND ae.created_at >= p_date_from
      AND ae.created_at <  p_date_to_exclusive
      AND (p_resident_id IS NULL OR (
        CASE p_person_type
          WHEN 'resident' THEN ae.user_id = p_resident_id
          ELSE vp.resident_id = p_resident_id
        END
      ))
      AND (
        p_search IS NULL OR p_search = ''
        OR vp.full_name        ILIKE '%' || p_search || '%'
        OR vp.phone            ILIKE '%' || p_search || '%'
        OR vp.company          ILIKE '%' || p_search || '%'
        OR v.plate             ILIKE '%' || p_search || '%'
        OR v.brand             ILIKE '%' || p_search || '%'
        OR v.model             ILIKE '%' || p_search || '%'
        OR ae.notes            ILIKE '%' || p_search || '%'
        OR vp_res.full_name    ILIKE '%' || p_search || '%'
        OR res.full_name       ILIKE '%' || p_search || '%'
      )
  ),
  counted AS (SELECT count(*) AS total FROM filtered),
  page AS (
    SELECT f.*
    FROM filtered f
    ORDER BY f.created_at DESC
    OFFSET p_offset LIMIT p_limit
  )
  SELECT
    page.id,
    page.tenant_id,
    page.person_type,
    page.direction,
    page.access_mode,
    page.notes,
    page.created_at,
    page.visit_person_id,
    page.user_id,
    page.vehicle_id,
    page.registered_by,
    page.vp_code,
    page.vp_full_name,
    page.vp_phone,
    page.vp_company,
    page.vp_status,
    page.vp_resident_id,
    page.vp_resident_full_name,
    page.res_full_name,
    page.res_address,
    page.vehicle_plate,
    page.vehicle_brand,
    page.vehicle_model,
    page.guard_full_name,
    page.tenant_name,
    (SELECT total FROM counted)
  FROM page;
$$;

GRANT EXECUTE ON FUNCTION public.search_access_events(uuid[], text, timestamptz, timestamptz, uuid, text, int, int)
  TO authenticated;
