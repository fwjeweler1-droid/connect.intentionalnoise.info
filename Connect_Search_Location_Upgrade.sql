-- Intentional Noise Connect: optional, approximate public profile location.
-- Execute once in Supabase SQL Editor. Existing profiles are preserved.
-- Coordinates should be approximate city centers, not private home addresses.
alter table public.musician_profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.musician_profiles
  drop constraint if exists musician_profiles_location_bounds;
alter table public.musician_profiles
  add constraint musician_profiles_location_bounds check (
    (latitude is null and longitude is null) or
    (latitude between -90 and 90 and longitude between -180 and 180)
  );
-- Existing RLS policies remain unchanged. Only published profiles are publicly readable.
