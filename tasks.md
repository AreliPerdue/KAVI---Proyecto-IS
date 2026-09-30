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
- [x] T153 Reactivar `expo-notifications` con la versión del SDK 57 (~57.0.20). La incompatibilidad era de versión, no de implementación: la instalada era para SDK 53.
- [x] T155 Los entrenamientos sueltos se pintan en el calendario como capa derivada, con interruptor en Perfil (RF-F10, spec actualizada). Se derivan en vez de crear actividades: alcanza tambien a los ya registrados y se puede ocultar sin borrar nada.
- [x] T160 Fecha escrita en lugar de navegada (cumpleanos y fin de recurrencia): el calendario mensual exige tantos toques como meses de distancia.
- [x] T161 Actividades privadas: los contactos ven el hueco ocupado pero nunca el titulo, sea cual sea su nivel de visibilidad (RF-C14). La regla vive en la RPC, no en el cliente.
- [x] T165 Confirmacion de asistencia con tres respuestas —voy, tal vez, no voy— y lista de invitados agrupada por respuesta (RF-S19).
- [x] T166 La app abre siempre en el calendario, salvo la primera vez que se usa (RF-C15).
- [x] T167 Modo claro elegible desde Perfil → Presentación (Sistema / Claro / Oscuro). La preferencia es del dispositivo y se guarda con las demás de presentación; sin elección se queda en oscuro, igual que antes. `app.json` pasa a `userInterfaceStyle: "automatic"` y el autofill del navegador sigue el tema mediante un atributo del documento, que es lo único que no se puede pintar desde React Native Web. El splash queda fijo en oscuro a propósito. (NFR-18)
- [x] T168 Juego claro de los veinte Nobis: el fondo va pintado dentro del PNG y no es transparente, así que el avatar sobre el esquema equivocado se veía como un recuadro de otro color dentro del círculo. Cada color pasa a tener dos imágenes indexadas por esquema y quien las pinta —avatar y selector de Perfil— elige por `useResolvedScheme()`. Lo que se guarda en el perfil sigue siendo el identificador del color, así que la versión la decide el esquema de quien mira, no el de quien eligió. Además, la mascota entra por fin en las specs (RF-A11), que hasta ahora no la recogían. (RF-A11, NFR-18)
- [x] T170 El modo claro no llegaba a aplicarse en el móvil: `hydrate()` leía las preferencias del disco y, cuando volvía, aplicaba lo guardado **encima** de lo que se acababa de elegir. En web no se veía porque `localStorage` contesta en el mismo tick; en un teléfono AsyncStorage tarda y da tiempo a tocar el ajuste, que se deshacía solo. Ahora `hydrate` no pisa lo elegido en la sesión. Además, las piezas nativas —barra de pestañas, teclado, hojas del sistema— seguían al esquema del sistema operativo y no a la preferencia: se alinean con `Appearance.setColorScheme`, y los iconos de la barra dejan de ir fijos en blanco. (NFR-18)
- [x] T171 El cumpleaños salía con icono de etiqueta: pedía `cake` y ese nombre no estaba en el catálogo, así que `ThemeIcon` caía a su icono genérico sin avisar. Se añade el pastel y los nombres que la app genera sola quedan fijados por prueba, que es lo que faltaba para que el fallo no fuera silencioso. (RF-A10, RF-T2)
- [x] T172 Los temas del sistema se pueden personalizar —nombre, dimensión, color e icono— y restablecer desde un botón con confirmación. Su fila es global y la comparten todas las cuentas, así que editarla en sitio le cambiaría el tema a todo el mundo: la personalización vive en `theme_overrides`, una fila por persona y tema, y la lista se compone al leer. Restablecer borra solo esas filas, así que no puede alcanzar a los temas propios. (RF-T3)
- [x] T173 Paleta de personas de 8 a 20 colores, uno por cada Nobi y con su mismo identificador: con ocho, del noveno contacto en adelante se repetían y dos personas compartían color justo en la vista que existe para distinguirlas. Por omisión cada quien sale del color de su Nobi, y el propio también se elige (antes era azul fijo). Los tonos se calcularon para cumplir ≥ 3:1 sobre los dos fondos —la apariencia se puede cambiar— y el orden alterna matices, porque es el que se reparte. Hay pruebas que miden contraste y que ningún par se confunda, para que nadie los retoque a ojo. (RF-S15, NFR-18)
- [x] T174 El tema se reparte por contexto en vez de resolverlo cada componente. Con una suscripción por componente basta con que uno no se vuelva a renderizar para que se quede pintado con el tema anterior, y la pantalla queda a medias. Ahora el esquema se calcula una vez en la raíz y baja por contexto, que atraviesa memoización y contenedores nativos. (NFR-18)
- [x] T175 La pastilla de la pestaña activa en Android quedaba negra sobre negro: no se le pasaba `indicatorColor`, así que la elegía Material 3 por su cuenta y el icono desaparecía al tocar. Va en `surfaceAlt`, que contrasta en los dos esquemas. (NFR-18)
- [x] T176 Las personalizaciones de tema no pueden tumbar la lista de temas: la consulta a `theme_overrides` iba con `unwrap` y una base sin la migración aplicada dejaba la pantalla en «algo salió mal». Los temas hacen funcionar al calendario y las personalizaciones son un extra. (RF-T3, NFR-17)
- [x] T177 Triaje del escaneo de ZAP: los seis hallazgos que quedan están revisados uno a uno en `.zap/reglas.tsv`, cada uno con el motivo escrito por el que se acepta —silenciar un aviso sin dejar constancia del porqué es indistinguible de esconderlo—. La CSP `style-src unsafe-inline` se queda en `WARN` y no en `IGNORE` a propósito: es el único con contenido real, es estructural mientras la web se genere con Expo, y así sigue saliendo en cada informe. 18 → 12 → 6 hallazgos, 0 de riesgo alto. (NFR-3)
- [x] T178 Informe de cierre regenerado con las cifras finales (143 commits, 147/150 tareas, 1 564 pruebas, 84 % de cobertura, 12 505 líneas analizadas) y con la lección nueva «medir antes que deducir». Las cifras salen de Jest, de la API de SonarQube y de tasks.md, así que son reproducibles.
- [x] T179 Presentación individual del reto y guion de voz en off, cubriendo los seis bloques de la rúbrica con la evidencia visual capturada del proyecto real. El guion incluye un anexo con las cinco preguntas más probables, porque la rúbrica da 15 puntos por responder con seguridad.
- [x] T180 Presentación rediseñada: 23 diapositivas ligeras en vez de 13 densas, para que no se quede una sola en pantalla mientras se habla. Toma el lenguaje visual de la referencia —formas orgánicas en las esquinas con línea de acento, tarjetas redondeadas, alternancia claro/oscuro— con la identidad de KAVI: wordmark en Moirai One rasterizado, los siete puntos de dimensión como motivo y Nobis recortados en círculo. Los entregables pasan a `kaviland/` y los generadores quedan versionados en `reports/presentacion/`. (NFR-19)
- [x] T181 Presentación con más evidencia de producto y tipografía propia: se añaden dos diapositivas de recorrido —crear actividad con su visibilidad, gimnasio y temas— y una de paridad entre plataformas con móvil y navegador en modo claro. La tipografía deja de ser Calibri en todo: Century Gothic para títulos y cifras, de la misma familia visual que el wordmark, y Corbel para leer. Ambas vienen con Office, así que no dependen de instalar nada. 25 diapositivas. (NFR-19)
- [x] T182 Guion sincronizado con la presentación: una acotación por diapositiva y, debajo, solo lo que se dice con esa en pantalla. Antes varias acotaciones agrupaban dos diapositivas y el texto quedaba cruzado —la frase de la 2 se leía todavía en la portada, y lo de las dimensiones bajo la acotación de la 2—, que es justo lo que confunde al leer en voz alta. Verificado: las 25 aparecen una sola vez y en orden.
- [x] T183 El recorrido del producto pasa de una diapositiva con tres miniaturas ilegibles a cuatro con la captura grande: el calendario, crear una actividad —con los tres niveles de visibilidad, que es lo distintivo—, el registro de gimnasio y la paridad entre plataformas. La captura de Fitness se sustituye por el detalle de un entrenamiento, que sí tiene contenido. 26 diapositivas y el guion renumerado.
- [x] T184 Presentación repartida en 37 diapositivas: ninguna nota pasa de 70 palabras, para que ninguna pantalla se quede fija mientras se habla más de medio minuto. Catorce diapositivas tenían más de 60 palabras y tres pasaban de 130. El texto hablado vive ahora en las notas del propio PowerPoint, así que el guion en .docx deja de existir como pieza aparte. Tono formal y menos técnico, pensado para un público que ya ha visto varios proyectos seguidos.
- [x] T185 Renderizado de la presentación sin depender de PowerPoint, que dejó de responder a la automatización y dejó la revisión visual a ciegas dos veces. Se instala LibreOffice y queda `revisar.sh`. Limitación documentada: sustituye las fuentes por una serif, así que sirve para composición pero no para tipografía.
- [x] T186 Presentación en lenguaje llano: fuera JWT, SQL, XSS, CSP, SDK, lint, pipeline, deuda técnica, políticas a nivel de fila y consultas parametrizadas, explicados por lo que hacen en vez de por su nombre. Solo quedan «OWASP ZAP» y «SonarQube», que la rúbrica pide citar. La lección sobre las cifras falsas del panel de calidad se sustituye por la compilación que salió conectada a los datos de práctica: un caso que sí se vivió y se puede defender si preguntan.
- [x] T169 CI sobre Node 24 y runner fijado en `ubuntu-24.04`: Node 20 quedó deprecado en los runners y `ubuntu-latest` migra a Ubuntu 26 el 19 de octubre de 2026. De paso, la cobertura del código nuevo vuelve sobre el 80 % que exige el quality gate: `lib/notifications.ts` no tenía ninguna prueba y era el agujero grande (43 de 124 líneas nuevas sin cubrir), y `app/index.tsx` decidía la primera pantalla sin nada que lo fijara. El generador del informe de pruebas dejaba caer en silencio los archivos que no tenía clasificados —diez— y llevaba las cifras de portada escritas a mano; ahora salen del resultado de Jest y un archivo sin clasificar detiene la generación. (NFR-4, NFR-14)
- [x] T163 Visibilidad por actividad con tres estados —normal, solo algunos, privada— y lista de quien puede ver el detalle (RF-C14). Solo restringe: el nivel del calendario es el techo, y la interfaz avisa cuando marcar a alguien no va a servir.
- [x] T164 Cerrado el hueco de la politica de lectura: una peticion a mano contra `activities` devolvia el titulo de una actividad privada aunque la RPC no lo entregara.
- [x] T158 Cumpleanos en el perfil y en el calendario, propio y de los contactos aceptados, con icono de pastel e interruptor (RF-A10). Migracion 20260923100000.
- [x] T159 El calendario reabre en mensual al volver a su pestana (RF-C1). Se escucha tabPress y no el foco, para no sacar de la vista semanal al cerrar una actividad.
- [x] T156 Recordatorio con antelacion libre, ademas de los cinco presets (RF-C9). El texto "agregalos desde Editar" pasa a boton que abre el formulario y se desplaza a la seccion.
- [x] T157 Avatares Nobi: diez colores de la mascota elegibles desde Perfil. Se guardan en el perfil, no en el dispositivo, para que los contactos vean el mismo avatar.
- [x] T154 Avisos de solicitudes de contacto e invitaciones a actividades (RF-S17). Se detectan comparando lo que refresca Realtime, no leyendo el evento, para que los datos sigan pasando por la capa de servicios. Solo llegan con la app en ejecución; el push con la app cerrada queda en el plan de mejora.

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
- [x] T017 ✅ HITO: registro→login→sesión persistente→logout verificado en Android y web con Supabase real. iOS queda cubierto en simulador; su distribución depende de la cuenta de Apple Developer. Dep: T031
- [x] T101 Rendimiento con 500 actividades: 421 ms al abrir (objetivo ≤3 s) y navegación entre meses sin spinner. Medido en navegador, ver reports/rendimiento.md. (NFR-1, NFR-2) Dep: T031
- [x] T105 Pruebas de RLS ampliadas con actividades privadas y cumpleaños (bloques 11-13), y la regla de que el acceso a datos solo vive en services pasa a ser una regla de lint en vez de una convención. (NFR-4, NFR-6) Dep: T031
- [ ] T107 ✅ HITO FINAL: versión candidata KAVI V1 con backend real — 26 de septiembre de 2026.

## Fase 9 — KAVI como proyecto personal (30-sep-2026 en adelante)
La entrega académica cerró con 100. De aquí en adelante KAVI deja de tener rúbrica y las
decisiones son de producto. Se mantiene SDD: nada se implementa sin spec.

### Correcciones
- [x] T187 Los filtros del calendario no alcanzaban a las capas derivadas: al filtrar por
  cualquier dimensión, los entrenamientos sueltos y los cumpleaños seguían pintados. Estaba
  escrito como decisión deliberada ("no tienen dimensión elegida por nadie"), pero sí la
  tienen —`fisica` y `social`—, así que incumplía el criterio de aceptación de RF-C11, que
  pide ver *solo* lo de la dimensión elegida. El filtro pasa a aplicarse sobre actividades y
  derivadas juntas; los interruptores de Perfil siguen siendo independientes, porque
  responden a otra pregunta (si la capa existe, no si pasa el filtro). Se aclara RF-C11 en
  la spec y quedan 5 pruebas de regresión. (RF-C11, RF-F10, RF-A10) Dep: —

### Cascarón de navegación (en pausa)
Los cuatro accesos se quedan como están. El cambio se hace cuando haya módulos que
poner en el dropdown —lectura, sueño, diario—; con solo Fitness dentro, el menú sería
un clic de más para llegar a lo mismo.
- [ ] T188 Barra de accesos configurable: **3 módulos a elección + el menú fijo en el cuarto
  lugar**. Todos los módulos siguen siendo rutas bajo `(tabs)/`; la preferencia decide cuál
  lleva botón, no cuál existe. El menú nunca es configurable, porque es la única vía de
  regreso si alguien quita Perfil de sus tres. La preferencia vive en `preferences-store`
  (dispositivo, como `appearance` y `selfColor`). En web no aplica el límite: caben todos.
  Plan A con `NativeTabs`; si cambiar el conjunto en caliente rompe el estado de navegación,
  plan B es la barra propia con `expo-router/ui` que la web ya usa. Requiere sección nueva de
  navegación en `specs/01-product-overview.md`. Dep: —
- [ ] T189 Menú emergente de módulos. El cuarto lugar lo ocupa un icono de **cuatro
  cuadrados** que despliega una lista con icono + texto por módulo: pesa · Fitness, libro ·
  Lectura, luna · Sueño, pluma · Diario, y los que vengan. Es también donde se eligen los
  tres accesos de la barra. El icono no cambia con la selección: es siempre "lo demás de
  KAVI", y esa constancia es lo que lo hace encontrable. Dep: T188
- [ ] T189b Acceso a Listas desde el calendario: botón ○✓ a la izquierda del selector de
  vistas, como el de tareas de Google Calendar. Abre la franja de pendientes sin salir del
  calendario, igual que Fitness se abre desde una actividad de gimnasio. Dep: T188, T194

### Densidad y vistas del calendario
- [x] T190a Píldoras del mes más delgadas. Se inflaban solas: el alto máximo era 28 px y
  en pantallas grandes los chips crecían hasta ahí siempre, así que una celda se llenaba
  con dos pastillas gordas en vez de con cuatro delgadas. Baja el alto base a 18, el tope
  a 20 y la separación a 2, como Calendar y Google Calendar, que mantienen la píldora a
  alto fijo y dejan el sobrante en blanco. La hora baja a una variante `micro` de 11 px
  para que ceda espacio al título y se lean más letras antes de los puntos suspensivos;
  es la única excepción al mínimo de 12 px y queda documentada en `kavi-design` §2.
  Verificado en web con las tres actividades por celda ya visibles. Dep: —
- [ ] T190b Misma revisión de densidad en las vistas de día y semana. Ahí el alto lo manda
  la duración, así que lo que queda por ajustar es la tipografía: hoy el título va en
  `label` (14) y la hora en `caption` (12) — la jerarquía ya es correcta, pero ambos se
  ven grandes frente a la referencia de Apple y Google. Pendiente de decidir con capturas
  a la vista. Dep: T190a
- [x] T191 Vista **Agenda**: lista cronológica agrupada por día, sin rejilla de horas, que
  **solo pinta los días con algo**. Ese es el punto: con pocas actividades la rejilla
  mensual se ve vacía y hay que recorrerla con la vista para hallar las tres cosas que sí
  hay. Comparte el rango del mes en vez de desplazarse sin fin como la de Google, para que
  "anterior" y "siguiente" signifiquen lo mismo en todas las vistas; el scroll infinito
  pedía otro modelo de navegación solo para ella. Es la única vista con estado vacío
  propio: las de horas no lo necesitan porque la rejilla es la referencia y además es la
  forma de crear tocando una hora. (RF-C16) Dep: T190
- [x] T192 Vista **3 días**: la misma rejilla de la semanal con tres columnas, arrancando en
  el día ancla y no en lunes, porque aquí lo que importa es "hoy y lo que viene". Existe
  porque la semana reparte 7 columnas en 390 px y cada bloque queda demasiado angosto para
  leer su título. (RF-C16) Dep: T190
- [x] T193 Selector de vistas configurable: pastilla con las vistas fijadas más un menú con
  las cinco, donde cada una se fija y se quita con un alfiler. Cinco no caben legibles en
  una pastilla, así que cada quien elige cuáles quiere a un toque. La preferencia vive en
  `preferences-store` junto a las demás del dispositivo, conserva el orden canónico en vez
  del orden en que se fijaron —para que la pastilla no cambie de forma según cómo se
  configuró— y nunca se queda vacía. En pantallas angostas se reduce a un botón con el
  nombre de la vista actual. (RF-C17) Dep: T191, T192
- [x] T193b Ajustes de la revisión visual: el encabezado se parte en dos filas por debajo de
  720 px —el mes competía con Hoy, Listas, la vista y los filtros y salía como "Septie…",
  que es justo el dato que dice dónde estás parada—, y la vista de 3 días usa un alto de
  hora más apretado que la semanal, porque con tres columnas sobra ancho y lo que escasea
  es alto. Dep: T193
- [x] T193c El FAB encoge mientras se baja y vuelve al subir. En la agenda tapaba el horario
  de las filas de abajo, y ahí la hora es información, no adorno. Encoge exactamente hasta
  el mínimo táctil y no menos: más chico se vería mejor y se tocaría peor. Se elige
  "bajar/subir" y no "hay scroll" porque en una lista larga uno está casi siempre
  desplazado, y con esa regla el botón viviría encogido y el gesto dejaría de significar
  algo. Respeta movimiento reducido. Dep: T191

### Módulo de listas — spec 10 (pendiente de escribir)
- [x] T194 Escribir `specs/10-lists.md`: filosofía, franja de pendientes del día, vistas,
  colaboración y criterios de aceptación en Given/When/Then. Alcance acotado a la Fase 1
  acordada. **Fuera del alcance para siempre**: rastreo de precios y vistas previas de
  tiendas. Dep: —
- [x] T195 Modelo de datos de listas en `specs/02-data-model.md`: `lists`, `list_sections`,
  `list_items`, `list_shares`, todas con RLS desde su creación. Dos cuidados aprendidos en
  este repo: helper `security definer` para evitar la recursión de RLS entre `lists` y
  `list_shares` (ver T-fix de `20260923220000`), y orden de ítems en `numeric` con índices
  fraccionarios, no enteros, para que dos personas reordenando a la vez no se pisen. La
  fecha sin hora va como `date` y no como `timestamptz`: es una fecha flotante y guardarla
  como instante UTC la corre de día según la zona. Excepción consciente a la regla de fechas
  de CLAUDE.md, documentada en la spec.
  Hecho: migración `20260930120000_lists.sql` con las tres tablas, sus índices —uno parcial
  sobre `due_date`, que solo la minoría de los elementos tiene—, los triggers de
  `updated_at`, el helper `can_edit_list` y las políticas. Y `supabaseLists` implementado
  contra ella. Se adelanta respecto al plan original: Areli valida en Vercel con datos
  reales, así que dejar la migración para el final la tenía probando a ciegas. Dep: T194

- [x] T198 Cascarón de Lists funcionando contra el backend demo: tipos de dominio,
  contrato `ListsApi`, backend demo completo de la fase 1 con semilla (Súper con secciones
  y Pendientes de casa con un ítem fechado hoy), fachada, hook con TanStack Query, pantalla
  de inicio con rejilla de tarjetas y pantalla de detalle con secciones, palomeo y
  completados plegables. Entrada por el botón ○✓ del encabezado del calendario.
  El inicio pinta cada grupo como bloque propio en vez de meter encabezados en las celdas:
  en dos columnas un encabezado ocupa una celda y sale al lado de una tarjeta, y
  `SectionList` no resuelve esto porque no admite varias columnas.
  `services/supabase/lists.ts` existe con el contrato completo pero cada método falla con
  un mensaje que la UI muestra: mejor un error legible que datos vacíos que se leerían como
  "no tienes listas". Se conecta de verdad con T195. (RF-L1, RF-L5–RF-L10) Dep: T194
- [x] T199 Alta y gestión de listas: formulario modal con nombre, color de la paleta de
  personas (21) e icono del catálogo, más menú de acciones por tarjeta —editar, fijar,
  duplicar, archivar, eliminar— y vista de archivadas con restaurar. Crear abre la lista
  recién hecha en vez de volver al inicio: quien crea una lista tiene algo que apuntar en
  ella ahora mismo. Eliminar nombra cuántos elementos se pierden y ofrece archivar como
  salida intermedia.
  El botón de acciones va **fuera** de la tarjeta y posicionado encima, no anidado: con
  mouse no existe la pulsación larga, así que sin él el menú era inalcanzable en web; pero
  un Pressable dentro de otro genera un `<button>` dentro de un `<button>`, que es HTML
  inválido, rompe la hidratación y saca al interno del recorrido con teclado. Como
  hermanos se ve igual y los dos funcionan.
  Las dos pantallas de Lists llevan botón de atrás propio: sin él la única salida en web
  era el botón del navegador, que en la app instalada ni siquiera existe. `ModalHeader`
  gana la variante `back` —flecha en vez de X— porque en una pantalla apilada, y no modal,
  cerrar con X sugiere descartar algo. (RF-L2, RF-L3) Dep: T198
- [x] T200 Captura de ítems. `ItemComposer` es una fila "+ …" en reposo —para no llenar la
  pantalla de campos vacíos— que al tocarla se vuelve input y **al confirmar no se cierra ni
  pierde el foco**: las listas se llenan en ráfaga y volver a tocar el botón entre uno y
  otro convertiría una captura de diez segundos en una de un minuto. Hay un compositor por
  sección, así que lo que escribes cae donde estás mirando y no al final de la lista.
  Además: hoja de edición con título, nota y cambio de sección, eliminar con confirmación
  que distingue palomear de eliminar —uno conserva, el otro no—, y crear secciones.
  En web se suprime el anillo de foco del navegador, que se encimaba sobre el borde de
  acento; no se pierde el indicador, porque ese borde **es** el indicador.
  (RF-L5, RF-L7, RF-L8, RF-L9) Dep: T198
- [x] T201 La franja de pendientes del día: arriba de la rejilla de horas, plegable, cada
  ítem con la casilla, el icono y el color de su lista, y una flecha que abre esa lista.
  **Nunca dentro de las horas**, ni siquiera si el ítem tiene hora — colocarlo ahí lo haría
  leerse como una cita, y "arreglar la puerta el sábado" no significa "el sábado a las 10".
  Sin pendientes no se dibuja nada: una franja vacía le robaría alto a la rejilla todos los
  días para no decir nada. Solo en la vista diaria, que es donde cabe sin comerse la
  rejilla y donde el día concreto da sentido a "esto toca hoy". (RF-L11–RF-L13) Dep: T200

- [ ] T204 Celdas del mes que solo muestran puntos. Cuando en una celda cabe **un** chip y
  hay dos o más actividades, `visible = activities.slice(0, slots - 1)` se queda en cero y
  la celda pinta solo la fila de "+N": ninguna actividad legible. Se ve en ventanas bajas y
  en teléfono; en pantallas altas no aparece porque caben más chips.
  Arreglo propuesto: calcular en dos pasos. Primero cuántos chips caben; si hay desborde,
  recalcular reservando el alto de la fila de puntos —que es más baja que un chip— y
  garantizar **al menos un chip** siempre que quepa uno. Así la celda muestra lo que cabe y
  los puntos con el "+N" debajo, que es lo que se espera al mirar un mes lleno. (RF-C1)
  Dep: T190a

- [x] T205 Vencidos y reprogramar, al estilo de Todoist. Los pendientes con fecha pasada y
  sin palomear se agrupan arriba de los de hoy, en el acento de aviso —que el token `today`
  ya existía justo para esto— con su fecha original y una acción para moverlos todos a hoy.
  Una lista que esconde lo que no hiciste deja de ser confiable, y es cuando se deja de
  apuntar ahí. Solo aparecen si el día abierto es hoy: lo vencido se mide contra hoy, no
  contra el día que se está leyendo. Se agregan `listOverdue` y `rescheduleItems` al
  contrato. (RF-L18) Dep: T201
- [x] T206 Filtro "Solo pendientes de listas" en el calendario. Esconde las actividades y
  deja lo que hay que hacer. No entra en `applyFilters` porque no es de su familia: los
  filtros de dimensión y tema acotan qué actividades se ven, y este decide si se ven
  actividades. (RF-C18) Dep: T201

- [x] T207 Alta de listas al estilo Google Keep, en vez de un formulario. "+" crea con
  valores por omisión y entra directo a la lista: el nombre es un campo en el sitio, ya
  enfocado y preseleccionado, y debajo el campo para listar. Color e icono pasan a una
  paleta en la barra inferior, como extra. Se elimina `list/new.tsx` y la fila "Editar" del
  menú de la tarjeta, que ya no tienen a dónde llevar.
  El motivo lo dijo Areli mejor que la spec: «de aquí a que elijo el color y todo ya se me
  olvidó que iba a anotar». Una lista vive de ser rápida.
  Contrapartida resuelta: una lista intacta —nombre por omisión, sin elementos ni
  secciones— se borra sola al salir, para que arrepentirse no deje basura en el inicio.
  (RF-L2) Dep: T199

- [ ] T208 Listas que se repiten (RF-L19). Regla de recurrencia en `lists`, reutilizando
  `lib/recurrence.ts` en vez de escribir una segunda expansión de RRULE. Dep: T195
- [ ] T209 Historial de vueltas (RF-L20). Tabla `list_runs` con la fecha y cuántos elementos
  se completaron de cuántos. Conteos, no copias: guardar cada elemento de cada día haría
  crecer la tabla sin que nadie lo consulte.
  **Periodo de gracia**: una vuelta no se cierra al empezar la siguiente, sigue editable
  hasta las 15:00 del día siguiente. La gente palomea tarde —lo de ayer se anota hoy en la
  mañana— y cerrar a medianoche registraría como incumplido algo que sí se hizo. Las dos
  vueltas conviven sin mezclarse: palomear en la de ayer suma a ayer, y la lista avisa
  arriba ("Ayer: 3 de 7") si la anterior sigue abierta. Dep: T208
- [ ] T210 Resúmenes (RF-L21). **La redacción se escribe antes que la consulta.** Un resumen
  que diga "dejaste el 25 % sin completar" es justo la presión que KAVI dijo que no iba a
  ejercer: se cuenta lo hecho, no lo que falta, y no hay rachas que romper. Dep: T209
- [ ] T211 Etiquetas de listas. Hacen falta para poder resumir "mis listas de trabajo"
  (RF-L21), y de paso son parte de la fase 3 del concepto. **Van después de lo ya
  planeado**: primero se termina la fase 1 y el bloque de compartir. Dep: T195

- [x] T212 Fechas en los elementos (RF-L11). Día y hora opcional desde la hoja de edición,
  y la fecha visible en el propio renglón sin abrir nada —en el acento de aviso si ya pasó,
  y solo mientras siga pendiente: una vez hecho su fecha ya no reclama nada—.
  La hora solo aparece con un día puesto: sin día sería un "cuándo" sin cuándo. Y quitar la
  fecha quita también la hora, por lo mismo.
  Los selectores esconden la hoja del elemento mientras están abiertos: dos `Modal` de React
  Native a la vez ya dieron problemas en este repo (T146). Dep: T200
- [x] T215 Recordatorios de elementos de lista. `due_time` guardaba la hora pero nadie
  programaba nada, y la etiqueta del selector decía "Hora del recordatorio": la interfaz
  prometía algo que no ocurría.
  Entran por el mismo camino que los de actividades y no por uno propio, porque
  `syncNotifications` cancela todas las notificaciones antes de reprogramar y dos fuentes
  llamándola por separado se borrarían entre sí. Para eso las dos se normalizan a
  `ScheduledReminder`, que es "cuándo suena y qué dice" sin importar de dónde salió.
  Solo avisa lo que tiene hora: una fecha sin hora significa "ese día, cuando pueda", y
  ponerle las 9 por nuestra cuenta sería una alarma que nadie pidió. (RF-L11, RF-C10)
  Dep: T212
- [x] T213 Buscar listas y elementos, completados incluidos (RF-L4). Campo en el inicio;
  desde dos letras, con rebote de 250 ms para no consultar por tecla y conservando el
  resultado anterior mientras llega el nuevo, para que no parpadee a vacío.
  Listas y elementos se muestran **por separado**: buscar "leche" puede dar una lista que se
  llama así y un elemento dentro de otra, y son dos respuestas distintas a la misma palabra.
  Lo palomeado aparece tachado en vez de esconderse — media búsqueda dentro de una lista es
  justo para recordar si algo ya se compró. En Supabase se escapan `%` y `_` del patrón:
  sin eso, buscar "50%" traería cualquier cosa. Dep: T195
- [x] T214 Reordenar con subir/bajar, en la hoja del elemento y en el menú de la lista. Se
  ordena dentro del propio grupo: subir no saca un elemento de su sección ni una lista de
  "Fijadas", y los extremos salen deshabilitados en vez de no hacer nada. El arrastre de
  verdad va aparte, cuando lo demás esté bien. (RF-L3, RF-L7) Dep: T200
- [x] T216 El backend demo devolvía **las mismas referencias** que guardaba, así que quien
  tuviera un elemento en la mano veía cambiar sus campos por debajo en cuanto alguien
  escribía. Lo destapó el intercambio de orden: al leer el `sort_order` del primero para
  dárselo al segundo, ese campo ya había sido mutado por la escritura anterior y los dos
  terminaban igual — el reordenar "no hacía nada". Supabase devuelve filas sueltas por
  construcción; el demo tiene que imitarlo o deja de servir para probar. Ahora copia cada
  fila al salir, y el intercambio además lee los dos órdenes antes de escribir ninguno, que
  es correcto con cualquier backend. Dep: T214

- [x] T217 Tocar un elemento abre su edición; palomear queda solo en el círculo, con su
  propia área táctil. Con renglones de 44 px pegados, palomear en cualquier parte es un
  dedazo esperando a pasar. Desaparece el lápiz: la fila entera ya abre. (RF-L13c) Dep: T212
- [x] T218 Los pendientes con fecha se pintan en **mes y agenda** como bloques del
  calendario, con el círculo de palomita en lugar de la hora y en el color de su lista. Ahí
  no hay rejilla de horas, así que no hay nada que malinterpretar. En las vistas de horas
  siguen sin pintarse: viven en la franja de arriba. De paso, "Solo pendientes de listas"
  deja de dejar la pantalla vacía en mes y agenda, que era el hueco que quedó al crearlo.
  (RF-L13b, RF-C18) Dep: T212

### Fase 2 de Lists — compartir
- [x] T219 Migración `list_shares` con los tres permisos y las políticas que distinguen
  **mirar** de **escribir**: `can_view_list`, `can_edit_list` y `can_manage_list`, las tres
  `security definer` para cortar la recursión de RLS entre `lists` y `list_shares` —la misma
  que ya costó una migración correctiva con `activities`—. Que las políticas de la migración
  anterior ya preguntaran por `can_edit_list()` en vez de consultar `lists` a mano es lo que
  permitió que hoy solo cambiara la función. `lists` se parte en tres políticas porque sus
  verbos dejaron de ir juntos: la ve quien pueda verla, la renombra quien administre, y solo
  su dueño la borra. (RF-L14, RF-L17) Dep: T195
- [x] T220 Compartir en la app: hoja con los contactos aceptados y, junto a cada uno, **Ver**
  y **Editar** como dos botones en su propia fila —es la pregunta que de verdad se hace al
  compartir, y con dos opciones se contesta sin abrir nada—. Una ✕ retira el acceso sin
  tocar el contenido. En el inicio aparece el grupo "Compartidas conmigo", aparte de las
  propias: no son tuyas y conviene que se note. El esquema admite `manage` pero la interfaz
  no lo ofrece, así que solo el dueño renombra y decide con quién se comparte. (RF-L14,
  RF-L15, RF-L17) Dep: T219
- [x] T221 Las implementaciones dejan de usar `this`. La fachada reexporta los métodos
  **desprendidos** del objeto (`export const shareList = listsApi.share`), así que dentro de
  una implementación `this` llega `undefined`. Lo destapó compartir, que no marcaba el
  permiso; pero el mismo fallo estaba en `duplicate` de Supabase, que habría reventado en
  cuanto alguien tocara "Duplicar" con el backend real. Lo compartido entre métodos pasa a
  funciones sueltas. Dep: T220
- [ ] T222 Tiempo real en listas compartidas (RF-L16): suscripción a `lists`, `list_items` y
  `list_shares`, con la invalidación centralizada en `lib/query-invalidation.ts` como ya se
  hace con el calendario. Dep: T220

### Pendientes sueltos
- [ ] T196 Elegir idioma de la interfaz: **español o inglés**. Hoy los textos están
  incrustados en los componentes, así que esto es sobre todo el trabajo de extraerlos.
  Afecta también los formatos de fecha (`date-fns` locale) y la redacción es-MX que fija
  `kavi-design` §4. Dep: —
- [x] T197 Nobi coral, el vigesimoprimero. Imágenes en sus dos variantes reescaladas a
  512 px como el resto (llegaban a 1254, que son ~1.3 MB por archivo al bundle), entrada en
  `constants/nobi.ts` entre el rojo y el rojo oscuro —donde cae su matiz en la rueda— y su
  color en `people-colors.ts`, **al final de la lista**: ese orden es el del reparto
  automático y se deriva en cada render, así que meterlo en medio le habría cambiado el
  color a contactos que ya tenían el suyo.
  El hex del PNG es `#F58466`, pero da 2.24:1 sobre el fondo claro y la paleta exige 3:1
  porque aquí el color significa quién es cada persona (kavi-design §5). Se usa `#DA6C50`,
  el color más parecido que cumple las tres reglas: queda a 9.0 de distancia perceptual del
  original —bajo el 13 en que dos colores se confunden, o sea el mismo coral a la vista— y
  contrasta 3.01:1 sobre papel y 5.52:1 sobre tinta. Es lo que ya se hacía con "blanco" y
  "negro", que son grises con matiz por la misma razón. Dep: —

- [ ] T202 Revisar los 21 colores de la paleta de personas con criterio de diseño, no solo
  de cumplimiento. Hoy se eligieron para pasar contraste y distancia mínima, y el resultado
  es que varios se parecen demasiado entre sí y otros no representan el color que el Nobi
  tiene en mente —el color es la personalidad de cada quien, y "morado claro" y "lila" no se
  distinguen al verlos juntos—. Va con licencia para **cambiar lo que dice `kavi-design`**
  si hace falta: el umbral de 13 de distancia perceptual es el mínimo para no confundirse,
  no una meta de diseño, y subirlo obligaría a repartir mejor los matices. Conviene hacerlo
  de una sola vez y contra los 21 PNG a la vista, no color por color. Dep: T197

- [ ] T203 La barra de personas del calendario, pensada para muchos contactos. Hoy ya es un
  carrusel horizontal, pero muestra **todos** los que comparten calendario: con veinte o más
  hay que deslizar a ciegas hasta dar con quien buscas. Pasa a mostrar los **frecuentes o
  recientes** (~20 como tope) y al final del carrusel un botón de tres puntos que abre la
  lista completa **de la A a la Z**, con una lupa arriba para buscar por nombre o usuario.
  Falta decidir qué cuenta como "frecuente": lo más honesto sin inventar telemetría es
  ordenar por la última vez que superpusiste su calendario, que ya es un dato que la app
  tiene a la mano. El buscador puede reutilizar `search_profiles`, que ya resuelve correo y
  `@usuario` (RF-S1). (RF-S7, RF-S8, RF-S15) Dep: —

### Largo plazo (cuando KAVI se lance al público)
Distribución en iOS y cuenta de Apple Developer · notificaciones push con la app cerrada ·
funciones con IA (categorización, lenguaje natural libre, sugerencias) · código de barras ·
imágenes en listas (gratis en dinero, caro en horas) · sincronización offline real.

## Backlog futuro (NO implementar — P8)
Estadísticas de entrenamientos · módulos de otras dimensiones (KAVI Reader, nutrición) · push remoto · export/import calendarios · offline completo · plantillas de rutina.
