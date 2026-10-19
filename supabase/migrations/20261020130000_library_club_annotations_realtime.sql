-- KAVI Library · Club de lectura: anotar juntos (spec 13f, RF-BC6 – RF-BC7; T307).
--
-- Lo que un miembro subraya, escribe o pega en el club llega a los demás mientras leen: `library_annotations`
-- entra a Realtime. La RLS decide quién recibe cada cambio (los miembros del club y el dueño); la app escucha
-- solo las de su club (`club_id=eq.<club>`).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'library_annotations'
  ) then
    alter publication supabase_realtime add table public.library_annotations;
  end if;
end
$$;
