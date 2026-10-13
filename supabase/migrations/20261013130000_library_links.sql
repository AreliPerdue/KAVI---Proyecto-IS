-- KAVI Library · Libros enlazados (spec 13a, RF-BL27, T316).
--
-- Un enlace dice qué es una pieza respecto a otra, leído de `from_item` a `to_item`:
--   prequel  — from es precuela de to (to es su secuela); "secuela de" se guarda al revés.
--   spinoff  — from es spin-off de to (to es su historia original).
--   universe — del mismo universo (simétrico).
--   related  — relacionados, sin más (simétrico).
--   notes    — from es el cuaderno o diario de notas de to (cuando existan las creaciones, L5).
-- Se guarda una sola vez y la app lo lee desde los dos lados. Las dos piezas tienen que ser de quien
-- enlaza, y borrar cualquiera de las dos borra el enlace.
create table if not exists public.library_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  from_item uuid not null references public.library_items(id) on delete cascade,
  to_item uuid not null references public.library_items(id) on delete cascade,
  kind text not null check (kind in ('prequel', 'spinoff', 'universe', 'related', 'notes')),
  created_at timestamptz not null default now(),
  check (from_item <> to_item)
);

-- Un solo enlace por pareja, en cualquier sentido: A–B y B–A son el mismo par.
create unique index if not exists idx_library_links_pair on public.library_links (owner_id, least(from_item, to_item), greatest(from_item, to_item));
create index if not exists idx_library_links_to on public.library_links (to_item);

alter table public.library_links enable row level security;

drop policy if exists "library_links_select_own" on public.library_links;
create policy "library_links_select_own" on public.library_links
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists "library_links_insert_own" on public.library_links;
create policy "library_links_insert_own" on public.library_links
  for insert to authenticated
  with check (owner_id = auth.uid() and public.library_item_is_mine(from_item) and public.library_item_is_mine(to_item));
drop policy if exists "library_links_update_own" on public.library_links;
create policy "library_links_update_own" on public.library_links
  for update to authenticated using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and public.library_item_is_mine(from_item) and public.library_item_is_mine(to_item));
drop policy if exists "library_links_delete_own" on public.library_links;
create policy "library_links_delete_own" on public.library_links
  for delete to authenticated using (owner_id = auth.uid());
