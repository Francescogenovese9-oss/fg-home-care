-- Enable INSERT notifications under the existing participant-only SELECT policy.
-- No grants, policies, document contents or storage visibility are changed.
-- Rollback: ALTER PUBLICATION supabase_realtime DROP TABLE public.video_consultation_documents;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public' AND tablename = 'video_consultation_documents') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.video_consultation_documents;
  END IF;
END $$;
