# CONNECT — Function Lock M-001: Member Messaging v1

Locked: 2026-11-08 (America/Indiana/Indianapolis)
Status: IMPLEMENTATION LOCKED — authenticated end-to-end browser test PENDING.

## Scope preserved
- Supabase migration: connect_direct_messages_v1 on project xyudcdgjyormlokwhfoi.
- RLS restricts SELECT to sender/recipient; INSERT requires sender identity and both sender/recipient profiles listed.
- No anonymous table read; no client DELETE or UPDATE; text-only messages (1–2000 characters).
- make-contact.html: signed-in inbox/conversation interface; explicit server-storage/non-E2EE notice.
- search.html: Send a private message link for listed member results.
- auth.html: inbox navigation; index.html: copy updated.
- Source completion commits: fe266d6915d1faba9ce0e3a3e5d037e6dea46b09, 69bd5b430c1f053762dd8a4380c590ec441dceb3, 729bd7476f04679ad40db42880db6c95dd1113a2, cb743356fcbdc207958920335a8e218df20f6524.

## Evidence and outstanding gate
- The migration call succeeded; security checks showed RLS enabled, two policies, authenticated SELECT/INSERT, anonymous SELECT denied, authenticated DELETE denied. Repository read-back confirmed the inbox and search link.
- No two-account send/receive and blocked/private/offline browser test has yet been completed. Do NOT claim live messaging verified or production-safe based solely on schema checks.
- No privacy, edit/delete, notifications, end-to-end encryption, or blocking/reporting feature is promised for v1.

## Locking rule
Preserve messaging v1; do not change these files or database policies while addressing My Media & Storage unless a specific defect is found and separately approved/tested. Continue one-function-at-a-time.
