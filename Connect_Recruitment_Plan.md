# Intentional Noise Connect — Nationwide Musician Recruitment
Status: PACKAGE DESIGN / NOT DEPLOYED. October 31, 2026.

## Purpose
Find musicians who publicly advertise availability for gigs, session work, touring, band openings and collaboration. Invite them to join Connect voluntarily. Do not create member profiles without consent.

## Discovery workflow
1. Search public, permitted musician and gig listings nationwide, organized by state, city, instrument and role. Prioritize fresh explicit availability notices.
2. Record minimal lead metadata: public listing URL, source name, artist/stage name if public, general city/state, instrument/role, availability claim, date checked and contact method permitted by source. No private contact harvesting or bulk copying of profiles.
3. Deduplicate by source URL and verified artist website; mark stale or ambiguous leads for recheck. Honor site terms, robots rules, platform messaging limits, and opt-outs. Do not bypass logins or anti-bot controls.
4. Send short, individual opt-in invitations only through permitted public/business contact channels. No automated unsolicited bulk messages. Record invitation date and do-not-contact requests.
5. Musicians register themselves, verify email, choose what to publish, and can toggle Available for Work. Connect never represents an unregistered person as a member.
6. Monitor public opportunities on a recurring schedule only after configuring a permitted search process and review results before outreach.

## Member profile additions
- available_for_work: boolean, default OFF
- work_types: paid gigs, studio sessions, touring, fill-ins, permanent band, remote recording, collaborations
- availability_notes: optional public free text (no personal contact details)
- remote_sessions: boolean, default OFF
- existing instrument/genre fields remain in place
- existing profile visibility must remain opt-in (is_public=true)

## Search experience
- Default instrument Guitar; specialty All guitars; distance 50 miles.
- Optional filter Available for Work, only for opted-in published profiles.
- Approximate city-center coordinates support distance search; never collect or publish home addresses.
- Nationwide discovery and recruitment is separate from the member search; unregistered leads never appear as Connect members.

## Deployment sequence
1. Review and execute Connect_Search_Location_Upgrade.sql, then Connect_Available_For_Work_Upgrade.sql in Supabase.
2. Update auth.html profile editor with opt-in work availability checkboxes and save/load logic. This step is NOT completed in this package.
3. Upload updated search.html to the Connect GitHub Pages repository; add navigation link from index.html.
4. Test private/public visibility, available/unavailable filters, location permission denied, and mobile layout with test accounts.
5. Start permitted nationwide lead discovery and invitation review. No scraping or outreach has been performed yet.

## Privacy rule
Supabase stores member data. Connect does not buy, sell, trade, or distribute member information. Only members decide whether their profile is published.
