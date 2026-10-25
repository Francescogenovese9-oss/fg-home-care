-- Booking availability checks are only needed by authenticated patients.
revoke execute on function public.is_professional_available(uuid,date,time without time zone,integer) from public, anon;
grant execute on function public.is_professional_available(uuid,date,time without time zone,integer) to authenticated;
