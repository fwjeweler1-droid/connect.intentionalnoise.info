# Hidden fan-chat translation pilot — review gate (2026-11-15)

## Staged, not deployed
- This branch adds `fan-chat-lab.html` and proposed SQL `supabase/fan-chat-lab-proposed.sql`.
- No existing member messaging, artist profile, billing page, live navigation, sitemap, or four-site link is changed.
- No migration has been applied; no tester IDs are added; no live GitHub Pages deployment.
- `robots noindex` supplements, but **does not replace**, Supabase RLS access control.
- Do not expose as a paid feature or add to the site navigation until separately approved.

## MVP behavior
- Signed-in approved testers only. Admin must explicitly create access rows with `enabled=true` using a trusted privileged interface. No self-service enrollment.
- Artist/test host creates a room, invites other signed-in test users by their UUID, sends/receives messages via Supabase Postgres Changes. Manual refresh fallback.
- Host can close a room. The room's messages remain stored; no delete/export/retention guarantee in this pilot.
- Each browser translates received text on-device **only when** the local Translator API and language pair are available. Optional automatic translation is opt-in per device. Otherwise original text is shown; there is no cloud fallback.
- Messages are text-only and stored in readable form in Supabase. **Not end-to-end encrypted**.
- No public rooms, anonymous spectators, fan-facing registration workflow, payment, voice, push alerts, or 3rd-party translation API.

## Installation and testing order
1. Review SQL, existing privileges, and RLS policy interactions (especially invitee access grants and cross-room isolation); confirm exact original source and project.
2. Apply SQL to a development/staging database, **not production** initially. Enable Realtime publication for `connect_fan_lab_messages` there (statement is commented out in the proposal).
3. With admin privileges, enable exactly two explicit test accounts in `connect_fan_lab_access`. Do not seed broad account access.
4. Host opens `fan-chat-lab.html` from this feature branch deployment, creates session, invites tester by UUID. Verify two-way live delivery and reload/history.
5. Check unauthorized signed-out user, signed-in non-tester, unrelated tester, and tester with a different room: all must be denied by DB, not just UI.
6. Check hidden/public member profiles, room closure, mobile layout, browser tab refresh, offline reconnect, language pairs, and unsupported iOS/Safari translation behavior.
7. Check RLS with direct REST requests and validate rate limits, spam handling, abuse controls, retention, and data deletion before any public pilot.
8. Review resource costs against Supabase Free limits (200 peak Realtime connections, 2M messages/month); these limits are shared with all Connect features.
9. Release behind an audited account entitlement and owner-controlled feature flag; separately establish billing and consent terms.

## Known blocking items before production
- Moderation, report/block/ignore, attendance controls, message retention/deletion and privacy policy
- End-to-end encryption (not implemented; no claims made); verified on-device translation coverage
- Automated membership discovery/invites, anti-spam/rate limits, maximum session size
- Separate entitlement for future paid service, quota metering, and performance tests
- Full browser and cross-account security acceptance

**Rollback:** Leave the draft unmerged and do not run SQL. No live production files or data have changed.