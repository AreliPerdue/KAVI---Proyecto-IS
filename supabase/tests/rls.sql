-- T030 · Pruebas de RLS con varios usuarios (Spec 02 "Criterios de aceptación", NFR-4)
-- Ejecutable tal cual en el SQL Editor de Supabase o contra un Postgres local.
-- Cada bloque lanza excepción si la regla de seguridad no se cumple; si termina,
-- es que todo pasó. No deja datos: la última sección borra las cuentas de prueba.

\set ON_ERROR_STOP on

-- ── Preparación: tres cuentas (el trigger handle_new_user crea sus profiles) ──
delete from auth.users where email like '%@rls.test';

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-4000-8000-000000000001','ana@rls.test','{"username":"ana_rls","display_name":"Ana"}'),
  ('bbbbbbbb-0000-4000-8000-000000000002','beto@rls.test','{"username":"beto_rls","display_name":"Beto"}'),
  ('cccccccc-0000-4000-8000-000000000003','caro@rls.test','{"username":"caro_rls","display_name":"Caro"}');

-- Ana crea dos actividades (como servicio, para preparar el escenario)
insert into public.activities (id, owner_id, title, start_at, end_at, color) values
  ('a0000000-0000-4000-8000-00000000000a','aaaaaaaa-0000-4000-8000-000000000001','Terapia',
   now() + interval '1 day', now() + interval '1 day 1 hour', '#E91E63'),
  ('a0000000-0000-4000-8000-00000000000b','aaaaaaaa-0000-4000-8000-000000000001','Cena de equipo',
   now() + interval '2 day', now() + interval '2 day 2 hour', '#607D8B');

-- Helper para actuar como una persona concreta a través de PostgREST
create or replace function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, false);
end $$;

-- ═══ 1. Sin relación no se ve nada (Spec 02, criterio 1) ═══
set role authenticated;
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
do $$ begin
  if (select count(*) from public.activities
       where owner_id = 'aaaaaaaa-0000-4000-8000-000000000001') <> 0 then
    raise exception 'FALLO 1: Beto ve actividades de Ana sin ningún share';
  end if;
  raise notice 'OK 1 · sin share, Beto recibe 0 filas de Ana';
end $$;

-- ═══ 2. visibility='busy' NO expone filas, solo bloques por RPC (criterio 2) ═══
reset role;
insert into public.connections (requester_id, addressee_id, status, responded_at)
values ('aaaaaaaa-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000002','accepted', now());
insert into public.calendar_shares (owner_id, shared_with_id, visibility)
values ('aaaaaaaa-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000002','busy');

set role authenticated;
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
do $$
declare n_rows int; n_blocks int; n_titles int;
begin
  select count(*) into n_rows from public.activities
   where owner_id = 'aaaaaaaa-0000-4000-8000-000000000001';
  if n_rows <> 0 then
    raise exception 'FALLO 2a: busy expone % filas de activities', n_rows;
  end if;

  select count(*), count(title) into n_blocks, n_titles
    from public.get_availability(array['aaaaaaaa-0000-4000-8000-000000000001'::uuid],
                                 now(), now() + interval '30 days');
  if n_blocks <> 2 then
    raise exception 'FALLO 2b: se esperaban 2 bloques de disponibilidad, hubo %', n_blocks;
  end if;
  if n_titles <> 0 then
    raise exception 'FALLO 2c: busy filtró % títulos', n_titles;
  end if;
  raise notice 'OK 2 · busy da 0 filas de activities y 2 bloques sin título';
end $$;

-- ═══ 3. visibility='details' sí muestra, y con título ═══
reset role;
update public.calendar_shares set visibility = 'details'
 where owner_id = 'aaaaaaaa-0000-4000-8000-000000000001';

set role authenticated;
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
do $$
declare n_rows int; n_titles int;
begin
  select count(*) into n_rows from public.activities
   where owner_id = 'aaaaaaaa-0000-4000-8000-000000000001';
  select count(title) into n_titles
    from public.get_availability(array['aaaaaaaa-0000-4000-8000-000000000001'::uuid],
                                 now(), now() + interval '30 days');
  if n_rows <> 2 then raise exception 'FALLO 3a: details debería mostrar 2 filas, mostró %', n_rows; end if;
  if n_titles <> 2 then raise exception 'FALLO 3b: details debería traer 2 títulos, trajo %', n_titles; end if;
  raise notice 'OK 3 · details muestra las 2 filas y sus títulos';
end $$;

-- ═══ 4. Caro solo ve la actividad que le compartieron puntualmente ═══
reset role;
insert into public.connections (requester_id, addressee_id, status, responded_at)
values ('aaaaaaaa-0000-4000-8000-000000000001','cccccccc-0000-4000-8000-000000000003','accepted', now());
insert into public.activity_shares (activity_id, shared_with_id, status)
values ('a0000000-0000-4000-8000-00000000000b','cccccccc-0000-4000-8000-000000000003','accepted');

set role authenticated;
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
do $$
declare n int; t text;
begin
  select count(*) into n from public.activities
   where owner_id = 'aaaaaaaa-0000-4000-8000-000000000001';
  if n <> 1 then raise exception 'FALLO 4a: Caro debería ver 1 actividad, ve %', n; end if;
  select title into t from public.activities
   where owner_id = 'aaaaaaaa-0000-4000-8000-000000000001';
  if t <> 'Cena de equipo' then raise exception 'FALLO 4b: Caro ve la actividad equivocada (%)', t; end if;
  raise notice 'OK 4 · share puntual muestra exactamente 1 actividad, la correcta';
end $$;

-- ═══ 5. Nadie edita ni borra lo ajeno ═══
do $$
declare n int;
begin
  update public.activities set title = 'Secuestrada'
   where id = 'a0000000-0000-4000-8000-00000000000b';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLO 5a: Caro pudo editar una actividad de Ana'; end if;

  delete from public.activities where id = 'a0000000-0000-4000-8000-00000000000b';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLO 5b: Caro pudo borrar una actividad de Ana'; end if;
  raise notice 'OK 5 · update y delete ajenos afectan 0 filas';
end $$;

-- ═══ 6. Reminders compartidos: cada quien silencia su copia (criterio 3) ═══
reset role;
insert into public.reminders (id, activity_id, offset_minutes, created_by)
values ('e0000000-0000-4000-8000-00000000000e','a0000000-0000-4000-8000-00000000000b', 30,
        'aaaaaaaa-0000-4000-8000-000000000001');

do $$
declare n int;
begin
  select count(*) into n from public.reminder_recipients
   where reminder_id = 'e0000000-0000-4000-8000-00000000000e';
  if n <> 2 then
    raise exception 'FALLO 6a: el trigger debía crear 2 copias (dueña + invitada), creó %', n;
  end if;
  raise notice 'OK 6a · add_reminder_recipients creó copia para Ana y para Caro';
end $$;

set role authenticated;
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
update public.reminder_recipients set enabled = false
 where user_id = 'cccccccc-0000-4000-8000-000000000003';

do $$
declare caro_enabled boolean; visibles int;
begin
  select enabled into caro_enabled from public.reminder_recipients
   where user_id = 'cccccccc-0000-4000-8000-000000000003';
  if caro_enabled then raise exception 'FALLO 6b: Caro no pudo silenciar su copia'; end if;

  select count(*) into visibles from public.reminder_recipients;
  if visibles <> 1 then
    raise exception 'FALLO 6c: Caro ve % filas de reminder_recipients, debería ver solo la suya', visibles;
  end if;
  raise notice 'OK 6b · Caro silencia su copia y solo ve la suya';
end $$;

reset role;
do $$
declare ana_enabled boolean;
begin
  select enabled into ana_enabled from public.reminder_recipients
   where user_id = 'aaaaaaaa-0000-4000-8000-000000000001';
  if not ana_enabled then raise exception 'FALLO 6d: silenciar el de Caro afectó al de Ana'; end if;
  raise notice 'OK 6c · la copia de Ana sigue activa';
end $$;

-- ═══ 7. Romper la conexión revoca los shares en ambos sentidos (RF-S2) ═══
delete from public.connections
 where requester_id = 'aaaaaaaa-0000-4000-8000-000000000001'
   and addressee_id = 'bbbbbbbb-0000-4000-8000-000000000002';

do $$
declare n int;
begin
  select count(*) into n from public.calendar_shares
   where owner_id = 'aaaaaaaa-0000-4000-8000-000000000001'
     and shared_with_id = 'bbbbbbbb-0000-4000-8000-000000000002';
  if n <> 0 then raise exception 'FALLO 7: quedó un calendar_share tras romper la conexión'; end if;
  raise notice 'OK 7 · romper la conexión revocó el share de calendario';
end $$;

-- ═══ 8. Temas del sistema intocables (RF-T3) ═══
set role authenticated;
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
do $$
declare n int;
begin
  update public.themes set name = 'Hackeado' where is_system;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLO 8a: se pudo editar un tema del sistema'; end if;

  delete from public.themes where is_system;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLO 8b: se pudo borrar un tema del sistema'; end if;
  raise notice 'OK 8 · los 19 temas del sistema son de solo lectura';
end $$;

-- ═══ 9. Modo admin: sin rol no hay estadísticas, y nadie se auto-asciende ═══
do $$
begin
  begin
    perform * from public.admin_stats();
    raise exception 'FALLO 9a: una cuenta normal pudo leer admin_stats()';
  exception when insufficient_privilege then
    raise notice 'OK 9a · admin_stats() rechaza a una cuenta normal';
  end;

  begin
    update public.profiles set role = 'adminkavi'
     where id = 'bbbbbbbb-0000-4000-8000-000000000002';
    raise exception 'FALLO 9b: Beto se auto-ascendió a adminkavi';
  exception when insufficient_privilege then
    raise notice 'OK 9b · el trigger bloquea el auto-ascenso';
  end;
end $$;

-- Ascenso legítimo: fuera de la app auth.uid() es null y el trigger lo permite
reset role;
select pg_temp.act_as(null);
update public.profiles set role = 'adminkavi'
 where id = 'bbbbbbbb-0000-4000-8000-000000000002';

set role authenticated;
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
do $$
declare cuentas bigint; actividades bigint; n_filas int;
begin
  select total_accounts, total_activities into cuentas, actividades from public.admin_stats();
  if cuentas < 3 then raise exception 'FALLO 9c: admin_stats cuenta % cuentas, esperaba >= 3', cuentas; end if;
  if actividades < 2 then raise exception 'FALLO 9d: admin_stats cuenta % actividades', actividades; end if;

  select count(*) into n_filas from public.admin_accounts();
  if n_filas < 3 then raise exception 'FALLO 9e: admin_accounts devolvió % filas', n_filas; end if;
  raise notice 'OK 9c · ya como adminkavi: % cuentas, % actividades, % filas en el listado',
    cuentas, actividades, n_filas;
end $$;

-- ═══ 10. El admin NO ve el contenido de nadie (solo agregados) ═══
do $$
declare n int;
begin
  select count(*) into n from public.activities
   where owner_id = 'aaaaaaaa-0000-4000-8000-000000000001';
  if n <> 0 then
    raise exception 'FALLO 10: el admin ve % actividades de Ana; debería ver solo agregados', n;
  end if;
  raise notice 'OK 10 · ser admin no da acceso a las actividades de nadie';
end $$;

-- ── Limpieza ──
reset role;
select pg_temp.act_as(null);
delete from auth.users where email like '%@rls.test';

do $$ begin raise notice '';
  raise notice '═══ TODAS LAS PRUEBAS DE RLS PASARON ═══';
end $$;
