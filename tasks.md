# tasks.md — KAVI V1

Fuente de verdad del avance. Reglas: trabajar en orden, respetar dependencias, marcar `[x]` al completar, commit `[Txxx] …`. Cada tarea referencia su spec (RF/NFR) — sus criterios de aceptación definen el "done".

**Decisión de orden (1-sep-2026):** el frontend completo se construye primero sobre el **modo demo** (backend en memoria, `services/demo/*`, ver CLAUDE.md). Toda la integración real (migraciones, RLS, tipos generados, implementaciones `services/supabase/*`, pruebas con backend) se concentra en la **Fase 8**, al final. Cada contrato nuevo en `services/contracts.ts` se implementa en demo de inmediato y en Supabase en la Fase 8.

## Fase 0 — Setup (Sprint 1)
- [x] T000 Skills de proyecto `kavi-dev` y `kavi-design` (síntesis de vercel-react-native-skills, ui-ux-pro-max y frontend-design) enlazadas como regla en CLAUDE.md; paquete SDD (specs, plan, tasks) en el repo.
- [x] T001 Crear proyecto Expo SDK 57 con TypeScript strict y Expo Router. (plan §1)
- [x] T002 Estructura de carpetas de plan §2 (app/, src/, supabase/). Dep: T001
- [x] T003 Instalar dependencias con `npx expo install`: supabase-js, tanstack-query, zustand, date-fns(-tz), expo-notifications, expo-secure-store, lucide-react-native, react-hook-form, zod. Dep: T001
- [x] T004 Cliente Supabase en `src/lib/supabase.ts` con adapter SecureStore (nativo) y default (web); `.env` + `.env.example`; `.gitignore`. (NFR-5, NFR-7) Dep: T003
- [x] T005 Inicializar Supabase CLI y carpeta `supabase/migrations/`. Dep: T001
- [x] T006 Providers raíz en `app/_layout.tsx`: QueryClient + AuthProvider (esqueleto). Dep: T002
- [x] T007 Script de verificación: `npx tsc --noEmit` documentado en CLAUDE.md/README. Dep: T001

## Fase 1 — Auth (UI sobre modo demo) — spec 03
- [x] T010 Migración: tabla `profiles` + RLS + trigger `handle_new_user`. (02 §1) Dep: T005
- [x] T011 `services/auth.ts`: signUp (con username), signIn, signOut, resetPassword, getSession. Dep: T004, T010
- [x] T012 AuthProvider real: sesión persistente, auto-refresh, estado de carga. (RF-A4) Dep: T011
- [x] T013 Rutas `(auth)`: login, register, forgot-password con react-hook-form+zod y errores en español. (RF-A1, RF-A3, RF-A7) Dep: T012
- [x] T014 Guard de rutas: redirect por sesión entre `(auth)` y `(app)`. (RF-A5) Dep: T012
- [x] T015 Tabs `(app)/_layout.tsx`: Calendario, Compartido, Fitness, Perfil (pantallas placeholder). Dep: T014
- [x] T016 Pantalla Perfil: ver/editar display_name y username, cerrar sesión. (RF-A6) Dep: T015
- [x] T018 Modo demo sin backend (`EXPO_PUBLIC_DEMO_MODE`, datos en memoria en `services/demo/`) y carga perezosa de módulos nativos. Fachadas `services/*.ts` sobre `services/backend.ts`.

## Fase 2 — Calendario núcleo (UI, modo demo) — spec 04
- [x] T039 Base del calendario: `lib/dates.ts` (rangos mes/semana/día, formatos es-MX, próxima media hora), `lib/storage.ts` (persistencia clave-valor multiplataforma), store Zustand (vista, fecha, filtros) y set de iconos curado `constants/icons.ts` + componente `Icon`. Dep: T018
- [x] T040 `services/activities.ts`: CRUD + query por rango (contrato + demo). Dep: T039
- [x] T041 `hooks/useActivitiesRange` con TanStack Query (cache por rango) + prefetch de rangos adyacentes. (NFR-1, NFR-2) Dep: T040
- [x] T042 Vista mensual: grid, puntos de color, tocar día→vista diaria. (RF-C1) Dep: T041
- [x] T043 Vista diaria: timeline con bloques posicionados. (RF-C3) Dep: T041
- [x] T044 Vista semanal: 7 columnas con bloques. (RF-C2) Dep: T043
- [x] T045 Navegación de fechas + botón Hoy + selector de vista persistente. (RF-C4) Dep: T042–T044
- [x] T046 Formulario de actividad (crear/editar): título, fecha, horas, todo-el-día, descripción; default 1 h. (RF-C5) Dep: T040
- [x] T047 Crear desde slot vacío con hora pre-llenada. (RF-C6) Dep: T043, T046
- [x] T048 Hoja de detalle: editar, eliminar (con confirmación/undo). (RF-C7 parcial, NFR-12) Dep: T046
- [x] T049 Estados carga/vacío/error en las 3 vistas. (RF-C12, NFR-11) Dep: T042–T044
- [x] T050 ✅ HITO: CRUD completo visible en 3 vistas en modo demo (web verificado con capturas; móvil por confirmar en build nativo del desarrollador). Dep: T045–T049

## Fase 3 — Temas, filtros y recurrencia (UI, modo demo) — spec 05 + RF-C8
- [x] T060 `constants/dimensions.ts` + `constants/themes.ts` (seed sistema) + `services/themes.ts` CRUD (contrato + demo). Dep: T039
- [x] T061 ThemePicker agrupado por dimensión con búsqueda. (RF-T1) Dep: T060
- [x] T062 Integrar picker al formulario: auto-asigna dimensión/color/icono e `is_gym` si tema Gimnasio. (RF-T1, regla 04) Dep: T061, T046
- [x] T063 CRUD de temas propios (paleta 12 colores, ~30 iconos); protección de temas sistema. (RF-T2, RF-T3) Dep: T061
- [x] T064 Eliminar tema propio: copia de estilo + set null verificado en demo. (RF-T6) Dep: T063
- [x] T065 Filtros por dimensión/tema (chips) aplicados a las 3 vistas. (RF-C11) Dep: T062
- [x] T066 Recurrencia en formulario: diaria/semanal(días)/mensual + fin. (RF-C8) Dep: T046
- [x] T067 `lib/recurrence.ts` (RRULE simplificada) + materialización de instancias a 90 días en demo; extensión de horizonte al abrir app. (plan §4) Dep: T066
- [x] T068 Editar/eliminar "solo esta" vs "toda la serie". (RF-C8) Dep: T067
- [x] T069 ✅ HITO: calendario personalizable con temas, filtros y recurrencia en modo demo. Dep: T062–T068

## Fase 4 — Reminders propios — RF-C9/C10
- [x] T070 `lib/notifications.ts`: permisos, programar/cancelar, `syncNotifications()` idempotente; expo-notifications cargado perezosamente; no-op en web. (plan §3.4) Dep: T039
- [x] T071 `services/reminders.ts` (contrato + demo) + UI de reminders en formulario/detalle (presets, múltiples). (RF-C9) Dep: T046, T070
- [x] T072 Reprogramación al editar horario/eliminar actividad; sync al login y foreground. (RF-C10) Dep: T071
- [x] T073 Fallback web: banner in-app de reminders vencidos. (RF-C10, NFR-10) Dep: T071
- [ ] T074 ✅ HITO: notificación local llega en iOS y Android con el título correcto (requiere build nativo recompilado). Dep: T072

## Fase 5 — Compartido (UI, modo demo) — spec 06
- [x] T080 `services/connections.ts` (contrato + demo con varias cuentas seed) + pantalla Contactos: búsqueda, solicitar, aceptar, eliminar. (RF-S1–S3) Dep: T039
- [x] T081 `services/shares.ts` + Compartir actividad desde detalle → shares pending. (RF-S4) Dep: T080, T048
- [x] T082 Invitaciones: badge en tab, aceptar/rechazar; estilo distintivo en calendario del invitado. (RF-S5) Dep: T081
- [x] T083 Solo-lectura para invitados + salirse del share. (RF-S6) Dep: T082
- [x] T084 Compartir calendario por contacto con visibilidad busy/details + revocar. (RF-S7) Dep: T080
- [x] T085 Vista Disponibilidad (`services/availability.ts`, multi-contacto). (RF-S8) Dep: T084
- [x] T086 "Encontrar horario": huecos comunes → pre-llenar formulario. (RF-S9) Dep: T085
- [x] T087 Suscripción a cambios (demo: emisor en memoria; Supabase Realtime en Fase 8) e invalidación de cache. (RF-S14) Dep: T082
- [x] T088 Reminders compartidos: herencia al aceptar, sync de cambios, silenciar individual, texto "Compartida por…". (RF-S10–S13) Dep: T087, T072
- [x] T089 ✅ HITO: criterios de spec 06 recorridos en modo demo cambiando entre cuentas seed. Dep: T083–T088

## Fase 6 — Fitness (UI, modo demo) — spec 07
- [x] T090 `services/workouts.ts` (contrato + demo). Dep: T039
- [x] T091 Botón "Registrar/Ver entrenamiento" en detalle si is_gym; relación 1:1. (RF-F1) Dep: T090, T062
- [x] T092 Pantalla de entrenamiento: encabezado + tarjetas de ejercicio con campos abiertos; guardado incremental. (RF-F3–F5) Dep: T091
- [x] T093 Autocompletado de nombres usados antes. (RF-F4) Dep: T092
- [x] T094 Eliminar ejercicio con undo. (RF-F6) Dep: T092
- [x] T095 Historial + detalle lectura + editar + entrenamiento libre. (RF-F2, RF-F7) Dep: T092
- [x] T096 Duplicar workout en actividad futura o libre. (RF-F8, HU-F4) Dep: T095
- [x] T097 Privacidad en UI: invitados no ven el botón ni el contenido del entrenamiento. (regla 07) Dep: T091
- [x] T098 ✅ HITO: flujo calendario→entrenamiento→historial completo en modo demo. Dep: T092–T097

## Fase 7 — NFR y pulido del frontend — spec 08
- [ ] T100 Matriz de pruebas por feature en iOS/Android/web en modo demo; corregir hallazgos. (NFR-8) — web verificado con capturas en cada fase; iOS/Android pendientes de build nativo del desarrollador.
- [x] T102 Revisión de estados carga/vacío/error en todas las pantallas. (NFR-11)
- [x] T103 Web responsive del calendario (semana completa ≥ 1024 px). (NFR-9)
- [x] T104 Revisión textos es-MX y confirmaciones/undo. (NFR-12, NFR-13)
- [x] T106 `tsc --noEmit` limpio, limpieza de código muerto, checklist kavi-design por pantalla. (NFR-14)

## Fase 7b — Refactor UX del calendario y responsive (2-sep-2026, feedback del desarrollador)
- [x] T110 Selector de hora en formato 12 h: hora 1–12, minuto 0–59 y AM/PM; formato 12 h en toda la UI. (RF-C5)
- [x] T111 Vista mensual con chips por actividad (título con color), "+N más" y celdas que llenan la pantalla; tocar un día abre el día por horas. (RF-C1, RF-C3)
- [x] T112 Pestañas de personas "Tú · contacto · + Contactos" para superponer el calendario de un contacto (busy sin títulos, details con títulos). (RF-S7, RF-S8)
- [x] T113 Header con mes desplegable (ir a fecha), Hoy, menú de vista y filtros; swipe horizontal para cambiar de periodo. (RF-C4)
- [x] T114 Responsive: `Screen` ya no desborda en nativo (ancho resuelto con alignSelf + maxWidth); verificado en simulador iPhone 17 en todas las pestañas. (NFR-9)
- [x] T115 `GestureHandlerRootView` en la raíz y `EXPO_PUBLIC_DEMO_START` para abrir cualquier ruta en desarrollo/capturas.
- [x] T116 Tema oscuro por defecto y sistema de color sobre las anclas `#131313` / `#F2F2F2`; paleta clara reescrita como inversa. Contrastes verificados ≥ 4.5:1. (NFR-18) Dep: T114
- [x] T117 Encuadre de pantallas modales: `Screen modal` deja de aplicar el inset superior de la ventana raíz (iOS reporta 62 pt dentro de un modal presentado) y los encabezados alinean ópticamente el icono con el borde de contenido. Dep: T116
- [x] T118 `Toggle` propio con tokens en lugar del `Switch` nativo: en iOS se ignoran `thumbColor` y el riel apagado, y el pulgar blanco del sistema desaparecía sobre el riel encendido. Dep: T116
- [x] T119 Calendario en 24 h: formatos `formatMinutes`/`formatHourLabel`, rejilla diaria y semanal en saltos de 30 min, las 24 horas visibles e indicador de hora actual en vivo. Selector de hora 00–23 / 00–59. (RF-C3, RF-C6, RF-C13, NFR-13) Dep: T116
- [x] T120 La vista mensual vuelve a ser la de apertura: entrar a un día desde el mes usa `openDay` y ya no sobrescribe la vista persistida. (RF-C1, RF-C4) Dep: T119
- [x] T121 Color por persona en el calendario superpuesto: paleta `constants/people-colors.ts` (8 matices, ≥ 5,6:1 sobre `#131313`), color por contacto en `Contact`/`ConnectionsApi.setContactColor` (demo + stub Supabase) con reparto automático del primer color libre, y selector en la ficha del contacto que se ofrece al aceptarlo. (RF-S15) Dep: T116
- [x] T122 Pestañas de personas multiselección: se superponen varios contactos a la vez y, mientras haya alguno, las actividades se pintan por dueño en vez de por tema; "Tú" a solas restaura el color coding de dimensiones. Seed demo con Pedro como segundo contacto que comparte. (RF-S15) Dep: T121
- [x] T123 La vista diaria despliega la rejilla de 24 h también sin actividades: el estado vacío pasa a ser un aviso en línea sobre la rejilla en vez de reemplazarla. (RF-C3, NFR-11) Dep: T119
- [x] T124 Vista mensual responsive: rejilla por filas con `flex` en vez de anchos `100/7 %` (en Android redondeaban a >100 % y el domingo saltaba de fila) y 6 filas que se reparten el alto (antes `Math.max(76,…)` + `overflow:hidden` recortaba las últimas semanas en pantallas bajas). Verificado en 720×1280@320, 1080×2400@420 y 1600×2560@280. (RF-C1, NFR-8, NFR-9) Dep: T120
- [x] T125 Densidad adaptativa de la celda del mes: los chips crecen para llenar la celda, la hora se antepone al título en celdas anchas, fallback a puntos de color cuando no cabe ningún chip, y fin de semana diferenciado. Número de día con `numberOfLines` y caja escalada: con fuente grande "14" envolvía y se recortaba. (RF-C1) Dep: T124
- [x] T126 Primitivas `SettingsGroup` / `SettingsRow` (tarjeta agrupada, tile de icono, valor, chevron, tono destructivo) para el patrón de lista de ajustes. Dep: T116
- [x] T127 Rediseño de Perfil: cabecera de identidad, resumen de uso, ajustes agrupados (cuenta, calendario, avisos, demo, acerca de), edición en hoja y cierre de sesión con confirmación. Nuevo `notificationPermissionGranted()` para mostrar el estado sin pedir el permiso. (RF-A6, NFR-12) Dep: T126
- [x] T128 Contrato de alta por pasos: `startEmailSignUp` / `verifyEmailOtp` / `setPassword` / `changePassword` en `AuthApi`, implementados en demo (código fijo `123456`) y en Supabase (`signInWithOtp` + `verifyOtp` + `updateUser`, con reautenticación antes de cambiar la contraseña). Username automático en `lib/username.ts`. (RF-A8, RF-A9) Dep: T127
- [x] T129 Pantalla de registro en 4 pasos con progreso y vuelta atrás. `signUpPending` en `AuthProvider`: verificar el OTP abre sesión, y sin esa bandera el guard entraba al calendario antes de pedir la contraseña. (RF-A8) Dep: T128
- [x] T130 Perfil: cambio de contraseña en hoja (actual + nueva + confirmar) y correo marcado como identificador inmutable. (RF-A9) Dep: T128
- [x] T131 `Sheet` esquiva el teclado: dentro de un `Modal` la ventana no se reajusta y el teclado tapaba por completo los formularios en hoja. Dep: T130
- [x] T132 Fuera el username: deja de mostrarse y de editarse, `ProfileUpdate` solo lleva el nombre y la búsqueda de personas pasa a **correo exacto**. Se conserva la columna como handle interno para las iniciales del avatar. (RF-A1, RF-A9, RF-S1) Dep: T130
- [x] T133 Perfil simplificado: la cuenta (nombre, correo bloqueado, contraseña) vive en la hoja de editar perfil, y el resumen pasa a cuatro tarjetas (mes, amigos, temas, entrenamientos). (RF-A6, RF-A9) Dep: T132
- [x] T134 Aviso de choque de horario al compartir: se consulta la disponibilidad de los contactos en el rango exacto de la actividad y cada fila indica ocupado/libre/no comparte, con resumen de los seleccionados. No bloquea la invitación. (RF-S16) Dep: T122
- [x] T135 Editor de ejercicios dentro del formulario de actividad al activar el toggle de gimnasio; se guardan creando el entrenamiento tras crear la actividad. Si ya existe uno, se ofrece abrirlo. (RF-F9) Dep: T134
- [x] T136 Vista diaria con solo la etiqueta en cada bloque, alto mínimo de una línea de texto y traslapes calculados sobre el espacio pintado (`visualEnd`), para que una actividad de 1 minuto no se recorte ni se solape con la siguiente. (RF-C3) Dep: T119
- [x] T137 Identidad de marca: ícono de la app, ícono adaptativo de Android (con monocromo) y favicon generados del logo oficial sobre `#131313`; splash nativo con el logo + eslogan y `SplashView` con la misma imagen para relevarlo sin salto. Se retiran los assets del template de Expo. (NFR-19) Dep: T136
- [x] T138 Wordmark tipográfico: `components/ui/Wordmark` escribe KAVI en Moirai One y el eslogan en Poiret One con las proporciones del logo; se usa en el encabezado de auth (eslogan solo en inicio de sesión) y en la barra superior web. Fuentes en `assets/fonts/`, embebidas por el config plugin de `expo-font` y cargadas también en runtime (`useBrandFonts`) para que apliquen sin recompilar; la puerta del splash espera a que estén listas. (NFR-19) Dep: T137
- [x] T139 Permanencia mínima del splash: `useSplashGate` sostiene marca 3 s desde el arranque del JS (no desde el montaje, para que el tiempo del splash nativo cuente) y retira el splash nativo y `SplashView` en el mismo instante. (NFR-19) Dep: T138
- [x] T140 Retirar los atajos de desarrollo del modo demo: `EXPO_PUBLIC_DEMO_AUTOLOGIN` y `EXPO_PUBLIC_DEMO_START` salen de `lib/env.ts`, de la rama de ruta libre en `app/index.tsx`, del arranque de `services/demo/store.ts` (siempre sin sesión) y de `.env.example`/README. El modo demo en sí sigue activo: es el único backend hasta la Fase 8. Dep: T139

## Fase 8 — Backend e integración real (al final) — spec 02 + spec 08
- [x] T020 Migración: enum `dimension` + tabla `themes` + RLS. Dep: T010
- [x] T021 Seed de ~19 temas del sistema (05). Dep: T020
- [x] T022 Migración: `activities` + índice + trigger updated_at + RLS de owner (sin shares aún). Dep: T020
- [x] T023 Migración: `connections` + RLS + función `are_connected`. Dep: T010
- [x] T024 Migración: `calendar_shares`, `activity_shares` + RLS; ampliar policy select de activities (02 §7). Dep: T022, T023
- [x] T025 Migración: `reminders`, `reminder_recipients` + RLS + RPC `add_reminder_recipients`. Dep: T024
- [x] T026 Migración: `workouts`, `workout_exercises` + RLS. Dep: T022
- [x] T027 RPC `get_availability` (security definer, solo bloques). Dep: T024
- [x] T028 Recurrencia a 90 días materializada en el cliente con `lib/recurrence.ts` en vez de la RPC `generate_recurrences`: la expansión de la RRULE ya existía y duplicarla en PL/pgSQL habría abierto la puerta a que demo y Supabase difirieran (revisión en plan.md §4). (plan §4) Dep: T022
- [x] T029 `types/database.ts` generado por introspección del esquema (`supabase gen types` exige Docker, que no hay en la máquina); filas mapeadas a `types/domain.ts` en los services. (NFR-15) Dep: T020–T028
- [x] T030 ✅ HITO: las 9 migraciones corren de cero y `supabase/tests/rls.sql` pasa sus 14 aserciones con 3 usuarios, cubriendo los criterios de spec 02 y de spec 09. Verificado contra un Postgres real con el entorno de Supabase simulado. (NFR-4) Dep: T029
- [x] T031 `services/supabase/*`: implementar todos los contratos (activities completo, themes CRUD, recurrencia vía RPC, reminders, connections, shares, availability, workouts). Dep: T029
- [x] T032 Realtime: suscripciones a activities compartidas, activity_shares, reminders/recipients → invalidación + `syncNotifications()`. (RF-S14) Dep: T031
- [x] T141 Fuga de credenciales: `.env` estaba versionado y `.gitignore` tenía la sección vacía. Se añade `.env` al ignore y se saca del índice con `git rm --cached`. (NFR-5) Dep: —
- [x] T142 Modo administrador (spec 09): columna `profiles.role`, trigger `protect_profile_role` contra el auto-ascenso, `is_admin`, RPC `admin_stats` y `admin_accounts`, contrato `AdminApi` con backend demo y real, y pantalla `/(app)/admin` accesible desde Perfil solo con rol `adminkavi`. Dep: T031
- [x] T143 Endurecer `EXECUTE`: Supabase concede ejecución a `anon` por defecto en funciones nuevas y `revoke from public` no lo deshace. Se revoca explícitamente a `anon` en todas salvo `is_username_available`, que el alta necesita sin sesión (RF-A1). Detectado sondeando el proyecto ya desplegado. (NFR-4) Dep: T031
- [x] T144 Fitness: (a) el check `char_length(trim(name)) >= 1` en `workout_exercises` impedía añadir ejercicios, porque «+ Ejercicio» crea la tarjeta con el nombre vacío para escribirlo dentro (RF-F4); se deja solo el tope de 80. (b) La fecha del entrenamiento se muestra sin hora: el selector es de día. (c) La duración total deja de capturarse y se calcula sumando la de los ejercicios; se elimina la columna `workouts.duration_minutes`. (RF-F3, RF-F4) Dep: T031
- [x] T145 El indicador de hoy y de la hora actual pasa del acento cálido al bloque de máximo contraste: número del día (mensual y cabecera semanal), línea de ahora, su punto y su píldora van en `ink` con el texto en `onInk` (17:1). El token `today` se queda solo para avisos —recordatorio vencido, filtros activos, choque de horario—, que es lo que sí pide un color de alerta. (kavi-design §2) Dep: T119
- [x] T146 El detalle de actividad deja de presentarse como `formSheet` en iOS y pasa a `modal`, igual que el resto de rutas modales. Abría con el contenido fuera de la zona visible y desaparecía al desplazar o tocar: dentro lleva un `Sheet` (elegir ocurrencia o serie) que es un `Modal` de React Native, y presentarlo desde dentro de un formSheet desprende el contenido de la hoja. De paso, `Screen` ya no pone `flex: 1` a su contenido dentro del ScrollView —eso le quita alto propio— y usa `flexGrow`, que conserva el centrado. Dep: T117
- [x] T147 Username público, editable y buscable: unicidad sobre `lower(username)` (antes `Pedro` y `pedro` podían coexistir), formato validado en BD igual que en la app, trigger que normaliza antes de validar, y RPC `search_profiles` que resuelve correo o `@usuario` sustituyendo a `search_profile_by_email`. En la app: campo de usuario en editar perfil, `@usuario` en la tarjeta de identidad y en los resultados, y buscador que acepta ambos. `is_username_available` excluye el propio para no reportar "ocupado" al guardar sin cambiarlo. (RF-A1, RF-A9, RF-S1) Dep: T031
- [x] T148 Refresco al tocar un contacto: aceptar, eliminar o cambiar visibilidad solo invalidaba `['connections']`, así que el calendario seguía mostrando las actividades de un excontacto y la disponibilidad quedaba obsoleta. La lista de lo afectado (conexiones, actividades, shares, recordatorios, disponibilidad) se centraliza en `lib/query-invalidation.ts` y la comparten las mutaciones y Realtime, que antes la tenían duplicada y distinta. Además el buscador de personas gana estado de error: sin él, una búsqueda fallida se veía igual que una sin resultados (en blanco). (RF-S2, NFR-11) Dep: T147
- [x] T149 Buscador de personas incremental: el username se busca por prefijo (3 letras) con resultados ordenados —exacto primero, luego por longitud— y tope de 8; el correo sigue exigiendo la cadena completa, porque aceptar prefijos ahí permitiría cosechar direcciones. En el cliente, `useDebouncedValue` evita una petición por tecla y `keepPreviousData` quita el parpadeo a vacío entre pulsaciones. Los resultados se ocultan si el término baja del mínimo, para no dejar en pantalla la coincidencia de lo escrito antes. (RF-S1) Dep: T148
- [x] T150 El alta pide el usuario en su propio paso (nombre → correo → **usuario** → código → contraseña). Llega propuesto desde el correo y se puede cambiar; se comprueba que esté libre antes de enviar el código y otra vez al enviarlo, por si alguien lo tomó en medio. El username viaja en los metadatos de `signInWithOtp` para que el trigger `handle_new_user` lo escriba al crear la cuenta, en vez de asignar uno provisional y corregirlo después. (RF-A8) Dep: T147
- [x] T152 Pruebas unitarias con Jest (`jest-expo`): 97 casos en 6 archivos sobre lógica pura (`lib/recurrence`, `lib/env`, `lib/username`) y el CRUD del backend demo (actividades, temas, entrenamientos), que implementa los mismos contratos que Supabase. El estado demo es un singleton de módulo, así que cada caso lo recarga con `jest.resetModules()`. `pnpm test` entra como barrera en los dos workflows de CI, antes de gastar créditos de EAS. **Sin spec previa**: no hay NFR de pruebas unitarias (NFR-4 cubre RLS en SQL y NFR-8 la matriz manual); si se adopta, conviene añadirlo a `specs/08-nfr.md`. Dep: T031
- [ ] T017 ✅ HITO: registro→login→sesión persistente→logout verificado en iOS/Android/web con Supabase real. Dep: T031
- [ ] T101 Rendimiento: seed 500 actividades, medir ≤3 s, prefetch mes adyacente. (NFR-1, NFR-2) Dep: T031
- [ ] T105 Pasada de tests RLS final + revisión de que no hay llamadas fuera de services. (NFR-4, NFR-6) Dep: T031
- [ ] T107 ✅ HITO FINAL: versión candidata KAVI V1 con backend real — 26 de septiembre de 2026.

## Backlog futuro (NO implementar — P8)
Estadísticas de entrenamientos · módulos de otras dimensiones (KAVI Reader, nutrición) · push remoto · export/import calendarios · offline completo · plantillas de rutina.
