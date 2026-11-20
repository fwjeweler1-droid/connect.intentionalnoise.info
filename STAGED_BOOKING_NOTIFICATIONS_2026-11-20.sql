-- STAGING ONLY: do not run in production until explicit approval and test fixtures pass.
-- Private in-app alert queue; email dispatch uses an optional authenticated Edge Function.
-- No public email, telephone, or message body is stored in this table.
begin;

create table if not exists public.connect_booking_alerts (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 alert_type text not null check (alert_type in ('private_message','booking_interest','booking_reply','booking_shortlisted')),
 booking_id uuid references public.venue_booking_requests(id) on delete cascade,
 source_key text not null unique,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 email_sent_at timestamptz
);
create index if not exists connect_booking_alerts_recipient_idx
 on public.connect_booking_alerts(recipient_id,created_at desc);
alter table public.connect_booking_alerts enable row level security;
revoke all on public.connect_booking_alerts from public, anon, authenticated;
grant select, update(read_at) on public.connect_booking_alerts to authenticated;

drop policy if exists "Only recipient reads alerts" on public.connect_booking_alerts;
create policy "Only recipient reads alerts"
 on public.connect_booking_alerts for select to authenticated
 using (recipient_id = (select auth.uid())
        and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));

drop policy if exists "Only recipient marks an alert read" on public.connect_booking_alerts;
create policy "Only recipient marks an alert read"
 on public.connect_booking_alerts for update to authenticated
 using (recipient_id = (select auth.uid()))
 with check (recipient_id = (select auth.uid()));

-- Transactional booking email preference. Defaults ON only when email delivery
-- is separately configured and approved; members can turn it OFF in Connect.
create table if not exists public.connect_booking_alert_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email_enabled boolean not null default true
);
alter table public.connect_booking_alert_preferences enable row level security;
revoke all on public.connect_booking_alert_preferences from public, anon, authenticated;
grant select,insert,update(email_enabled) on public.connect_booking_alert_preferences to authenticated;
drop policy if exists "Owner reads alert preference" on public.connect_booking_alert_preferences;
create policy "Owner reads alert preference" on public.connect_booking_alert_preferences
 for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "Owner creates alert preference" on public.connect_booking_alert_preferences;
create policy "Owner creates alert preference" on public.connect_booking_alert_preferences
 for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists "Owner edits alert preference" on public.connect_booking_alert_preferences;
create policy "Owner edits alert preference" on public.connect_booking_alert_preferences
 for update to authenticated
 using (user_id=(select auth.uid()))
 with check (user_id=(select auth.uid()));

-- Trigger functions are internal to private schema. They are NOT HTTP RPC endpoints.
create or replace function private.connect_enqueue_booking_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_actor uuid;
 v_recipient uuid;
 v_booking uuid;
 v_kind text;
 v_key text;
 v_owner uuid;
 v_musician uuid;
begin
 if tg_table_name = 'connect_direct_messages' and tg_op = 'INSERT' then
  v_actor := new.sender_id;
  v_recipient := new.recipient_id;
  v_kind := 'private_message';
  v_key := 'dm:'||new.id::text;
 elsif tg_table_name = 'venue_booking_interests' then
  if tg_op = 'INSERT' then
   v_actor := new.musician_id;
   v_recipient := new.venue_owner_id;
   v_kind := 'booking_interest';
   v_booking := new.booking_id;
   v_key := 'interest:'||new.id::text;
  elsif tg_op = 'UPDATE' and new.status = 'shortlisted'
       and old.status is distinct from new.status then
   v_actor := new.venue_owner_id;
   v_recipient := new.musician_id;
   v_kind := 'booking_shortlisted';
   v_booking := new.booking_id;
   v_key := 'shortlist:'||new.id::text;
  end if;
 elsif tg_table_name = 'venue_booking_thread_messages' and tg_op = 'INSERT' then
  select i.venue_owner_id,i.musician_id,i.booking_id
   into v_owner,v_musician,v_booking
   from public.venue_booking_interests i where i.id = new.interest_id;
  v_actor := new.author_id;
  if v_actor = v_owner then v_recipient := v_musician;
  elsif v_actor = v_musician then v_recipient := v_owner;
  else return new; end if;
  v_kind := 'booking_reply';
  v_key := 'thread:'||new.id::text;
 end if;

 if v_recipient is not null and v_actor is distinct from v_recipient then
  insert into public.connect_booking_alerts
    (recipient_id,actor_id,alert_type,booking_id,source_key)
  values(v_recipient,v_actor,v_kind,v_booking,v_key)
  on conflict (source_key) do nothing;
 end if;
 return new;
end $$;

revoke all on function private.connect_enqueue_booking_alert()
 from public, anon, authenticated;

drop trigger if exists alert_on_connect_dm on public.connect_direct_messages;
create trigger alert_on_connect_dm after insert
 on public.connect_direct_messages for each row
 execute function private.connect_enqueue_booking_alert();

drop trigger if exists alert_on_venue_interest on public.venue_booking_interests;
create trigger alert_on_venue_interest after insert or update of status
 on public.venue_booking_interests for each row
 execute function private.connect_enqueue_booking_alert();

drop trigger if exists alert_on_booking_message on public.venue_booking_thread_messages;
create trigger alert_on_booking_message after insert
 on public.venue_booking_thread_messages for each row
 execute function private.connect_enqueue_booking_alert();

commit;

-- Delivery is intentionally NOT wired in this migration.
-- Separate reviewed database webhook must POST INSERT events on
-- public.connect_booking_alerts to booking-alert-email Edge Function.
-- Configure a strong per-webhook secret (Edge Function secret, not client JS);
-- never put an API secret in a GitHub file or web page.
-- Email vendor credentials and verified sender required before any deployment.

-- Staging privacy tests:
-- (1) Venue->musician DM alerts musician; reply alerts venue.
-- (2) Interest alerts venue; shortlist alerts musician.
-- (3) Booking thread replies alert the OTHER party only.
-- (4) Anonymous and unrelated account SELECT: zero rows.
-- (5) Authenticated sender cannot insert or forge alerts directly.
-- (6) Recipient can mark only read_at; cannot update email_sent_at.
-- (7) Existing history is NOT replayed when triggers are installed.
-- (8) Duplicate source_key cannot produce a second alert.
