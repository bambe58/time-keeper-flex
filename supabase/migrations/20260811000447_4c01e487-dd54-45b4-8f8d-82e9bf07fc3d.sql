CREATE POLICY "Group members can view group settings"
ON public.user_settings
FOR SELECT
TO authenticated
USING (
  public.current_group_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_settings.user_id
      AND p.group_id = public.current_group_id()
  )
);