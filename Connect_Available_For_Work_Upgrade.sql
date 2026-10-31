-- Intentional Noise Connect: opt-in availability, no private contact exposure.
-- Run in Supabase SQL Editor after reviewing existing RLS policies.
ALTER TABLE public.musician_profiles ADD COLUMN IF NOT EXISTS available_for_work boolean NOT NULL DEFAULT false;
ALTER TABLE public.musician_profiles ADD COLUMN IF NOT EXISTS work_types text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.musician_profiles ADD COLUMN IF NOT EXISTS availability_notes text;
ALTER TABLE public.musician_profiles ADD COLUMN IF NOT EXISTS remote_sessions boolean NOT NULL DEFAULT false;
ALTER TABLE public.musician_profiles DROP CONSTRAINT IF EXISTS musician_work_types_allowed;
ALTER TABLE public.musician_profiles ADD CONSTRAINT musician_work_types_allowed CHECK (work_types <@ ARRAY['paid_gigs','studio_sessions','touring','fill_ins','permanent_band','remote_recording','collaborations']::text[]);
-- The existing public-read policy must still require is_public=true.
-- Never publish email, phone, or precise home address in the public profile.
