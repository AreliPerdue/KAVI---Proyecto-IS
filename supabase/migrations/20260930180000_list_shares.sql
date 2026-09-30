-- T219 · Spec 10 §Compartir — Listas compartidas con permisos
--
-- El problema de fondo aquí es la recursión de RLS, la misma que ya costó una migración
-- correctiva con `activities` y `activity_shares`:
--
--   la política de `lists` necesita saber si hay un share → consulta `list_shares`
--   la política de `list_shares` necesita saber de qué lista es → consulta `lists`
--
-- Se corta con funciones `security definer`, que saltan RLS dentro de sí mismas. No amplían
-- lo que nadie puede ver: solo responden sí o no sobre el usuario de la sesión. Por eso las
-- políticas escritas en la migración anterior ya preguntaban por `can_edit_list()` en vez de
-- consultar `lists` a mano — hoy basta con cambiar la función.

create table if not exists public.list_shares (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  shared_with_id uuid not null references public.profiles(id) on delete cascade,
  -- ver: solo mirar · editar: agregar, editar y palomear · administrar: además, miembros
  permission text not null default 'edit' check (permission in ('view', 'edit', 'manage')),
  created_at timestamptz not null default now(),
  unique (list_id, shared_with_id)
);

create index if not exists idx_list_shares_con on public.list_shares (shared_with_id);

/* Quién puede *mirar* una lista: su dueño o cualquiera con quien esté compartida. */
create or replace function public.can_view_list(p_list uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.lists l where l.id = p_list and l.owner_id = auth.uid())
      or exists (select 1 from public.list_shares s where s.list_id = p_list and s.shared_with_id = auth.uid());
$$;

/* Quién puede *escribir* en ella: el dueño, o quien tenga permiso de editar o administrar. */
create or replace function public.can_edit_list(p_list uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.lists l where l.id = p_list and l.owner_id = auth.uid())
      or exists (
        select 1 from public.list_shares s
        where s.list_id = p_list and s.shared_with_id = auth.uid() and s.permission in ('edit', 'manage')
      );
$$;

/* Quién puede tocar la lista en sí y a sus miembros: el dueño o quien administre. */
create or replace function public.can_manage_list(p_list uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.lists l where l.id = p_list and l.owner_id = auth.uid())
      or exists (
        select 1 from public.list_shares s
        where s.list_id = p_list and s.shared_with_id = auth.uid() and s.permission = 'manage'
      );
$$;

revoke all on function public.can_view_list(uuid) from public;
revoke all on function public.can_manage_list(uuid) from public;
revoke execute on function public.can_view_list(uuid) from anon;
revoke execute on function public.can_manage_list(uuid) from anon;
revoke execute on function public.can_edit_list(uuid) from anon;
grant execute on function public.can_view_list(uuid) to authenticated;
grant execute on function public.can_manage_list(uuid) to authenticated;

alter table public.list_shares enable row level security;

/*
 * Se ve el reparto de una lista que puedes ver, y siempre tu propia fila —para que una
 * lista compartida contigo aparezca en tu inicio aunque el dueño te quite el acceso a
 * mitad de una consulta—.
 */
create policy "list_shares_select" on public.list_shares
  for select to authenticated
  using (shared_with_id = auth.uid() or public.can_view_list(list_id));

create policy "list_shares_cud" on public.list_shares
  for all to authenticated
  using (public.can_manage_list(list_id))
  with check (
    public.can_manage_list(list_id)
    -- Solo con contactos aceptados, igual que el calendario (spec 06).
    and public.are_connected(auth.uid(), shared_with_id)
  );

/*
 * Las políticas de la migración anterior se reemplazan por las que distinguen mirar de
 * escribir. `lists` se parte en tres porque sus verbos ya no van juntos: cualquiera que la
 * vea puede verla, solo quien administre puede renombrarla, y solo su dueño puede borrarla
 * —que alguien con "administrar" pueda eliminar la lista de otro sería demasiado—.
 */
drop policy if exists "lists_select" on public.lists;
drop policy if exists "lists_cud_owner" on public.lists;

create policy "lists_select" on public.lists
  for select to authenticated using (public.can_view_list(id));
create policy "lists_insert_own" on public.lists
  for insert to authenticated with check (owner_id = auth.uid());
create policy "lists_update_manager" on public.lists
  for update to authenticated using (public.can_manage_list(id)) with check (public.can_manage_list(id));
create policy "lists_delete_owner" on public.lists
  for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "list_sections_select" on public.list_sections;
drop policy if exists "list_items_select" on public.list_items;

create policy "list_sections_select" on public.list_sections
  for select to authenticated using (public.can_view_list(list_id));
create policy "list_items_select" on public.list_items
  for select to authenticated using (public.can_view_list(list_id));
