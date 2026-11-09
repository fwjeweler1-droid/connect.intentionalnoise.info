# Connect message translation — T-001 (LibreTranslate)
Date: November 9, 2026
State: LIBRETRANSLATE CODE STAGED; EDGE FUNCTION v2 DEPLOYED; PROVIDER DISCONNECTED UNTIL HTTPS SERVICE CONFIGURED; NOT USER-ACCEPTED

## Decision
- Google Cloud Translation is removed from this feature's staged frontend and Edge Function implementation.
- Use LibreTranslate, an open-source Argos Translate-powered service, at an operator-controlled HTTPS endpoint. Self-hosting avoids Google API billing, but the server, compute, updates and networking still have costs.
- Do NOT assume the public libretranslate.com API is free for production applications. Its managed API generally requires a paid key.
- Do not activate a paid hosting plan, merge the draft pull request, or advertise live multilingual chat without owner approval and real-account tests.

## Existing assets preserved
- Existing Supabase project: xyudcdgjyormlokwhfoi.
- Existing member messaging M-001 and database policies untouched; cross-account browser acceptance remains pending.
- Existing Edge Function `translate-message` requires a valid signed-in JWT, loads only messages visible through caller RLS, checks sender/recipient, and accepts message ID (never arbitrary text). New requests do not overwrite the message.
- Existing `connect_translation_requests` quota metadata table (requester/message IDs + time; no message bodies), 20 requests/member and 150 total per rolling 24 hours, remains. These counters are not atomic hard caps; enforce limits on the translation host too.
- Existing inbox per-message Translate/Show Original, browser-local language preference and optional click-based sending. Translation is NOT automatic.
- Existing strict Connect origin CORS and not-end-to-end-encrypted notice.
- No media, booking, profiles, MFA, other websites, or music release records changed.

## Backend service deployment gate
1. Run a LibreTranslate server on a host with HTTPS accessible to the Supabase Edge Function. Use a private/restricted instance, control abuse, keep software and language models patched, and set resource/rate limits. Do not expose an unrestricted public translating endpoint.
2. Confirm GET `/health` and GET `/languages` work on that server. Supported languages depend on the installed Argos models; the frontend filters to those advertised by the server. Some requested language pairs may be unsupported.
3. Add Supabase secret `LIBRETRANSLATE_URL` (base HTTPS URL only). Optional `LIBRETRANSLATE_API_KEY` if the server enforces an API key. NEVER put secrets in GitHub, public HTML, or chat.
4. GET `translate-message` should report `available: true` only when the configured server responds with supported languages. Without it, the function returns not configured/unavailable and the original messages remain readable.
5. POST uses `/translate` with `source: auto`, target and body fetched under message RLS. Response is displayed transiently to requester, not persisted as a translated message. The `zh-CN` user target maps to LibreTranslate's `zh`.
6. Test an authorized member sending Punjabi→English or another actual supported pair; do not advertise a specific language as supported before checking installed models.

## Acceptance / security gates
- Test two signed-in accounts: send, receive, translate, Show Original, change target language, sign out and mobile display.
- Test unauthorized message ID (must not disclose message), signed-out request (denied), missing endpoint, upstream timeout, unsupported language and request quotas. Keep the original intact in all failures.
- Confirm the host does not retain message content longer than necessary, and its privacy notice matches actual hosting. No end-to-end encryption is claimed.
- Confirm GitHub Pages preview/main deployment separately; this PR stays DRAFT until approved.
- Check whether `LIBRETRANSLATE_URL` and required auth keys are configured without displaying secrets.
- No auto-translation, translated member profiles, venue booking threads, or language preference sync in this version.

## Rollback
- Without `LIBRETRANSLATE_URL`, translation fails closed. Unmerge/revert frontend if deployed.
- If running, remove the endpoint secret or disable the host, leaving original chat intact.
- Preserve the additive quota table and audit history unless an approved retention change is made.

## 2026-11-09 Latest decision: prioritize working Google API path
This section supersedes the earlier LibreTranslate provider proposal for T-001, retaining that alternative only as historical documentation.

- Owner priority: working member translation with as little setup as possible. Google Cloud Translation Basic (v2) is selected for launch because hosting LibreTranslate on Railway requires a paid plan and additional server operation.
- The preexisting Google function code has been restored on the draft branch. Supabase Edge Function `translate-message` v3 deployed and read back with `verify_jwt=true`. Participant-only RLS checks and server-only 20/user and 150/global request limits remain. Those application limits are non-atomic; a Google Cloud project quota is still advised.
- Draft frontend UI text and optional translation controls were updated to disclose Google. No merge or public website feature activation occurred.
- Required user-owned setup: create/link Google Cloud billing account; enable Cloud Translation API for the selected project; create API key restricted to the Cloud Translation API. Never paste key into chat or commit it in code.
- Required security setup after user billing: add `GOOGLE_TRANSLATE_API_KEY` as Supabase Edge Function secret. Connector currently does not expose set-secret action; user must configure in Supabase dashboard or use an authorized CLI locally.
- Verify backend availability, real two-account exchange/translation, unauthorized ID and signed-out denial, fallback/original preservation, and strict upstream quotas. Only then merge, deploy, and conduct browser acceptance.
- Google Cloud charges are possible above its pricing credit; no claim of a hard $0 maximum. No Railway project or subscription was created.
