-- Proposed private venue / organizer booking intake.
-- This complements, and does not replace, individual venue booking offers.
CREATE TABLE IF NOT EXISTS public.venue_booking_intake (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  event_audience text NOT NULL DEFAULT '' CHECK (char_length(event_audience) <= 700),
  performance_schedule text NOT NULL DEFAULT '' CHECK (char_length(performance_schedule) <= 700),
  compensation_terms text NOT NULL DEFAULT '' CHECK (char_length(compensation_terms) <= 700),
  technical_provisions text NOT NULL DEFAULT '' CHECK (char_length(technical_provisions) <= 850),
  venue_logistics text NOT NULL DEFAULT '' CHECK (char_length(venue_logistics) <= 850),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.venue_booking_intake ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.venue_booking_intake FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.venue_booking_intake TO authenticated;

CREATE POLICY "Venue booking intake owner select"
  ON public.venue_booking_intake FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Venue booking intake owner insert"
  ON public.venue_booking_intake FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Venue booking intake owner update"
  ON public.venue_booking_intake FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Venue booking intake owner delete"
  ON public.venue_booking_intake FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

COMMENT ON TABLE public.venue_booking_intake IS
  'Private optional five-question venue/organizer booking intake. It is not public, shared with musicians, or linked to individual venue offer publication automatically.';
