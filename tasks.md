# tasks.md — KAVI V1

Fuente de verdad del avance. Reglas: trabajar en orden, respetar dependencias, marcar `[x]` al completar, commit `[Txxx] …`. Cada tarea referencia su spec (RF/NFR) — sus criterios de aceptación definen el "done".

## Fase 0 — Setup (Sprint 1)
- [x] T000 Skills de proyecto `kavi-dev` y `kavi-design` (síntesis de vercel-react-native-skills, ui-ux-pro-max y frontend-design) enlazadas como regla en CLAUDE.md; paquete SDD (specs, plan, tasks) en el repo.
- [x] T001 Crear proyecto Expo SDK 57 con TypeScript strict y Expo Router. (plan §1)
- [x] T002 Estructura de carpetas de plan §2 (app/, src/, supabase/). Dep: T001
- [x] T003 Instalar dependencias con `npx expo install`: supabase-js, tanstack-query, zustand, date-fns(-tz), expo-notifications, expo-secure-store, lucide-react-native, react-hook-form, zod. Dep: T001
- [x] T004 Cliente Supabase en `src/lib/supabase.ts` con adapter SecureStore (nativo) y default (web); `.env` + `.env.example`; `.gitignore`. (NFR-5, NFR-7) Dep: T003
- [x] T005 Inicializar Supabase CLI y carpeta `supabase/migrations/`. Dep: T001
- [x] T006 Providers raíz en `app/_layout.tsx`: QueryClient + AuthProvider (esqueleto). Dep: T002
- [x] T007 Script de verificación: `npx tsc --noEmit` documentado en CLAUDE.md/README. Dep: T001

## Fase 1 — Auth (Sprint 1) — spec 03
- [x] T010 Migración: tabla `profiles` + RLS + trigger `handle_new_user`. (02 §1) Dep: T005
- [x] T011 `services/auth.ts`: signUp (con username), signIn, signOut, resetPassword, getSession. Dep: T004, T010
- [x] T012 AuthProvider real: sesión persistente, auto-refresh, estado de carga. (RF-A4) Dep: T011
- [x] T013 Rutas `(auth)`: login, register, forgot-password con react-hook-form+zod y errores en español. (RF-A1, RF-A3, RF-A7) Dep: T012
- [x] T014 Guard de rutas: redirect por sesión entre `(auth)` y `(app)`. (RF-A5) Dep: T012
- [ ] T015 Tabs `(app)/_layout.tsx`: Calendario, Compartido, Fitness, Perfil (pantallas placeholder). Dep: T014
- [ ] T016 Pantalla Perfil: ver/editar display_name y username, cerrar sesión. (RF-A6) Dep: T015
- [ ] T017 ✅ HITO: registro→login→sesión persistente→logout verificado en iOS/Android/web. Dep: T013–T016

## Fase 2 — Modelo de datos completo (Sprint 2) — spec 02
- [ ] T020 Migración: enum `dimension` + tabla `themes` + RLS. Dep: T010
- [ ] T021 Seed de ~19 temas del sistema (05). Dep: T020
- [ ] T022 Migración: `activities` + índice + trigger updated_at + RLS de owner (sin shares aún). Dep: T020
- [ ] T023 Migración: `connections` + RLS + función `are_connected`. Dep: T010
- [ ] T024 Migración: `calendar_shares`, `activity_shares` + RLS; ampliar policy select de activities (02 §7). Dep: T022, T023
- [ ] T025 Migración: `reminders`, `reminder_recipients` + RLS + RPC `add_reminder_recipients`. Dep: T024
- [ ] T026 Migración: `workouts`, `workout_exercises` + RLS. Dep: T022
- [ ] T027 RPC `get_availability` (security definer, solo bloques). Dep: T024
- [ ] T028 RPC `generate_recurrences` (horizonte 90 días). (plan §4) Dep: T022
- [ ] T029 Generar `types/database.ts` con supabase gen types. (NFR-15) Dep: T020–T028
- [ ] T030 ✅ HITO: `supabase db reset` limpio + tests RLS con 2 usuarios cubriendo criterios de spec 02. (NFR-4) Dep: T029

## Fase 3 — Calendario núcleo (Sprint 2) — spec 04
- [ ] T040 `services/activities.ts`: CRUD + query por rango. Dep: T029
- [ ] T041 `hooks/useActivitiesRange` con TanStack Query (cache por rango). (NFR-1) Dep: T040
- [ ] T042 Vista mensual: grid, puntos de color, tocar día→vista diaria. (RF-C1) Dep: T041
- [ ] T043 Vista diaria: timeline con bloques posicionados. (RF-C3) Dep: T041
- [ ] T044 Vista semanal: 7 columnas con bloques. (RF-C2) Dep: T043
- [ ] T045 Navegación de fechas + botón Hoy + selector de vista persistente. (RF-C4) Dep: T042–T044
- [ ] T046 Formulario de actividad (crear/editar): título, fecha, horas, todo-el-día, descripción; default 1 h. (RF-C5) Dep: T040
- [ ] T047 Crear desde slot vacío con hora pre-llenada. (RF-C6) Dep: T043, T046
- [ ] T048 Bottom sheet de detalle: editar, eliminar. (RF-C7 parcial) Dep: T046
- [ ] T049 Estados carga/vacío/error en las 3 vistas. (RF-C12, NFR-11) Dep: T042–T044
- [ ] T050 ✅ HITO: CRUD completo visible en 3 vistas, probado en 3 plataformas. Dep: T045–T049

## Fase 4 — Temas, filtros y recurrencia (Sprint 3) — spec 05 + RF-C8
- [ ] T060 `constants/dimensions.ts` + set de iconos curado. Dep: T029
- [ ] T061 ThemePicker agrupado por dimensión con búsqueda. (RF-T1) Dep: T060
- [ ] T062 Integrar picker al formulario: auto-asigna dimensión/color/icono e `is_gym` si tema Gimnasio. (RF-T1, regla 04) Dep: T061, T046
- [ ] T063 CRUD de temas propios (paleta 12 colores, ~30 iconos); protección de temas sistema. (RF-T2, RF-T3) Dep: T061
- [ ] T064 Eliminar tema propio: copia de estilo + set null verificado. (RF-T6) Dep: T063
- [ ] T065 Filtros por dimensión/tema (chips) aplicados a las 3 vistas. (RF-C11) Dep: T062
- [ ] T066 Recurrencia en formulario: diaria/semanal(días)/mensual + fin. (RF-C8) Dep: T046
- [ ] T067 Integrar `generate_recurrences` al guardar serie; extensión de horizonte al abrir app. Dep: T066, T028
- [ ] T068 Editar/eliminar "solo esta" vs "toda la serie". (RF-C8) Dep: T067
- [ ] T069 ✅ HITO: calendario personalizable con temas, filtros y recurrencia. Dep: T062–T068

## Fase 5 — Reminders propios (Sprint 4) — RF-C9/C10
- [ ] T070 `lib/notifications.ts`: permisos, programar/cancelar, `syncNotifications()` idempotente. (plan §3.4) Dep: T029
- [ ] T071 UI de reminders en formulario/detalle (presets, múltiples). (RF-C9) Dep: T046, T070
- [ ] T072 Reprogramación al editar horario/eliminar actividad; sync al login y foreground. (RF-C10) Dep: T071
- [ ] T073 Fallback web: banner in-app de reminders vencidos. (RF-C10, NFR-10) Dep: T071
- [ ] T074 ✅ HITO: notificación local llega en iOS y Android con el título correcto. Dep: T072

## Fase 6 — Compartido (Sprint 4) — spec 06
- [ ] T080 `services/connections.ts` + pantalla Contactos: búsqueda, solicitar, aceptar, eliminar. (RF-S1–S3) Dep: T029
- [ ] T081 Compartir actividad desde detalle → shares pending. (RF-S4) Dep: T080, T048
- [ ] T082 Invitaciones: badge, aceptar/rechazar; estilo distintivo en calendario del invitado. (RF-S5) Dep: T081
- [ ] T083 Solo-lectura para invitados + salirse del share. (RF-S6) Dep: T082
- [ ] T084 Compartir calendario por contacto con visibilidad busy/details + revocar. (RF-S7) Dep: T080
- [ ] T085 Vista Disponibilidad (RPC get_availability, multi-contacto). (RF-S8) Dep: T084, T027
- [ ] T086 "Encontrar horario": huecos comunes → pre-llenar formulario. (RF-S9) Dep: T085
- [ ] T087 Realtime: suscripciones e invalidación de cache. (RF-S14) Dep: T082
- [ ] T088 Reminders compartidos: herencia al aceptar, sync de cambios, silenciar individual, texto "Compartida por…". (RF-S10–S13) Dep: T087, T072, T025
- [ ] T089 ✅ HITO: criterios de aceptación de spec 06 completos entre 2 cuentas reales. Dep: T083–T088

## Fase 7 — Fitness (Sprint 5) — spec 07
- [ ] T090 `services/workouts.ts`. Dep: T029
- [ ] T091 Botón "Registrar/Ver entrenamiento" en detalle si is_gym; relación 1:1. (RF-F1) Dep: T090, T062
- [ ] T092 Pantalla de entrenamiento: encabezado + tarjetas de ejercicio con campos abiertos; guardado incremental. (RF-F3–F5) Dep: T091
- [ ] T093 Autocompletado de nombres usados antes. (RF-F4) Dep: T092
- [ ] T094 Eliminar ejercicio con undo. (RF-F6) Dep: T092
- [ ] T095 Historial + detalle lectura + editar. (RF-F7) Dep: T092
- [ ] T096 Duplicar workout en actividad futura o libre. (RF-F8, HU-F4) Dep: T095
- [ ] T097 Privacidad: invitados no ven workouts (test con 2 cuentas). (regla 07) Dep: T091
- [ ] T098 ✅ HITO: flujo calendario→entrenamiento→historial completo. Dep: T092–T097

## Fase 8 — NFR, pruebas y entrega (Sprint 6) — spec 08
- [ ] T100 Matriz de pruebas por feature en iOS/Android/web; corregir hallazgos. (NFR-8)
- [ ] T101 Rendimiento: seed 500 actividades, medir ≤3 s, prefetch mes adyacente. (NFR-1, NFR-2)
- [ ] T102 Revisión de estados carga/vacío/error en todas las pantallas. (NFR-11)
- [ ] T103 Web responsive del calendario. (NFR-9)
- [ ] T104 Revisión textos es-MX y confirmaciones/undo. (NFR-12, NFR-13)
- [ ] T105 Pasada de tests RLS final + revisión de que no hay llamadas fuera de services. (NFR-4, NFR-6)
- [ ] T106 `tsc --noEmit` limpio, limpieza de código muerto. (NFR-14)
- [ ] T107 ✅ HITO FINAL: versión candidata KAVI V1 — 26 de septiembre de 2026.

## Backlog futuro (NO implementar — P8)
Estadísticas de entrenamientos · módulos de otras dimensiones (KAVI Reader, nutrición) · push remoto · export/import calendarios · offline completo · plantillas de rutina.
