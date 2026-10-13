-- KAVI Library · Acomodar los libros arrastrando, también en "Todos" (spec 13a, RF-BL7, T280).
--
-- Cada pieza guarda su lugar en la librería. Al moverla se le pone el punto medio entre sus nuevos
-- vecinos (como en Listas y en los libreros), así que basta con un número que se pueda partir.
-- Lo nuevo entra al principio: por omisión, menos el instante en que se creó (lo más reciente queda
-- con el número más chico). Las piezas que ya existían conservan el orden de "lo más reciente".
alter table public.library_items
  add column if not exists sort_order numeric;

update public.library_items
   set sort_order = -extract(epoch from created_at)
 where sort_order is null;

alter table public.library_items
  alter column sort_order set default (-extract(epoch from now())),
  alter column sort_order set not null;

create index if not exists idx_library_items_owner_order on public.library_items (owner_id, sort_order);
