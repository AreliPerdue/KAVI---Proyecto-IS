-- T170 · Spec 05 (RF-T3) — Personalizar los temas del sistema, por persona.
--
-- Los temas del sistema son filas GLOBALES (`owner_id is null`) que comparten todas
-- las cuentas: editarlas en sitio le cambiaria el tema a todo el mundo. Por eso la
-- personalizacion vive aparte, una fila por persona y tema, y la lista se compone al
-- leer. Asi cada quien ve los suyos, nadie puede tocar los de otro y "restablecer" es
-- un borrado limpio que no puede alcanzar a los temas propios.

create table public.theme_overrides (
  user_id uuid not null references public.profiles(id) on delete cascade,
  theme_id uuid not null references public.themes(id) on delete cascade,
  name text check (char_length(trim(name)) between 1 and 40),
  dimension public.dimension,
  color text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text,
  created_at timestamptz not null default now(),
  primary key (user_id, theme_id)
);

comment on table public.theme_overrides is
  'Personalizacion por persona de los temas del sistema (RF-T3). Las columnas nulas '
  'heredan del tema original.';

alter table public.theme_overrides enable row level security;

-- Sin `for all`: se separan para que quede escrito que nadie escribe la fila de otro.
create policy "theme_overrides_select" on public.theme_overrides
  for select to authenticated using (user_id = auth.uid());
create policy "theme_overrides_insert" on public.theme_overrides
  for insert to authenticated with check (user_id = auth.uid());
create policy "theme_overrides_update" on public.theme_overrides
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "theme_overrides_delete" on public.theme_overrides
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.theme_overrides to authenticated;

-- Solo tiene sentido personalizar un tema del sistema: los propios se editan directos.
create or replace function public.theme_override_solo_sistema()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.themes t where t.id = new.theme_id and t.is_system) then
    raise exception 'Solo se pueden personalizar los temas del sistema';
  end if;
  return new;
end;
$$;

create trigger theme_overrides_solo_sistema
  before insert or update on public.theme_overrides
  for each row execute function public.theme_override_solo_sistema();
