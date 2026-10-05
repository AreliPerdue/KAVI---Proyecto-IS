-- T264 · Edad mínima y consentimiento (spec 03, RF-A13).
--
-- Tres piezas:
--  1. `account_consents`: fecha de nacimiento y aceptación expresa del aviso de privacidad. Solo la ve su
--     dueño; es aparte de `profiles.birthday` (RF-A10), que ven los contactos.
--  2. `guardian_consents`: la aprobación de madre, padre o tutor para cuentas de 16 o 17 años. La app solo
--     la **lee**; se escribe únicamente con las funciones de abajo.
--  3. Un secreto de servidor: el token del enlace que va por correo lo crea la base y lo entrega solo a quien
--     presenta ese secreto (la función de Vercel que manda el correo). Aquí va su huella SHA-256, nunca el
--     secreto (el repo es público). Sin esto, un menor podría pedir el token y aprobarse a sí mismo.
--
-- Todo cae en cascada al eliminar la cuenta (RF-A12).

create schema if not exists kavi_private;
revoke all on schema kavi_private from public;
revoke all on schema kavi_private from anon, authenticated;

create table if not exists kavi_private.server_secrets (
  name text primary key,
  sha256_hex text not null
);
insert into kavi_private.server_secrets (name, sha256_hex)
values ('guardian_email', '16a04261eca8d3dc0f9d79048906fd92ff61ca6414955fdfa295777d2e17c0fa')
on conflict (name) do update set sha256_hex = excluded.sha256_hex;

-- ─── 1. Aceptación del aviso y fecha de nacimiento ────────────────────────────────────

create table if not exists public.account_consents (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  birth_date date not null check (birth_date > '1900-01-01' and birth_date <= current_date),
  privacy_version text not null check (char_length(privacy_version) between 1 and 40),
  privacy_accepted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_consents enable row level security;
drop policy if exists "account_consents_own" on public.account_consents;
create policy "account_consents_own" on public.account_consents
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── 2. Aprobación de madre, padre o tutor ─────────────────────────────────────────────

create table if not exists public.guardian_consents (
  id uuid primary key default gen_random_uuid(),
  minor_id uuid not null references public.profiles(id) on delete cascade,
  guardian_email text not null check (char_length(guardian_email) <= 254 and guardian_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  token_sha256 text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'replaced')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  decided_at timestamptz
);
create index if not exists idx_guardian_consents_minor on public.guardian_consents (minor_id, created_at desc);

alter table public.guardian_consents enable row level security;
-- Solo lectura de lo propio: no hay políticas de escritura, así que la app no puede aprobarse.
drop policy if exists "guardian_consents_read_own" on public.guardian_consents;
create policy "guardian_consents_read_own" on public.guardian_consents
  for select to authenticated using (minor_id = auth.uid());

create or replace function kavi_private.sha256_hex(p text)
returns text language sql immutable as $$ select encode(sha256(convert_to(p, 'UTF8')), 'hex') $$;

/**
 * Crea la solicitud y devuelve el token **solo** a quien presenta el secreto del servidor de correo. Corre
 * con la sesión del menor (auth.uid()), que la función de Vercel reenvía.
 */
create or replace function public.create_guardian_consent(p_secret text, p_guardian_email text)
returns table (token text, minor_name text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, kavi_private
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(p_guardian_email));
  v_birth date;
  v_edad int;
  v_token text;
  v_vence timestamptz := now() + interval '7 days';
begin
  if v_uid is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = '42501';
  end if;
  if kavi_private.sha256_hex(coalesce(p_secret, '')) is distinct from (select sha256_hex from kavi_private.server_secrets where name = 'guardian_email') then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;
  if v_email = (select lower(email) from auth.users where id = v_uid) then
    raise exception 'Escribe el correo de tu madre, padre o tutor, no el tuyo.' using errcode = '22023';
  end if;
  select birth_date into v_birth from public.account_consents where user_id = v_uid;
  v_edad := date_part('year', age(current_date, v_birth));
  if v_birth is null or v_edad < 16 or v_edad >= 18 then
    raise exception 'La aprobación de un adulto solo se pide para cuentas de 16 o 17 años.' using errcode = '22023';
  end if;
  if (select count(*) from public.guardian_consents g where g.minor_id = v_uid and g.created_at > now() - interval '1 day') >= 5 then
    raise exception 'Ya enviaste varios correos hoy. Inténtalo mañana.' using errcode = '22023';
  end if;

  update public.guardian_consents g set status = 'replaced' where g.minor_id = v_uid and g.status = 'pending';
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.guardian_consents (minor_id, guardian_email, token_sha256, expires_at)
  values (v_uid, v_email, kavi_private.sha256_hex(v_token), v_vence);

  return query
    select v_token, coalesce(p.display_name, p.username), v_vence from public.profiles p where p.id = v_uid;
end;
$$;

/** Lo que ve el adulto al abrir el enlace: de quién es y en qué estado está. */
create or replace function public.guardian_consent_info(p_token text)
returns table (minor_name text, status text, expires_at timestamptz)
language sql
security definer
set search_path = public, kavi_private
as $$
  select coalesce(p.display_name, p.username),
         case when g.status = 'pending' and g.expires_at < now() then 'expired' else g.status end,
         g.expires_at
  from public.guardian_consents g
  join public.profiles p on p.id = g.minor_id
  where g.token_sha256 = kavi_private.sha256_hex(coalesce(p_token, ''));
$$;

/** El adulto aprueba o no. Una sola vez por enlace; repetir devuelve el estado que ya tiene. */
create or replace function public.decide_guardian_consent(p_token text, p_approve boolean)
returns text
language plpgsql
security definer
set search_path = public, kavi_private
as $$
declare
  v_row public.guardian_consents%rowtype;
begin
  select * into v_row from public.guardian_consents where token_sha256 = kavi_private.sha256_hex(coalesce(p_token, ''));
  if not found then
    raise exception 'Este enlace no es válido.' using errcode = '22023';
  end if;
  if v_row.status <> 'pending' then
    return v_row.status;
  end if;
  if v_row.expires_at < now() then
    raise exception 'Este enlace venció. Pide que te envíen uno nuevo desde KAVI.' using errcode = '22023';
  end if;
  update public.guardian_consents
     set status = case when p_approve then 'approved' else 'rejected' end, decided_at = now()
   where id = v_row.id;
  return case when p_approve then 'approved' else 'rejected' end;
end;
$$;

revoke execute on function public.create_guardian_consent(text, text) from public, anon;
grant execute on function public.create_guardian_consent(text, text) to authenticated;
revoke execute on function public.guardian_consent_info(text) from public;
grant execute on function public.guardian_consent_info(text) to anon, authenticated;
revoke execute on function public.decide_guardian_consent(text, boolean) from public;
grant execute on function public.decide_guardian_consent(text, boolean) to anon, authenticated;
