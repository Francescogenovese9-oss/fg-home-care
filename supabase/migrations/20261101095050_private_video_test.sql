-- Private, expiring video trial. No profile publication or RLS changes.
-- Rollback: restore check_professional_bookable to APPROVED AND published IS TRUE.
CREATE OR REPLACE FUNCTION public.check_professional_bookable()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $function$
DECLARE v_allowed boolean;
BEGIN
  SELECT (
    verification_status = 'APPROVED'
    AND (published IS TRUE OR (
      NEW.patient_id = '98548773-e1f9-4d5a-a963-c1ec8c14084f'::uuid
      AND NEW.professional_id = '4a603f21-7b57-47fb-9d41-69845235cbfa'::uuid
      AND NEW.service_type = 'VIDEO_CONSULTATION'
      AND NEW.service_payment_route = 'PAY_PROFESSIONAL_DIRECTLY'
      AND NEW.payment_status = 'NOT_REQUIRED'
      AND video_consultations IS TRUE
      AND CURRENT_TIMESTAMP < '2026-11-09T00:00:00+01:00'::timestamptz
      AND ((NEW.appointment_date + NEW.appointment_time) AT TIME ZONE 'Europe/Rome')
        + pg_catalog.make_interval(mins => NEW.duration_minutes) < '2026-11-09T00:00:00+01:00'::timestamptz
    ))
  ) INTO v_allowed
  FROM public.professional_profiles WHERE user_id = NEW.professional_id FOR SHARE;
  IF v_allowed IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Professionista non approvato o non pubblicato' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;
