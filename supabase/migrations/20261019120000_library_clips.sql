-- KAVI Library · Fragmentos (spec 13c, RF-BH19 – RF-BH21; T317).
--
-- Como recortar de un libro o de una revista: un pedazo de texto (lo seleccionado) o de imagen (un rectángulo
-- de la página) se guarda con su libro, su lugar y la fecha. La imagen (JPEG) vive en R2 en la carpeta de la
-- persona, `<persona>/clips/<id>.jpg`, fuera de la del libro: borrar el libro no borra sus fragmentos, que se
-- quedan con su título (`book_title`) y sin `item_id`. El id lo pone el cliente. Solo lo propio, y de lo ya
-- guardado solo se cambia la nota.

create table if not exists public.library_clips (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  item_id uuid references public.library_items(id) on delete set null,
  book_title text not null check (char_length(book_title) between 1 and 300),
  kind text not null check (kind in ('text', 'image')),
  -- El texto seleccionado; vacío en un libro que no deja copiar (RF-BH9): se guarda solo la referencia.
  text text check (char_length(text) <= 5000),
  -- Dónde está: página (PDF), CFI (EPUB) y la parte del libro; en uno de imagen, también el rectángulo.
  locator jsonb not null default '{}'::jsonb check (jsonb_typeof(locator) = 'object'),
  path text,
  -- Alto entre ancho de la imagen.
  ar numeric(6, 4) check (ar between 0.05 and 20),
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'text' and path is null and ar is null)
    or (kind = 'image' and text is null and ar is not null and path = owner_id::text || '/clips/' || id::text || '.jpg')
  )
);

create index if not exists idx_library_clips_owner on public.library_clips (owner_id, created_at desc);
create index if not exists idx_library_clips_item on public.library_clips (item_id);

drop trigger if exists library_clips_set_updated_at on public.library_clips;
create trigger library_clips_set_updated_at
  before update on public.library_clips
  for each row execute function public.set_updated_at();

alter table public.library_clips enable row level security;

drop policy if exists "library_clips_select_own" on public.library_clips;
create policy "library_clips_select_own" on public.library_clips
  for select to authenticated using (owner_id = auth.uid());

-- Un fragmento nuevo es de un libro propio (o de ninguno).
drop policy if exists "library_clips_insert_own" on public.library_clips;
create policy "library_clips_insert_own" on public.library_clips
  for insert to authenticated with check (
    owner_id = auth.uid()
    and (item_id is null or exists (select 1 from public.library_items i where i.id = item_id and i.owner_id = auth.uid()))
  );

drop policy if exists "library_clips_update_own" on public.library_clips;
create policy "library_clips_update_own" on public.library_clips
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "library_clips_delete_own" on public.library_clips;
create policy "library_clips_delete_own" on public.library_clips
  for delete to authenticated using (owner_id = auth.uid());

-- De lo guardado solo cambia la nota (lo recortado es lo que era).
revoke update on public.library_clips from authenticated, anon;
grant update (note) on public.library_clips to authenticated;
