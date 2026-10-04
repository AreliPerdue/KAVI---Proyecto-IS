-- T239 · Spec 07 v2 (RF-F11 – RF-F16, RF-F52, RF-F58) — Modelo de datos del gym tracker
--
-- Jerarquía: sesión (workouts) → grupo (exercise_groups) → ejercicio en sesión
-- (workout_exercises) → serie (workout_sets) → segmento (set_segments). Más el catálogo
-- (exercises), las preferencias por ejercicio (user_exercise_prefs) y las decisiones de
-- racha (workout_streak_events).
--
-- **Solo agrega.** Ninguna columna existente se renombra, se reescribe ni se borra: el
-- texto libre de v1 (`name`, `sets`, `reps`, `weight`, `duration_minutes`) se queda donde
-- está y sigue siendo legible (RF-F61). El código de v1 sigue funcionando con este esquema,
-- así que la migración se puede correr antes del deploy sin romper nada.
--
-- **Se puede correr dos veces.** `if not exists`, `drop … if exists` antes de crear y
-- `create or replace` en todo.

-- ─── 1. Catálogo ─────────────────────────────────────────────────────────────────────

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  -- Identidad estable para el `upsert` del catálogo (RF-F20). Los personalizados llevan
  -- `custom-<uuid>`, así que nunca chocan con los del sistema.
  slug text not null unique,
  name_es text not null check (char_length(trim(name_es)) between 1 and 120),
  name_en text check (char_length(name_en) <= 120),
  aliases text[] not null default '{}',
  -- Familia o "variante de": agrupa "Press de banca con pausa" bajo "Press plano".
  family text,
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  equipment text[] not null default '{}',
  movement_pattern text,
  mechanic text check (mechanic in ('compound', 'isolation')),
  laterality text check (laterality in ('bilateral', 'unilateral', 'alternating')),
  tracking_type text not null default 'weight_reps' check (tracking_type in (
    'weight_reps', 'bodyweight_reps', 'weighted_bodyweight', 'assisted_bodyweight',
    'reps_only', 'duration', 'weight_duration', 'distance_duration', 'weight_distance'
  )),
  -- null = del sistema. Con dueño = personalizado (RF-F24).
  created_by uuid references public.profiles(id) on delete cascade,
  -- Los personalizados se archivan, no se borran: pueden tener historial colgando.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exercises_created_by on public.exercises (created_by);

alter table public.exercises enable row level security;

drop policy if exists "exercises_select" on public.exercises;
create policy "exercises_select" on public.exercises
  for select to authenticated using (created_by is null or created_by = auth.uid());

-- Solo personalizados propios. Los del sistema los escribe la migración del catálogo.
drop policy if exists "exercises_insert_own" on public.exercises;
create policy "exercises_insert_own" on public.exercises
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "exercises_update_own" on public.exercises;
create policy "exercises_update_own" on public.exercises
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop trigger if exists exercises_set_updated_at on public.exercises;
create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

-- Favorito, nota fija y último uso, por persona y ejercicio (RF-F25, RF-F52).
create table if not exists public.user_exercise_prefs (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  is_favorite boolean not null default false,
  sticky_note text check (char_length(sticky_note) <= 500),
  last_used_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (owner_id, exercise_id)
);

alter table public.user_exercise_prefs enable row level security;

drop policy if exists "user_exercise_prefs_owner" on public.user_exercise_prefs;
create policy "user_exercise_prefs_owner" on public.user_exercise_prefs
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop trigger if exists user_exercise_prefs_set_updated_at on public.user_exercise_prefs;
create trigger user_exercise_prefs_set_updated_at
  before update on public.user_exercise_prefs
  for each row execute function public.set_updated_at();

-- ─── 2. Herencia de dueño ─────────────────────────────────────────────────────────────
--
-- Cada tabla hija lleva `owner_id` copiado de su padre, para que **toda** política sea
-- `owner_id = auth.uid()` sobre la propia fila (RF-F16). Dos razones:
--
--  - Sin esto, la política de un segmento tendría que subir tres niveles con `exists`
--    (segmento → serie → ejercicio → sesión) por cada fila leída.
--  - Una política que depende de otra tabla es la que rompió `INSERT … RETURNING` en
--    `lists` (42501 idéntico al de una sesión caducada). Con la columna propia no hay
--    nada que mirar fuera de la fila.
--
-- La función corre con los permisos de quien escribe (no es `security definer`): si el
-- padre es de otra persona, la RLS lo esconde, no se encuentra, y la escritura se
-- rechaza. Así nadie puede colgar una serie de la sesión ajena.

create or replace function public.gym_inherit_owner()
returns trigger language plpgsql set search_path = public as $$
declare
  v_parent_table text := tg_argv[0];
  v_parent_column text := tg_argv[1];
  v_parent_id uuid := (to_jsonb(new) ->> v_parent_column)::uuid;
  v_owner uuid;
begin
  execute format('select owner_id from public.%I where id = $1', v_parent_table)
    into v_owner using v_parent_id;
  if v_owner is null then
    raise exception 'No existe o no es tuyo: %.%', v_parent_table, v_parent_id
      using errcode = '42501';
  end if;
  new.owner_id := v_owner;
  return new;
end;
$$;

revoke execute on function public.gym_inherit_owner() from anon;

-- ─── 3. Sesión: se extiende `workouts` ────────────────────────────────────────────────

-- Las sesiones que ya existen están terminadas; las nuevas las crea la app como `active`.
alter table public.workouts
  add column if not exists status text not null default 'completed'
    check (status in ('active', 'completed', 'discarded')),
  add column if not exists ended_at timestamptz,
  add column if not exists bodyweight_kg numeric(5, 2) check (bodyweight_kg > 0),
  add column if not exists energy smallint check (energy between 1 and 5),
  add column if not exists pump smallint check (pump between 1 and 5),
  add column if not exists tags text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now(),
  -- Se marca al editar una sesión ya terminada (RF-F42).
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz;

drop trigger if exists workouts_set_updated_at on public.workouts;
create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

-- ─── 4. Grupos (superseries, circuitos…) ──────────────────────────────────────────────

create table if not exists public.exercise_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  type text not null check (type in (
    'superset', 'compound_set', 'tri_set', 'giant_set', 'circuit',
    'pre_exhaust', 'post_exhaust', 'contrast', 'paired_sets'
  )),
  rounds smallint check (rounds > 0),
  rest_after_round_sec int check (rest_after_round_sec >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_exercise_groups_workout on public.exercise_groups (workout_id);

alter table public.exercise_groups enable row level security;

drop policy if exists "exercise_groups_owner" on public.exercise_groups;
create policy "exercise_groups_owner" on public.exercise_groups
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop trigger if exists exercise_groups_inherit_owner on public.exercise_groups;
create trigger exercise_groups_inherit_owner
  before insert or update on public.exercise_groups
  for each row execute function public.gym_inherit_owner('workouts', 'workout_id');

drop trigger if exists exercise_groups_set_updated_at on public.exercise_groups;
create trigger exercise_groups_set_updated_at
  before update on public.exercise_groups
  for each row execute function public.set_updated_at();

-- ─── 5. Ejercicio en sesión: se extiende `workout_exercises` ─────────────────────────

alter table public.workout_exercises
  add column if not exists owner_id uuid references public.profiles(id) on delete cascade,
  add column if not exists exercise_id uuid references public.exercises(id) on delete set null,
  add column if not exists group_id uuid references public.exercise_groups(id) on delete set null,
  add column if not exists group_position smallint check (group_position > 0),
  add column if not exists protocol text,
  add column if not exists protocol_config jsonb,
  add column if not exists rest_target_sec int check (rest_target_sec >= 0),
  -- Cuándo se convirtió el texto libre de v1 en series (RF-F62). Es lo que hace la
  -- conversión idempotente: lo convertido no se vuelve a convertir aunque luego se
  -- borren sus series a propósito.
  add column if not exists legacy_converted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

-- Rellenar el dueño de lo que ya existe antes de exigirlo.
update public.workout_exercises we
   set owner_id = w.owner_id
  from public.workouts w
 where w.id = we.workout_id
   and we.owner_id is null;

alter table public.workout_exercises alter column owner_id set not null;

create index if not exists idx_workout_exercises_owner_exercise
  on public.workout_exercises (owner_id, exercise_id);

drop trigger if exists workout_exercises_inherit_owner on public.workout_exercises;
create trigger workout_exercises_inherit_owner
  before insert or update on public.workout_exercises
  for each row execute function public.gym_inherit_owner('workouts', 'workout_id');

drop trigger if exists workout_exercises_set_updated_at on public.workout_exercises;
create trigger workout_exercises_set_updated_at
  before update on public.workout_exercises
  for each row execute function public.set_updated_at();

-- La política pasa del `exists` contra `workouts` a la columna propia. Se crea la nueva
-- antes de quitar la vieja para que no haya un instante sin política.
drop policy if exists "wex_owner_v2" on public.workout_exercises;
create policy "wex_owner_v2" on public.workout_exercises
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "wex_owner" on public.workout_exercises;

-- ─── 6. Series ────────────────────────────────────────────────────────────────────────

create table if not exists public.workout_sets (
  -- La genera el cliente (RF-F16): así una serie existe en pantalla antes de que el
  -- servidor conteste, y reenviarla tras un cierre es un `upsert`, no un duplicado.
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  -- `numeric` como en Lists: mover una serie entre dos es escribir una sola fila.
  sort_order numeric not null default 0,
  set_type text not null default 'working' check (set_type in (
    'warmup', 'feeder', 'working', 'top_set', 'backoff', 'failure', 'amrap', 'technique', 'max_test'
  )),
  -- Claves de la spec 07 §6.2, componibles. Sin `check`: la lista vive en la app y crece
  -- sin pedir migración.
  intensifiers text[] not null default '{}',
  -- Lo planeado: { reps_min, reps_max, weight_kg, rir, rpe, duration_sec }.
  target jsonb,
  rpe numeric(3, 1) check (rpe between 1 and 10),
  rir numeric(3, 1) check (rir between 0 and 10),
  failure text check (failure in ('technical', 'muscular', 'absolute')),
  tempo text check (char_length(tempo) <= 20),
  rom text check (rom in ('full', 'partial', 'lengthened', 'shortened')),
  side text check (side in ('both', 'left', 'right', 'alternating')),
  -- { added_kg, assistance_kg, bands, chains_kg, deficit_cm, pin_height }.
  load_mods jsonb,
  gear text[] not null default '{}',
  spotter boolean not null default false,
  -- Descanso real medido por el timer después de esta serie.
  rest_after_sec int check (rest_after_sec >= 0),
  -- null = pendiente; con fecha = hecha. Una sola columna, sin booleano que la contradiga.
  completed_at timestamptz,
  notes text check (char_length(notes) <= 500),
  tags text[] not null default '{}',
  -- Creada por la conversión del texto de v1 (RF-F62). Revertirla es borrar estas.
  from_legacy boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_workout_sets_exercise on public.workout_sets (workout_exercise_id, sort_order);

alter table public.workout_sets enable row level security;

drop policy if exists "workout_sets_owner" on public.workout_sets;
create policy "workout_sets_owner" on public.workout_sets
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop trigger if exists workout_sets_inherit_owner on public.workout_sets;
create trigger workout_sets_inherit_owner
  before insert or update on public.workout_sets
  for each row execute function public.gym_inherit_owner('workout_exercises', 'workout_exercise_id');

drop trigger if exists workout_sets_set_updated_at on public.workout_sets;
create trigger workout_sets_set_updated_at
  before update on public.workout_sets
  for each row execute function public.set_updated_at();

-- ─── 7. Segmentos ─────────────────────────────────────────────────────────────────────
--
-- Una serie normal es un segmento `main`. Un drop set triple es una serie con cuatro
-- segmentos. Así volumen, PRs y edición se calculan igual para todo (RF-F15).

create table if not exists public.set_segments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  set_id uuid not null references public.workout_sets(id) on delete cascade,
  sort_order smallint not null default 0,
  kind text not null default 'main' check (kind in (
    'main', 'drop', 'rest_pause', 'myo_activation', 'myo_mini', 'cluster',
    'forced', 'negative', 'partials', 'iso_hold', 'loaded_stretch',
    'twenty_ones_bottom', 'twenty_ones_top', 'twenty_ones_full', 'bfr'
  )),
  -- Siempre en kg (canónico); `input_unit` recuerda en qué se escribió.
  weight_kg numeric(7, 2) check (weight_kg >= 0),
  input_unit text not null default 'kg' check (input_unit in ('kg', 'lb')),
  reps smallint check (reps >= 0),
  reps_left smallint check (reps_left >= 0),
  reps_right smallint check (reps_right >= 0),
  partial_reps smallint check (partial_reps >= 0),
  forced_reps smallint check (forced_reps >= 0),
  cheat_reps smallint check (cheat_reps >= 0),
  duration_sec int check (duration_sec >= 0),
  distance_m numeric(9, 2) check (distance_m >= 0),
  rest_before_sec int check (rest_before_sec >= 0),
  -- Drop mecánico: mismo peso, otra variante del ejercicio.
  variant_exercise_id uuid references public.exercises(id) on delete set null,
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_set_segments_set on public.set_segments (set_id, sort_order);

alter table public.set_segments enable row level security;

drop policy if exists "set_segments_owner" on public.set_segments;
create policy "set_segments_owner" on public.set_segments
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop trigger if exists set_segments_inherit_owner on public.set_segments;
create trigger set_segments_inherit_owner
  before insert or update on public.set_segments
  for each row execute function public.gym_inherit_owner('workout_sets', 'set_id');

drop trigger if exists set_segments_set_updated_at on public.set_segments;
create trigger set_segments_set_updated_at
  before update on public.set_segments
  for each row execute function public.set_updated_at();

-- ─── 8. Racha de Hierro (RF-F58) ─────────────────────────────────────────────────────
--
-- Una semana sin entreno no rompe la racha: la deja en pausa hasta que la persona decide.
-- Aquí queda esa decisión, con su nota y sus motivos. Sin fila para una semana vacía, la
-- racha sigue en pausa.

create table if not exists public.workout_streak_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  -- Lunes de la semana. Fecha flotante, como `list_items.due_date`: es una semana del
  -- calendario de quien entrena, no un instante.
  week_start date not null,
  decision text not null check (decision in ('kept', 'reset')),
  note text check (char_length(note) <= 500),
  reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (owner_id, week_start)
);

alter table public.workout_streak_events enable row level security;

drop policy if exists "workout_streak_events_owner" on public.workout_streak_events;
create policy "workout_streak_events_owner" on public.workout_streak_events
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ─── 9. Estadísticas de admin ─────────────────────────────────────────────────────────
--
-- Los entrenamientos ahora se borran con `deleted_at` (RF-F16). Sin este cambio, el panel
-- seguiría contando los borrados. Misma firma; solo cambia la última línea.

create or replace function public.admin_stats()
returns table (
  total_accounts bigint,
  accounts_7d bigint,
  accounts_30d bigint,
  active_users_30d bigint,
  total_activities bigint,
  activities_30d bigint,
  accepted_connections bigint,
  shared_calendars bigint,
  custom_themes bigint,
  total_workouts bigint
)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Solo las cuentas administradoras pueden consultar estadísticas'
      using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    (select count(distinct owner_id) from public.activities
      where updated_at > now() - interval '30 days'),
    (select count(*) from public.activities),
    (select count(*) from public.activities where created_at > now() - interval '30 days'),
    (select count(*) from public.connections where status = 'accepted'),
    (select count(*) from public.calendar_shares),
    (select count(*) from public.themes where not is_system),
    (select count(*) from public.workouts where deleted_at is null);
end;
$$;

-- ─── 10. Deuda: permiso de `can_edit_list` ───────────────────────────────────────────
--
-- Vivía en `…000900_grants.sql`, que corre antes de que `can_edit_list` exista, así que un
-- `db reset` desde cero fallaba (NFR-16). En tu proyecto ya se aplicó; repetirlo no cambia nada.
revoke execute on function public.can_edit_list(uuid) from anon;
