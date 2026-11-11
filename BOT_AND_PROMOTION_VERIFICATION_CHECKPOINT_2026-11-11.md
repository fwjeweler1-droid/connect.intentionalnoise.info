# Connect / IneedaGig — bot and promotional-abuse checkpoint (2026-11-11)

Status: **required design, NOT enabled**. Do not claim that CAPTCHA, server-verified posting or automated moderation is live.

## Public policy wording
"This network is for musicians, artists, venues, and genuine event opportunities. Unauthorized commercial solicitation, spam, impersonation, misleading listings, counterfeit offers, and infringement of others' intellectual-property rights are prohibited. Members may promote their own creative work only through the designated, owner-controlled profile, release, gig, and showcase features. Abusive listings may be rejected or removed and accounts restricted."

Avoid naming private prototypes or specific internal products. Do not prohibit legitimate artist promotion in appropriate spaces.

## Required registration check
- Preferred low-friction verification: Cloudflare Turnstile.
- Configure Supabase Auth native CAPTCHA protection only after provisioning provider site and secret keys. Site key may appear in client; **never** put the secret in browser code or GitHub.
- Collect Turnstile response and pass to Supabase signUp as options.captchaToken; verify server-side in Supabase Auth, not with a fake client checkbox.
- Keep email confirmation, owner-controlled profile privacy and minimal personal-data collection.

## Required posting checks
- Protect venue booking offers, member gig requests, and artist-media/public promotional submissions using server-verified tokens at sensitive write points, along with authentication, RLS, and per-account submission controls.
- Prefer a Supabase Edge Function to validate challenge tokens for writes where needed. Reject missing, expired, or replayed tokens.
- Protect privacy: only owner-authorized material becomes public; keep member-only requests separate. Do not disable existing registration, publishing or posting before the verification service is configured.
- Add proportional throttling, duplicates/abuse review and removal; avoid paywalls and unnecessary collection of identity documents.

## Verification acceptance
1. Provision Turnstile site and secret keys for actual deployed domains.
2. Integrate Supabase Auth CAPTCHA and server-side posting checks.
3. Test new and existing legitimate accounts, venue submissions, gig requests, private/public transitions, and missing/expired/replayed challenge tokens.
4. Test phone, desktop, keyboard access and failure recovery.
5. Document live results and update the authoritative project record after acceptance, not before.

Official references: https://supabase.com/docs/guides/auth/auth-captcha and https://supabase.com/docs/guides/functions/examples/cloudflare-turnstile
