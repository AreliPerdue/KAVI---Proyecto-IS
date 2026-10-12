-- T275 · KAVI Library (spec 13 §6): datos y Storage.
--
-- Todo es **de su dueño** y de nadie más (P4): compartir queda fuera de esta versión (spec 13 §7).
-- Las tablas hijas (anotaciones, fichas, páginas, piezas en un librero) además comprueban que la
-- pieza —y el librero— también sean de quien escribe: sin eso, alguien podría colgar anotaciones
-- de un libro ajeno conociendo su id.
--
-- Los archivos van en el bucket privado `library`, en una carpeta por persona
-- (`<uid>/<item>/archivo.pdf`): cada quien solo puede leer y escribir dentro de la suya.
-- Límites (decisión B2): 50 MB por archivo en el bucket y 500 MB por persona en
-- `library_items.file_size` (la base se niega a pasar del tope; la app avisa antes).
--
-- Solo agrega y se puede correr dos veces: `if not exists`, `drop … if exists` y `create or replace`.

-- ─── 1. Piezas ───────────────────────────────────────────────────────────────────────

create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  -- Libro (archivo importado, se anota encima) o creación (se edita, spec 13e).
  family text not null check (family in ('book', 'creation')),
  kind text not null check (kind in (
    'pdf', 'epub', 'docx', 'pages', 'pptx', 'keynote', 'xlsx', 'numbers',
    'notebook', 'journal', 'album'
  )),
  title text not null check (char_length(trim(title)) between 1 and 300),
  authors text[] not null default '{}',
  -- Una sola por pieza, la elige la persona (RF-BL9); los géneros pueden ser varios.
  category text check (char_length(category) <= 60),
  genres text[] not null default '{}',
  cover_path text,
  -- Color dominante de la portada, para el lomo y el filtro por color (RF-BL13).
  cover_color text check (cover_color ~ '^#[0-9A-Fa-f]{6}$'),
  -- El archivo original y, si hubo que convertirlo (oficina, B3), el PDF que se lee.
  file_path text,
  pdf_path text,
  file_size bigint not null default 0 check (file_size between 0 and 52428800),
  page_count int check (page_count >= 0),
  -- Avance (RF-BR9): 0 a 1, y la última posición estable (página + coordenadas o CFI).
  progress numeric(5, 4) not null default 0 check (progress between 0 and 1),
  last_position jsonb,
  reading_mode text check (reading_mode in ('book', 'scroll', 'paged')),
  -- Solo creaciones: estilo y color de partida (spec 13e).
  style text,
  base_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un libro trae su archivo; una creación no.
  constraint library_items_family_kind check (
    (family = 'book' and kind in ('pdf', 'epub', 'docx', 'pages', 'pptx', 'keynote', 'xlsx', 'numbers'))
    or (family = 'creation' and kind in ('notebook', 'journal', 'album'))
  )
);

create index if not exists idx_library_items_owner on public.library_items (owner_id, created_at desc);

alter table public.library_items enable row level security;

drop policy if exists "library_items_select_own" on public.library_items;
create policy "library_items_select_own" on public.library_items
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists "library_items_insert_own" on public.library_items;
create policy "library_items_insert_own" on public.library_items
  for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "library_items_update_own" on public.library_items;
create policy "library_items_update_own" on public.library_items
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "library_items_delete_own" on public.library_items;
create policy "library_items_delete_own" on public.library_items
  for delete to authenticated using (owner_id = auth.uid());

drop trigger if exists library_items_set_updated_at on public.library_items;
create trigger library_items_set_updated_at
  before update on public.library_items
  for each row execute function public.set_updated_at();

-- Tope por persona (B2): 500 MB entre todos sus archivos. Mensaje con código propio para que la
-- app lo traduzca ("Tu biblioteca está llena…") en vez de mostrar un error técnico.
create or replace function public.library_check_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  usado bigint;
begin
  select coalesce(sum(file_size), 0) into usado
    from public.library_items
   where owner_id = new.owner_id and id <> new.id;
  if usado + new.file_size > 524288000 then
    raise exception 'library_quota' using errcode = 'P0001', hint = 'library_quota';
  end if;
  return new;
end;
$$;

drop trigger if exists library_items_quota on public.library_items;
create trigger library_items_quota
  before insert or update of file_size on public.library_items
  for each row execute function public.library_check_quota();

-- ─── 2. Libreros ─────────────────────────────────────────────────────────────────────

create table if not exists public.library_shelves (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  color text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text,
  sort_order numeric not null default 1024,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_library_shelves_owner on public.library_shelves (owner_id, sort_order);

alter table public.library_shelves enable row level security;

drop policy if exists "library_shelves_own" on public.library_shelves;
create policy "library_shelves_own" on public.library_shelves
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop trigger if exists library_shelves_set_updated_at on public.library_shelves;
create trigger library_shelves_set_updated_at
  before update on public.library_shelves
  for each row execute function public.set_updated_at();

-- Una pieza puede estar en varios libreros (RF-BL6); quitarla de uno no la borra.
create table if not exists public.library_shelf_items (
  shelf_id uuid not null references public.library_shelves(id) on delete cascade,
  item_id uuid not null references public.library_items(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  sort_order numeric not null default 1024,
  added_at timestamptz not null default now(),
  primary key (shelf_id, item_id)
);

create index if not exists idx_library_shelf_items_item on public.library_shelf_items (item_id);

alter table public.library_shelf_items enable row level security;

drop policy if exists "library_shelf_items_select_own" on public.library_shelf_items;
create policy "library_shelf_items_select_own" on public.library_shelf_items
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists "library_shelf_items_write_own" on public.library_shelf_items;
create policy "library_shelf_items_write_own" on public.library_shelf_items
  for insert to authenticated with check (
    owner_id = auth.uid()
    and exists (select 1 from public.library_shelves s where s.id = shelf_id and s.owner_id = auth.uid())
    and exists (select 1 from public.library_items i where i.id = item_id and i.owner_id = auth.uid())
  );
drop policy if exists "library_shelf_items_update_own" on public.library_shelf_items;
create policy "library_shelf_items_update_own" on public.library_shelf_items
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "library_shelf_items_delete_own" on public.library_shelf_items;
create policy "library_shelf_items_delete_own" on public.library_shelf_items
  for delete to authenticated using (owner_id = auth.uid());

-- ─── 3. Lo que cuelga de una pieza ───────────────────────────────────────────────────

-- ¿La pieza es mía? La usan las políticas de las tablas hijas.
create or replace function public.library_item_is_mine(p_item uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (select 1 from public.library_items i where i.id = p_item and i.owner_id = auth.uid());
$$;

-- Anotaciones (spec 13c): nunca tocan el archivo; viven aparte con su posición estable.
create table if not exists public.library_annotations (
  -- El id lo pone el cliente: se anota sin conexión y se sube después (RF-BR3).
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.library_items(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('highlight', 'note', 'textbox', 'ink', 'sticker', 'postit', 'bookmark', 'image')),
  -- Página + coordenadas relativas (0–1) en PDF, o CFI en EPUB.
  locator jsonb not null,
  content jsonb not null default '{}',
  z numeric not null default 0,
  -- Un sticker "quitado" se guarda en la charola y se puede volver a poner (RF-BH13).
  removed boolean not null default false,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_library_annotations_item on public.library_annotations (item_id);

alter table public.library_annotations enable row level security;

drop policy if exists "library_annotations_select_own" on public.library_annotations;
create policy "library_annotations_select_own" on public.library_annotations
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists "library_annotations_insert_own" on public.library_annotations;
create policy "library_annotations_insert_own" on public.library_annotations
  for insert to authenticated with check (owner_id = auth.uid() and public.library_item_is_mine(item_id));
drop policy if exists "library_annotations_update_own" on public.library_annotations;
create policy "library_annotations_update_own" on public.library_annotations
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.library_item_is_mine(item_id));
drop policy if exists "library_annotations_delete_own" on public.library_annotations;
create policy "library_annotations_delete_own" on public.library_annotations
  for delete to authenticated using (owner_id = auth.uid());

drop trigger if exists library_annotations_set_updated_at on public.library_annotations;
create trigger library_annotations_set_updated_at
  before update on public.library_annotations
  for each row execute function public.set_updated_at();

-- Diseños de ficha (spec 13d): campos y aspecto en `jsonb`.
create table if not exists public.library_card_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  fields jsonb not null default '[]',
  look jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.library_card_templates enable row level security;

drop policy if exists "library_card_templates_own" on public.library_card_templates;
create policy "library_card_templates_own" on public.library_card_templates
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop trigger if exists library_card_templates_set_updated_at on public.library_card_templates;
create trigger library_card_templates_set_updated_at
  before update on public.library_card_templates
  for each row execute function public.set_updated_at();

-- Fichas llenas: una por plantilla en cada pieza (RF-BF7). Los valores van por id de campo, no por
-- etiqueta, para que renombrar un campo no pierda nada (13d §5).
create table if not exists public.library_cards (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.library_items(id) on delete cascade,
  template_id uuid not null references public.library_card_templates(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  "values" jsonb not null default '{}',
  placement text not null default 'back' check (placement in ('front', 'back', 'first_page', 'last_page')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, template_id)
);

create index if not exists idx_library_cards_owner on public.library_cards (owner_id);

alter table public.library_cards enable row level security;

drop policy if exists "library_cards_select_own" on public.library_cards;
create policy "library_cards_select_own" on public.library_cards
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists "library_cards_insert_own" on public.library_cards;
create policy "library_cards_insert_own" on public.library_cards
  for insert to authenticated with check (
    owner_id = auth.uid()
    and public.library_item_is_mine(item_id)
    and exists (select 1 from public.library_card_templates t where t.id = template_id and t.owner_id = auth.uid())
  );
drop policy if exists "library_cards_update_own" on public.library_cards;
create policy "library_cards_update_own" on public.library_cards
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.library_item_is_mine(item_id));
drop policy if exists "library_cards_delete_own" on public.library_cards;
create policy "library_cards_delete_own" on public.library_cards
  for delete to authenticated using (owner_id = auth.uid());

drop trigger if exists library_cards_set_updated_at on public.library_cards;
create trigger library_cards_set_updated_at
  before update on public.library_cards
  for each row execute function public.set_updated_at();

-- Páginas de una creación (spec 13e §5): la plantilla y lo cambiado sobre ella, como diferencias.
create table if not exists public.library_pages (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.library_items(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  sort_order numeric not null default 1024,
  template text not null,
  layers jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_library_pages_item on public.library_pages (item_id, sort_order);

alter table public.library_pages enable row level security;

drop policy if exists "library_pages_select_own" on public.library_pages;
create policy "library_pages_select_own" on public.library_pages
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists "library_pages_insert_own" on public.library_pages;
create policy "library_pages_insert_own" on public.library_pages
  for insert to authenticated with check (owner_id = auth.uid() and public.library_item_is_mine(item_id));
drop policy if exists "library_pages_update_own" on public.library_pages;
create policy "library_pages_update_own" on public.library_pages
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.library_item_is_mine(item_id));
drop policy if exists "library_pages_delete_own" on public.library_pages;
create policy "library_pages_delete_own" on public.library_pages
  for delete to authenticated using (owner_id = auth.uid());

drop trigger if exists library_pages_set_updated_at on public.library_pages;
create trigger library_pages_set_updated_at
  before update on public.library_pages
  for each row execute function public.set_updated_at();

-- Fuentes propias (RF-BH4): solo con el aviso de licencias aceptado.
create table if not exists public.library_fonts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  file_path text not null,
  format text not null check (format in ('ttf', 'otf', 'woff2')),
  file_size bigint not null check (file_size between 1 and 10485760),
  license_accepted_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.library_fonts enable row level security;

drop policy if exists "library_fonts_own" on public.library_fonts;
create policy "library_fonts_own" on public.library_fonts
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ─── 4. Storage ──────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values ('library', 'library', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- Cada quien en su carpeta: el primer segmento de la ruta es su id.
drop policy if exists "library_objects_select_own" on storage.objects;
create policy "library_objects_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'library' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "library_objects_insert_own" on storage.objects;
create policy "library_objects_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'library' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "library_objects_update_own" on storage.objects;
create policy "library_objects_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'library' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'library' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "library_objects_delete_own" on storage.objects;
create policy "library_objects_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'library' and (storage.foldername(name))[1] = auth.uid()::text);
