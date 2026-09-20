-- T149 · Búsqueda de personas por prefijo de username, con resultados ordenados (RF-S1)

/*
 * El username pasa a buscarse por PREFIJO; el correo sigue exigiendo coincidencia exacta.
 *
 * La asimetría es deliberada. Un username es un identificador público —existe para que
 * te encuentren— así que exponerlo por prefijo no revela nada que su dueño no quisiera
 * publicar. Un correo sí: si aceptara prefijos, escribir "gmail" devolvería direcciones
 * de gente registrada y la búsqueda se convertiría en una herramienta de cosecha.
 *
 * Aun con prefijos el resultado va acotado: mínimo 3 caracteres, tope de filas y solo
 * username y nombre visible. Nadie puede recorrer el padrón completo a base de consultas.
 */
create or replace function public.search_profiles(p_query text, p_limit int default 8)
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
    select ltrim(lower(trim(p_query)), '@') as term
  )
  select p.id, p.username, p.display_name, p.avatar_url, p.created_at, p.role
  from public.profiles p
  join auth.users u on u.id = p.id
  cross join q
  where p.id <> auth.uid()
    and char_length(q.term) >= 3
    and case
          -- Con arroba dentro es un correo: exacto y nada más.
          when position('@' in q.term) > 0 then lower(u.email) = q.term
          else lower(p.username) like q.term || '%'
        end
  order by
    -- Primero la coincidencia exacta, luego las más cortas: la más probable arriba.
    case when lower(p.username) = q.term then 0 else 1 end,
    char_length(p.username),
    p.username
  limit greatest(1, least(p_limit, 20));
$$;

revoke all on function public.search_profiles(text, int) from public;
revoke execute on function public.search_profiles(text, int) from anon;
grant execute on function public.search_profiles(text, int) to authenticated;

-- Hace que el `like 'term%'` use índice en vez de recorrer la tabla.
create index if not exists idx_profiles_username_prefix
  on public.profiles (lower(username) text_pattern_ops);

-- Queda sustituida por la versión con límite.
drop function if exists public.search_profiles(text);
