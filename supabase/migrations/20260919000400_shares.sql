-- T024 · Spec 02 §5–§7 — Compartir calendario y actividades + política SELECT de activities

create table public.calendar_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  shared_with_id uuid not null references public.profiles(id) on delete cascade,
  visibility text not null default 'busy' check (visibility in ('busy','details')),
  created_at timestamptz not null default now(),
  check (owner_id <> shared_with_id),
  unique (owner_id, shared_with_id)
);

alter table public.calendar_shares enable row level security;

create policy "cal_shares_select" on public.calendar_shares
  for select to authenticated
  using (owner_id = auth.uid() or shared_with_id = auth.uid());
-- Solo se comparte con contactos aceptados (RF-S7): el check lo garantiza en BD,
-- no solo en el servicio, porque es lo que protege la privacidad del calendario.
create policy "cal_shares_cud_owner" on public.calendar_shares
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and public.are_connected(owner_id, shared_with_id));

create table public.activity_shares (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  shared_with_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (activity_id, shared_with_id)
);

create index idx_activity_shares_recipient on public.activity_shares (shared_with_id, status);

alter table public.activity_shares enable row level security;

create policy "act_shares_select" on public.activity_shares
  for select to authenticated
  using (shared_with_id = auth.uid() or public.owns_activity(activity_id, auth.uid()));
create policy "act_shares_insert_owner" on public.activity_shares
  for insert to authenticated
  with check (public.owns_activity(activity_id, auth.uid()));
create policy "act_shares_update_recipient" on public.activity_shares
  for update to authenticated
  using (shared_with_id = auth.uid()) with check (shared_with_id = auth.uid());
create policy "act_shares_delete" on public.activity_shares
  for delete to authenticated
  using (shared_with_id = auth.uid() or public.owns_activity(activity_id, auth.uid()));

/**
 * Helpers SECURITY DEFINER para la política SELECT de `activities`.
 * Mismo motivo que `owns_activity`: consultar estas tablas desde una política de
 * `activities` con un `exists` normal dispararía sus propias políticas, que a su vez
 * consultan `activities`. Saltar RLS aquí rompe el ciclo; la condición que evalúan es
 * exactamente la misma que evaluaría la política, así que no amplía la visibilidad.
 */
create or replace function public.is_activity_shared_with(p_activity uuid, p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.activity_shares s
    where s.activity_id = p_activity and s.shared_with_id = p_user and s.status = 'accepted'
  );
$$;

create or replace function public.shares_calendar_details(p_owner uuid, p_viewer uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.calendar_shares c
    where c.owner_id = p_owner and c.shared_with_id = p_viewer and c.visibility = 'details'
  );
$$;

revoke all on function public.is_activity_shared_with(uuid, uuid) from public;
revoke all on function public.shares_calendar_details(uuid, uuid) from public;
grant execute on function public.is_activity_shared_with(uuid, uuid) to authenticated;
grant execute on function public.shares_calendar_details(uuid, uuid) to authenticated;

/**
 * Spec 02 §7. La visibilidad 'busy' NO aparece aquí a propósito: no expone ninguna
 * fila. La disponibilidad se sirve por `get_availability`, que devuelve solo bloques
 * (inicio/fin) sin título ni descripción.
 */
create policy "activities_select" on public.activities
  for select to authenticated using (
    owner_id = auth.uid()
    or public.is_activity_shared_with(id, auth.uid())
    or public.shares_calendar_details(owner_id, auth.uid())
  );
