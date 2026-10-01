-- T231 · `lists_select` no podía ver la fila recién insertada
--
-- Al insertar con RETURNING, Postgres aplica también la política de **lectura** a la fila
-- que va a devolver. La que había preguntaba `can_view_list(id)`, una función `stable` que
-- vuelve a consultar `lists` por id — y una función `stable` trabaja con la foto del
-- momento en que empezó la sentencia, así que **no ve la fila que esa misma sentencia
-- acaba de insertar**. Devolvía falso, la lectura quedaba bloqueada y el servidor
-- contestaba 42501: el mismo error que da una sesión caducada o una operación ajena, que
-- es lo que hizo tan difícil distinguirlo.
--
-- `activities` nunca tuvo el problema porque su política compara `owner_id = auth.uid()`
-- **sobre la propia fila**: ese valor viene en el INSERT y no hay que ir a buscarlo.
--
-- La regla que queda: en una política de SELECT, lo que se pueda resolver con columnas de
-- la fila se resuelve ahí; una función solo para lo que de verdad está en otra tabla.

create or replace function public.list_shared_with_me(p_list uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.list_shares s
    where s.list_id = p_list and s.shared_with_id = auth.uid()
  );
$$;

revoke all on function public.list_shared_with_me(uuid) from public;
revoke execute on function public.list_shared_with_me(uuid) from anon;
grant execute on function public.list_shared_with_me(uuid) to authenticated;

-- Se crea la nueva antes de quitar la vieja: si algo falla a media ejecución, la tabla
-- nunca se queda sin política de lectura. (Lección de la migración de compartir.)
create policy "lists_select_v2" on public.lists
  for select to authenticated
  using (owner_id = auth.uid() or public.list_shared_with_me(id));

drop policy if exists "lists_select" on public.lists;
