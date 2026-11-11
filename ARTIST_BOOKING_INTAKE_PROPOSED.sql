-- PROPOSED ONLY: apply to the existing Intentional-noise-connect Supabase project
-- before deploying the matching auth.html / artist-booking-intake.js update.
-- No public access to booking answers; no changes to existing public profiles.
create table if not exists public.artist_booking_intake (
  user_id uuid primary key references auth.users(id) on delete cascade,
  performance_details text not null default '' check (char_length(performance_details) <= 800),
  live_sample_url text not null default '' check (
    char_length(live_sample_url) <= 500 and
    (live_sample_url = '' or live_sample_url ~* '^https://[^[:space:]]+$')
  ),
  booking_availability text not null default '' check (char_length(booking_availability) <= 600),
  show_format text not null default '' check (char_length(show_format) <= 600),
  fee_details text not null default '' check (char_length(fee_details) <= 600),
  technical_needs text not null default '' check (char_length(technical_needs) <= 800),
  updated_at timestamptz not null default now()
);

alter table public.artist_booking_intake enable row level security;

-- Self-service intake is for signed-in artist/band account owners only.
revoke all on table public.artist_booking_intake from anon;
grant select, insert, update, delete on table public.artist_booking_intake to authenticated;

create policy "Artist booking intake owner select"
  on public.artist_booking_intake for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Artist booking intake owner insert"
  on public.artist_booking_intake for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Artist booking intake owner update"
  on public.artist_booking_intake for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Artist booking intake owner delete"
  on public.artist_booking_intake for delete to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.artist_booking_intake is
  'Private, optional five-question artist booking intake. No public profile, booking, or venue access is granted.';

-- Verify: RLS enabled, anon table privileges absent, and all four owner policies.
-- SECURITY INVARIANT: do not expose this table through public artist_pages views
-- or the member search without separate explicit owner authorization.
