-- T272 · Un día borrado de una serie no vuelve, aunque lo intente un cliente viejo (RF-C8).
--
-- T249 guardó los días excluidos (`recurrence_exdates`) y enseñó a la app a respetarlos al
-- regenerar la serie. Pero la regla vivía solo en el cliente: un APK anterior a T249 no
-- conoce la columna, y al iniciar sesión rellena las ocurrencias que faltan —incluida la que
-- se borró—. Reporte del 9 oct 2026: serie del 1 al 9 de octubre, se borró solo el 9 y volvió
-- tras algunos inicios de sesión.
--
-- Aquí la base misma se niega: antes de insertar una ocurrencia, si su día **local** está
-- entre los excluidos de la madre, la fila se omite en silencio (el cliente viejo no ve un
-- error; simplemente no se crea). El día local necesita la zona horaria de quien armó la
-- serie, así que se guarda en la madre (`recurrence_tz`) y no en el perfil, que lo pueden
-- leer todos los usuarios autenticados. Sin zona —series viejas que la app todavía no
-- completó— o con una zona que Postgres no reconoce, no se adivina: se deja pasar.

alter table public.activities
  add column if not exists recurrence_tz text;

comment on column public.activities.recurrence_tz is
  'Zona IANA de quien armó la serie (p. ej. America/Mexico_City). Solo en la madre; con ella la base sabe qué día local es cada ocurrencia.';

create or replace function public.activities_skip_excluded()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  excluidos date[];
  zona text;
begin
  if new.recurrence_parent_id is null then
    return new;
  end if;

  select a.recurrence_exdates, a.recurrence_tz
    into excluidos, zona
    from public.activities a
   where a.id = new.recurrence_parent_id;

  if zona is null or excluidos is null or cardinality(excluidos) = 0 then
    return new;
  end if;

  begin
    if (new.start_at at time zone zona)::date = any (excluidos) then
      return null;
    end if;
  exception when invalid_parameter_value then
    -- Zona desconocida para Postgres: mejor crear de más que borrar algo que sí iba.
    return new;
  end;

  return new;
end;
$$;

drop trigger if exists activities_skip_excluded on public.activities;
create trigger activities_skip_excluded
  before insert on public.activities
  for each row execute function public.activities_skip_excluded();
