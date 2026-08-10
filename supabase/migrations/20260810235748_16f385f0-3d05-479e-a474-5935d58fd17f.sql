REVOKE EXECUTE ON FUNCTION public.current_group_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_group_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_group_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_group_id() TO service_role;