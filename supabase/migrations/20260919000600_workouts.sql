-- T026 · Spec 02 §9 — Mini gym tracker (spec 07)

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid unique references public.activities(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  performed_at timestamptz not null default now(),
  duration_minutes int check (duration_minutes > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_workouts_owner_performed on public.workouts (owner_id, performed_at desc);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  position int not null default 0,
  name text not null check (char_length(trim(name)) between 1 and 80),
  sets int check (sets > 0),
  reps text,
  weight text,
  duration_minutes int check (duration_minutes > 0),
  notes text
);

create index idx_workout_exercises_workout on public.workout_exercises (workout_id, position);

alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;

create policy "workouts_owner" on public.workouts
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- `workouts` solo se filtra por owner_id, así que este exists no entra en ciclo de RLS.
create policy "wex_owner" on public.workout_exercises
  for all to authenticated
  using (exists (select 1 from public.workouts w
                  where w.id = workout_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from public.workouts w
                       where w.id = workout_id and w.owner_id = auth.uid()));
