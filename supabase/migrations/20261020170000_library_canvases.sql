-- KAVI Library · Lienzo creativo (spec 13h §10; T351): un recorte de un libro (y, en C5, una página del Journal).
--
-- Un lienzo es un documento: su formato (A5 vertical u horizontal, 1 : √2) y sus elementos en `doc`, con
-- coordenadas de 0 a 1 respecto a su página, para que se vea idéntico en todo dispositivo (RF-CC5). Es solo de su
-- dueño (RF-CC25) y, si es de un libro, el libro también tiene que ser suyo. Al borrar el libro se van sus recortes.
--
-- Solo agrega y se puede correr dos veces.

create table if not exists public.library_canvases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  -- Recortes de un libro ("yo con este libro") o páginas del Journal ("yo como lector", C5).
  context text not null default 'book' check (context in ('book', 'journal')),
  item_id uuid references public.library_items(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 120),
  orientation text not null default 'portrait' check (orientation in ('portrait', 'landscape')),
  -- `{ "pages": 1, "elements": [...] }` (ver `src/lib/library/canvas.ts`). Un tope generoso para que un documento
  -- roto no llene la base: las imágenes van en R2, aquí solo su ruta.
  doc jsonb not null default '{"pages": 1, "elements": []}'::jsonb check (octet_length(doc::text) <= 1048576),
  -- Sube con cada guardado: la cola sin red no pisa una versión más nueva (RF-CC10).
  version int not null default 1 check (version >= 1),
  thumb_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_canvases_book check (context <> 'book' or item_id is not null)
);

create index if not exists idx_library_canvases_item on public.library_canvases (item_id, created_at desc) where item_id is not null;
create index if not exists idx_library_canvases_owner on public.library_canvases (owner_id, updated_at desc);

alter table public.library_canvases enable row level security;

drop policy if exists "library_canvases_select_own" on public.library_canvases;
create policy "library_canvases_select_own" on public.library_canvases
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists "library_canvases_insert_own" on public.library_canvases;
create policy "library_canvases_insert_own" on public.library_canvases
  for insert to authenticated with check (owner_id = auth.uid() and (item_id is null or public.library_item_is_mine(item_id)));
drop policy if exists "library_canvases_update_own" on public.library_canvases;
create policy "library_canvases_update_own" on public.library_canvases
  for update to authenticated using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and (item_id is null or public.library_item_is_mine(item_id)));
drop policy if exists "library_canvases_delete_own" on public.library_canvases;
create policy "library_canvases_delete_own" on public.library_canvases
  for delete to authenticated using (owner_id = auth.uid());

drop trigger if exists library_canvases_set_updated_at on public.library_canvases;
create trigger library_canvases_set_updated_at
  before update on public.library_canvases
  for each row execute function public.set_updated_at();
