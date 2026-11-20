-- STAGED ONLY — DO NOT run on production until two-account acceptance and abuse review.
-- Intentional Noise Connect: venue -> listed-member private inquiry access.
-- Existing venue-only accounts have no musician_profiles / instructor_profiles row.
-- This replaces only the permissive INSERT policy. The separate restrictive
-- "Block always prevents sending" policy MUST remain in place unchanged.
-- All messages remain private to sender and recipient (existing SELECT RLS).
--
-- Security behavior:
--   * Authenticated, non-anonymous, non-self sender only.
--   * Recipient must have a currently listed musician/instructor profile,
--     an approved published artist page, or an already-existing DM history.
--   * No permission to discover or contact previously hidden strangers.
--   * No public account email/phone is exposed by this change.
--   * Blocked contacts are denied by the existing restrictive policy.
-- This expands initiation to venue accounts and other authenticated members.
-- Review spam/rate-limit policy and include all negative cases before rollout.
BEGIN;
DROP POLICY IF EXISTS "Registered members contact listed artists or existing peers"
  ON public.connect_direct_messages;
CREATE POLICY "Registered members contact listed artists or existing peers"
  ON public.connect_direct_messages
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())
    AND recipient_id <> (select auth.uid())
    AND NOT coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
    AND (
      private.connect_dm_has_history(sender_id, recipient_id)
      OR EXISTS (
        SELECT 1 FROM public.artist_pages p
        WHERE p.user_id = recipient_id
          AND p.published = true
          AND p.approved_at IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM public.musician_profiles p
        WHERE p.user_id = recipient_id AND p.is_public = true
      )
      OR EXISTS (
        SELECT 1 FROM public.instructor_profiles p
        WHERE p.user_id = recipient_id AND p.is_public = true
      )
    )
  );
COMMIT;

-- MANDATORY staging acceptance (use disposable accounts and roll back all fixtures):
-- 1. Venue WITHOUT musician/instructor profile -> listed musician: INSERT passes.
-- 2. Musician -> venue reply: passes by existing DM history.
-- 3. Venue -> private/unlisted musician with no history: denied.
-- 4. Anon/anonymous-login, forged sender_id, and self-contact: denied.
-- 5. Blocked in either direction: denied (existing restrictive policy).
-- 6. Third user SELECT of venue/artist DM: zero rows.
-- 7. Existing contacts remain usable after recipient hides profile.
-- 8. Spam/abuse thresholds and reporting are reviewed before public rollout.
-- 9. Verify Connect search -> booking inquiry -> inbox reply in actual iPhone
--    and Windows browsers. No email/phone leakage.
