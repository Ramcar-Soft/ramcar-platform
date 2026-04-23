-- Feature 020 (Phase 8, T113): SECURITY DEFINER function that atomically
-- syncs public.user_tenants for a given admin/guard user to exactly match
-- the supplied tenant_ids set, updates profiles.tenant_id to the primary,
-- and returns the resulting ordered tenant_ids array so the caller can
-- mirror it into auth.users.raw_app_meta_data (see FR-028a).
--
-- This function executes the three mutations inside a single implicit
-- transaction (every SQL function runs as one transaction), which is the
-- atomicity guarantee the feature spec calls for.

CREATE OR REPLACE FUNCTION public.sync_user_tenants(
  p_user_id          uuid,
  p_tenant_ids       uuid[],
  p_primary_tenant_id uuid,
  p_assigned_by      uuid
) RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_final_ids uuid[];
BEGIN
  IF p_tenant_ids IS NULL OR array_length(p_tenant_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'tenant_ids must be a non-empty array'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_primary_tenant_id IS NULL OR NOT (p_primary_tenant_id = ANY (p_tenant_ids)) THEN
    RAISE EXCEPTION 'primary_tenant_id must be one of tenant_ids'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.profiles
     SET tenant_id = p_primary_tenant_id
   WHERE user_id = p_user_id;

  DELETE FROM public.user_tenants
   WHERE user_id = p_user_id
     AND tenant_id <> ALL (p_tenant_ids);

  INSERT INTO public.user_tenants (user_id, tenant_id, assigned_by)
  SELECT p_user_id, unnest(p_tenant_ids), p_assigned_by
  ON CONFLICT (user_id, tenant_id) DO NOTHING;

  SELECT COALESCE(array_agg(ut.tenant_id ORDER BY ut.created_at), ARRAY[]::uuid[])
    INTO v_final_ids
    FROM public.user_tenants ut
   WHERE ut.user_id = p_user_id;

  RETURN v_final_ids;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_user_tenants(uuid, uuid[], uuid, uuid) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.sync_user_tenants(uuid, uuid[], uuid, uuid) TO service_role;
