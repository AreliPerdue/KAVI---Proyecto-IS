-- Corrige una recursión infinita entre políticas (introducida en 20260923180000).
--
-- El problema:
--
--   `activities_select`      consultaba `activity_viewers` para saber si el lector
--                            está en la lista de una actividad `selected`.
--   `activity_viewers_owner` consultaba `activities` para saber si el lector es el
--                            dueño de esa actividad.
--
-- Una política que consulta otra tabla queda sujeta a las políticas de esa tabla, así
-- que leer `activities` disparaba `activity_viewers`, que volvía a disparar
-- `activities`. PostgreSQL lo detecta y aborta la consulta: el calendario entero
-- dejaba de cargar con un error genérico.
--
-- La solución es la misma que ya usaban `is_activity_shared_with` y
-- `shares_calendar_details`: encapsular la comprobación en una función
-- `security definer`, que se ejecuta con los permisos de quien la definió y por tanto
-- no vuelve a pasar por las políticas.

create or replace function public.can_view_activity_detail(p_activity uuid, p_viewer uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.activity_viewers v
    where v.activity_id = p_activity and v.user_id = p_viewer
  );
$$;

revoke all on function public.can_view_activity_detail(uuid, uuid) from public;
grant execute on function public.can_view_activity_detail(uuid, uuid) to authenticated;

drop policy if exists "activities_select" on public.activities;
create policy "activities_select" on public.activities
  for select to authenticated using (
    owner_id = auth.uid()
    or public.is_activity_shared_with(id, auth.uid())
    or (
      public.shares_calendar_details(owner_id, auth.uid())
      and (
        visibility = 'default'
        or (visibility = 'selected' and public.can_view_activity_detail(id, auth.uid()))
      )
    )
  );

-- La RPC de disponibilidad ya era `security definer`, pero hacía la misma subconsulta
-- en línea. Se pasa por la función para que la regla viva en un solo sitio.
create or replace function public.get_availability(
  p_user_ids uuid[],
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  user_id uuid,
  start_at timestamptz,
  end_at timestamptz,
  title text,
  color text
)
language sql security definer stable set search_path = public as $$
  with target as (
    select u as owner_id,
           u = auth.uid() as is_me,
           (select c.visibility from public.calendar_shares c
             where c.owner_id = u and c.shared_with_id = auth.uid()) as visibility
    from unnest(p_user_ids) as u
  ),
  visible as (
    select a.*,
           t.is_me,
           (t.is_me or (
             t.visibility = 'details'
             and (a.visibility = 'default'
                  or (a.visibility = 'selected'
                      and public.can_view_activity_detail(a.id, auth.uid())))
           )) as ver_detalle
    from public.activities a
    join target t on t.owner_id = a.owner_id
    where (t.is_me or t.visibility is not null)
      and a.start_at < p_to
      and a.end_at > p_from
  )
  select owner_id,
         start_at,
         end_at,
         case when ver_detalle then title else null end,
         case when ver_detalle then color else null end
  from visible
  order by start_at;
$$;

-- `activity_viewers`: la política de administración pasa a cubrir solo escritura.
-- Con `for all` también se evaluaba al leer, y es la mitad que cerraba el ciclo.
drop policy if exists "activity_viewers_owner" on public.activity_viewers;

create policy "activity_viewers_owner_write" on public.activity_viewers
  for insert to authenticated
  with check (exists (select 1 from public.activities a where a.id = activity_id and a.owner_id = auth.uid()));

create policy "activity_viewers_owner_delete" on public.activity_viewers
  for delete to authenticated
  using (exists (select 1 from public.activities a where a.id = activity_id and a.owner_id = auth.uid()));

-- Lectura: cada quien ve las filas que le nombran. Sin subconsulta, sin ciclo.
drop policy if exists "activity_viewers_self_select" on public.activity_viewers;
create policy "activity_viewers_self_select" on public.activity_viewers
  for select to authenticated using (user_id = auth.uid());
