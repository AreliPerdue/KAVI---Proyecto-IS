-- T023 · Spec 02 §4, Spec 06 — Conexiones, color por contacto y búsqueda por correo

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

-- Evita que A→B y B→A coexistan como dos solicitudes distintas.
create unique index idx_connections_pair on public.connections
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.connections enable row level security;

create policy "connections_select_own" on public.connections
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "connections_insert_own" on public.connections
  for insert to authenticated with check (requester_id = auth.uid());
create policy "connections_update_addressee" on public.connections
  for update to authenticated
  using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());
create policy "connections_delete_own" on public.connections
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

/** ¿Hay conexión aceptada entre a y b? Usada por las políticas de shares. */
create or replace function public.are_connected(a uuid, b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.connections c
    where c.status = 'accepted'
      and ((c.requester_id = a and c.addressee_id = b)
        or (c.requester_id = b and c.addressee_id = a))
  );
$$;

revoke all on function public.are_connected(uuid, uuid) from public;
grant execute on function public.are_connected(uuid, uuid) to authenticated;

-- RF-S15 · Color con el que YO veo a un contacto. Es preferencia de quien mira.
create table public.contact_colors (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid not null references public.profiles(id) on delete cascade,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  primary key (owner_id, contact_id)
);

alter table public.contact_colors enable row level security;

create policy "contact_colors_own" on public.contact_colors
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

/**
 * RF-S2 · Al romper la conexión desaparecen todos los shares entre ambos.
 * Va en un trigger y no en el servicio porque la RLS de `calendar_shares` solo deja
 * borrar las filas propias: el cliente no puede retirar el share que la otra persona
 * creó hacia él, y quedaría colgado dándole acceso a un excontacto.
 */
create or replace function public.revoke_shares_between()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  a uuid := old.requester_id;
  b uuid := old.addressee_id;
begin
  delete from public.calendar_shares
   where (owner_id = a and shared_with_id = b) or (owner_id = b and shared_with_id = a);

  delete from public.activity_shares s
   using public.activities act
   where s.activity_id = act.id
     and ((act.owner_id = a and s.shared_with_id = b)
       or (act.owner_id = b and s.shared_with_id = a));

  delete from public.reminder_recipients r
   using public.reminders rem, public.activities act
   where r.reminder_id = rem.id
     and rem.activity_id = act.id
     and ((act.owner_id = a and r.user_id = b)
       or (act.owner_id = b and r.user_id = a));

  delete from public.contact_colors
   where (owner_id = a and contact_id = b) or (owner_id = b and contact_id = a);

  return old;
end;
$$;

/**
 * RF-S1 · Búsqueda por correo EXACTO. El correo vive en auth.users, que el cliente
 * no puede leer, de ahí el SECURITY DEFINER. Exigir el correo completo es lo que
 * impide enumerar quién está registrado: no hay búsqueda por prefijo ni parcial.
 */
create or replace function public.search_profile_by_email(p_email text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  created_at timestamptz
)
language sql security definer stable set search_path = public, auth as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(trim(p_email))
    and p.id <> auth.uid()
  limit 1;
$$;

revoke all on function public.search_profile_by_email(text) from public;
grant execute on function public.search_profile_by_email(text) to authenticated;
