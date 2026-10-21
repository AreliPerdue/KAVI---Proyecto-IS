-- KAVI Library · Lienzo creativo: "Mis colores" (spec 13h, RF-CC12; T342).
--
-- La paleta que cada quien guarda y reutiliza en cualquier recorte o página del Journal. Va en la cuenta (no en el
-- dispositivo) para verla en todos lados; en su propia tabla y no en `profiles`, porque los perfiles los leen los
-- contactos y esto es solo de su dueño. KAVI no trae paletas (RF-CC11): empieza vacía.
--
-- Solo agrega y se puede correr dos veces.

create table if not exists public.library_saved_colors (
  owner_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  -- Hasta 30, en HEX mayúscula (#RRGGBB), sin repetir; el orden es el de la persona.
  colors text[] not null default '{}' check (
    cardinality(colors) <= 30
    and array_to_string(colors, ',') ~ '^(#[0-9A-F]{6}(,#[0-9A-F]{6})*)?$'
  ),
  updated_at timestamptz not null default now()
);

alter table public.library_saved_colors enable row level security;

drop policy if exists "library_saved_colors_select_own" on public.library_saved_colors;
create policy "library_saved_colors_select_own" on public.library_saved_colors
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists "library_saved_colors_insert_own" on public.library_saved_colors;
create policy "library_saved_colors_insert_own" on public.library_saved_colors
  for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "library_saved_colors_update_own" on public.library_saved_colors;
create policy "library_saved_colors_update_own" on public.library_saved_colors
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "library_saved_colors_delete_own" on public.library_saved_colors;
create policy "library_saved_colors_delete_own" on public.library_saved_colors
  for delete to authenticated using (owner_id = auth.uid());

drop trigger if exists library_saved_colors_set_updated_at on public.library_saved_colors;
create trigger library_saved_colors_set_updated_at
  before update on public.library_saved_colors
  for each row execute function public.set_updated_at();
