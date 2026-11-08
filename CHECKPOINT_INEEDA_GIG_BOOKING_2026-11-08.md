# DotInfo Function Checkpoint: Ineeda Gig / Fill My Stage
**Date:** November 8, 2026  
**Status:** SOURCE & DATABASE IMPLEMENTED; LIVE VENUE/MUSICIAN BROWSER ACCEPTANCE PENDING  
**No change to the staged/OFF MFA gate.**

## Approved mascot — exact asset deployed

- Official mascot **Ineeda Gig** is FROG's girlfriend and serves **bars, venues, clubs, festivals and event organizers looking to hire musicians or bands**, not the general FROG releases area.
- Approved asset: `Ineeda_Gig_Mascot_APPROVED_2026-11-08.png`, 3,126,500 bytes, SHA-256 `a1e547392dc11e50643df088275bacff114f7a3abaa7a9a826e347a4591f6f35`.
- GitHub blob SHA `29c1651f9e33e0b4d45edcf20af2819255a0c856` **matches the exact original PNG bytes**. No image edits, resize, crop, new generation or quality conversion.
- Main page `fill-my-stage.html` references the approved asset at the repository root with `object-fit:contain` to prevent cropping.
- Authoritative backup: user's Library `/Projects/DotInfo/Mascots/Ineeda_Gig_Mascot_APPROVED_2026-11-08.png`, ID `libfile_a5e7df52eca08191a94801b0afe658c6`.
- Temporary Google Drive transport artifact used for GitHub binary upload was deleted after successful commit. No public Drive copy remains.

## Functional booking flow

1. `fill-my-stage.html` — Three-step **Fill My Stage!** wizard: what act, where/when/offer, details/review/publish. Approved Ineeda Gig mascot in hero.
2. `fill-my-stage.js` — Guided data validation and free sign-in; venue can register/log in without creating a musician profile; form data is temporarily retained in same-tab sessionStorage to smooth sign-in.
3. New `venue_booking_requests` stores public offers and private drafts; owner can edit, hide, reopen, mark filled, cancel and remove. Max 10 upcoming open offers per account.
4. `venue_booking_interests` stores private musician introductions/interest. Only listed member profiles may respond to currently open gigs. One response per artist per gig; requester can shortlist or decline.
5. `venue_booking_thread_messages` stores private conversations between venue owner and individual responding musician. No participant email, phone or account password published. **Not E2EE**; messages live in Supabase.
6. Filled offers disappear from anonymous public search but private conversations remain visible to the participants.
7. Navigation: FROG releases/gigs, current gig requests, .info homepage and .band homepage point to the venue booking page. Login safe-return list includes `/fill-my-stage.html`.
8. No fees, subscriptions, booking guarantees, commissions, direct payments or automated matching have been introduced.

## Verification conducted

- JavaScript syntax verification of `fill-my-stage.js` passed; all referenced HTML element IDs present.
- Approved PNG Git blob checksum compared to source; exact match.
- DB RLS enabled on all three venue-booking tables, with ownership/participant-specific permissions.
- Transaction-only booking flow exercised: venue create/open, listed artist interest, private reply from both parties, venue mark filled, artist still reads two private messages.
- Third authenticated account saw **zero** other people's private interests and **zero** private conversation messages.
- Anonymous account saw **zero** venue private drafts.
- All test writes were rolled back; production DB had zero venue booking, interest, and message rows after tests.
- Public Connect website could not be independently opened with the available browser search environment. **Do not represent this as a live browser-tested launch.**

## Known limitations / next gate

- Confirm in an actual signed-in browser: venue signup/no musician profile, new request save as private draft, publish, anonymous read, artist response from a listed musician profile, shortlisting, private message send/receive, mark filled, hide/delete, mobile presentation and browser sign-out.
- Requests are self-asserted by the poster: **venue/business identity is not independently verified**. Add reporting/blocking, moderation halt, rate limits/abuse detection before broad public launch.
- External offers are not contracts and no financial transactions are processed by Connect.
- Photo is 3.13 MB original approved PNG. Monitor mobile performance; do not optimize/crop/replace it without the user's express approval.
- Avoid email blasts or introducing payment gateways. No automatic follow-up or background monitoring.

## Return link

Page: https://connect.intentionalnoise.info/fill-my-stage.html  
Source: https://github.com/fwjeweler1-droid/connect.intentionalnoise.info/blob/main/fill-my-stage.html  
Approved mascot: https://github.com/fwjeweler1-droid/connect.intentionalnoise.info/blob/main/Ineeda_Gig_Mascot_APPROVED_2026-11-08.png

Next: user visually inspects and performs one venue + one musician test; adjust only a specific observed defect, then approve and lock.
