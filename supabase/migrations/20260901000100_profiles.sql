-- T010 · Spec 02 §1 — Perfiles + RLS + trigger handle_new_user (RF-A2)

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 30),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Todos los autenticados pueden ver perfiles básicos (necesario para buscar contactos)
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- Crea el profile automáticamente al registrarse.
-- El cliente envía username/display_name en options.data (raw_user_meta_data).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(
      nullif(lower(new.raw_user_meta_data ->> 'username'), ''),
      'user_' || left(replace(new.id::text, '-', ''), 8)
    ),
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Permite validar disponibilidad de username antes del registro (RF-A1),
-- también para usuarios anónimos. No expone ningún otro dato del perfil.
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where username = lower(p_username)
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;
