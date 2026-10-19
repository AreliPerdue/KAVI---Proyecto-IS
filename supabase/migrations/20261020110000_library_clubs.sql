-- KAVI Library · Club de lectura: datos (spec 13f §5; T305).
--
-- Un club es un grupo de contactos que lee el mismo PDF o EPUB. Cada miembro tiene su propia copia (una pieza
-- normal suya en `library_items`, con `club_id` mientras esté conectada) y anotan juntos: las anotaciones del
-- club son filas de `library_annotations` con `club_id`, que ven y editan todos los miembros aceptados. Las
-- "Solo para mí" no llevan `club_id`.
--
-- Quien crea el club es su anfitrión. Al salir, ser quitado o cerrarse el club (también si el anfitrión borra
-- su cuenta), `library_club_disconnect` le deja a cada quien en su copia las anotaciones del club como suyas,
-- con el nombre de quien las hizo (`author_id`), y desde ahí ya no se sincronizan (RF-BC8).
--
-- Solo se invita a contactos aceptados (`are_connected`), hasta 12 personas contando al anfitrión (C5).

-- ─── Tablas ─────────────────────────────────────────────────────────────────────

create table if not exists public.library_clubs (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  -- El libro del anfitrión del que salen las copias, y su huella: tipo y tamaño (todas las copias son el mismo).
  source_item_id uuid references public.library_items(id) on delete set null,
  kind text not null check (kind in ('pdf', 'epub')),
  file_size bigint not null check (file_size between 1 and 52428800),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_library_clubs_host on public.library_clubs (host_id);

create table if not exists public.library_club_members (
  club_id uuid not null references public.library_clubs(id) on delete cascade,
  person_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  -- Su copia, una pieza suya; vacía hasta que acepta.
  item_id uuid references public.library_items(id) on delete set null,
  -- Si los demás ven por dónde va (RF-BC9).
  shows_progress boolean not null default true,
  invited_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (club_id, person_id)
);

create index if not exists idx_library_club_members_person on public.library_club_members (person_id);

alter table public.library_items add column if not exists club_id uuid references public.library_clubs(id) on delete set null;

alter table public.library_annotations add column if not exists club_id uuid references public.library_clubs(id) on delete set null;
-- Quién la hizo (en una copia que quedó del club, la persona original) y quién la cambió por última vez (RF-BC7).
alter table public.library_annotations add column if not exists author_id uuid references public.profiles(id) on delete set null;
alter table public.library_annotations add column if not exists updated_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_library_annotations_club on public.library_annotations (club_id) where club_id is not null;

drop trigger if exists library_clubs_set_updated_at on public.library_clubs;
create trigger library_clubs_set_updated_at
  before update on public.library_clubs
  for each row execute function public.set_updated_at();

-- ─── ¿Quién es quién? ───────────────────────────────────────────────────────────

-- Miembro aceptado del club: ve y edita sus anotaciones.
create or replace function public.library_club_member(p_club uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.library_club_members m
     where m.club_id = p_club and m.person_id = auth.uid() and m.status = 'accepted'
  );
$$;

-- Invitado o miembro: ve el club y a sus miembros (para decidir si acepta).
create or replace function public.library_club_invited(p_club uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.library_club_members m where m.club_id = p_club and m.person_id = auth.uid());
$$;

create or replace function public.library_club_host(p_club uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.library_clubs c where c.id = p_club and c.host_id = auth.uid());
$$;

revoke all on function public.library_club_member(uuid) from public;
revoke all on function public.library_club_invited(uuid) from public;
revoke all on function public.library_club_host(uuid) from public;
grant execute on function public.library_club_member(uuid) to authenticated;
grant execute on function public.library_club_invited(uuid) to authenticated;
grant execute on function public.library_club_host(uuid) to authenticated;

-- ─── Clubes ─────────────────────────────────────────────────────────────────────

-- Al crearlo: su huella sale del libro del anfitrión (solo PDF o EPUB suyo), el anfitrión queda como miembro
-- aceptado con ese libro como su copia, y el libro queda en el club.
create or replace function public.library_clubs_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.library_items;
begin
  select * into v_item from public.library_items where id = new.source_item_id and owner_id = new.host_id;
  if v_item.id is null or v_item.family <> 'book' or v_item.kind not in ('pdf', 'epub') or v_item.file_size <= 0 then
    raise exception 'library_club_source' using errcode = 'P0001', hint = 'library_club_source';
  end if;
  if v_item.club_id is not null then
    raise exception 'library_club_already' using errcode = 'P0001', hint = 'library_club_already';
  end if;
  new.kind := v_item.kind;
  new.file_size := v_item.file_size;
  return new;
end;
$$;

create or replace function public.library_clubs_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.library_club_members (club_id, person_id, status, item_id, invited_by, joined_at)
  values (new.id, new.host_id, 'accepted', new.source_item_id, new.host_id, now());
  update public.library_items set club_id = new.id where id = new.source_item_id;
  return new;
end;
$$;

-- Lo que no cambia de un club: su anfitrión, su libro y su huella.
create or replace function public.library_clubs_before_update()
returns trigger
language plpgsql
as $$
begin
  new.host_id := old.host_id;
  new.source_item_id := old.source_item_id;
  new.kind := old.kind;
  new.file_size := old.file_size;
  return new;
end;
$$;

drop trigger if exists library_clubs_before_insert on public.library_clubs;
create trigger library_clubs_before_insert before insert on public.library_clubs
  for each row execute function public.library_clubs_before_insert();
drop trigger if exists library_clubs_after_insert on public.library_clubs;
create trigger library_clubs_after_insert after insert on public.library_clubs
  for each row execute function public.library_clubs_after_insert();
drop trigger if exists library_clubs_before_update on public.library_clubs;
create trigger library_clubs_before_update before update on public.library_clubs
  for each row execute function public.library_clubs_before_update();

alter table public.library_clubs enable row level security;

drop policy if exists "library_clubs_select" on public.library_clubs;
create policy "library_clubs_select" on public.library_clubs
  for select to authenticated using (host_id = auth.uid() or public.library_club_invited(id));
drop policy if exists "library_clubs_insert_host" on public.library_clubs;
create policy "library_clubs_insert_host" on public.library_clubs
  for insert to authenticated with check (host_id = auth.uid());
drop policy if exists "library_clubs_update_host" on public.library_clubs;
create policy "library_clubs_update_host" on public.library_clubs
  for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());
-- Cerrar el club es borrarlo: antes, cada miembro se queda con lo del club (disparador de abajo).
drop policy if exists "library_clubs_delete_host" on public.library_clubs;
create policy "library_clubs_delete_host" on public.library_clubs
  for delete to authenticated using (host_id = auth.uid());

-- ─── Miembros ───────────────────────────────────────────────────────────────────

-- Hasta 12 personas por club, contando al anfitrión e invitaciones pendientes (C5).
create or replace function public.library_club_members_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.library_club_members where club_id = new.club_id) >= 12 then
    raise exception 'library_club_full' using errcode = 'P0001', hint = 'library_club_full';
  end if;
  return new;
end;
$$;

-- Lo único que cambia una persona en su fila: aceptar (con una copia suya en este club) y si muestra su avance.
create or replace function public.library_club_members_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.club_id := old.club_id;
  new.person_id := old.person_id;
  new.invited_by := old.invited_by;
  new.created_at := old.created_at;
  if old.status = 'accepted' and new.status <> 'accepted' then
    raise exception 'library_club_status' using errcode = 'P0001', hint = 'library_club_status';
  end if;
  if new.status = 'pending' then
    new.item_id := null;
    return new;
  end if;
  -- Aceptar pide una copia suya en este club. Si la persona borra su copia, la fila se queda sin ella.
  if (old.status = 'pending' and new.item_id is null)
     or (new.item_id is not null and new.item_id is distinct from old.item_id and not exists (
       select 1 from public.library_items i where i.id = new.item_id and i.owner_id = new.person_id and i.club_id = new.club_id
     )) then
    raise exception 'library_club_copy' using errcode = 'P0001', hint = 'library_club_copy';
  end if;
  if old.status = 'pending' then
    new.joined_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists library_club_members_before_insert on public.library_club_members;
create trigger library_club_members_before_insert before insert on public.library_club_members
  for each row execute function public.library_club_members_before_insert();
drop trigger if exists library_club_members_before_update on public.library_club_members;
create trigger library_club_members_before_update before update on public.library_club_members
  for each row execute function public.library_club_members_before_update();

alter table public.library_club_members enable row level security;

drop policy if exists "library_club_members_select" on public.library_club_members;
create policy "library_club_members_select" on public.library_club_members
  for select to authenticated using (public.library_club_invited(club_id) or public.library_club_host(club_id));
-- El anfitrión invita a sus contactos aceptados (pendientes y sin copia). Su propia fila la pone el disparador.
drop policy if exists "library_club_members_insert_host" on public.library_club_members;
create policy "library_club_members_insert_host" on public.library_club_members
  for insert to authenticated with check (
    public.library_club_host(club_id)
    and person_id <> auth.uid()
    and status = 'pending'
    and item_id is null
    and public.are_connected(auth.uid(), person_id)
  );
drop policy if exists "library_club_members_update_self" on public.library_club_members;
create policy "library_club_members_update_self" on public.library_club_members
  for update to authenticated using (person_id = auth.uid()) with check (person_id = auth.uid());
-- Rechazar una invitación o retirarla. Quien ya es miembro sale con `library_leave_club` (se queda lo del club).
drop policy if exists "library_club_members_delete_pending" on public.library_club_members;
create policy "library_club_members_delete_pending" on public.library_club_members
  for delete to authenticated using (status = 'pending' and (person_id = auth.uid() or public.library_club_host(club_id)));

-- ─── Copias del club ────────────────────────────────────────────────────────────

-- Una pieza entra a un club solo si su dueño está invitado o es miembro, y es del mismo tipo de libro.
create or replace function public.library_items_check_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.club_id is not null and (tg_op = 'INSERT' or new.club_id is distinct from old.club_id) then
    if not exists (
      select 1 from public.library_club_members m join public.library_clubs c on c.id = m.club_id
       where m.club_id = new.club_id and m.person_id = new.owner_id and c.kind = new.kind
    ) then
      raise exception 'library_club_copy' using errcode = 'P0001', hint = 'library_club_copy';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists library_items_check_club on public.library_items;
create trigger library_items_check_club
  before insert or update of club_id on public.library_items
  for each row execute function public.library_items_check_club();

-- ─── Anotaciones del club ───────────────────────────────────────────────────────

-- El autor es el dueño si no se dice otro (las copias que quedan de un club traen al original). Una anotación
-- entra al club solo desde una copia de ese club y siendo miembro.
create or replace function public.library_annotations_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := coalesce(new.author_id, new.owner_id);
  else
    -- Quien no es el dueño (otro miembro del club) solo cambia el contenido: ni dueño, ni pieza, ni club, ni autor.
    -- Al desconectar a alguien (`library_club_disconnect`) sí se sacan sus anotaciones del club.
    if auth.uid() is distinct from old.owner_id and coalesce(current_setting('kavi.club_disconnect', true), '') <> 'on' then
      new.owner_id := old.owner_id;
      new.item_id := old.item_id;
      new.club_id := old.club_id;
      new.author_id := old.author_id;
    end if;
    if auth.uid() is not null then
      new.updated_by := auth.uid();
    end if;
  end if;
  if new.club_id is not null and (tg_op = 'INSERT' or new.club_id is distinct from old.club_id) then
    if not exists (
      select 1 from public.library_club_members m join public.library_items i on i.id = new.item_id
       where m.club_id = new.club_id and m.person_id = new.owner_id and m.status = 'accepted' and i.club_id = new.club_id
    ) then
      raise exception 'library_club_annotation' using errcode = 'P0001', hint = 'library_club_annotation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists library_annotations_before_write on public.library_annotations;
create trigger library_annotations_before_write
  before insert or update on public.library_annotations
  for each row execute function public.library_annotations_before_write();

drop policy if exists "library_annotations_select_own" on public.library_annotations;
create policy "library_annotations_select_own" on public.library_annotations
  for select to authenticated using (owner_id = auth.uid() or (club_id is not null and public.library_club_member(club_id)));
drop policy if exists "library_annotations_insert_own" on public.library_annotations;
create policy "library_annotations_insert_own" on public.library_annotations
  for insert to authenticated with check (owner_id = auth.uid() and public.library_item_is_mine(item_id));
drop policy if exists "library_annotations_update_own" on public.library_annotations;
create policy "library_annotations_update_own" on public.library_annotations
  for update to authenticated
  using (owner_id = auth.uid() or (club_id is not null and public.library_club_member(club_id)))
  with check ((owner_id = auth.uid() and public.library_item_is_mine(item_id)) or (club_id is not null and public.library_club_member(club_id)));
drop policy if exists "library_annotations_delete_own" on public.library_annotations;
create policy "library_annotations_delete_own" on public.library_annotations
  for delete to authenticated using (owner_id = auth.uid() or (club_id is not null and public.library_club_member(club_id)));

-- ─── Desconectarse (RF-BC8) ─────────────────────────────────────────────────────

-- A la copia de la persona pasan, como suyas, las anotaciones del club de los demás (con su autor); las suyas
-- dejan de ser del club; su copia sale del club y su fila se quita. No se da a nadie: la usan las de abajo.
create or replace function public.library_club_disconnect(p_club uuid, p_person uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item uuid;
begin
  perform set_config('kavi.club_disconnect', 'on', true);
  select item_id into v_item from public.library_club_members
   where club_id = p_club and person_id = p_person and status = 'accepted';
  if v_item is not null then
    insert into public.library_annotations (item_id, owner_id, kind, locator, content, z, removed, locked, author_id, created_at, updated_at)
    select v_item, p_person, a.kind, a.locator, a.content, a.z, false, a.locked, coalesce(a.author_id, a.owner_id), a.created_at, now()
      from public.library_annotations a
     where a.club_id = p_club and a.owner_id <> p_person and not a.removed;
    update public.library_annotations set club_id = null where club_id = p_club and owner_id = p_person;
    update public.library_items set club_id = null where id = v_item and club_id = p_club;
  end if;
  delete from public.library_club_members where club_id = p_club and person_id = p_person;
  perform set_config('kavi.club_disconnect', '', true);
end;
$$;

revoke all on function public.library_club_disconnect(uuid, uuid) from public, anon, authenticated;

-- Salir de un club (no siendo su anfitrión: el anfitrión lo cierra).
create or replace function public.library_leave_club(p_club uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.library_club_members where club_id = p_club and person_id = auth.uid()) then
    raise exception 'library_club_not_member' using errcode = 'P0001', hint = 'library_club_not_member';
  end if;
  if exists (select 1 from public.library_clubs where id = p_club and host_id = auth.uid()) then
    raise exception 'library_club_host_leaves' using errcode = 'P0001', hint = 'library_club_host_leaves';
  end if;
  perform public.library_club_disconnect(p_club, auth.uid());
end;
$$;

-- El anfitrión quita a alguien (que se queda con su copia y lo del club).
create or replace function public.library_remove_club_member(p_club uuid, p_person uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.library_clubs where id = p_club and host_id = auth.uid()) or p_person = auth.uid() then
    raise exception 'library_club_not_host' using errcode = 'P0001', hint = 'library_club_not_host';
  end if;
  perform public.library_club_disconnect(p_club, p_person);
end;
$$;

revoke all on function public.library_leave_club(uuid) from public, anon;
revoke all on function public.library_remove_club_member(uuid, uuid) from public, anon;
grant execute on function public.library_leave_club(uuid) to authenticated;
grant execute on function public.library_remove_club_member(uuid, uuid) to authenticated;

-- Cerrar el club (o que el anfitrión borre su cuenta): antes de borrarlo, cada miembro se queda con lo suyo.
create or replace function public.library_clubs_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person uuid;
begin
  for v_person in select person_id from public.library_club_members where club_id = old.id and status = 'accepted' loop
    perform public.library_club_disconnect(old.id, v_person);
  end loop;
  return old;
end;
$$;

drop trigger if exists library_clubs_before_delete on public.library_clubs;
create trigger library_clubs_before_delete before delete on public.library_clubs
  for each row execute function public.library_clubs_before_delete();
