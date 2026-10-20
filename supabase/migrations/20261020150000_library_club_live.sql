-- KAVI Library · Club de lectura: sesión en vivo (spec 13f, RF-BC10 – RF-BC14; T309).
--
-- La sesión va por canales privados de Supabase Realtime: `club-vivo:<club>` (presence de quién está y
-- broadcast de la posición de quien dirige, señalar y pasar el mando) y `club-avisos:<club>` ("Ana está
-- leyendo en vivo"). Nada de la sesión se guarda en la base. Un canal privado pide permiso en
-- `realtime.messages`: solo los miembros aceptados del club escuchan y hablan en los suyos.

-- El club de un canal del club, o null si el canal no es de un club.
create or replace function public.library_club_de_canal(p_topic text)
returns uuid
language sql
immutable
as $$
  select case
    when p_topic ~ '^club-(vivo|avisos):[0-9a-f-]{36}$' then substring(p_topic from '[0-9a-f-]{36}$')::uuid
    else null
  end;
$$;

grant execute on function public.library_club_de_canal(text) to authenticated;

-- `realtime.messages` es de Supabase (su dueño es otro rol) y ya trae RLS activado: aquí solo se agregan
-- las políticas. Activarlo aquí falla con "must be owner of table messages".

drop policy if exists "library_club_live_select" on realtime.messages;
create policy "library_club_live_select" on realtime.messages
  for select to authenticated
  using (public.library_club_member(public.library_club_de_canal(realtime.topic())));

drop policy if exists "library_club_live_insert" on realtime.messages;
create policy "library_club_live_insert" on realtime.messages
  for insert to authenticated
  with check (public.library_club_member(public.library_club_de_canal(realtime.topic())));
