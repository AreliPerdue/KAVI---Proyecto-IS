-- KAVI Library · Acomodos: el librero (lomos) con su propio orden y acomodos guardados (spec 13a, RF-BL7b; T331).
--
-- 1. Los lomos se acomodan aparte de las portadas: `spine_order` en la pieza (para "Todos") y en cada libro de un
--    librero. Vacío = sigue el orden de las portadas, así nada cambia para quien no los acomode.
-- 2. `library_layouts`: acomodos con nombre, por vista (portadas o lomos) y por lugar (Todos o un librero). Cada uno
--    es la lista de piezas en su orden; aplicarlo reescribe el orden de ese lugar en una sola llamada
--    (`library_apply_order`). Las piezas que ya no existen se ignoran al aplicarlo.

alter table public.library_items
  add column if not exists spine_order numeric;

alter table public.library_shelf_items
  add column if not exists spine_order numeric;

create table if not exists public.library_layouts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  view text not null check (view in ('covers', 'spines')),
  -- Nulo = "Todos"; si se borra el librero, se van sus acomodos.
  shelf_id uuid references public.library_shelves(id) on delete cascade,
  item_ids uuid[] not null default '{}' check (cardinality(item_ids) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_library_layouts_owner on public.library_layouts (owner_id, view, shelf_id);

alter table public.library_layouts enable row level security;

drop policy if exists "library_layouts_select_own" on public.library_layouts;
create policy "library_layouts_select_own" on public.library_layouts
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists "library_layouts_insert_own" on public.library_layouts;
create policy "library_layouts_insert_own" on public.library_layouts
  for insert to authenticated with check (
    owner_id = auth.uid()
    and (shelf_id is null or exists (select 1 from public.library_shelves s where s.id = shelf_id and s.owner_id = auth.uid()))
  );

drop policy if exists "library_layouts_update_own" on public.library_layouts;
create policy "library_layouts_update_own" on public.library_layouts
  for update to authenticated using (owner_id = auth.uid()) with check (
    owner_id = auth.uid()
    and (shelf_id is null or exists (select 1 from public.library_shelves s where s.id = shelf_id and s.owner_id = auth.uid()))
  );

drop policy if exists "library_layouts_delete_own" on public.library_layouts;
create policy "library_layouts_delete_own" on public.library_layouts
  for delete to authenticated using (owner_id = auth.uid());

drop trigger if exists library_layouts_set_updated_at on public.library_layouts;
create trigger library_layouts_set_updated_at
  before update on public.library_layouts
  for each row execute function public.set_updated_at();

-- Reescribe el orden de un lugar con la lista dada (la primera, 1024; luego de 1024 en 1024). Corre con los
-- permisos de quien llama: la RLS solo deja tocar lo suyo.
create or replace function public.library_apply_order(p_view text, p_shelf uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_view not in ('covers', 'spines') then
    raise exception 'vista inválida' using errcode = '22023';
  end if;
  if cardinality(p_ids) > 5000 then
    raise exception 'demasiadas piezas' using errcode = '22023';
  end if;
  if p_shelf is null then
    if p_view = 'covers' then
      update public.library_items i set sort_order = o.n * 1024
        from unnest(p_ids) with ordinality as o(id, n)
       where i.id = o.id and i.owner_id = auth.uid();
    else
      update public.library_items i set spine_order = o.n * 1024
        from unnest(p_ids) with ordinality as o(id, n)
       where i.id = o.id and i.owner_id = auth.uid();
    end if;
  else
    if p_view = 'covers' then
      update public.library_shelf_items s set sort_order = o.n * 1024
        from unnest(p_ids) with ordinality as o(id, n)
       where s.shelf_id = p_shelf and s.item_id = o.id and s.owner_id = auth.uid();
    else
      update public.library_shelf_items s set spine_order = o.n * 1024
        from unnest(p_ids) with ordinality as o(id, n)
       where s.shelf_id = p_shelf and s.item_id = o.id and s.owner_id = auth.uid();
    end if;
  end if;
end;
$$;

revoke all on function public.library_apply_order(text, uuid, uuid[]) from public, anon;
grant execute on function public.library_apply_order(text, uuid, uuid[]) to authenticated;
