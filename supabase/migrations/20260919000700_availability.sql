-- T027 · Spec 02 §10, RF-S8 — Disponibilidad sin exponer detalle

/**
 * Devuelve bloques ocupados de las personas indicadas. Es SECURITY DEFINER porque la
 * visibilidad 'busy' NO da acceso a las filas de `activities` (la política SELECT no la
 * contempla): esta función es la única vía, y solo emite inicio/fin. El título y el color
 * viajan únicamente cuando la actividad es mía o el share es 'details' (P4).
 */
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
  )
  select a.owner_id,
         a.start_at,
         a.end_at,
         case when t.is_me or t.visibility = 'details' then a.title else null end,
         case when t.is_me or t.visibility = 'details' then a.color else null end
  from public.activities a
  join target t on t.owner_id = a.owner_id
  where (t.is_me or t.visibility is not null)
    and a.start_at < p_to
    and a.end_at > p_from
  order by a.start_at;
$$;

revoke all on function public.get_availability(uuid[], timestamptz, timestamptz) from public;
grant execute on function public.get_availability(uuid[], timestamptz, timestamptz) to authenticated;
