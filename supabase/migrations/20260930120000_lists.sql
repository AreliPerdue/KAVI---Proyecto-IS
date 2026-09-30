-- T195 · Spec 10 — KAVI Lists: listas, secciones y elementos
--
-- Tres decisiones de esquema que no son obvias y conviene dejar escritas:
--
-- 1. `sort_order` es `numeric` y no un entero de posición. Mover un elemento entre dos
--    vecinos se resuelve escribiendo **una** fila con el promedio de sus órdenes; con
--    enteros habría que renumerar todo lo que queda debajo, y en una lista compartida dos
--    personas reordenando a la vez se pisarían.
--
-- 2. `due_date` es `date` y no `timestamptz`, en contra de la regla general del proyecto.
--    "El sábado" no es un instante: es un día del calendario de quien lo escribió. Como
--    `timestamptz` se correría de día al cruzar husos horarios. La hora, cuando existe, sí
--    es un dato aparte (`due_time`) y solo sirve para el recordatorio: no coloca el
--    elemento en la rejilla del calendario (spec 10, RF-L12).
--
-- 3. `can_edit_list()` existe desde ahora aunque todavía no haya listas compartidas. Las
--    políticas de secciones y elementos preguntan por ella en vez de consultar `lists`
--    directamente, así que cuando llegue `list_shares` (fase 2) solo cambia la función y
--    ninguna política. Es también la forma de no repetir la recursión de RLS que ya
--    costó una migración correctiva en este repo.

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  icon text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  -- `view` es palabra reservada en SQL; el dominio la llama `view` y el servicio mapea.
  view_mode text not null default 'checklist' check (view_mode in ('checklist', 'grid')),
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  sort_order numeric not null default 1024,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.list_sections (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  sort_order numeric not null default 1024
);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  -- Al borrar una sección sus elementos **no** se van con ella: vuelven a la lista sin
  -- agrupar. Borrar una forma de ordenar no debería borrar lo ordenado.
  section_id uuid references public.list_sections(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  note text check (note is null or char_length(note) <= 500),
  sort_order numeric not null default 1024,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  due_date date,
  due_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Palomeado sin quién ni cuándo deja la autoría a medias en una lista compartida.
  check ((completed_at is null) = (completed_by is null))
);

create index if not exists idx_lists_owner on public.lists (owner_id, is_archived, sort_order);
create index if not exists idx_list_sections_list on public.list_sections (list_id, sort_order);
create index if not exists idx_list_items_list on public.list_items (list_id, sort_order);
-- Parcial: la franja del día y los vencidos solo preguntan por lo que tiene fecha, que es
-- la minoría de los elementos de una lista de súper.
create index if not exists idx_list_items_due on public.list_items (list_id, due_date)
  where due_date is not null;

create trigger lists_set_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();

create trigger list_items_set_updated_at
  before update on public.list_items
  for each row execute function public.set_updated_at();

/*
 * Quién puede tocar una lista. Hoy solo su dueño; en la fase 2 se amplía aquí y las
 * políticas de abajo no se enteran.
 *
 * `security definer` por la misma razón que `owns_activity`: cuando existan
 * `list_shares`, su propia RLS querrá consultar `lists` y la de `lists` consultaría
 * `list_shares` — recursión. Saltando RLS dentro de la función se corta el ciclo sin
 * ampliar lo que nadie puede ver, porque la función solo responde sí o no sobre el
 * usuario de la sesión.
 */
create or replace function public.can_edit_list(p_list uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.lists l where l.id = p_list and l.owner_id = auth.uid()
  );
$$;

revoke all on function public.can_edit_list(uuid) from public;
revoke execute on function public.can_edit_list(uuid) from anon;
grant execute on function public.can_edit_list(uuid) to authenticated;

alter table public.lists enable row level security;
alter table public.list_sections enable row level security;
alter table public.list_items enable row level security;

create policy "lists_select" on public.lists
  for select to authenticated using (owner_id = auth.uid());
create policy "lists_cud_owner" on public.lists
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "list_sections_select" on public.list_sections
  for select to authenticated using (public.can_edit_list(list_id));
create policy "list_sections_cud" on public.list_sections
  for all to authenticated using (public.can_edit_list(list_id)) with check (public.can_edit_list(list_id));

create policy "list_items_select" on public.list_items
  for select to authenticated using (public.can_edit_list(list_id));
create policy "list_items_cud" on public.list_items
  for all to authenticated using (public.can_edit_list(list_id)) with check (public.can_edit_list(list_id));
