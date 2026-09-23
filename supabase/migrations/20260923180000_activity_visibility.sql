-- Visibilidad por actividad (RF-C14, reemplaza a `is_private`).
--
-- Antes, lo que veía cada contacto dependía solo del nivel dado a tu calendario:
-- con `details` veía el título de todo. `is_private` añadió una excepción binaria.
-- Esto la convierte en tres estados, que es lo que hacía falta:
--
--   'default'   lo ven quienes tengan `details` sobre tu calendario
--   'selected'  solo las personas elegidas, y aun así con `details`
--   'private'   nadie: todos ven el hueco como ocupado
--
-- Regla de fondo: **la visibilidad de la actividad solo puede restringir, nunca
-- ampliar**. El nivel del calendario es el techo. Si a alguien le compartes en modo
-- `busy`, elegirlo en una actividad no le enseña el título: seguiría viendo el
-- bloque. Lo contrario convertiría un ajuste por actividad en una forma de saltarse
-- lo que decidiste para esa persona.

alter table public.activities
  add column visibility text not null default 'default'
    check (visibility in ('default', 'selected', 'private'));

update public.activities set visibility = 'private' where is_private;
alter table public.activities drop column is_private;

comment on column public.activities.visibility is
  'Quién ve el título: default = quien tenga details; selected = los de activity_viewers; private = nadie (RF-C14).';

-- ── Quién puede ver el detalle cuando la visibilidad es 'selected' ──
create table public.activity_viewers (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (activity_id, user_id)
);

create index idx_activity_viewers_user on public.activity_viewers (user_id);

alter table public.activity_viewers enable row level security;

-- Solo el dueño de la actividad administra su lista; cada quien puede consultar
-- las filas que le nombran, que es lo que necesita la RPC.
create policy "activity_viewers_owner" on public.activity_viewers
  for all to authenticated
  using (exists (select 1 from public.activities a where a.id = activity_id and a.owner_id = auth.uid()))
  with check (exists (select 1 from public.activities a where a.id = activity_id and a.owner_id = auth.uid()));

create policy "activity_viewers_self_select" on public.activity_viewers
  for select to authenticated using (user_id = auth.uid());

-- ── El título solo sale si el nivel del calendario lo permite Y la actividad no
--    lo restringe más ──
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
         case when t.is_me or (
                t.visibility = 'details'
                and (
                  a.visibility = 'default'
                  or (a.visibility = 'selected'
                      and exists (select 1 from public.activity_viewers v
                                   where v.activity_id = a.id and v.user_id = auth.uid()))
                )
              ) then a.title else null end,
         case when t.is_me or (
                t.visibility = 'details'
                and (
                  a.visibility = 'default'
                  or (a.visibility = 'selected'
                      and exists (select 1 from public.activity_viewers v
                                   where v.activity_id = a.id and v.user_id = auth.uid()))
                )
              ) then a.color else null end
  from public.activities a
  join target t on t.owner_id = a.owner_id
  where (t.is_me or t.visibility is not null)
    and a.start_at < p_to
    and a.end_at > p_from
  order by a.start_at;
$$;

-- Una actividad privada sigue sin admitir invitados: sería contradecirse.
create or replace function public.activity_shares_reject_private()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.activities a where a.id = new.activity_id and a.visibility = 'private') then
    raise exception 'No puedes invitar a una actividad privada.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ── La política de lectura también tiene que respetarla ──
--
-- No basta con que la RPC filtre el título: la política dejaba leer la FILA entera a
-- quien tuviera `details`, así que una petición hecha a mano contra `activities`
-- devolvía el título de una actividad privada. El cliente de KAVI no la hace —su
-- calendario pide solo lo propio y lo compartido—, pero eso es una convención del
-- cliente, no una defensa.
--
-- El dueño sigue viéndolo todo: `owner_id = auth.uid()` va primero.
drop policy if exists "activities_select" on public.activities;
create policy "activities_select" on public.activities
  for select to authenticated using (
    owner_id = auth.uid()
    or public.is_activity_shared_with(id, auth.uid())
    or (
      public.shares_calendar_details(owner_id, auth.uid())
      and (
        visibility = 'default'
        or (visibility = 'selected'
            and exists (select 1 from public.activity_viewers v
                         where v.activity_id = id and v.user_id = auth.uid()))
      )
    )
  );
