# Intentional Noise Connect — Message Translation T-001
Date: November 9, 2026
Status: BACKEND DEPLOYED, SOURCE STAGED — NOT YET LIVE/ACCEPTED.

## Scope
- Add translation to the **existing signed-in member inbox** (`make-contact.html`).
- User selects destination language; incoming messages gain `Translate` / `Show original` controls.
- Translate only on an explicit click. Auto-translation, translated profiles, gig booking threads, and cross-site language preference sync are **not** part of T-001.
- Original message stays in `connect_direct_messages` and is never overwritten.
- Translation language is stored in this browser's localStorage; not the central member profile.

## Deployment evidence and protections
- Supabase project: `xyudcdgjyormlokwhfoi`.
- New Edge Function: `translate-message`, version 1, JWT verification ON, deployed November 9, 2026. It returns unavailable until Google Cloud Translation credentials are configured.
- Existing direct-message RLS is unchanged. Function authenticates each user, fetches the requested stored message under that user's RLS, and explicitly checks that the user is its sender/recipient. No arbitrary user-submitted text translation.
- New migration `connect_message_translation_v1` applied. `connect_translation_requests` stores requester ID, message ID and timestamp **only**, with RLS ON, no public/authenticated read policy, and no table SELECT grants for those roles. Database check passed.
- Server limits: 20 per signed-in member / rolling 24h; 150 globally / rolling 24h. These are best-effort non-atomic application limits; **also establish a hard Google Cloud usage quota before enabling billing**.
- Exact allowed CORS origin is `https://connect.intentionalnoise.info`. API credentials are server-side only.
- Third-party processing notice is visible in inbox and at translation controls. No end-to-end encryption is claimed.
- Existing unrelated Supabase security-advisor findings remain open; no privileged RPC permissions were changed.

## Activation still required
1. Create/enable Google Cloud Translation Basic and configure a budget/quota in Google Cloud.
2. Add `GOOGLE_TRANSLATE_API_KEY` as a **Supabase Edge Function secret**. Never commit or paste the key into the frontend, GitHub, or a chat.
3. Verify the function reports available to a signed-in test member; perform an authorized Punjabi→English request.
4. Validate original/translated toggle, target-language switch, fallback, mobile display, and empty provider response.
5. Conduct **two real-account** send/receive, unauthorized message-ID attempts, signed-out calls, rate limit, and billing/quota tests; review privacy notice.
6. After gates pass, merge this draft PR to deploy the UI, inspect GitHub Pages build, then verify live behavior. Do not describe the feature or the pre-existing inbox as production-ready earlier.

## Rollback
- Frontend: do not merge PR, or revert the PR commit.
- Edge: remove/disable provider secret, leaving function configured but incapable of paid translation requests. Function does not mutate messages.
- Quota metadata table is additive. Preserve audit records until a retention policy is approved. No existing messaging policy or profile table was changed.

T-001 follows the existing messaging function lock M-001 and the four-site network checkpoint: one function at a time, no untested availability claims.
