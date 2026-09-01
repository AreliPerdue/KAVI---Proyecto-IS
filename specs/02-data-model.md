# Spec 02 — Modelo de datos (PostgreSQL / Supabase)

Entidad central: **activities**. Todo lo demás se relaciona con ella (P6). Todas las fechas en `timestamptz` (UTC). Todas las tablas con RLS activo.

## Diagrama lógico
```
profiles ─┬─< activities >─── themes (predefinidos, ligados a dimensión)
          │       │
          │       ├─< reminders ─< reminder_recipients (reminders compartidos)
          │       ├─< activity_shares (compartir actividad puntual)
          │       └─── workouts ─< workout_exercises (mini gym tracker)
          ├─< connections (contactos entre usuarios)
          └─< calendar_shares (compartir calendario completo)
```

## 1. Perfiles
```sql
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
```
Trigger recomendado: crear el profile automáticamente al registrarse (function `handle_new_user` sobre `auth.users`).

## 2. Dimensiones y temas predefinidos
Las 7 dimensiones son un tipo enum (fijas, P3). Los temas son filas seed del sistema; el usuario también puede crear temas propios.

```sql
create type public.dimension as enum
  ('fisica','emocional','social','intelectual','espiritual','financiera','ocupacional');

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dimension public.dimension not null,
  color text not null,          -- hex, ej. '#4CAF50'
  icon text not null,           -- nombre de icono (lucide/ionicons)
  is_system boolean not null default false,
  owner_id uuid references public.profiles(id) on delete cascade, -- null si is_system
  created_at timestamptz not null default now(),
  check (is_system = (owner_id is null))
);

alter table public.themes enable row level security;

create policy "themes_select" on public.themes
  for select to authenticated using (is_system or owner_id = auth.uid());
create policy "themes_insert_own" on public.themes
  for insert to authenticated with check (owner_id = auth.uid() and not is_system);
create policy "themes_update_own" on public.themes
  for update to authenticated using (owner_id = auth.uid());
create policy "themes_delete_own" on public.themes
  for delete to authenticated using (owner_id = auth.uid());
```
Seed de temas del sistema (ver lista completa en `05-themes-dimensions.md`), ej.: Gimnasio (fisica), Caminata (fisica), Trabajo (ocupacional), Estudio (intelectual), Lectura (intelectual), Familia (social), Amigos (social), Meditación (espiritual), Finanzas (financiera), Terapia/Journaling (emocional), Descanso (emocional).

## 3. Actividades (núcleo)
```sql
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  theme_id uuid references public.themes(id) on delete set null,
  dimension public.dimension,        -- redundante con theme para permitir actividad sin tema
  color text,                        -- override opcional del color del tema
  icon text,                         -- override opcional
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  recurrence_rule text,              -- RRULE (RFC 5545) simplificada: DAILY/WEEKLY/MONTHLY + BYDAY + UNTIL/COUNT
  recurrence_parent_id uuid references public.activities(id) on delete cascade,
  is_gym boolean not null default false,  -- habilita módulo fitness (se activa con tema Gimnasio o manualmente)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index idx_activities_owner_range on public.activities (owner_id, start_at);
alter table public.activities enable row level security;
```
Políticas (dependen de shares, definidas abajo en §7 para evitar referencias circulares).

**Recurrencia (decisión):** se guarda la regla en la actividad "madre" y se **materializan instancias** hasta un horizonte de 90 días (filas con `recurrence_parent_id`). Editar "esta ocurrencia" edita la instancia; editar "toda la serie" regenera instancias futuras. Simple y consultable con SQL normal.

## 4. Conexiones (contactos)
```sql
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

alter table public.connections enable row level security;

create policy "connections_select_own" on public.connections
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "connections_insert_own" on public.connections
  for insert to authenticated with check (requester_id = auth.uid());
create policy "connections_update_addressee" on public.connections
  for update to authenticated using (addressee_id = auth.uid());  -- aceptar
create policy "connections_delete_own" on public.connections
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
```
Función helper (security definer) `are_connected(a uuid, b uuid) returns boolean` — usada por otras políticas.

## 5. Compartir calendario completo
```sql
create table public.calendar_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  shared_with_id uuid not null references public.profiles(id) on delete cascade,
  visibility text not null default 'busy' check (visibility in ('busy','details')),
  -- 'busy'   = solo bloques ocupado/libre (disponibilidad)
  -- 'details'= título, tema y horario de las actividades
  created_at timestamptz not null default now(),
  check (owner_id <> shared_with_id),
  unique (owner_id, shared_with_id)
);

alter table public.calendar_shares enable row level security;
create policy "cal_shares_select" on public.calendar_shares
  for select to authenticated using (owner_id = auth.uid() or shared_with_id = auth.uid());
create policy "cal_shares_cud_owner" on public.calendar_shares
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
```
Requisito: solo se puede compartir con conexiones `accepted` (validar en servicio + check con `are_connected`).

## 6. Compartir actividad puntual
```sql
create table public.activity_shares (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  shared_with_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (activity_id, shared_with_id)
);

alter table public.activity_shares enable row level security;
create policy "act_shares_select" on public.activity_shares
  for select to authenticated
  using (shared_with_id = auth.uid()
         or exists (select 1 from public.activities a
                    where a.id = activity_id and a.owner_id = auth.uid()));
create policy "act_shares_insert_owner" on public.activity_shares
  for insert to authenticated
  with check (exists (select 1 from public.activities a
                      where a.id = activity_id and a.owner_id = auth.uid()));
create policy "act_shares_update_recipient" on public.activity_shares
  for update to authenticated using (shared_with_id = auth.uid()); -- aceptar/rechazar
create policy "act_shares_delete" on public.activity_shares
  for delete to authenticated
  using (shared_with_id = auth.uid()
         or exists (select 1 from public.activities a
                    where a.id = activity_id and a.owner_id = auth.uid()));
```

## 7. Políticas RLS de activities (con shares ya definidos)
```sql
create policy "activities_select" on public.activities
  for select to authenticated using (
    owner_id = auth.uid()
    or exists (select 1 from public.activity_shares s
               where s.activity_id = id and s.shared_with_id = auth.uid()
                 and s.status = 'accepted')
    or exists (select 1 from public.calendar_shares c
               where c.owner_id = activities.owner_id
                 and c.shared_with_id = auth.uid()
                 and c.visibility = 'details')
  );
-- La visibilidad 'busy' NO expone filas: la disponibilidad se consulta
-- vía RPC get_availability() (security definer) que devuelve solo bloques
-- (start_at, end_at) sin título ni detalle.

create policy "activities_cud_owner" on public.activities
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
```

## 8. Reminders y reminders compartidos
Un reminder pertenece a una actividad; cada destinatario tiene su fila (el dueño y cada persona que aceptó la actividad compartida). Cada cliente programa localmente sus propias notificaciones a partir de sus filas.

```sql
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  offset_minutes int not null check (offset_minutes >= 0),  -- antes del start_at
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (activity_id, offset_minutes)
);

create table public.reminder_recipients (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  enabled boolean not null default true,   -- cada quien puede silenciar el reminder
  unique (reminder_id, user_id)
);

alter table public.reminders enable row level security;
alter table public.reminder_recipients enable row level security;

create policy "reminders_select" on public.reminders
  for select to authenticated
  using (exists (select 1 from public.reminder_recipients r
                 where r.reminder_id = id and r.user_id = auth.uid())
         or created_by = auth.uid());
create policy "reminders_cud_activity_owner" on public.reminders
  for all to authenticated
  using (exists (select 1 from public.activities a
                 where a.id = activity_id and a.owner_id = auth.uid()))
  with check (created_by = auth.uid());

create policy "rem_recipients_select_own" on public.reminder_recipients
  for select to authenticated using (user_id = auth.uid());
create policy "rem_recipients_update_own" on public.reminder_recipients
  for update to authenticated using (user_id = auth.uid());
-- inserts vía función add_reminder_recipients() (security definer):
-- al crear reminder → fila para el owner y para cada share aceptado;
-- al aceptar un share → filas para los reminders existentes de esa actividad.
```

## 9. Módulo fitness (mini gym tracker)
Campos abiertos y sencillos: texto libre donde importa, números opcionales.

```sql
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid unique references public.activities(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  performed_at timestamptz not null default now(),
  duration_minutes int check (duration_minutes > 0),
  notes text,
  created_at timestamptz not null default now()
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  position int not null default 0,
  name text not null,        -- libre: "Press banca", "Sentadilla búlgara"…
  sets int,                  -- opcional
  reps text,                 -- libre: "12", "12/10/8", "al fallo"
  weight text,               -- libre: "40kg", "25 lb por lado", "peso corporal"
  duration_minutes int,      -- para cardio/planchas
  notes text                 -- detalle libre
);

alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;

create policy "workouts_owner" on public.workouts
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "wex_owner" on public.workout_exercises
  for all to authenticated
  using (exists (select 1 from public.workouts w
                 where w.id = workout_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from public.workouts w
                      where w.id = workout_id and w.owner_id = auth.uid()));
```

## 10. Funciones/RPC requeridas
| Función | Tipo | Propósito |
|---|---|---|
| `handle_new_user()` | trigger | Crea profile al registrarse |
| `are_connected(a,b)` | security definer | ¿Existe conexión accepted entre a y b? |
| `get_availability(user_id, from, to)` | security definer | Bloques ocupado/libre sin detalle (visibility busy) |
| `add_reminder_recipients(...)` | security definer | Mantiene reminder_recipients sincronizado |
| `set_updated_at()` | trigger | updated_at en activities |

## Criterios de aceptación del modelo
- Given un usuario B sin shares, When consulta activities de A, Then recibe 0 filas (probado con tests de RLS).
- Given calendar_share visibility='busy', When B consulta disponibilidad de A, Then obtiene bloques sin título/descripcion, y no puede leer las filas de activities.
- Given un activity_share aceptado con reminder, When B consulta reminder_recipients, Then tiene su fila y puede silenciarla sin afectar al dueño.
- Todas las migraciones corren de cero (`supabase db reset`) sin errores y con seeds de temas.
