-- T230 · Reparar las políticas de las tablas de listas
--
-- La migración de compartir **borra** las políticas de `lists` para reemplazarlas por otras
-- que distinguen mirar de escribir. Si esa migración no llegó a terminar, `lists` se queda
-- con RLS activo y sin política de inserción: se pueden leer las listas pero no crear
-- ninguna, y el fallo llega a la app como "no tienes permiso".
--
-- Este script deja el estado final correcto **venga de donde venga**: borra cada política
-- por nombre si existe y la vuelve a crear. Correrlo dos veces no hace daño. No toca datos.
--
-- Requiere que existan `can_view_list`, `can_edit_list` y `can_manage_list`; si falta
-- alguna, antes hay que correr `20260930180000_list_shares.sql`.

-- lists ────────────────────────────────────────────────────────────────────────
drop policy if exists "lists_select" on public.lists;
drop policy if exists "lists_cud_owner" on public.lists;
drop policy if exists "lists_insert_own" on public.lists;
drop policy if exists "lists_update_manager" on public.lists;
drop policy if exists "lists_delete_owner" on public.lists;

create policy "lists_select" on public.lists
  for select to authenticated using (public.can_view_list(id));
create policy "lists_insert_own" on public.lists
  for insert to authenticated with check (owner_id = auth.uid());
create policy "lists_update_manager" on public.lists
  for update to authenticated using (public.can_manage_list(id)) with check (public.can_manage_list(id));
create policy "lists_delete_owner" on public.lists
  for delete to authenticated using (owner_id = auth.uid());

-- list_sections ────────────────────────────────────────────────────────────────
drop policy if exists "list_sections_select" on public.list_sections;
drop policy if exists "list_sections_cud" on public.list_sections;

create policy "list_sections_select" on public.list_sections
  for select to authenticated using (public.can_view_list(list_id));
create policy "list_sections_cud" on public.list_sections
  for all to authenticated using (public.can_edit_list(list_id)) with check (public.can_edit_list(list_id));

-- list_items ───────────────────────────────────────────────────────────────────
drop policy if exists "list_items_select" on public.list_items;
drop policy if exists "list_items_cud" on public.list_items;

create policy "list_items_select" on public.list_items
  for select to authenticated using (public.can_view_list(list_id));
create policy "list_items_cud" on public.list_items
  for all to authenticated using (public.can_edit_list(list_id)) with check (public.can_edit_list(list_id));

-- list_shares ──────────────────────────────────────────────────────────────────
drop policy if exists "list_shares_select" on public.list_shares;
drop policy if exists "list_shares_cud" on public.list_shares;

create policy "list_shares_select" on public.list_shares
  for select to authenticated
  using (shared_with_id = auth.uid() or public.can_view_list(list_id));
create policy "list_shares_cud" on public.list_shares
  for all to authenticated
  using (public.can_manage_list(list_id))
  with check (public.can_manage_list(list_id) and public.are_connected(auth.uid(), shared_with_id));

-- list_tags y list_tag_links ───────────────────────────────────────────────────
drop policy if exists "list_tags_select_own" on public.list_tags;
drop policy if exists "list_tags_cud_own" on public.list_tags;
drop policy if exists "list_tag_links_select" on public.list_tag_links;
drop policy if exists "list_tag_links_cud" on public.list_tag_links;

create policy "list_tags_select_own" on public.list_tags
  for select to authenticated using (owner_id = auth.uid());
create policy "list_tags_cud_own" on public.list_tags
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "list_tag_links_select" on public.list_tag_links
  for select to authenticated
  using (exists (select 1 from public.list_tags t where t.id = tag_id and t.owner_id = auth.uid()));
create policy "list_tag_links_cud" on public.list_tag_links
  for all to authenticated
  using (exists (select 1 from public.list_tags t where t.id = tag_id and t.owner_id = auth.uid()))
  with check (
    exists (select 1 from public.list_tags t where t.id = tag_id and t.owner_id = auth.uid())
    and public.can_view_list(list_id)
  );
