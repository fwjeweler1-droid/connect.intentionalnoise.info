# DOTINFO LANDMARK — 2026-11-08

**State:** IMPLEMENTATION CHECKPOINT / HOLD POINT — NOT AN END-TO-END LIVE ACCEPTANCE
**Owner project:** Intentional Noise Connect (.info / connect. / .band continuity)
**Authoritative source:** `fwjeweler1-droid/connect.intentionalnoise.info`, `main`

## Locked functions and current source

1. **Messaging v1 — implementation locked.** Prior lock: `CHECKPOINT_MESSAGING_V1_LOCKED_2026-11-08.md` (commit `bf8191a75c6573cc41844aee9614f135f9580555`). Two real signed-in accounts have NOT completed a send/receive test.
2. **My Media & Storage — implemented.** Free provider choices, first-visit instructions, private provider choice + HTTPS shortcut, owner-only database RLS, link to existing editor. No authorization to connect to external storage on the artist's behalf, scrape files, or store provider credentials. No confirmed live signed-in browser test.
3. **Artist self-publication — implemented.** Approved-by-owner media can be presented on an artist-published .band page. No requirement for manual prereview. Existing rules and takedown capability remain in force, but formal block/report support for all artist media needs further review.
4. **Duplicate-posting flag — implemented.** Both artist-page media submission and five-clip preview submission check title matches against existing entries; artist-page submissions also check identical external URLs. When a match appears, the owner must explicitly confirm intention to duplicate, stored in `intentional_duplicate` on the new record. Owner editors display existing same-title cross-section overlaps. This is NOT binary/content-hash matching; different titles for identical files can pass.
5. **Edit / replace / remove — implemented.** Artists can change a posted title and external HTTPS link; they can convert a hosted artist-page upload to an external link and remove the hosted file after a successful database update and explicit on-screen confirmation. The five-preview area supports owner title edits and removal with confirmation. The flows are code-complete but NOT proved through two-device, authenticated live browser tests.

**Current source commit references at this landmark (before landmark commit):**
- Connect `main`: `f3c4e2528cd4237be6dda9b1bd45e77713ff41bc`
- Public .band `main`: `9ff5814aef2537a2ca85b1ca9e5a492e9b5577a9`
- .info `main`: `5b71f4294b1c021ab8e6eb91a686490035baeba0`

**Connected backend:** Existing Supabase project, with migrations for member messages, private media-storage preferences, artist self-publishing, and the 2026-11-08 edit/duplicate flags. Never include customer provider account secrets, confidential links, or auth tokens in this public repository.

## Nerdly public test profile — observational state

- Public profile slug: `nerdly`, published.
- Current artist-page media: `KING` (Supabase-hosted) and `Sample Test` (external pCloud share link).
- One 60-second public work preview: `KING` (Supabase-hosted). This is distinct from artist-page `KING`.
- The owner removed the older pending test file, which no longer appears in the database or hosted object count. Current owner-linked Supabase files: **2** (one in `artist-review`, one in `connect-clips`).
- Do not delete, rename, replace, unpublish, or move the remaining files or links without the owner's specific decision. Their pCloud provider shortcut is private and must not be reproduced in source code or handoff notes.

## Verification evidence on November 8

- Read-back of GitHub and database metadata; newly modified JavaScript module syntax validated.
- Database RLS read-only transaction using `anon` saw exactly the published Nerdly profile, **two** public artist-media records and **one** public preview.
- Simulated Nerdly authenticated read could access **one** private storage preference.
- Simulated a different member's authenticated read: **zero** Nerdly private storage preferences visible.
- Verified no pending Nerdly artist-media records. No extra media mutations were made during this checkpoint.
- Source and database validations are NOT substitutes for actual live browser, playback, save, deletion, external link or mobile tests. Web-fetch of deployed Connect and .band domains was unavailable from this environment. Do not mark browser operations PASS.

## Unfinished / risk register (not locked as complete)

- **Live signed-in functional testing:** first-visit account → media storage → editor → duplicate warning (Cancel/Confirm) → title edit → link replacement → publish/hide → public playback and deletion; verify on phone and desktop. DO NOT conduct a destructive test on actual client media without explicit approval.
- **Cross-account writes:** non-owner update/delete attempts and storage signed-URL boundaries still require active authentication-context tests. Read-only RLS simulations passed their stated scope.
- **Messaging:** two actual members must exchange messages; test privacy and sign-out.
- **Nerdly account:** no verified MFA; three session records, three non-revoked refresh token records observed in earlier audit. User should verify devices; do not unilaterally revoke sessions.
- **Project-wide Supabase advisor findings:** leaked-password protection disabled, several publicly executable SECURITY DEFINER functions flagged, and `studio_invites` has RLS without policies. These are not confirmed exploits. Preserve and resolve with targeted review, do not blanket-disable functions that other features may use.
- **Product roadmap:** FROG release/promo cards still incomplete; moderation/report/block for member interactions incomplete; final three-site UX continuity unverified.
- **Architecture:** external pCloud links work as pointers; hosted MP4 copies remain under Supabase until artist explicitly replaces/removes them. DO NOT state the third-party-storage architecture is fully migrated or virtually trustless.
- No paid tier or payment collection authorized.

## Exact handoff / next one-by-each

1. Start with a logged-in Nerdly browser session at `https://connect.intentionalnoise.info/band-page.html#myMediaPanel`. Confirm the duplicate indicator and existing media items.
2. Let the artist choose which `KING` to keep, which to replace with pCloud, and which to delete. The user explicitly owns that choice. Use the new **Edit title or source** control for a Supabase→pCloud link replacement; the separate 60-second preview is not affected by the artist-page edit.
3. Confirm a public visitor can play/view the retained content at `https://intentionalnoise.band/nerdly/`; check that the private provider shortcut is not displayed.
4. Then complete one two-member messaging functional test before locking that feature as user-accepted; next implementation topic is FROG promo cards.
5. Continue using *inspect → change one function → test → show → approve → lock*. Avoid broad redesign, duplicate outbound email, changes to music MPCC or other project records.

**Return phrase:** “Sparky, resume DotInfo from `LANDMARK_DOTINFO_2026-11-08.md`.”


## Addendum — MFA prepared, RELEASE DISABLED (November 8, 2026)

User requested: **build Connect authenticator-app MFA, but do not enable until everything else works**.

- Source prepared exclusively in GitHub branch `staging/mfa-totp-disabled`; production `main` login code and Supabase MFA configuration were not changed.
- Staging artifacts: `mfa.html`, `mfa-controller.js`, `mfa-feature-flag.js` with `MFA_RELEASE_ENABLED=false`, staging-branch `auth.html` MFA challenge hook, and `MFA_RELEASE_GATE.md`.
- Scope: TOTP enrollment, QR/secret display, six-digit verification, MFA login challenge, factor listing and removal. No active member factor was enrolled; Nerdly still has zero verified MFA factors at read-back.
- Implementation verified only by repository read-back and JavaScript syntax checks; no MFA authenticated browser tests have been performed.
- Release blockers: test all Connect workflows, 2-member messaging and artist media, device-loss recovery, test-account enrollment/login/unlock, and server-side AAL2 enforcement on protected operations. No merge, no enable, no automatic activation; explicit user approval required.
- Source: https://github.com/fwjeweler1-droid/connect.intentionalnoise.info/tree/staging/mfa-totp-disabled

## Acceptance update — User-reported PASS (2026-11-08)

The project owner explicitly reported having **tested and passed** all of the following on the current Connect workflow:

| Area | Recorded outcome | Basis |
| --- | --- | --- |
| UI behavior | PASS | User-tested; not witnessed by assistant |
| Actual public media playback | PASS | User-tested; not witnessed by assistant |
| Account login | PASS | User-tested; not witnessed by assistant |
| Mobile experience | PASS | User-tested; not witnessed by assistant |
| Save and replace flows | PASS | User-tested; not witnessed by assistant |
| Deletion flows | PASS | User-tested; not witnessed by assistant |

This report **supersedes the earlier "no live testing evidence" notes for these exact six areas**. It does not imply that the assistant personally reproduced the tests. It does not establish two-member messaging, all duplicate-warning edge cases, cross-account attack tests, FROG cards, all three-site continuity, or MFA functionality.

**MFA remains STAGED/OFF**, with server-side AAL2 enforcement, test-account TOTP enrollment/challenge/recovery and final explicit release approval still required. Do not merge the staging branch, enable Supabase MFA settings, or require existing members to enroll based on this report.

## FROG implementation checkpoint — November 8, 2026

FROG releases-and-gigs placeholder replaced with live-table source, public feeds and owner edit/publish controls. Added up to five release cards (database-enforced), one gig/presale promo card, artwork reuse/direct external HTTPS image links, and restored the missing `gig_requests` backend. Account navigation updated across `.info`, Connect and `.band`. Read-only RLS and transaction-rollback write tests passed; no test rows remain. **FROG real-browser acceptance and moderation/report controls remain pending.** Details: `CHECKPOINT_FROG_2026-11-08.md`.

**Important branch hygiene:** MFA remains staged and switched OFF. The staged `auth.html` fork precedes the new FROG account-navigation link. Reconcile MFA staging with current `main` before any eventual approved MFA merge; never replace newer FROG navigation by taking an older staging copy wholesale.
