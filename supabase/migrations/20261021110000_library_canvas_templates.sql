-- KAVI Library · Lienzo creativo: Mis plantillas (spec 13h, RF-CC20; T344).
--
-- Un recorte guardado como plantilla: su acomodo y su contenido de ejemplo (sin fotos ni imágenes propias, ver
-- `src/lib/library/canvas-templates.ts`), para empezar otros recortes con él. Las plantillas de KAVI viven en la app;
-- aquí solo las de cada quien, que solo ve y cambia su dueño. La miniatura se dibuja con el documento.
--
-- Solo agrega y se puede correr dos veces.

create table if not exists public.library_canvas_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  orientation text not null default 'portrait' check (orientation in ('portrait', 'landscape')),
  doc jsonb not null default '{"pages": 1, "elements": []}'::jsonb check (octet_length(doc::text) <= 1048576),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_library_canvas_templates_owner on public.library_canvas_templates (owner_id, created_at desc);

alter table public.library_canvas_templates enable row level security;

drop policy if exists "library_canvas_templates_select_own" on public.library_canvas_templates;
create policy "library_canvas_templates_select_own" on public.library_canvas_templates
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists "library_canvas_templates_insert_own" on public.library_canvas_templates;
create policy "library_canvas_templates_insert_own" on public.library_canvas_templates
  for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "library_canvas_templates_update_own" on public.library_canvas_templates;
create policy "library_canvas_templates_update_own" on public.library_canvas_templates
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "library_canvas_templates_delete_own" on public.library_canvas_templates;
create policy "library_canvas_templates_delete_own" on public.library_canvas_templates
  for delete to authenticated using (owner_id = auth.uid());

drop trigger if exists library_canvas_templates_set_updated_at on public.library_canvas_templates;
create trigger library_canvas_templates_set_updated_at
  before update on public.library_canvas_templates
  for each row execute function public.set_updated_at();
