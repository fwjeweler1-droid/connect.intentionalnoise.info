# Intentional Noise Network — synchronized-site checkpoint

**Checkpoint ID:** `IN-NET-2026-11-08-SYNC-01`  
**Date:** November 8, 2026 (America/Indiana/Indianapolis)  
**Status:** **SOURCE-CONNECTED / GITHUB PAGES DEPLOYED; LIVE END-TO-END ACCEPTANCE PENDING**  
**Purpose:** Stable placement marker for all connected website work. This document supersedes stale *current-status* claims in earlier handoffs; it does **not** rewrite prior approvals or original landmark evidence.

## What "synchronized" means here

One Connect Supabase backend is the source of truth. The websites are **separate GitHub repositories and separate deployments**, but their public artist-profile views read the **same** `artist_pages` record. This is data-source synchronization, not code mirroring, not four separate accounts, and not cross-domain single-sign-on.

A new musician or band registers through Connect, verifies their email, and receives a **private** `musician_profiles` record on first authenticated return. Existing database triggers create the corresponding **private** `artist_pages` draft and synchronize artist details on profile updates. The user must choose member-list visibility separately (`musician_profiles.is_public`) and explicitly publish their artist page; public pages require `artist_pages.published=true` and non-null `approved_at`. A venue account does not have to create a musician profile.

**Never describe account registration as automatically making a public profile.** One account powers four *eligible profile destinations*, but publication is an explicit action. `intentionalnoise.com` is a separately governed music/storefront site, not a fifth public copy of member profiles.

## Domain / repository / owner responsibility

| Website | Repository | Role and live route |
| --- | --- | --- |
| IntentionalNoise.info | `fwjeweler1-droid/intentionalnoise.info` | Organization/community, link to `https://intentionalnoise.info/artists.html` |
| Connect | `fwjeweler1-droid/connect.intentionalnoise.info` | Single sign-up, identity, private profile, publication control, booking tables and private correspondence; `https://connect.intentionalnoise.info/auth.html`, `/artists.html` |
| IntentionalNoise.band | `fwjeweler1-droid/intentionalnoise.band` | Musician/artist public showcases; `https://intentionalnoise.band/artists.html`, published page at `https://intentionalnoise.band/<slug>` |
| IneedaGig.net | `fwjeweler1-droid/ineedagig` | Canonical public booking and gig-request entry point; `https://ineedagig.net/`, `/artists.html` |
| IntentionalNoise.com | `fwjeweler1-droid/intentionalnoise.com` | **Adjacent artist music/release storefront only**; release sources of truth remain MPCC/Library, not the website profile record |

## Routes that must agree (four-site profile synchronization)

- Musician registration: `https://connect.intentionalnoise.info/auth.html?role=musician`
- Band registration: `https://connect.intentionalnoise.info/auth.html?role=band`
- Venue registration: `https://connect.intentionalnoise.info/auth.html?role=venue`
- Complete/maintain musician profile: `https://connect.intentionalnoise.info/auth.html#profile`
- Explicit artist-page publication: `https://connect.intentionalnoise.info/band-page.html`
- Public artist profile on info: `https://intentionalnoise.info/artists.html?slug=<slug>`
- Public artist profile on Connect: `https://connect.intentionalnoise.info/artists.html?slug=<slug>`
- Public artist showcase: `https://intentionalnoise.band/<slug>`
- Public artist profile on IneedaGig: `https://ineedagig.net/artists.html?slug=<slug>`
- Canonical booking hub: `https://ineedagig.net/` (`#book`, `#opportunities`, `#member-requests`)
- Actual signed-in venue booking form (until secure migration): `https://connect.intentionalnoise.info/fill-my-stage.html`
- Actual signed-in member requests form (until secure migration): `https://connect.intentionalnoise.info/gig-requests.html`
- Public, open, date-valid booking link: `https://ineedagig.net/?booking=<UUID>#opportunities`

There remain **two separate Connect request tables**: public future `venue_booking_requests` and authenticated-only `gig_requests`. Their records must **not** be merged or disclosed to anonymous visitors. The venue workflow also uses `venue_booking_interests` and `venue_booking_thread_messages`; private conversations stay within Connect.

**FROG** remains a separate promotional board for release and gig/tour/presale cards; promotional cards are not dated venue booking records. **Ineeda Gig** is the approved mascot for venue booking. Preserve their original approved images and source lineage.

## Site-by-site technical placement

- All four sites use the same approved-public-artist data from `artist_pages`; `.band` had an existing directory, the other three gained `artists.html`.
- Public artist records appear only after user-approved publication and existing approval controls; private drafts and account emails remain inaccessible in public directories.
- `auth.html` has musician, band and venue signup kinds; musician/band profile initialization is idempotent on authenticated return.
- Profile updates use the existing `musician_profiles -> artist_pages` triggers; they are **not separate manual copies** of profile details.
- .info, .band and Connect public booking navigation points to IneedaGig; operational submission/reply flows remain on Connect to preserve the existing authorization model.
- Booking publication generates a public URL and composer links for Facebook, X, Threads and LinkedIn. **Direct unattended account posting is NOT connected or authorized.**
- MFA stays **disabled as explicitly directed**; do not silently enable or merge older staged auth branches.
- Other website source code, branding and artwork do not automatically synchronize merely because these profile records do.

## Evidence and current status

**Source/code checks already completed:** GitHub source readbacks and JavaScript parse checks for new directories, new signup page and IneedaGig; existing Supabase RLS/publishing policies and artist draft triggers inspected. The GitHub Pages build logs reported successful deployments for all four public-facing repositories as of this checkpoint.

**Unverified and not approved as a public launch:** live multi-browser/mobile click-through; first-time confirmation-email signup; test member profile creation and private-to-public transition; four-domain listing updates after editing/unpublishing; real venue-to-musician booking and reply/closure; negative cross-account tests; reporting/moderation/abuse/rate limits; social composer behavior on actual devices; redirect/auth-domain edge cases.

**Security review open:** Supabase Security Advisor reported some `SECURITY DEFINER` RPC exposure findings and leaked-password protection disabled. Do not change privileged RPC grants indiscriminately without impact assessment. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Acceptance gates for advertising

1. Create a brand-new musician account; receive confirmation email; first authenticated sign-in creates one private profile and one unpublished artist draft.
2. Edit the profile and confirm shared source record; publish with consent and verify the **same** profile on all four site destinations.
3. Unpublish and confirm anonymous viewers on all four no longer see it; no stale public cache.
4. Create a separate venue account; post a request, confirm public link, musician response, private thread and venue closure. Verify anonymous/other-account access denials.
5. Complete abuse-reporting, mobile, link, and social-preview checks; secure production registration and billing settings before broad marketing.

**Do not claim these gates have passed until observed and logged.** For early invitations say *founding-member beta/early access*, not production-complete public launch.

## Authority / resumption

- **Current network checkpoint (this document):** `fwjeweler1-droid/connect.intentionalnoise.info/NETWORK_SYNC_CHECKPOINT_2026-11-08.md`
- **Cross-repository machine-readable placement marker:** root `network-sync.json` (same checkpoint ID in the four network repositories and the separate `.com` reference repository)
- **Library checkpoint summary (links to this full record):** `/Projects/DotInfo/Network_Synchronization_Checkpoint_2026-11-08.md`
- Historical approved checkpoints and original media remain unchanged; consult `LANDMARK_DOTINFO_2026-11-08.md`, `CHECKPOINT_INEEDA_GIG_BOOKING_2026-11-08.md` and `CHECKPOINT_FROG_2026-11-08.md` for their original scope.
- Intentional Noise music/releases: **MPCC/Library retains authority**; do not substitute website manifest for `Music_Project_Command_Center.xlsx`.

**Resume marker:** “Sparky, resume four-site sync from IN-NET-2026-11-08-SYNC-01 — start with first-time signup and live booking acceptance.”


---

## November 13, 2026 — Private Studio acceptance landmark

**Landmark ID:** `IN-CONNECT-STUDIO-2026-11-13-01`  
**Status:** **OWNER-REPORTED SAVE PASS; TOM-REPORTED PCLOUD CONNECTION + STUDIO ACCESS PASS; REMAINING FUNCTIONAL GATES PENDING**  
**Scope:** The existing `https://connect.intentionalnoise.info/studio.html` private Studio only. This is an addendum to the existing network checkpoint, not a replacement checkpoint, MPCC, or parallel app.

### Observed and owner-reported facts

| Item | Outcome | Evidence and limitation |
| --- | --- | --- |
| Studio inline track editor and save feedback | Source fix committed and read back | `studio.html` now uses inline Edit song / Change status Save/Cancel; checks the returned saved row; displays errors beside the track. GitHub commit `5c99edc04a01f37a8912fbf0c606e94db18c6036`. |
| Master choice for private recordings | Source fix committed and read back | Studio owner may select a private uploaded take or an external version link. Changes only the working Studio record; MPCC/public releases unaffected. GitHub commit `d47722ce210a75c80011ffb892839208893ce85c`. |
| Nerdly Studio file save | **PASS — reported by project owner November 13** | Owner stated, “file save is working.” This confirms the tested save path; it is not a claim that every edit, upload or approval button has been tested. |
| Tom pCloud connection | **PASS — reported by Tom through owner November 13** | Owner said Tom established a connection through pCloud. The precise provider operation was not independently observed; do not infer that all playback, transfers or providers pass. |
| Tom Private Studio access | **PASS — reported by Tom through owner November 13** | Tom reached Studio. This is an access/connectivity test, not proof of his upload, edit, playback or permission boundaries. |
| GitHub source readback and JavaScript syntax | **PASS for source checks** | Final `studio.html` read back after both commits; syntax parsing and expected-code checks passed. |
| GitHub Pages deployment and live editor cross-account acceptance | **NOT independently established by these checks** | Owner-reported successful save is evidence the used Studio path worked, but build status, full public deployment coverage and two-role security tests were not independently confirmed. |

### Open gates — preserve, do not overstate

- Tom's private audio playback, upload, and any edit/submit permitted to his role, plus owner-only denial checks for other accounts.
- End-to-end Studio master selection, track status/running order changes, and screen-level error handling on actual phone/desktop.
- Signed-out and cross-account privacy checks; actual confirmation of published-page changes across the network remains governed by the earlier network gate.
- Existing separate public Nerdly showcase media and the canonical music MPCC are untouched; private Studio tracks remain non-authoritative working records.
- No external account credentials, private pCloud links, tokens or member media content were copied into GitHub notes.

**HOLD / HANDOFF:** By direct owner instruction, **pause further Studio work and testing**; the owner has one recruit and is moving to another project. Do not restart Studio checks, invitations, marketing or extra changes merely because pending gates remain. Resume only when asked.

**Resume phrase:** “Sparky, resume Studio from `IN-CONNECT-STUDIO-2026-11-13-01`.”

---

## November 13, 2026 — Studio album reconciliation and resumption

**Latest landmark:** IN-CONNECT-STUDIO-2026-11-13-02
**Status:** MPCC AND PRIVATE STUDIO SOURCE RECONCILED; LIVE NEW-CONTROL ACCEPTANCE PENDING.
**Supersedes:** Earlier Nov. 13 Studio HOLD for work state only, by subsequent owner instruction to reconcile tracks, amend Studio and resume. Earlier observations remain valid.

### Authoritative records

- The SAME authoritative Music_Project_Command_Center.xlsx, Library ID libfile_c2221b6092bc8191922be8f3a37ff555, was overwritten in place and read back as version 146. New sheet Studio Album Links (27 album memberships), existing Reconciliation Log row 92.
- MPCC album rosters: TGIK 18 candidate songs (sequence not locked), Tom's four owner-approved masters, Thanksgiving five-track approved CD lineup. Do You Get It Yet? appears intentionally on Tom's and Thanksgiving; never merge or automatically copy the audio, take, or album-specific approval. Words in Red / The Words in RED is a possible title variant, not an automatically validated identical recording.
- Studio backend has TWO projects, TGIK and Thankful Thanksgiving Thank You, owned by different accounts. Tom's private Studio project has NOT been verified or invented. Existing working track records and private files were preserved without deletion or fabricated uploads.

### Backend and UI amendments

- Added private public.studio_album_roster in the existing Supabase project; 18 TGIK reference rows and five Thanksgiving reference rows. These are distinct from uploaded/studio_tracks rows. RLS: only project members can read their own roster; anon cannot read. Readback confirmed TGIK 18, Thanksgiving five, with one existing TGIK working track match and zero Thanksgiving lineup matches. The three pre-existing Thanksgiving test tracks remain intact.
- Added non-null UUID studio_tracks.work_id plus per-project uniqueness. A musical work may be included in multiple albums, with distinct per-album track IDs, track order, notes, statuses, audio files, versions and master approvals.
- The EXISTING Connect studio.html now displays the MPCC roster privately and shows which entries have a matching working Studio record. Only owners can add missing roster working entries under existing caps. Owners may include the same composition in ANOTHER PROJECT THEY OWN, sharing work_id but not copying recordings, approvals, links or private account information; other collaborators continue to use the proposal workflow.
- GitHub commits bc8264214972005b8844f4251c2ff0841a8d04aa and c9842cab134c5e621375298b83dab51d02d359ae. Source and JavaScript parsing checks passed. Database roster RLS tests passed (five visible to owning account, zero to an unrelated account). A transaction-rolled-back shared-song insert passed; zero test projects or tracks remain.
- Live GitHub Pages deployment revision, actual signed-in click-through, mobile UI and same-song owner interactions are STILL UNVERIFIED. Direct fetch of Connect site was DNS-blocked from the test environment; do not mistake that for site outage.

### Resume point and approval boundaries

Studio work RESUMES by direct owner instruction. Keep the earlier Nerdly file-save PASS and Tom-reported pCloud connection and Studio access PASS. Pending: actual live owner-edited track/roster actions, Tom's album ownership, cross-account negative checks and media playback; do not claim these tests passed.
Do not automatically create all 18 TGIK working tracks (current account has a five-track free pilot cap) or fabricate missing audio. Do not create a Tom Studio project without verifying its owner. The existing MPCC is the only authoritative source for songs and release masters. No outreach, public publication, or automatic media upload was authorized.

**Return phrase:** Sparky, resume from IN-CONNECT-STUDIO-2026-11-13-02.
