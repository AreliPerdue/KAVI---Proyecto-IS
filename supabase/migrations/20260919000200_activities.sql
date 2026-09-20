-- T022 · Spec 02 §3 — Actividades (entidad central), índice de rango y updated_at
-- La política SELECT necesita los shares, así que se define en 20260919000400.

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  theme_id uuid references public.themes(id) on delete set null,
  dimension public.dimension,
  color text,
  icon text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  recurrence_rule text,
  recurrence_parent_id uuid references public.activities(id) on delete cascade,
  is_gym boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  -- Una instancia materializada nunca lleva regla propia: la regla vive en la madre.
  check (recurrence_parent_id is null or recurrence_rule is null)
);

-- NFR-1: la consulta del calendario siempre es por dueño + rango.
create index idx_activities_owner_range on public.activities (owner_id, start_at);
create index idx_activities_parent on public.activities (recurrence_parent_id)
  where recurrence_parent_id is not null;

alter table public.activities enable row level security;

create policy "activities_cud_owner" on public.activities
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger activities_set_updated_at
  before update on public.activities
  for each row execute function public.set_updated_at();

/**
 * ¿Es mía esta actividad? SECURITY DEFINER a propósito: otras políticas necesitan
 * preguntarlo, y si lo consultaran con un `exists` normal, la RLS de `activities`
 * volvería a consultar `activity_shares` y ésta a `activities` — recursión infinita.
 * Al saltar RLS aquí se corta el ciclo sin ampliar lo que nadie puede ver.
 */
create or replace function public.owns_activity(p_activity uuid, p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.activities a where a.id = p_activity and a.owner_id = p_user
  );
$$;

revoke all on function public.owns_activity(uuid, uuid) from public;
grant execute on function public.owns_activity(uuid, uuid) to authenticated;
