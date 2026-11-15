-- Hidden fan-chat / multilingual lab. Staged only; do not apply until test identities approved.
-- Four isolated tables, no change to member messaging v1 or public profiles.
create table if not exists public.connect_fan_lab_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  granted_at timestamptz not null default now()
);
create table if not exists public.connect_fan_lab_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (char_length(btrim(title)) between 3 and 100),
  status text not null default 'live' check (status in ('live','ended')),
  created_at timestamptz not null default now()
);
create table if not exists public.connect_fan_lab_members (
  room_id uuid not null references public.connect_fan_lab_rooms(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  can_post boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (room_id,member_id)
);
create table if not exists public.connect_fan_lab_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.connect_fan_lab_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists connect_fan_lab_messages_room_time on public.connect_fan_lab_messages(room_id,created_at desc);
alter table public.connect_fan_lab_access enable row level security;
alter table public.connect_fan_lab_rooms enable row level security;
alter table public.connect_fan_lab_members enable row level security;
alter table public.connect_fan_lab_messages enable row level security;
revoke all on public.connect_fan_lab_access,public.connect_fan_lab_rooms,public.connect_fan_lab_members,public.connect_fan_lab_messages from anon,authenticated;
grant select on public.connect_fan_lab_access to authenticated;
grant select,insert,update on public.connect_fan_lab_rooms to authenticated;
grant select,insert on public.connect_fan_lab_members to authenticated;
grant select,insert on public.connect_fan_lab_messages to authenticated;

create policy "Pilot user can read own access" on public.connect_fan_lab_access
for select to authenticated using (user_id=(select auth.uid()));

-- Private rooms: owners or explicitly enrolled pilot members only.
create policy "Pilot room membership can read" on public.connect_fan_lab_rooms
for select to authenticated using (
  exists (select 1 from public.connect_fan_lab_access a where a.user_id=(select auth.uid()) and a.enabled)
  and (host_id=(select auth.uid()) or exists (
    select 1 from public.connect_fan_lab_members p where p.room_id=id and p.member_id=(select auth.uid())
  ))
);
create policy "Pilot may host room" on public.connect_fan_lab_rooms
for insert to authenticated with check (
  host_id=(select auth.uid()) and exists (
    select 1 from public.connect_fan_lab_access a where a.user_id=(select auth.uid()) and a.enabled
  )
);
create policy "Host may close pilot room" on public.connect_fan_lab_rooms
for update to authenticated using (
  host_id=(select auth.uid()) and exists (
    select 1 from public.connect_fan_lab_access a where a.user_id=(select auth.uid()) and a.enabled
  )
) with check (
  host_id=(select auth.uid()) and exists (
    select 1 from public.connect_fan_lab_access a where a.user_id=(select auth.uid()) and a.enabled
  )
);

-- Non-recursive membership policy: a member can read only their own membership.
create policy "Pilot member reads own membership" on public.connect_fan_lab_members
for select to authenticated using (
  member_id=(select auth.uid()) and exists (
    select 1 from public.connect_fan_lab_access a where a.user_id=(select auth.uid()) and a.enabled
  )
);
create policy "Pilot host adds enabled testers" on public.connect_fan_lab_members
for insert to authenticated with check (
  exists (select 1 from public.connect_fan_lab_access a where a.user_id=(select auth.uid()) and a.enabled)
  and exists (select 1 from public.connect_fan_lab_access a where a.user_id=member_id and a.enabled)
  and exists (select 1 from public.connect_fan_lab_rooms r where r.id=room_id and r.host_id=(select auth.uid()) and r.status='live')
);

create policy "Pilot room members can read messages" on public.connect_fan_lab_messages
for select to authenticated using (
  exists (select 1 from public.connect_fan_lab_access a where a.user_id=(select auth.uid()) and a.enabled)
  and exists (select 1 from public.connect_fan_lab_members p where p.room_id=room_id and p.member_id=(select auth.uid()))
);
create policy "Pilot room members can post" on public.connect_fan_lab_messages
for insert to authenticated with check (
  sender_id=(select auth.uid())
  and exists (select 1 from public.connect_fan_lab_access a where a.user_id=(select auth.uid()) and a.enabled)
  and exists (select 1 from public.connect_fan_lab_members p where p.room_id=room_id and p.member_id=(select auth.uid()) and p.can_post)
  and exists (select 1 from public.connect_fan_lab_rooms r where r.id=room_id and r.status='live')
);
-- Realtime Postgres Changes; RLS still governs which rows clients can receive.
-- Run only once after confirming the publication and table registration:
-- alter publication supabase_realtime add table public.connect_fan_lab_messages;
-- Admin only, NEVER client: insert access grants for two explicitly approved test user IDs.
-- No seed grants, no public links, no billing, no cloud translation, no E2EE claim.
