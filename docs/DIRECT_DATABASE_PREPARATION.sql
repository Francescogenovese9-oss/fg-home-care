-- PREPARAZIONE, NON ESEGUIRE IN PRODUZIONE PRIMA DEL RILASCIO COORDINATO.
-- Il vincolo esistente e' stato verificato sul progetto Supabase.
-- La migrazione va generata tramite Supabase CLI e testata su ambiente di staging.
BEGIN;
ALTER TABLE public.professional_profiles
  DROP CONSTRAINT professional_profiles_subscription_plan_check;
ALTER TABLE public.professional_profiles
  ADD CONSTRAINT professional_profiles_subscription_plan_check
  CHECK (subscription_plan = ANY (ARRAY['BASIC'::text, 'PREMIUM'::text, 'DIRECT'::text]));
COMMIT;
-- Verifica post-migrazione:
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid='public.professional_profiles'::regclass
-- AND conname='professional_profiles_subscription_plan_check';
