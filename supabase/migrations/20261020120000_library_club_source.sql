-- KAVI Library · Club de lectura: aceptar con copia propia (spec 13f, RF-BC3; T306).
--
-- Quien está invitado necesita saber qué libro va a recibir (título, autores, tipo, tamaño y portada) y la
-- función de archivos necesita la ruta del original para copiarlo dentro de R2 a su carpeta. El libro es del
-- anfitrión y su RLS no deja verlo, así que esta función lo da solo a quien está invitado o es miembro.
-- La ruta del archivo solo la usa la función de archivos (en el servidor); la app la recibe pero no puede
-- leerla en R2 (la firma solo se da para rutas de la propia carpeta).

create or replace function public.library_club_source(p_club uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'title', i.title,
    'authors', i.authors,
    'kind', i.kind,
    'file_size', i.file_size,
    'file_path', i.file_path,
    'cover_path', i.cover_path,
    'cover_color', i.cover_color,
    'page_count', i.page_count,
    'host_name', p.display_name
  )
    from public.library_clubs c
    join public.library_items i on i.id = c.source_item_id
    left join public.profiles p on p.id = c.host_id
   where c.id = p_club and public.library_club_invited(p_club);
$$;

revoke all on function public.library_club_source(uuid) from public, anon;
grant execute on function public.library_club_source(uuid) to authenticated;

-- Las invitaciones y los cambios del club llegan solos (como Compartido, RF-S14).
do $$
declare
  t text;
begin
  foreach t in array array['library_clubs', 'library_club_members']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
