# Intentional Noise Connect — shared application backend and account portal

**Current network checkpoint:** [IN-NET-2026-11-08-SYNC-01](NETWORK_SYNC_CHECKPOINT_2026-11-08.md)  
**Machine-readable placement marker:** [network-sync.json](network-sync.json)

Connect is the single source for member registration, artist/profile editing and publication, privacy controls, and existing booking records. The other public domains read or route to these workflows; they do **not** have separate account databases.

- [Create musician/band/venue account](https://connect.intentionalnoise.info/auth.html)
- [Edit Connect musician profile](https://connect.intentionalnoise.info/auth.html#profile)
- [Approve/publicly publish artist showcase](https://connect.intentionalnoise.info/band-page.html)
- [Public directory here](https://connect.intentionalnoise.info/artists.html)
- [IneedaGig booking hub](https://ineedagig.net/)
- [Venue operational form](https://connect.intentionalnoise.info/fill-my-stage.html)
- [Member gig-request form](https://connect.intentionalnoise.info/gig-requests.html)

**Privacy invariant:** New musician/band account gets a private profile and artist draft after verified sign-in. The public directory requires `artist_pages.published=true` plus `approved_at`; member profile listing is separate. Venue accounts need no musician profile. Account/email/session data is not duplicated across sites. MFA remains disabled by express direction.

**Status:** Code committed and GitHub Pages deployed; real first-user signup, four-domain updates, venue/musician flow and security/abuse gates remain open. The older `LANDMARK_DOTINFO_2026-11-08.md` and function-level checkpoints preserve historical evidence; consult the newest network checkpoint for present cross-site context. Music authority stays with MPCC/Library.

## Artist booking intake — five venue questions (November 11, 2026)

The private Connect artist profile editor (`auth.html#artistBookingIntake`) includes five optional, editable booking questions: performance identity + optional recent live sample URL; booking area/availability; show length/set format; fee/inclusions; and technical equipment/venue requirements. The band-page editor links to the form. This data is saved independently from the existing `musician_profiles` identity and shared `artist_pages` showcase via `public.artist_booking_intake`, so it cannot accidentally publish with biography changes. The new table has owner-only row-level security and no anonymous SELECT; its Supabase migration was applied on November 11 and verified (four owner policies; zero existing rows). Nothing is sent to venues automatically. **The answers are private**, not yet part of venue search results or public artist pages. Preserve existing user-controlled publication and avoid adding a public reader without separate explicit approval and security review.

Pending release verification: actual signed-in artist roundtrip, cross-account denial, logged-out denial, live phone/desktop viewing, and GitHub Pages deploy acceptance. No existing member records were altered.


## Five-question venue / organizer booking intake (November 11, 2026)

Signed-in **venue** accounts can complete an optional, editable five-question intake at `auth.html?role=venue#venueIntake`. Questions cover: event/audience, performance schedule/load-in, pay/settlement/cancellation, equipment and technical facilities, and practical logistics/contact responsibilities. A link from the existing `fill-my-stage.html` form makes this discoverable.

Answers are stored in independent `public.venue_booking_intake` (installed November 11, 2026) with owner-only RLS and **no anonymous read or insert privileges**. This table does not alter `venue_booking_requests`, `gig_requests`, bookings, private messages, artist profiles or the four-site public showcase synchronization. Answers are **never automatically attached to public venue offers** and are not a contract. The venue still chooses the specifics of each individual public/private booking request.

Verified at source/database level: five input fields, form wiring, signout reset, syntax parse, owner-only RLS (four policies), anonymous rights revoked, zero pre-existing answers. Pending live acceptance: authentic venue save/reload, phone/desktop visual inspection, cross-account denial, and no public exposure after posting a venue offer. No other operational permissions were changed.
