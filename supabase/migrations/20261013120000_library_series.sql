-- KAVI Library · Sagas (spec 13a, RF-BL24 – RF-BL26, T315).
--
-- Una saga es una serie de libros de la persona ("Una corte de rosas y espinas"); cada libro guarda
-- a qué saga pertenece y su número dentro de ella. El número admite decimales (#1.5 para la novela
-- corta entre el 1 y el 2). Borrar una saga no borra sus libros: solo dejan de estar en ella.
create table if not exists public.library_series (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Una sola saga por nombre (sin importar mayúsculas): escribir "acotar" otra vez reusa "ACOTAR".
create unique index if not exists idx_library_series_owner_name on public.library_series (owner_id, lower(trim(name)));

alter table public.library_series enable row level security;

drop policy if exists "library_series_own" on public.library_series;
create policy "library_series_own" on public.library_series
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop trigger if exists library_series_set_updated_at on public.library_series;
create trigger library_series_set_updated_at
  before update on public.library_series
  for each row execute function public.set_updated_at();

alter table public.library_items
  add column if not exists series_id uuid references public.library_series(id) on delete set null,
  add column if not exists series_index numeric check (series_index is null or series_index >= 0);

create index if not exists idx_library_items_series on public.library_items (series_id, series_index);

-- La saga de un libro tiene que ser del mismo dueño: la RLS de `library_items` solo mira la pieza, y un
-- id de saga ajeno (adivinado) la colgaría de una serie que no es suya.
create or replace function public.library_items_check_series()
returns trigger
language plpgsql
as $$
begin
  if new.series_id is not null
     and not exists (select 1 from public.library_series s where s.id = new.series_id and s.owner_id = new.owner_id) then
    raise exception 'La saga no es tuya.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists library_items_check_series on public.library_items;
create trigger library_items_check_series
  before insert or update of series_id on public.library_items
  for each row execute function public.library_items_check_series();
