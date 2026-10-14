-- KAVI Library · Tienda de stickers en la nube (spec 13c, RF-BH13b; T337).
--
-- Los packs que no vienen en la app viven aquí y cada quien descarga los que le gustan.
-- 1. `sticker_packs`: el catálogo. Lo lee cualquiera con sesión (solo lo publicado); solo se escribe con
--    migraciones (no hay políticas de escritura). Cada pack trae sus stickers como lista `[{ name, ar }]`.
-- 2. `user_sticker_packs`: qué packs descargó cada persona. Solo lo suyo.
-- 3. El bucket público `stickers` (Supabase Storage): `<pack>/<nombre>.png` y `<pack>/muestra.png`. Público para
--    leer (con caché); nadie sube desde la app: los archivos se suben con el CLI.

create table if not exists public.sticker_packs (
  id text primary key check (id ~ '^[a-z0-9-]{1,60}$'),
  collection text not null check (collection ~ '^[a-z0-9-]{1,40}$'),
  -- El color de sus Nobi (id de la paleta de la app: `blue`, `navy_blue`…); nulo si no es de un color.
  color text check (color is null or color ~ '^[a-z_]{1,20}$'),
  name_es text not null check (char_length(trim(name_es)) between 1 and 60),
  name_en text not null check (char_length(trim(name_en)) between 1 and 60),
  sort_order integer not null default 0,
  -- [{ "name": "popcorn", "ar": 0.833 }]: cada nombre es su archivo; `ar`, alto entre ancho.
  stickers jsonb not null check (jsonb_typeof(stickers) = 'array' and jsonb_array_length(stickers) between 1 and 200),
  bytes integer not null default 0 check (bytes >= 0),
  -- Sube cuando cambian sus imágenes: así la app y la caché piden las nuevas.
  version integer not null default 1 check (version >= 1),
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_sticker_packs_orden on public.sticker_packs (collection, sort_order);

alter table public.sticker_packs enable row level security;

drop policy if exists "sticker_packs_select_published" on public.sticker_packs;
create policy "sticker_packs_select_published" on public.sticker_packs
  for select to authenticated using (published);

create table if not exists public.user_sticker_packs (
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  pack_id text not null references public.sticker_packs(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (owner_id, pack_id)
);

alter table public.user_sticker_packs enable row level security;

drop policy if exists "user_sticker_packs_select_own" on public.user_sticker_packs;
create policy "user_sticker_packs_select_own" on public.user_sticker_packs
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists "user_sticker_packs_insert_own" on public.user_sticker_packs;
create policy "user_sticker_packs_insert_own" on public.user_sticker_packs
  for insert to authenticated with check (
    owner_id = auth.uid()
    and exists (select 1 from public.sticker_packs p where p.id = pack_id and p.published)
  );

drop policy if exists "user_sticker_packs_delete_own" on public.user_sticker_packs;
create policy "user_sticker_packs_delete_own" on public.user_sticker_packs
  for delete to authenticated using (owner_id = auth.uid());

-- El bucket: público para leer; sin políticas de escritura (solo el CLI, con la llave de servicio).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stickers', 'stickers', true, 2097152, array['image/png'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
