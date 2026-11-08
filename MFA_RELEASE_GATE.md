# Intentional Noise Connect — MFA Release Gate (STAGED / OFF)
Date: 2026-11-08
Branch: `staging/mfa-totp-disabled`
Status: **NOT APPROVED FOR RELEASE. DO NOT MERGE OR ENABLE.**

## Purpose and non-negotiable release rule
Provide optional authenticator-app TOTP MFA to ordinary Connect members, with a future stronger policy for authorized moderation/admin accounts. User explicitly requested that MFA be **created now but NOT enabled until everything else works**.

As of this checkpoint:
- Production `main` is unchanged by this staging feature.
- `mfa-feature-flag.js` has `MFA_RELEASE_ENABLED = false`.
- `mfa.html`, `mfa-controller.js`, and the staging-branch `auth.html` were prepared.
- Neither Supabase Auth MFA settings nor authentication/database RLS were changed by this feature.
- There are no new production routes, registration gates, account factors, or user sessions caused by this staging feature.
- The user must expressly approve activation after site-level readiness tests.

## Prepared component behavior (not yet end-to-end tested)
1. Member opens account-security view only after enabling and deployment.
2. Member signs in with existing Connect credentials (same account).
3. Optional TOTP enrollment: create unverified factor, display Supabase QR / secret, verify six-digit code using Supabase `auth.mfa.challengeAndVerify`. Do not store the secret in Connect database or logs.
4. Existing verified factor: login checks `getAuthenticatorAssuranceLevel()`, redirects to `mfa.html` when an AAL2 challenge is required; correct code upgrades current session.
5. Factors are listed from Supabase Auth and can be removed using `unenroll` after AAL2 verification. Unfinished setup can be discarded.
6. Sign-in remains email/password and unchanged in the production build until explicit launch.
7. While `MFA_RELEASE_ENABLED=false`, the page stops before creating a Supabase client or calling any MFA API and shows a disabled/coming-later message. The account navigation link remains hidden.

## Blocking tests before any launch
- [ ] Finish actual two-account member messaging send/receive and privacy tests.
- [ ] Finish storage/provider/link conversion, duplicates, five-preview limits, artist publish/private, file deletion, signed-link security and third-party link tests.
- [ ] Finish FROG promotional cards and reporting/blocking decisions; verify real mobile/desktop three-site navigation.
- [ ] Confirm current Supabase Auth TOTP settings and availability. Do not flip MFA Auth project settings without a separate approval/test.
- [ ] Test TOTP enrollment with a new dedicated test account only; verify QR scan, manual secret, code expiry, bad codes, page reload, unfinished factor cancellation.
- [ ] Verify login on another device and proper AAL1→AAL2 challenge handling, sign-out, session expiry/refresh and redirect. AAL1 must NOT retain protected access after enrollment. Validate PKCE and direct deep-link routes.
- [ ] Test factor removal with AAL2, with invalid code, with only one factor, and with a lost phone/account recovery scenario. Document a verified recovery process FIRST. Supabase currently has no custom recovery UX in this staging feature.
- [ ] Verify Supabase's behavior of ending other sessions when a new TOTP factor is verified; warn members before they enroll.
- [ ] Add and test **server-enforced** authorization for protected actions (AAL rules in RLS/API); a browser toggle/login redirect alone is not a security boundary. Avoid putting global AAL2 restrictions on public media reads; test members with and without factors. Restrict moderator/admin privileges by trusted server-side identity, not client metadata.
- [ ] Cross-account security test: non-owner cannot enroll/unenroll/change other member MFA or alter protected records; neither public nor unauthenticated clients can reach private data.
- [ ] Confirm that Supabase leaked-password protection and privileged SECURITY DEFINER advisor findings are separately reviewed.
- [ ] Test keyboard/mobile accessibility; never reveal QR / secret in logs or rendered after successful enrollment.
- [ ] Final artist/admin acceptance; receive explicit written release instruction.
- [ ] **Only then** enable MFA capability on a tested release branch, merge/test, and deploy. Verify the live domain and keep rollback instructions.

## Sources and technical references
- Supabase Auth MFA overview: https://supabase.com/docs/guides/auth/auth-mfa
- TOTP enrollment: https://supabase.com/docs/reference/javascript/auth-mfa-enroll
- Challenge + verify: https://supabase.com/docs/reference/javascript/auth-mfa-challengeandverify
- Factor removal: https://supabase.com/docs/reference/javascript/auth-mfa-unenroll

## Note on scope
Current implementation is **prepared source, not proven security**. Production stays password-based with email confirmation. Existing members (including Nerdly) have NOT had factors added. Do not silently introduce compulsory MFA or override the account's consent. Keep personal account email, tokens and factor secrets out of all issue logs and checkpoints.

## Acceptance update — User-tested site functions PASS (2026-11-08)

The project owner attested the following have been tested and **PASS**: UI behavior; actual media playback; account login; mobile experience; save/replace flows; deletion flows. This is direct user acceptance evidence, **not assistant-observed browser testing**. Earlier statements describing these precise six areas as untested are superseded. These functional tests are distinct from MFA-specific functionality.

The broader storage/product checklist remains open to the extent it calls for evidence of **additional specific scenarios not explicitly reported** (signed media access, the five-preview cap, duplication cancel/confirm, third-party provider privacy, publishing/unpublishing). Do not silently mark those individually passed.

All TOTP enrollment, device login challenge, factor removal/recovery, AAL2 server enforcement, cross-account security, unfinished messaging/FROG and **explicit activation approval** remain unchecked. The feature flag must stay **false**.
