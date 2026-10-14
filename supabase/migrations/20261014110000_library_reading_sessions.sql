-- KAVI Library · Tiempo de lectura: una fila por sesión (spec 13b, RF-BR11 – RF-BR13; T318).
--
-- La app cuenta el tiempo mientras el libro está abierto (sin segundo plano ni más de 5 min sin tocar nada) y
-- guarda la sesión al salir, y cada minuto mientras dura (mismo id: se reescribe). El total de un libro y los
-- resúmenes se calculan de aquí; no se guardan aparte. Las de menos de un minuto no se guardan (fue un vistazo).
-- El id lo pone el cliente: se lee sin conexión y se sube después (RF-BR3).

create table if not exists public.library_reading_sessions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.library_items(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  -- Lo leído de verdad, sin pausas: nunca más que lo que duró la sesión (con un margen por relojes).
  seconds integer not null check (seconds between 60 and 86400),
  start_locator jsonb,
  end_locator jsonb,
  start_progress numeric(5, 4) check (start_progress between 0 and 1),
  end_progress numeric(5, 4) check (end_progress between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at >= started_at),
  check (seconds <= extract(epoch from (ended_at - started_at)) + 60)
);

create index if not exists idx_library_reading_sessions_owner on public.library_reading_sessions (owner_id, started_at desc);
create index if not exists idx_library_reading_sessions_item on public.library_reading_sessions (item_id);

alter table public.library_reading_sessions enable row level security;

drop policy if exists "library_reading_sessions_select_own" on public.library_reading_sessions;
create policy "library_reading_sessions_select_own" on public.library_reading_sessions
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists "library_reading_sessions_insert_own" on public.library_reading_sessions;
create policy "library_reading_sessions_insert_own" on public.library_reading_sessions
  for insert to authenticated with check (owner_id = auth.uid() and public.library_item_is_mine(item_id));

drop policy if exists "library_reading_sessions_update_own" on public.library_reading_sessions;
create policy "library_reading_sessions_update_own" on public.library_reading_sessions
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.library_item_is_mine(item_id));

drop policy if exists "library_reading_sessions_delete_own" on public.library_reading_sessions;
create policy "library_reading_sessions_delete_own" on public.library_reading_sessions
  for delete to authenticated using (owner_id = auth.uid());

drop trigger if exists library_reading_sessions_set_updated_at on public.library_reading_sessions;
create trigger library_reading_sessions_set_updated_at
  before update on public.library_reading_sessions
  for each row execute function public.set_updated_at();
