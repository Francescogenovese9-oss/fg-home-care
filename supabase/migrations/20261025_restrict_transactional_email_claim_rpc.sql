-- Only the trusted server-side service role may claim transactional email events.
revoke execute on function public.claim_transactional_email_event(text,text,text,uuid,uuid)
from public, anon, authenticated;
