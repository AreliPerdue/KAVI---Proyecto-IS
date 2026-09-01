# plan.md — Plan técnico KAVI V1

Decisiones de arquitectura para implementar las specs. Si algo aquí contradice una spec, gana la spec.

## 1. Stack y librerías
| Capa | Elección | Notas |
|---|---|---|
| Framework | React Native + Expo SDK 57 | proyecto TypeScript |
| Routing | Expo Router (file-based) | grupos `(auth)` y `(app)` |
| Backend | Supabase (`@supabase/supabase-js`) | Auth + Postgres + RLS + Realtime |
| Estado servidor | TanStack Query (react-query) | cache por rango de fechas, invalidación tras mutaciones y eventos Realtime |
| Estado local | Zustand (mínimo) | filtros activos, vista seleccionada |
| Fechas | date-fns + date-fns-tz | UTC en BD, local en UI |
| Calendario UI | Componentes propios sobre FlatList/ScrollView | control total de las 3 vistas; evaluar `react-native-calendars` solo para el grid mensual si acelera |
| Notificaciones | expo-notifications | locales programadas; permisos al primer reminder |
| Storage seguro | expo-secure-store | storage del cliente Supabase en nativo |
| Iconos | lucide-react-native | set curado en `constants/icons.ts` |
| Diseño | Skills `kavi-dev` + `kavi-design` (.claude/skills) | tokens en `constants/theme.ts`; reglas RN de Vercel; checklist ui-ux-pro-max |
| Formularios | react-hook-form + zod | validación tipada |

Nota de implementación: verificar versiones compatibles con SDK 57 vía `npx expo install` siempre (nunca `npm install` directo para libs con módulo nativo).

## 2. Arquitectura de la app
Nota: las rutas viven en `src/app/` (Expo Router SDK 57 le da precedencia sobre `app/` raíz; el template oficial ya usa `src/`).
```
src/app/
├── (auth)/login.tsx | register.tsx | forgot-password.tsx
├── (app)/
│   ├── _layout.tsx          # tabs: Calendario / Compartido / Fitness / Perfil
│   ├── calendar/index.tsx   # vistas mes-semana-día (estado interno)
│   ├── activity/[id].tsx    # detalle (bottom sheet route)
│   ├── activity/new.tsx     # formulario crear/editar
│   ├── shared/index.tsx     # contactos, solicitudes, invitaciones
│   ├── shared/availability.tsx
│   ├── fitness/index.tsx    # historial
│   ├── workout/[id].tsx     # captura de entrenamiento
│   └── profile/index.tsx
└── _layout.tsx              # AuthProvider + QueryClientProvider + redirect por sesión

src/
├── lib/supabase.ts          # cliente con SecureStore adapter (nativo) / default (web)
├── lib/notifications.ts     # programar/cancelar/reprogramar locales; fallback web
├── lib/dates.ts             # helpers rango de vista, huecos de disponibilidad
├── services/                # auth.ts, activities.ts, themes.ts, connections.ts,
│                            # shares.ts, reminders.ts, workouts.ts, availability.ts
├── hooks/                   # useActivitiesRange, useRealtimeShared, useReminderSync…
├── components/calendar/     # MonthView, WeekView, DayView, ActivityBlock, ThemePicker…
├── components/ui/           # Button, Sheet, Chip, EmptyState, ErrorState…
├── constants/dimensions.ts  # 7 dimensiones: color, icono, label
└── types/database.ts        # generado por supabase gen types
```

## 3. Flujo de datos
1. **Lectura calendario**: `useActivitiesRange(from,to)` → service → `select * from activities where start_at < to and end_at > from` (propias + compartidas aceptadas, la RLS filtra) → cache por clave `[from,to,filters]`.
2. **Mutaciones**: service → invalidate queries del rango afectado → reprogramar notificaciones si cambió horario/reminders.
3. **Realtime**: canal por usuario suscrito a `activities` (compartidas), `activity_shares`, `reminders`, `reminder_recipients` → invalidate + `syncNotifications()`.
4. **Notificaciones**: `syncNotifications()` = leer mis reminder_recipients habilitados de actividades futuras (próx. 90 días) → cancelar todas las programadas → reprogramar. Idempotente; se ejecuta al login, al recibir evento realtime y al volver a foreground.
5. **Disponibilidad**: RPC `get_availability(user_ids[], from, to)` → bloques sin detalle → `findFreeSlots()` en `lib/dates.ts` para RF-S9.

## 4. Recurrencia (implementación)
- Guardar RRULE simplificada en la madre; al crear/editar serie, generar instancias 90 días con función SQL `generate_recurrences(activity_id)` (mantiene todo consultable por rango).
- Job de extensión de horizonte: al abrir la app, si `max(start_at)` de la serie < hoy+60d → regenerar (client-triggered RPC; sin cron en V1).
- Editar "solo esta": la instancia se marca `recurrence_parent_id` + campos propios (detached=una fila normal editada).

## 5. Orden de construcción (fases → tasks.md)
1. **F0 Setup**: repo, Expo 57, Router, Supabase, CI de tipos.
2. **F1 Auth** (spec 03) — desbloquea todo.
3. **F2 Datos**: migraciones completas spec 02 + seeds + tests RLS (antes de UI de calendario, para no rehacer).
4. **F3 Calendario CRUD + vistas** (spec 04 sin recurrencia ni reminders).
5. **F4 Temas + filtros** (spec 05) y **recurrencia**.
6. **F5 Reminders propios** (notificaciones locales).
7. **F6 Compartido**: conexiones → shares → realtime → disponibilidad → reminders compartidos (spec 06).
8. **F7 Fitness** (spec 07).
9. **F8 NFR y hardening**: matriz 3 plataformas, rendimiento, estados, pulido (spec 08).

Mapa a sprints del documento académico: F0–F1=Sprint 1 · F2–F4=Sprints 2-3 · F5–F6=Sprint 4 · F7=Sprint 5 · F8=Sprint 6. Entrega: 26-sep-2026.

## 6. Riesgos técnicos y mitigación
| Riesgo | Mitigación |
|---|---|
| Complejidad del compartido (RLS + realtime + reminders) | F2 prueba RLS con tests antes de UI; construir compartido en sub-fases (conexiones→shares→realtime→reminders) |
| Notificaciones locales inconsistentes tras cambios remotos | `syncNotifications()` idempotente que reconstruye todo, en vez de deltas |
| Rendimiento del calendario | query por rango + índice + cache TanStack; medir con 500 actividades seed |
| Diferencias web/nativo | validar cada componente de calendario en web desde F4, no al final |
| Alcance creciente | P8: cualquier idea nueva → sección "Futuro" de la spec, no código |

## 7. Entornos y flujo de trabajo
- Supabase: proyecto único de desarrollo en V1 (académico); migraciones con CLI (`supabase migration new`, `supabase db push`).
- Git: `main` protegida mental­mente; ramas cortas por fase opcionales; commits `[Txxx] descripción`.
- Definición de done por tarea: criterios de aceptación de la spec + `tsc --noEmit` limpio + probado en al menos móvil; fin de fase: probado en las 3 plataformas.
