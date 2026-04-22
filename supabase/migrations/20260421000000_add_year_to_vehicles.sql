-- Migration: add_year_to_vehicles
-- Adds optional year column to vehicles for the brand/model/year autocomplete feature (spec 016).

ALTER TABLE public.vehicles
  ADD COLUMN year smallint;

ALTER TABLE public.vehicles
  ADD CONSTRAINT chk_vehicles_year
    CHECK (year IS NULL OR (year >= 1960 AND year <= 2100));

COMMENT ON COLUMN public.vehicles.year IS
  'Four-digit year of manufacture. Optional. Authoritative bounds enforced by Zod schema in @ramcar/shared.';
