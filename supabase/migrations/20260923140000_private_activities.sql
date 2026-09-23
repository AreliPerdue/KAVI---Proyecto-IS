-- Actividades privadas (RF-C14).
--
-- Hasta ahora lo que veía cada contacto dependía solo del nivel que le hubieras
-- dado a tu calendario: con `details` veía el título de TODO. Esto añade una
-- excepción por actividad: marcarla como privada hace que nadie vea su título,
-- tenga el nivel que tenga. La persona sigue apareciendo ocupada en ese hueco,
-- que es el punto: proteger el contenido sin mentir sobre la disponibilidad.
--
-- La regla vive aquí y no en el cliente a propósito. Si se aplicara al pintar, el
-- título viajaría igualmente hasta el dispositivo de la otra persona y bastaría
-- con mirar la respuesta de red para leerlo.

alter table public.activities
  add column is_private boolean not null default false;

comment on column public.activities.is_private is
  'Privada: los demás ven el bloque como ocupado, nunca su título (RF-C14).';

-- El título y el color solo se entregan si, además de haber nivel `details`, la
-- actividad no es privada.
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
         case when t.is_me or (t.visibility = 'details' and not a.is_private) then a.title else null end,
         case when t.is_me or (t.visibility = 'details' and not a.is_private) then a.color else null end
  from public.activities a
  join target t on t.owner_id = a.owner_id
  where (t.is_me or t.visibility is not null)
    and a.start_at < p_to
    and a.end_at > p_from
  order by a.start_at;
$$;

-- Una actividad privada no se puede compartir: sería contradecirse.
create or replace function public.activity_shares_reject_private()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.activities a where a.id = new.activity_id and a.is_private) then
    raise exception 'No puedes invitar a una actividad privada.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists activity_shares_reject_private on public.activity_shares;
create trigger activity_shares_reject_private
  before insert or update on public.activity_shares
  for each row execute function public.activity_shares_reject_private();
