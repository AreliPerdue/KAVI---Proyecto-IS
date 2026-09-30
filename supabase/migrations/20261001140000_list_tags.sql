-- T211 · Spec 10 RF-L22 — Etiquetas para agrupar listas
--
-- Decisión de fondo: **no hay etiquetas del sistema**. Las sugerencias de la app (Casa,
-- Escuela, Trabajo…) viven en el cliente y al elegir una se crea una etiqueta **de quien la
-- elige**, con su nombre. Así toda etiqueta tiene dueño y se puede renombrar o borrar sin
-- pedir permiso a nadie.
--
-- La alternativa era filas globales con un `is_system`, como los temas. Ahí eso tenía
-- sentido porque los temas traen dimensión y color que el producto define; una etiqueta es
-- solo una palabra que alguien eligió, y hacerla global obliga a una tabla de
-- personalizaciones por usuario para poder renombrar "Escuela" a "Uni".

create table if not exists public.list_tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 24),
  created_at timestamptz not null default now(),
  -- Sin distinguir mayúsculas: "Casa" y "casa" serían dos montones para lo mismo.
  unique (owner_id, name)
);

create index if not exists idx_list_tags_owner on public.list_tags (owner_id, name);

create table if not exists public.list_tag_links (
  list_id uuid not null references public.lists(id) on delete cascade,
  tag_id uuid not null references public.list_tags(id) on delete cascade,
  primary key (list_id, tag_id)
);

create index if not exists idx_list_tag_links_tag on public.list_tag_links (tag_id);

alter table public.list_tags enable row level security;
alter table public.list_tag_links enable row level security;

create policy "list_tags_select_own" on public.list_tags
  for select to authenticated using (owner_id = auth.uid());
create policy "list_tags_cud_own" on public.list_tags
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

/*
 * Etiquetar es cosa de quien mira, no de la lista.
 *
 * En una lista compartida cada quien la agrupa como le sirve: que yo la etiquete "Casa" no
 * tiene por qué aparecerle a la otra persona como "Casa". Por eso el vínculo exige que la
 * etiqueta sea tuya, y ver el vínculo también: si la etiqueta es tuya, el vínculo es tuyo.
 */
create policy "list_tag_links_select" on public.list_tag_links
  for select to authenticated
  using (exists (select 1 from public.list_tags t where t.id = tag_id and t.owner_id = auth.uid()));

create policy "list_tag_links_cud" on public.list_tag_links
  for all to authenticated
  using (exists (select 1 from public.list_tags t where t.id = tag_id and t.owner_id = auth.uid()))
  with check (
    exists (select 1 from public.list_tags t where t.id = tag_id and t.owner_id = auth.uid())
    and public.can_view_list(list_id)
  );
