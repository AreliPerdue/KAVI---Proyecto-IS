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
Nota: las rutas viven en `src/app/` (Expo Router SDK 57 le da precedencia sobre `app/` raíz; el template oficial ya usa `src/`). Las pestañas van en el grupo `(app)/(tabs)/` como archivos planos para que los triggers de `NativeTabs` referencien rutas hoja; las rutas no-tab de `(app)` (detalle de actividad, workout) cuelgan del Stack padre. Guard de sesión con `Stack.Protected` (rutas protegidas nativas de Expo Router).
```
src/app/
├── (auth)/_layout.tsx | login.tsx | register.tsx | forgot-password.tsx
├── (app)/
│   ├── _layout.tsx          # Stack nativo: (tabs) + rutas modales (actividad, workout…)
│   ├── (tabs)/_layout.tsx   # NativeTabs (iOS/Android): Calendario / Compartido / Fitness / Perfil
│   ├── (tabs)/_layout.web.tsx # Tabs headless (expo-router/ui) con barra superior en web
│   ├── (tabs)/calendar.tsx  # vistas mes-semana-día (estado interno) → URL /calendar
│   ├── (tabs)/shared.tsx    # contactos, solicitudes, invitaciones → URL /shared
│   ├── (tabs)/fitness.tsx   # historial → URL /fitness
│   ├── (tabs)/profile.tsx   # perfil → URL /profile
│   ├── activity/[id].tsx    # detalle (bottom sheet route)
│   ├── activity/new.tsx     # formulario crear/editar
│   ├── shared/availability.tsx
│   └── workout/[id].tsx     # captura de entrenamiento
├── _layout.tsx              # Providers + Stack.Protected por sesión (RF-A5)
└── index.tsx                # Redirect a /calendar o /login

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
- Guardar RRULE simplificada en la madre; al crear/editar serie, materializar instancias a 90 días (mantiene todo consultable por rango).
- **Revisión (19-sep-2026, T031):** la materialización se hace en el cliente con `lib/recurrence.ts`, no con una función SQL `generate_recurrences`. Esa lógica ya expande la RRULE y es la que el modo demo usa desde la Fase 3; reescribirla en PL/pgSQL habría dejado la misma regla en dos lenguajes, con el riesgo de que la recurrencia se comportara distinto según el backend. Se inserta en lote, así que sigue siendo una sola ida al servidor.
- Job de extensión de horizonte: al abrir la app, si `max(start_at)` de la serie < hoy+60d → regenerar (client-triggered RPC; sin cron en V1).
- Editar "solo esta": la instancia se marca `recurrence_parent_id` + campos propios (detached=una fila normal editada).

## 5. Orden de construcción (fases → tasks.md)
Decisión (1-sep-2026): **frontend primero sobre modo demo**, backend real al final.
1. **F0 Setup**: repo, Expo 57, Router, CI de tipos.
2. **F1 Auth** (spec 03) — UI completa; backend demo en memoria.
3. **F2 Calendario CRUD + vistas** (spec 04 sin recurrencia ni reminders).
4. **F3 Temas + filtros** (spec 05) y **recurrencia** (materialización en cliente demo; en F8 vía RPC).
5. **F4 Reminders propios** (notificaciones locales, carga perezosa del módulo nativo).
6. **F5 Compartido**: conexiones → shares → disponibilidad → reminders compartidos (spec 06) con cuentas demo intercambiables.
7. **F6 Fitness** (spec 07).
8. **F7 NFR y pulido del frontend** (spec 08).
9. **F8 Backend e integración**: migraciones completas spec 02 + seeds + tests RLS + tipos generados + `services/supabase/*` + Realtime + hitos con backend real.

Regla de arquitectura que hace esto posible: la UI solo conoce `services/contracts.ts`; `services/backend.ts` elige demo o Supabase (ver kavi-dev §1).

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
