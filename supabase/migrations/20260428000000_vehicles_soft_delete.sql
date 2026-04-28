ALTER TABLE public.vehicles
  ADD COLUMN deleted_at TIMESTAMPTZ NULL;

CREATE INDEX vehicles_deleted_at_idx
  ON public.vehicles (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;
