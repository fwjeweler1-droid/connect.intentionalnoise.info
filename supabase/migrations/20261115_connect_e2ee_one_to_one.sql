-- Intentional Noise Connect: E2EE envelope v1 (browser encryption; no server-side keys).
-- Preserves pre-existing plaintext rows as legacy history.
-- Must be deployed together with make-contact.html and connect-e2ee.js.
-- Revoke old plaintext INSERT by a restrictive RLS policy before telling members E2EE is live.
-- This version uses ECDH/P-256, HKDF/SHA-256, AES-256-GCM, ECDSA/P-256.
-- NOT the Signal protocol / Double Ratchet. No forward secrecy under identity key compromise.

create table public.connect_e2ee_public_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encryption_public_key jsonb not null,
  signing_public_key jsonb not null,
  created_at timestamptz not null default now(),
  constraint connect_e2ee_enc_key_shape check (
    jsonb_typeof(encryption_public_key)='object'
    and encryption_public_key->>'kty'='EC'
    and encryption_public_key->>'crv'='P-256'
    and pg_catalog.length(encryption_public_key::text) between 100 and 1800
  ),
  constraint connect_e2ee_sig_key_shape check (
    jsonb_typeof(signing_public_key)='object'
    and signing_public_key->>'kty'='EC'
    and signing_public_key->>'crv'='P-256'
    and pg_catalog.length(signing_public_key::text) between 100 and 1800
  )
);
alter table public.connect_e2ee_public_keys enable row level security;
revoke all on public.connect_e2ee_public_keys from public,anon,authenticated;
grant select,insert on public.connect_e2ee_public_keys to authenticated;
create policy "Relevant member public keys available for encryption"
on public.connect_e2ee_public_keys for select to authenticated
using (
  user_id = (select auth.uid())
  or exists(select 1 from public.musician_profiles p where p.user_id=connect_e2ee_public_keys.user_id and p.is_public)
  or exists(select 1 from public.instructor_profiles p where p.user_id=connect_e2ee_public_keys.user_id and p.is_public)
  or exists(select 1 from public.artist_pages a where a.user_id=connect_e2ee_public_keys.user_id and a.published and a.approved_at is not null)
  or exists(select 1 from public.connect_direct_messages m where
      (m.sender_id=(select auth.uid()) and m.recipient_id=connect_e2ee_public_keys.user_id)
      or (m.recipient_id=(select auth.uid()) and m.sender_id=connect_e2ee_public_keys.user_id))
);
create policy "One immutable public key per confirmed member"
on public.connect_e2ee_public_keys for insert to authenticated
with check (user_id=(select auth.uid())
  and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
  and exists(select 1 from auth.users u where u.id=(select auth.uid()) and u.email_confirmed_at is not null));

create table public.connect_e2ee_key_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  kdf_salt text not null,
  kdf_iterations integer not null check(kdf_iterations=600000),
  nonce text not null,
  ciphertext text not null,
  created_at timestamptz not null default now(),
  constraint backup_shape check (
    kdf_salt ~ '^[A-Za-z0-9+/=]{20,28}$'
    and nonce ~ '^[A-Za-z0-9+/=]{12,20}$'
    and pg_catalog.length(ciphertext) between 500 and 12000
  )
);
alter table public.connect_e2ee_key_backups enable row level security;
revoke all on public.connect_e2ee_key_backups from public,anon,authenticated;
grant select,insert on public.connect_e2ee_key_backups to authenticated;
create policy "Only member can read encrypted key backup"
on public.connect_e2ee_key_backups for select to authenticated
using (user_id=(select auth.uid()));
create policy "Only member can register one encrypted key backup"
on public.connect_e2ee_key_backups for insert to authenticated
with check (user_id=(select auth.uid()) and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));

alter table public.connect_direct_messages
  add column encrypted_payload jsonb;
alter table public.connect_direct_messages
  add constraint connect_dm_envelope_shape check(
    encrypted_payload is null or
    (jsonb_typeof(encrypted_payload)='object'
      and encrypted_payload->>'v'='1'
      and pg_catalog.pg_column_size(encrypted_payload) between 200 and 18000)
  ) not valid;

-- Remove an incorrectly-permissive "block override" policy: permissive INSERT policies OR together,
-- so the old rule did NOT reliably stop a blocked member from passing the other policy.
drop policy if exists "Block overrides permission to send direct messages"
on public.connect_direct_messages;
create policy "Block always prevents sending"
on public.connect_direct_messages as restrictive for insert to authenticated
with check (not private.connect_dm_is_blocked(sender_id,recipient_id));

-- Existing plaintext message history remains readable as legacy data, but
-- ALL NEW INSERTs must contain encrypted payload and a fixed public marker.
-- Existing cached old clients fail closed rather than silently send plaintext.
create policy "New direct messages must be encrypted"
on public.connect_direct_messages as restrictive for insert to authenticated
with check (
  body='[Encrypted message]'
  and encrypted_payload is not null
  and encrypted_payload->>'v'='1'
);

comment on column public.connect_direct_messages.encrypted_payload is
  'Browser-encrypted E2EE envelope. Legacy plaintext rows have NULL. Not Signal/Double Ratchet.';
