-- Trigger functions and internal admin-check RPC must not be callable directly by client roles.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon, authenticated;
