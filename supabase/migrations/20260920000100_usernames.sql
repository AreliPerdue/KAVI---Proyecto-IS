-- T147 · Username público, editable y buscable (RF-A1, RF-A9, RF-S1)

-- Normaliza lo que ya exista antes de endurecer las reglas.
update public.profiles set username = lower(trim(username));

/*
 * La unicidad era sobre el texto tal cual, así que `Pedro` y `pedro` podían coexistir
 * y ser la misma persona a ojos de quien busca. Se sustituye por un índice sobre
 * `lower(username)`: dos personas no pueden compartir nombre ni cambiando mayúsculas.
 */
alter table public.profiles drop constraint profiles_username_key;
create unique index idx_profiles_username_lower on public.profiles (lower(username));

-- Mismo formato que valida la app (`USERNAME_PATTERN` en lib/schemas/auth.ts).
alter table public.profiles drop constraint profiles_username_check;
alter table public.profiles
  add constraint profiles_username_check check (username ~ '^[a-z0-9_]{3,30}$');

/*
 * Normaliza antes de validar: quien mande `  Pedro_99 ` guarda `pedro_99` en vez de
 * recibir un error de formato por algo que la app puede resolver sola.
 */
create or replace function public.normalize_username()
returns trigger language plpgsql as $$
begin
  new.username := lower(trim(new.username));
  return new;
end;
$$;

create trigger profiles_normalize_username
  before insert or update of username on public.profiles
  for each row execute function public.normalize_username();

/*
 * RF-A9 · Disponibilidad de un username. Excluye el propio para que guardar el perfil
 * sin cambiarlo no se reporte como "ya ocupado".
 * Sigue abierta a `anon` porque el alta la consulta antes de que exista sesión (RF-A1);
 * ahí `auth.uid()` es null y la exclusión no aplica.
 */
create or replace function public.is_username_available(p_username text)
returns boolean
language sql security definer stable set search_path = public as $$
  select not exists (
    select 1 from public.profiles
     where lower(username) = lower(trim(p_username))
       and (auth.uid() is null or id <> auth.uid())
  );
$$;

/*
 * RF-S1 · Búsqueda de personas por correo exacto o por @usuario exacto.
 *
 * Exigir la cadena completa —no prefijos— es lo que impide enumerar quién está
 * registrado: hay que saber a quién buscas antes de buscarlo. El `@` inicial es
 * opcional; lo que decide si es correo o usuario es si queda una arroba después
 * de quitarlo.
 */
create or replace function public.search_profiles(p_query text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  created_at timestamptz,
  role text
)
language sql security definer stable set search_path = public, auth as $$
  with q as (
    select
      lower(trim(p_query)) as raw,
      ltrim(lower(trim(p_query)), '@') as term
  )
  select p.id, p.username, p.display_name, p.avatar_url, p.created_at, p.role
  from public.profiles p
  join auth.users u on u.id = p.id
  cross join q
  where p.id <> auth.uid()
    and char_length(q.term) > 0
    and case
          when position('@' in q.term) > 0 then lower(u.email) = q.term
          else lower(p.username) = q.term
        end
  limit 1;
$$;

revoke all on function public.search_profiles(text) from public;
revoke execute on function public.search_profiles(text) from anon;
grant execute on function public.search_profiles(text) to authenticated;

-- La sustituye `search_profiles`, que cubre correo y username.
drop function if exists public.search_profile_by_email(text);
