-- KAVI Library · Club de lectura: por dónde va cada quien (spec 13f, RF-BC9; T308).
--
-- El avance de una copia es de su dueño (su RLS no deja verlo). Esta función da a los miembros aceptados del
-- club el avance de cada copia del club: la parte leída y la página o el CFI donde va. Quien apagó "Que vean
-- por dónde voy" no sale (salvo para sí). Nada de esto se guarda aparte: sale de cada copia.

create or replace function public.library_club_progress(p_club uuid)
returns table (person_id uuid, progress numeric, page int, cfi text, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.person_id,
         i.progress,
         nullif(i.last_position ->> 'page', '')::int,
         i.last_position ->> 'cfi',
         i.updated_at
    from public.library_club_members m
    join public.library_items i on i.id = m.item_id and i.club_id = m.club_id
   where m.club_id = p_club
     and m.status = 'accepted'
     and (m.shows_progress or m.person_id = auth.uid())
     and public.library_club_member(p_club);
$$;

revoke all on function public.library_club_progress(uuid) from public, anon;
grant execute on function public.library_club_progress(uuid) to authenticated;
