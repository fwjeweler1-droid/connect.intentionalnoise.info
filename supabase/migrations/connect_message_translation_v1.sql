-- Connect Message Translation V1 (November 9, 2026)
-- Privacy: stores only request metadata; never stores message text or translations.
-- Closed to anon and authenticated direct table access. Only the Edge Function's
-- service role may write/read quota records.
create table if not exists public.connect_translation_requests (
  id bigint generated always as identity primary key,
  requester_id uuid not null references auth.users(id) on delete cascade,
  message_id bigint not null references public.connect_direct_messages(id) on delete cascade,
  requested_at timestamptz not null default now()
);
alter table public.connect_translation_requests enable row level security;
revoke all on table public.connect_translation_requests from public, anon, authenticated;
revoke all on sequence public.connect_translation_requests_id_seq from public, anon, authenticated;
grant select, insert on table public.connect_translation_requests to service_role;
grant usage, select on sequence public.connect_translation_requests_id_seq to service_role;
create index if not exists connect_translation_requests_requester_time_idx
  on public.connect_translation_requests(requester_id, requested_at desc);
create index if not exists connect_translation_requests_time_idx
  on public.connect_translation_requests(requested_at desc);
comment on table public.connect_translation_requests is
  'Server-only metadata for per-user and global on-demand translation quotas; no message bodies.';
