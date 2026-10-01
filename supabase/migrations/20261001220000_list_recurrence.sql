-- T208/T209 · Spec 10 RF-L19, RF-L20 — Listas que se repiten y su historial
--
-- Una rutina no es una lista que se hace una vez: es la misma lista que se vuelve a
-- empezar. Para poder decir algo sobre cómo ha ido hace falta registrar **cada vuelta**.
--
-- Tres decisiones que no se leen solas en el esquema:
--
-- 1. El historial guarda **conteos**, no copias. Una fila por vuelta con cuántos elementos
--    se completaron de cuántos; guardar cada elemento de cada día haría crecer la tabla sin
--    que nadie la consulte.
--
-- 2. `list_run_items` existe de todas formas, pero solo mientras la vuelta está abierta y
--    **solo para lo palomeado**. Hace falta porque durante el periodo de gracia conviven dos
--    vueltas —la de ayer sigue editable hasta las 15:00 de hoy— y con un único
--    `completed_at` por elemento no se pueden distinguir. Al cerrar una vuelta se resumen
--    sus filas en los conteos y se descartan.
--
-- 3. Ninguna política de SELECT pregunta por una función que consulte **su propia** tabla.
--    `list_runs` se resuelve por `list_id`, que apunta a una fila que ya existe; es la
--    lección de `lists_select`, que no veía la fila recién insertada.

alter table public.lists
  add column if not exists recurrence_rule text,
  -- Desde cuándo cuenta la regla. Sin ancla, "cada lunes" no sabe qué lunes fue el primero.
  add column if not exists recurrence_start date;

create table if not exists public.list_runs (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  run_date date not null,
  /* null = abierta. Una vuelta sigue editable hasta las 15:00 del día siguiente: la gente
     palomea tarde, y cerrar a medianoche registraría como incumplido algo que sí se hizo. */
  closed_at timestamptz,
  completed_count int not null default 0,
  total_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (list_id, run_date)
);

create index if not exists idx_list_runs_lista on public.list_runs (list_id, run_date desc);

create table if not exists public.list_run_items (
  run_id uuid not null references public.list_runs(id) on delete cascade,
  item_id uuid not null references public.list_items(id) on delete cascade,
  completed_at timestamptz not null default now(),
  completed_by uuid not null references public.profiles(id) on delete cascade,
  primary key (run_id, item_id)
);

alter table public.list_runs enable row level security;
alter table public.list_run_items enable row level security;

create policy "list_runs_select" on public.list_runs
  for select to authenticated using (public.can_view_list(list_id));
create policy "list_runs_cud" on public.list_runs
  for all to authenticated using (public.can_edit_list(list_id)) with check (public.can_edit_list(list_id));

create policy "list_run_items_select" on public.list_run_items
  for select to authenticated
  using (exists (select 1 from public.list_runs r where r.id = run_id and public.can_view_list(r.list_id)));
create policy "list_run_items_cud" on public.list_run_items
  for all to authenticated
  using (exists (select 1 from public.list_runs r where r.id = run_id and public.can_edit_list(r.list_id)))
  with check (exists (select 1 from public.list_runs r where r.id = run_id and public.can_edit_list(r.list_id)));
