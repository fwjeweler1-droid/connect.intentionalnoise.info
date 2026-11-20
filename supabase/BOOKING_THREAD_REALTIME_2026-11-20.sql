-- Booking thread Realtime for authenticated participants only.
-- Existing SELECT RLS limits published rows to the venue owner and responding musician.
-- This does not change permissions, stored messages, or account settings.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime'
      AND schemaname='public'
      AND tablename='venue_booking_thread_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_booking_thread_messages;
  END IF;
END $$;
