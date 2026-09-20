-- T020 + T021 · Spec 02 §2, Spec 05 — Dimensiones, temas y seed del sistema

create type public.dimension as enum
  ('fisica','emocional','social','intelectual','espiritual','financiera','ocupacional');

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 40),
  dimension public.dimension not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null,
  is_system boolean not null default false,
  owner_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (is_system = (owner_id is null))
);

-- Un usuario no repite el nombre de sus propios temas (RF-T2).
create unique index idx_themes_owner_name on public.themes (owner_id, lower(name))
  where owner_id is not null;

alter table public.themes enable row level security;

create policy "themes_select" on public.themes
  for select to authenticated using (is_system or owner_id = auth.uid());
-- `not is_system` impide que alguien se cuele un tema global (RF-T3).
create policy "themes_insert_own" on public.themes
  for insert to authenticated with check (owner_id = auth.uid() and not is_system);
create policy "themes_update_own" on public.themes
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "themes_delete_own" on public.themes
  for delete to authenticated using (owner_id = auth.uid());

-- Seed de los 19 temas del sistema (Spec 05). Los UUID son fijos y los mismos que
-- usa `src/constants/themes.ts`, para que el id del tema Gimnasio (que enciende el
-- módulo fitness, RF-T4) sea estable entre el backend demo y el real.
insert into public.themes (id, name, dimension, color, icon, is_system, owner_id) values
  ('00000000-0000-4000-8000-000000000001','Gimnasio','fisica','#4CAF50','dumbbell',true,null),
  ('00000000-0000-4000-8000-000000000002','Caminata/Correr','fisica','#4CAF50','footprints',true,null),
  ('00000000-0000-4000-8000-000000000003','Deporte','fisica','#4CAF50','trophy',true,null),
  ('00000000-0000-4000-8000-000000000004','Cita médica','fisica','#4CAF50','stethoscope',true,null),
  ('00000000-0000-4000-8000-000000000005','Descanso','emocional','#E91E63','moon',true,null),
  ('00000000-0000-4000-8000-000000000006','Journaling/Terapia','emocional','#E91E63','notebook-pen',true,null),
  ('00000000-0000-4000-8000-000000000007','Familia','social','#FF9800','house-heart',true,null),
  ('00000000-0000-4000-8000-000000000008','Amigos','social','#FF9800','users',true,null),
  ('00000000-0000-4000-8000-000000000009','Cita/Pareja','social','#FF9800','heart',true,null),
  ('00000000-0000-4000-8000-000000000010','Estudio','intelectual','#2196F3','graduation-cap',true,null),
  ('00000000-0000-4000-8000-000000000011','Lectura','intelectual','#2196F3','book-open',true,null),
  ('00000000-0000-4000-8000-000000000012','Curso/Clase','intelectual','#2196F3','school',true,null),
  ('00000000-0000-4000-8000-000000000013','Meditación','espiritual','#9C27B0','flower-2',true,null),
  ('00000000-0000-4000-8000-000000000014','Iglesia/Práctica','espiritual','#9C27B0','church',true,null),
  ('00000000-0000-4000-8000-000000000015','Finanzas/Pagos','financiera','#009688','wallet',true,null),
  ('00000000-0000-4000-8000-000000000016','Presupuesto','financiera','#009688','calculator',true,null),
  ('00000000-0000-4000-8000-000000000017','Trabajo','ocupacional','#607D8B','briefcase',true,null),
  ('00000000-0000-4000-8000-000000000018','Junta/Reunión','ocupacional','#607D8B','video',true,null),
  ('00000000-0000-4000-8000-000000000019','Proyecto personal','ocupacional','#607D8B','rocket',true,null)
on conflict (id) do nothing;
