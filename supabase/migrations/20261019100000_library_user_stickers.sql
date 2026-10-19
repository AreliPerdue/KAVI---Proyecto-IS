-- KAVI Library · Stickers propios (spec 13c, RF-BH13; T335).
--
-- Una persona hace stickers con sus imágenes (con o sin margen blanco) y los pega como los incluidos o los de la
-- tienda. La imagen ya procesada (PNG) vive en R2 en su carpeta, `<persona>/stickers/<id>.png`, y la sube y la
-- lee la función de archivos; aquí va su fila: proporción y grosor del margen con que se hizo. El id lo pone el
-- cliente. Solo lo propio.

create table if not exists public.library_user_stickers (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  path text not null,
  -- Alto entre ancho de la imagen final (con su margen).
  ar numeric(6, 4) not null check (ar between 0.25 and 4),
  -- El margen blanco con que se hizo, en px de una imagen de 512 (0 = sin margen).
  margin smallint not null default 0 check (margin between 0 and 40),
  created_at timestamptz not null default now(),
  check (path = owner_id::text || '/stickers/' || id::text || '.png')
);

create index if not exists idx_library_user_stickers_owner on public.library_user_stickers (owner_id, created_at desc);

alter table public.library_user_stickers enable row level security;

drop policy if exists "library_user_stickers_select_own" on public.library_user_stickers;
create policy "library_user_stickers_select_own" on public.library_user_stickers
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists "library_user_stickers_insert_own" on public.library_user_stickers;
create policy "library_user_stickers_insert_own" on public.library_user_stickers
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "library_user_stickers_delete_own" on public.library_user_stickers;
create policy "library_user_stickers_delete_own" on public.library_user_stickers
  for delete to authenticated using (owner_id = auth.uid());
