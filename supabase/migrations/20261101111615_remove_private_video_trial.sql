-- End the authorized private video trial. Restore the original publication guard.
-- Historical migrations remain intact for an auditable migration history.
CREATE OR REPLACE FUNCTION public.check_professional_bookable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_allowed boolean;
BEGIN
  SELECT (verification_status = 'APPROVED' AND published IS TRUE)
  INTO v_allowed
  FROM public.professional_profiles
  WHERE user_id = NEW.professional_id
  FOR SHARE;
  IF v_allowed IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Professionista non approvato o non pubblicato' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;
