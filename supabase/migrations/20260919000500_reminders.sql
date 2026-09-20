-- T025 · Spec 02 §8 — Reminders y reminders compartidos (RF-C10, RF-S12)

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  offset_minutes int not null check (offset_minutes >= 0),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (activity_id, offset_minutes)
);

create table public.reminder_recipients (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  unique (reminder_id, user_id)
);

create index idx_reminder_recipients_user on public.reminder_recipients (user_id);

alter table public.reminders enable row level security;
alter table public.reminder_recipients enable row level security;

create policy "reminders_select" on public.reminders
  for select to authenticated
  using (created_by = auth.uid()
         or exists (select 1 from public.reminder_recipients r
                    where r.reminder_id = id and r.user_id = auth.uid()));
create policy "reminders_cud_activity_owner" on public.reminders
  for all to authenticated
  using (public.owns_activity(activity_id, auth.uid()))
  with check (public.owns_activity(activity_id, auth.uid()) and created_by = auth.uid());

create policy "rem_recipients_select_own" on public.reminder_recipients
  for select to authenticated using (user_id = auth.uid());
-- Cada quien silencia su propia copia sin afectar a los demás (RF-S12).
create policy "rem_recipients_update_own" on public.reminder_recipients
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

/**
 * Spec 02 §10 · Mantiene `reminder_recipients` al día para una actividad: una fila por
 * el dueño y una por cada persona con el share aceptado, y fuera quien ya no aplica.
 * No hay política de INSERT sobre la tabla justamente porque las filas solo nacen aquí:
 * un cliente no debe poder darse de alta en los recordatorios de otro.
 */
create or replace function public.add_reminder_recipients(p_activity uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.reminder_recipients (reminder_id, user_id)
  select r.id, dest.user_id
  from public.reminders r
  cross join lateral (
    select a.owner_id as user_id from public.activities a where a.id = r.activity_id
    union
    select s.shared_with_id from public.activity_shares s
     where s.activity_id = r.activity_id and s.status = 'accepted'
  ) dest
  where r.activity_id = p_activity
  on conflict (reminder_id, user_id) do nothing;

  delete from public.reminder_recipients rr
  using public.reminders r
  where rr.reminder_id = r.id
    and r.activity_id = p_activity
    and not exists (select 1 from public.activities a
                     where a.id = r.activity_id and a.owner_id = rr.user_id)
    and not exists (select 1 from public.activity_shares s
                     where s.activity_id = r.activity_id
                       and s.shared_with_id = rr.user_id
                       and s.status = 'accepted');
end;
$$;

revoke all on function public.add_reminder_recipients(uuid) from public;
grant execute on function public.add_reminder_recipients(uuid) to authenticated;

-- Se dispara solo: crear un reminder, o aceptar/rechazar una invitación, deja las
-- copias correctas sin que el cliente tenga que acordarse de llamar a nada.
create or replace function public.tg_sync_reminder_recipients()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.add_reminder_recipients(
    case tg_table_name when 'reminders' then new.activity_id else new.activity_id end
  );
  return new;
end;
$$;

create trigger reminders_sync_recipients
  after insert on public.reminders
  for each row execute function public.tg_sync_reminder_recipients();

create trigger activity_shares_sync_recipients
  after insert or update of status on public.activity_shares
  for each row execute function public.tg_sync_reminder_recipients();

-- Ahora que existen todas las tablas implicadas, se engancha la revocación de shares
-- al romper una conexión (RF-S2, función definida en 20260919000300).
create trigger connections_revoke_shares
  after delete on public.connections
  for each row execute function public.revoke_shares_between();
