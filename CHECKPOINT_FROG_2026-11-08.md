# FROG Functionality Checkpoint — 2026-11-08

Status: **IMPLEMENTED IN PRODUCTION SOURCE / DATABASE; LIVE BROWSER ACCEPTANCE PENDING**.

FROG = **Free Releases Or Gigs**. The official, locked mascot remains `FROG_Official_IntentionalNoise_Info_Mascot_LOCKED.png`. No new paid tier, member signup, or forced third-party hosting was added.

## Features implemented

1. `releases-and-gigs.html` is no longer a static placeholder. It now renders published release and gig/presale cards and, for signed-in members, a form for managing their own listings.
2. New `frog-board.js` fetches public cards, displays published artist identity and an optional image, and permits a member to create/edit/hide/publish/remove up to **five** release cards. PostgreSQL trigger enforces the cap.
3. Each member may keep **one** gig or presale promotional card (owner_id primary key). Edits replace the existing record, avoiding accidental extra cards. Cards have title, description, destination HTTPS link and optional artwork.
4. Published cards require the artist's own `.band` page to be public. Drafts stay private; publishing is an explicit member action.
5. Images reuse **previously shared** artist-page artwork (including uploaded images), or a direct externally hosted HTTPS image link. No bulk files or redundant media are created. To upload new artwork, use the existing `band-page.html#mediaForm` uploader and then choose that artwork in FROG. Direct new uploads *inside the FROG form* are not implemented.
6. The find-talent cluster of frog gigs and the empty-barrel looking-for-gigs illustration are inline SVG, with the official mascot retained. Labels: "Here's what's croakin'", "Show me your Ribbits!", "Grab your gig!".
7. Existing `gig-requests.html` had referenced a missing `public.gig_requests` table. Its supporting table and authenticated RLS now exist. No old gig request records were migrated or fabricated.
8. Login return allow-list includes `/releases-and-gigs.html`. Added FROG navigation to Connect member access, artist editor, `.info` and `.band`; existing other pages preserved.

## Supabase objects
- `public.frog_releases` (max five owner listings; public SELECT only if card published and artist page public; owner controls drafts and updates)
- `public.frog_promos` (one per owner; same publication protection)
- `public.gig_requests` (authenticated only; owner may post and mark filled)
- `public.frog_validate_artwork_owner()` trigger checks shared artwork belongs to same user; no cross-account artist-media references
- `public.frog_limit_five_releases()` trigger uses an owner-scoped transaction advisory lock for atomic five-card limit

## Verified in database and source
- Successful staged insert and owner read for draft release, draft promo and gig requests, with transaction rollback.
- Under an anonymous or other-member identity, private release cards were not readable.
- Published release and promo cards were visible to an anonymous role when linked to a public artist page, in rollback-only test transactions.
- Five simultaneous release inserts succeeded, sixth blocked by server guard. Test rows rolled back.
- Updating the one-owner promo and marking a gig request filled succeeded; test rows rolled back.
- `frog-board.js` JavaScript syntax and all referenced DOM field IDs passed source checks.
- `safeSearchReturn` accepts the FROG return path.
- At test completion, **zero** real FROG release rows, promo rows, and gig-request rows remained. No fake records were published.

## Acceptance gates NOT yet cleared
- The deployed domain could not be fetched via the available web tool; do not assert live FROG browser rendering or user-tested form completion.
- Test signed-in real-user FROG create/edit/hide/publish/delete, choosing reused artwork, external image fallbacks, mobile layout and live promo link navigation.
- Test the gig-request form and owner mark-filled workflow in an actual browser.
- FROG-specific reporting / blocking / moderation halt controls are not delivered here; the project-wide moderation roadmap remains open. Review before opening public posting broadly.
- Newly published card content is public and owner-controlled; public artist-page terms rules still apply.
- External image URLs must point to actual images, not a pCloud dashboard or a sharing page. Use the existing external storage path.
- No automated posting or release seeding from the music MPCC; artists choose explicitly.

## Launch status & safeguards
- This checkpoint is a functional code/data milestone, not an acceptance lock. Request the artist's visual approval and completed live form test before closing FROG.
- MFA continues **STAGED/OFF** in `staging/mfa-totp-disabled`. No production login MFA change was made by this work.
- Preserve the member's five work previews separately from five FROG release listings.
- Do not alter Nerdly's existing media, private pCloud shortcut, or prior confirmed test outcomes.

## Next one-by-each
1. Open https://connect.intentionalnoise.info/releases-and-gigs.html .
2. Sign in using the existing Connect account; under "My FROG cards" save a release as a **private draft** and verify it is not visible from a logged-out window.
3. Publish the artist's `.band` page if not already public; explicitly publish the release and confirm its cover and link on FROG as a visitor.
4. Test one gig/presale promo card and the separate dated gig-request form; hide/remove the test listings when finished.
5. Complete the moderation/report decision and user approval, then lock the function.
