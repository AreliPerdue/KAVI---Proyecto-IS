-- T222 · Realtime reproducible desde las migraciones
--
-- Supabase entrega cambios en vivo solo para las tablas que estén en la publicación
-- `supabase_realtime`. Hasta ahora eso se había habilitado desde el panel, así que **no
-- estaba en el repositorio**: un proyecto recreado desde estas migraciones se levantaría
-- sin tiempo real y sin ningún error que lo delatara — la app simplemente dejaría de
-- refrescarse sola y costaría entender por qué.
--
-- Se agregan aquí las tablas de listas y, de paso, las que ya se vigilaban, para que el
-- esquema baste por sí solo. Cada una va comprobada: `alter publication ... add table`
-- falla si la tabla ya está, y en el proyecto en uso varias lo están.

do $$
declare
  t text;
begin
  foreach t in array array[
    'activities',
    'activity_shares',
    'calendar_shares',
    'connections',
    'reminders',
    'reminder_recipients',
    'lists',
    'list_sections',
    'list_items',
    'list_shares'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
