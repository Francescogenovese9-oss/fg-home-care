-- PREPARAZIONE, NON ESEGUIRE IN PRODUZIONE PRIMA DEL RILASCIO COORDINATO.
-- Il vincolo esistente e' stato verificato sul progetto Supabase.
-- La migrazione va generata tramite Supabase CLI e testata su ambiente di staging.
BEGIN;
ALTER TABLE public.professional_profiles
  DROP CONSTRAINT IF EXISTS professional_profiles_subscription_plan_check;
ALTER TABLE public.professional_profiles
  ADD CONSTRAINT professional_profiles_subscription_plan_check
  CHECK (subscription_plan = ANY (ARRAY['BASIC'::text, 'PREMIUM'::text, 'DIRECT'::text]));
-- Immutable booking-time payment route. Existing bookings remain NULL and
-- follow legacy processing; DIRECT bookings always store an explicit route.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS service_payment_route text;

-- Existing appointments may retain NULL. New appointments must specify
-- a route; no hardcoded cutoff date is required.
CREATE OR REPLACE FUNCTION public.require_appointment_payment_route_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $route_required$
BEGIN
  IF NEW.service_payment_route IS NULL THEN
    RAISE EXCEPTION 'Payment route is required for new appointments';
  END IF;
  RETURN NEW;
END;
$route_required$;

DROP TRIGGER IF EXISTS appointments_payment_route_required ON public.appointments;
CREATE TRIGGER appointments_payment_route_required
BEFORE INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.require_appointment_payment_route_on_insert();

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_service_payment_route_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_service_payment_route_check
  CHECK (
    service_payment_route IS NULL OR
    service_payment_route IN ('STRIPE_PLATFORM', 'PAY_PROFESSIONAL_DIRECTLY')
  );

-- DIRECT bookings must not be assigned a platform-payment status.
-- NOT VALID avoids scanning legacy rows at deploy time; new INSERT/UPDATE
-- rows are checked immediately. Validate after inspecting existing data.
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_direct_payment_status_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_direct_payment_status_check
  CHECK (
    service_payment_route IS DISTINCT FROM 'PAY_PROFESSIONAL_DIRECTLY'
    OR payment_status = 'NOT_REQUIRED'
  ) NOT VALID;

-- Prevent changes after booking, including privileged accidental updates.
-- A trusted migration can deliberately bypass this only by dropping the trigger.
CREATE OR REPLACE FUNCTION public.prevent_appointment_payment_route_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $route_guard$
BEGIN
  IF NEW.service_payment_route IS DISTINCT FROM OLD.service_payment_route THEN
    RAISE EXCEPTION 'Appointment payment route is immutable';
  END IF;
  RETURN NEW;
END;
$route_guard$;

DROP TRIGGER IF EXISTS appointments_payment_route_immutable ON public.appointments;
CREATE TRIGGER appointments_payment_route_immutable
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.prevent_appointment_payment_route_change();

COMMIT;
-- Verifica post-migrazione:
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid='public.professional_profiles'::regclass
-- AND conname='professional_profiles_subscription_plan_check';
