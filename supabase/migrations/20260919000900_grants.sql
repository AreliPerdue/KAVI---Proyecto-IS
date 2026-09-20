-- T143 · Endurecer permisos de ejecución
--
-- Supabase concede EXECUTE a `anon` por defecto en toda función nueva de `public`,
-- y un `revoke ... from public` no deshace esa concesión explícita. Hoy ninguna
-- filtra nada (todas dependen de `auth.uid()`, que sin sesión es null), pero que una
-- función de escritura sea invocable sin sesión no debe quedarse así.
--
-- `is_username_available` es la excepción a propósito: el alta la consulta antes de
-- que exista la sesión (RF-A1), así que sigue abierta a `anon`.

revoke execute on function public.are_connected(uuid, uuid) from anon;
revoke execute on function public.owns_activity(uuid, uuid) from anon;
revoke execute on function public.is_activity_shared_with(uuid, uuid) from anon;
revoke execute on function public.shares_calendar_details(uuid, uuid) from anon;
revoke execute on function public.search_profile_by_email(text) from anon;
revoke execute on function public.get_availability(uuid[], timestamptz, timestamptz) from anon;
revoke execute on function public.add_reminder_recipients(uuid) from anon;
revoke execute on function public.is_admin(uuid) from anon;
revoke execute on function public.admin_stats() from anon;
revoke execute on function public.admin_accounts(int, int) from anon;
