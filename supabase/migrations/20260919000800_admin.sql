-- T141 · Spec 09 — Modo administrador (rol `adminkavi`) y panel de estadísticas

alter table public.profiles
  add column role text not null default 'user' check (role in ('user','adminkavi'));

create index idx_profiles_admin on public.profiles (role) where role = 'adminkavi';

/**
 * El rol NO se puede tocar desde la app. Hace falta este trigger porque la política
 * `profiles_update_own` deja a cada quien actualizar su propia fila: sin esto, cualquier
 * usuario podría mandar `update profiles set role='adminkavi'` y auto-ascenderse.
 *
 * El discriminante es `auth.uid()`: en una petición de PostgREST siempre viene el usuario
 * y se rechaza; desde el SQL Editor o con la service_role es null y se permite. O sea,
 * ascender a alguien es una acción deliberada de quien administra el proyecto.
 */
create or replace function public.protect_profile_role()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'El rol de una cuenta no se cambia desde la aplicación'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

/** ¿Esta cuenta es administradora? SECURITY DEFINER para poder usarse dentro de RPCs. */
create or replace function public.is_admin(p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles p where p.id = p_user and p.role = 'adminkavi'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

/**
 * Estadísticas agregadas del producto. SECURITY DEFINER para poder contar filas de todas
 * las cuentas, con la comprobación de rol como primera instrucción: sin ella, cualquier
 * usuario autenticado podría llamarla y leer el tamaño del negocio.
 * Solo devuelve AGREGADOS: ninguna actividad, título ni dato personal de nadie.
 */
create or replace function public.admin_stats()
returns table (
  total_accounts bigint,
  accounts_7d bigint,
  accounts_30d bigint,
  active_users_30d bigint,
  total_activities bigint,
  activities_30d bigint,
  accepted_connections bigint,
  shared_calendars bigint,
  custom_themes bigint,
  total_workouts bigint
)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Solo las cuentas administradoras pueden consultar estadísticas'
      using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    (select count(distinct owner_id) from public.activities
      where updated_at > now() - interval '30 days'),
    (select count(*) from public.activities),
    (select count(*) from public.activities where created_at > now() - interval '30 days'),
    (select count(*) from public.connections where status = 'accepted'),
    (select count(*) from public.calendar_shares),
    (select count(*) from public.themes where not is_system),
    (select count(*) from public.workouts);
end;
$$;

revoke all on function public.admin_stats() from public;
grant execute on function public.admin_stats() to authenticated;

/**
 * Listado de cuentas para el panel. Incluye el correo (vive en auth.users, ilegible para
 * el cliente) y por eso exige rol admin igual que `admin_stats`. Deliberadamente NO expone
 * contenido: ni títulos de actividades, ni contactos, ni entrenamientos — solo el conteo.
 */
create or replace function public.admin_accounts(p_limit int default 100, p_offset int default 0)
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz,
  activity_count bigint,
  last_active_at timestamptz
)
language plpgsql security definer stable set search_path = public, auth as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Solo las cuentas administradoras pueden consultar cuentas'
      using errcode = '42501';
  end if;

  return query
  select p.id,
         u.email::text,
         p.display_name,
         p.role,
         p.created_at,
         count(a.id),
         max(a.updated_at)
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.activities a on a.owner_id = p.id
  group by p.id, u.email, p.display_name, p.role, p.created_at
  order by p.created_at desc
  limit greatest(1, least(p_limit, 500))
  offset greatest(0, p_offset);
end;
$$;

revoke all on function public.admin_accounts(int, int) from public;
grant execute on function public.admin_accounts(int, int) to authenticated;

-- Para nombrar a la primera persona administradora, ejecutar en el SQL Editor
-- (ahí `auth.uid()` es null y el trigger lo permite):
--
--   update public.profiles set role = 'adminkavi'
--    where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
