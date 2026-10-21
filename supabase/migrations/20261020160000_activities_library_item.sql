-- KAVI Library conectada al calendario (spec 13 §4, T302): una actividad de Lectura puede ligarse a un libro.
--
-- La actividad guarda la pieza; si la pieza se borra, el enlace se vacía solo. La base solo acepta una pieza
-- de quien es dueño de la actividad: así nadie liga (ni descubre) el libro de otra persona. Library nunca
-- modifica el calendario (P6): solo el calendario apunta a Library.

alter table public.activities
  add column library_item_id uuid references public.library_items(id) on delete set null;

create index idx_activities_library_item on public.activities (library_item_id)
  where library_item_id is not null;

-- Solo una pieza mía. `security definer` para mirar `library_items` sin depender de su RLS (la serie se
-- materializa con el mismo dueño, pero así la regla no cambia según quién escriba).
create or replace function public.activities_library_item_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.library_item_id is not null and not exists (
    select 1 from public.library_items i where i.id = new.library_item_id and i.owner_id = new.owner_id
  ) then
    raise exception 'library item not owned by activity owner' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.activities_library_item_owner() from public, anon, authenticated;

create trigger activities_library_item_owner
  before insert or update of library_item_id, owner_id on public.activities
  for each row execute function public.activities_library_item_owner();
