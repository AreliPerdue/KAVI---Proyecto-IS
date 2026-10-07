# Pruebas pendientes

> **Cómo leer este archivo (6 oct 2026).** Desde hoy la suite completa pasa y lo automatizable se va cubriendo
> (cada `[x]` dice con qué archivo). Lo que queda marcado **(manual)** necesita teléfono, correo real, lector de
> pantalla o ver la pantalla; lo marcado **(base de datos)** necesita una base de Postgres de prueba con RLS
> (no se corre contra el proyecto real).

Bitácora de lo que queda por verificar. Cada cambio cierra con la suite en verde y sus pruebas; aquí queda lo
que todavía no se automatiza.

## Densidad del calendario (T190a, T190b)

- [x] `month-view.test.tsx` — los chips cambiaron de alto (20→18 base, 28→20 tope) y de
  separación (3→2). Revisar si alguna aserción daba por buenos los valores viejos. → `ya pasa con los altos nuevos (suite en verde)`
- [x] `timeline.test.tsx` — `BASE_MIN_BLOCK_HEIGHT` bajó de 28 a 22 con la tipografía. Una
  actividad corta ahora ocupa menos alto; comprobar que el título sigue sin cortarse. → `ya pasa (suite en verde)`
- [ ] Prueba nueva: el número del día se alinea a la derecha en web y centrado en nativo.
  Hoy no hay ninguna que lo fije, así que un cambio de `alignItems` pasaría inadvertido.
- [ ] Prueba nueva: que la variante `micro` (11 px) no se use fuera del calendario. Es la
  única excepción al mínimo de 12 px de `kavi-design` §2 y conviene que una prueba la
  mantenga acotada en vez de la disciplina.
- [ ] (manual) Revisar a mano en 375 px de ancho: con la tipografía en 12, comprobar que la vista
  semanal en móvil no encima títulos entre columnas.

## Nobi coral (T197)

- [x] Contraste y distancia perceptual: los comprueba `people-colors.test.ts` y pasaron al
  agregarlo (son un cálculo barato, no una suite).
- [ ] (manual) Revisar el coral en tema claro dentro de la app, no solo el PNG suelto.

## Cascarón de Lists (T198)

- [x] `services/demo/lists.ts` no tiene pruebas. Lo que más las pide: `duplicate` (copia
  solo pendientes y remapea las secciones), `removeSection` (los ítems vuelven a la lista
  sin agrupar, no se borran) y `listByDateRange` (compara fechas `YYYY-MM-DD` como texto,
  que es correcto solo con cero a la izquierda). → `services/demo/__tests__/lists.test.ts`
- [ ] Pantalla de inicio: que los grupos se pinten como bloques y que una fila impar no
  estire la última tarjeta.
- [ ] Detalle: que un ítem palomeado salga de su sección y baje a completados, y que
  despalomearlo lo devuelva a la sección de donde salió.
- [x] `supabaseLists` falla a propósito hasta T195; conviene una prueba que fije que el
  mensaje llega a la UI en vez de convertirse en una lista vacía. → `services/supabase/__tests__/lists.test.ts`

## Alta y gestión de listas (T199)

- [ ] Que el botón de acciones **no** quede anidado dentro del Pressable de la tarjeta: es
  HTML inválido en web y ya ocurrió una vez. Una prueba que lo fije vale más que recordarlo.
- [ ] Crear una lista navega a su detalle, no al inicio.
- [ ] Eliminar pide confirmación y el mensaje menciona cuántos elementos se pierden.
- [x] Archivar la saca del inicio y aparece en Archivadas; restaurar la devuelve. → `services/demo/__tests__/lists.test.ts`
- [x] `listFormSchema` rechaza un color fuera de la paleta. → `lib/__tests__/list-schema.test.ts`
- [x] `ModalHeader` con `back`: dice "Atrás" y usa flecha, no X. Y que dentro de Archivadas
  el botón vuelva a las listas activas en vez de salir del módulo. → `components/__tests__/modal-header.test.tsx`

## Vistas nuevas y pastilla configurable (T191-T193)

- [x] `rangeForView` y `shiftAnchor` con `threeDays` y `agenda`: son switches exhaustivos y
  un caso nuevo sin rama rompería en silencio. → `components/calendar/__tests__/views-and-filters.test.ts`
- [x] `togglePinnedView`: no deja la pastilla vacía, y conserva el orden canónico en vez del
  orden en que se fijaron. → `components/calendar/__tests__/views-and-filters.test.ts`
- [ ] `AgendaView` omite los días sin actividades y agrupa bien las que cruzan medianoche.
- [x] `formatThreeDaysTitle` cuando el rango cruza de mes. → `i18n/__tests__/i18n.test.ts`
- [ ] Que el alfiler del menú no quede anidado dentro del Pressable de su fila.
- [ ] Encabezado del calendario en dos filas por debajo de 720 px, con el título completo.
  Es la clase de regresión que solo se ve en una captura, así que conviene una prueba que
  fije que el título no se trunca a 390 px.

## FAB que encoge (T193c)

- [x] `useShrinkOnScroll`: encoge al bajar, vuelve al subir, y no reacciona dentro de la
  zona superior ni a desplazamientos por debajo del umbral. → `hooks/__tests__/use-shrink-on-scroll.test.tsx`
- [x] El FAB encogido **no** baja del mínimo táctil (44 iOS / 48 Android). Es la garantía
  que justifica la escala elegida y la que se rompería al retocar el tamaño a ojo. → `components/ui/__tests__/fab.test.tsx`
- [ ] Con movimiento reducido cambia de tamaño sin transición.

## Captura de ítems (T200)

- [ ] `ItemComposer`: al confirmar limpia el campo y **conserva el foco**; con el campo
  vacío se cierra en vez de agregar algo en blanco. Es el comportamiento del que depende
  capturar de corrido y el más fácil de romper sin darse cuenta.
- [x] Agregar dentro de una sección deja el ítem en esa sección, no al final de la lista. → `services/demo/__tests__/lists.test.ts`
- [ ] Mover un ítem entre secciones desde la hoja de edición.
- [ ] Eliminar pide confirmación y el mensaje distingue palomear de eliminar.
- [ ] El lápiz de cada renglón no queda anidado dentro del Pressable de la fila.

## Franja de pendientes del día (T201)

- [ ] Sin pendientes del día la franja **no se dibuja** (no una franja vacía que robe alto).
- [ ] Un ítem con fecha y **con hora** sigue en la franja y no aparece en la rejilla. Es la
  regla que define el módulo y la que se rompería al "mejorar" la integración.
- [ ] Palomear desde la franja marca la misma fila que en su lista.
- [x] `useListItemsByDate` con el día como `YYYY-MM-DD`, no como ISO. → `hooks/__tests__/use-lists.test.tsx`

## Vencidos y filtro de listas (T205, T206)

- [x] `listOverdue` excluye lo ya palomeado y lo de listas archivadas, y ordena de más
  viejo a más reciente. → `services/demo/__tests__/lists.test.ts`
- [ ] Los vencidos **no** se muestran al abrir un día que no es hoy.
- [x] `rescheduleItems` mueve todos los indicados y no toca el resto. → `services/demo/__tests__/lists.test.ts`
- [x] `hasActiveFilters` es verdadero con `onlyListItems` aunque no haya dimensión ni tema
  —si no, el punto del botón de filtros no se enciende y el filtro queda invisible. → `components/calendar/__tests__/views-and-filters.test.ts`
- [x] `applyFilters` ignora `onlyListItems`: recibe actividades y devuelve actividades. → `components/calendar/__tests__/views-and-filters.test.ts`

## Migración de Lists (T195)

- [ ] (base de datos) Ampliar `supabase/tests/rls.sql`: con dos usuarios, que B no vea ni toque las listas,
  secciones ni elementos de A. Es la garantía que sostiene todo el módulo.
- [ ] (base de datos) Que `can_edit_list` no sea ejecutable por `anon`.
- [x] `listByDateRange` y `listOverdue` excluyen las listas archivadas por el join. → `services/supabase/__tests__/lists.test.ts`
- [x] `duplicate` en Supabase remapea las secciones y copia solo los pendientes, igual que
  el demo. Son dos implementaciones del mismo contrato y es donde más fácil divergen. → `services/supabase/__tests__/lists.test.ts`
- [ ] (base de datos) El check de `completed_at`/`completed_by`: palomear sin usuario debe fallar.

## Alta estilo Keep (T207)

- [ ] "+" crea y navega sin pantalla intermedia, con el título enfocado.
- [ ] Al salir, una lista intacta se borra; una con nombre cambiado **o** con un elemento,
  no. Es la regla que evita basura sin tragarse trabajo de nadie.
- [ ] El título guarda al perder el foco y se repone si se deja vacío.
- [ ] Cambiar color o icono desde la paleta se refleja en la tarjeta del inicio.

## Fechas en elementos (T212)

- [x] Quitar el día quita también la hora. → `services/demo/__tests__/lists.test.ts`
- [ ] Un elemento con fecha pasada **ya palomeado** no se pinta como vencido.
- [x] La fecha viaja como `YYYY-MM-DD` y no como instante, en las dos implementaciones. → `hooks/__tests__/use-lists.test.tsx, services/demo/__tests__/lists.test.ts`
- [ ] Un elemento al que se le pone la fecha de hoy aparece en la franja del día.

## Recordatorios de elementos de lista (T215)

- [x] `syncNotifications` recibe actividades **y** elementos juntos: la prueba clave es que
  programar unos no cancele los otros, que es justo lo que pasaría llamándola por fuente. → `hooks/__tests__/use-reminders.test.tsx`
- [x] Un elemento con fecha y **sin** hora no programa nada. → `hooks/__tests__/use-reminders.test.tsx (desde T223 se anclan a las 9:00 si tienen recordatorio)`
- [x] Un elemento ya palomeado no programa nada. → `hooks/__tests__/use-reminders.test.tsx`
- [x] La hora se interpreta como local, no como UTC. → `hooks/__tests__/use-reminders.test.tsx`

## Buscar y reordenar (T213, T214, T216)

- [x] **La más importante**: el backend demo no devuelve referencias vivas de su almacén.
  Mutar lo devuelto no debe cambiar lo guardado. Es la prueba que habría atrapado T216. → `services/demo/__tests__/lists.test.ts`
- [x] `search` con menos de dos letras no consulta. → `hooks/__tests__/use-lists.test.tsx`
- [x] `search` encuentra elementos ya palomeados. → `services/demo/__tests__/lists.test.ts`
- [x] En Supabase, buscar "50%" no trae de más: `%` y `_` van escapados. → `services/supabase/__tests__/lists.test.ts`
- [ ] Subir/bajar solo permuta dentro del grupo y los extremos van deshabilitados.
- [ ] El intercambio lee ambos `sort_order` antes de escribir.

## Pendientes en el calendario y áreas táctiles (T217, T218)

- [x] **La que más importa**: un pendiente con fecha **no** aparece en las vistas de horas
  (día, 3 días, semana). Es la regla que define el módulo y la más fácil de romper al
  "mejorar" la integración. → `components/calendar/__tests__/list-layers.test.ts (y calendar.tsx solo los agrega en mes y agenda)`
- [x] En mes, el chip de un pendiente no pinta hora aunque el elemento tenga `due_time`. → `components/calendar/__tests__/list-layers.test.ts`
- [x] `isDerivedActivity` reconoce el prefijo de pendientes: no se pueden editar ni compartir
  como actividades. → `components/calendar/__tests__/views-and-filters.test.ts`
- [ ] Tocar el texto de un elemento abre la edición y **no** lo palomea.

## Compartir listas (T219-T221)

- [ ] (base de datos) **La más importante**: ampliar `supabase/tests/rls.sql`. Con tres usuarios, que quien
  tiene permiso de *ver* no pueda escribir, que quien no tiene acceso no vea nada, y que
  nadie salvo el dueño pueda borrar la lista.
- [ ] (base de datos) Compartir solo funciona con contactos aceptados (`are_connected` en el `with check`).
- [x] Retirar el acceso no borra contenido. → `services/demo/__tests__/lists.test.ts`
- [x] **Ninguna implementación usa `this`.** Es la prueba que habría atrapado T221 y que
  seguirá atrapándolo: la fachada desprende los métodos del objeto. → `services/demo/__tests__/lists.test.ts, services/supabase/__tests__/lists.test.ts`
- [x] `sharedWithMe` no devuelve listas archivadas ni las propias. → `services/demo/__tests__/lists.test.ts`

## Tiempo real en listas (T222)

- [x] Que las cuatro tablas de listas estén en la lista vigilada y que `['lists']` esté en
  la invalidación: son dos listas que se editan a mano y es fácil agregar una tabla nueva a
  una y olvidarla en la otra. → `services/supabase/__tests__/shared.test.ts`
- [ ] (manual) Verificación manual con dos sesiones: A palomea un elemento y B lo ve sin recargar.
- [ ] (manual) Comprobar en el proyecto real que las tablas quedaron en `supabase_realtime`
  (`select * from pg_publication_tables where pubname = 'supabase_realtime'`).

## Recordatorio con desfase (T223)

- [x] Un elemento **sin** recordatorio no programa nada, aunque tenga hora. → `hooks/__tests__/use-reminders.test.tsx`
- [x] Con hora y "2 días antes", el aviso cae dos días antes **a esa hora**. → `hooks/__tests__/use-reminders.test.tsx`
- [x] Sin hora y "2 días antes", el aviso cae dos días antes a las 9:00. → `hooks/__tests__/use-reminders.test.tsx`
- [x] Quitar la fecha deja el recordatorio sin efecto (no hay de qué contar hacia atrás). → `hooks/__tests__/use-reminders.test.tsx`

## Arrastrar elementos (T225)

- [x] `destinoDe` con filas de **alturas distintas**: es toda la razón de medirlas y donde
  un error se ve como "lo solté aquí y cayó allá". → `lib/__tests__/drag.test.ts (encontró y corrigió un error: con una fila alta debajo había que arrastrar 3/4 de ella)`
- [x] Arrastrar menos de media fila no cambia nada. → `lib/__tests__/drag.test.ts`
- [x] El orden nuevo cae entre los vecinos del destino y no pisa a ninguno. → `lib/__tests__/drag.test.ts`
- [ ] Tocar sin mantener sigue abriendo la edición, no arrastra.
- [ ] (manual) Verificación manual en teléfono: el arrastre no pelea con el scroll de la pantalla.

## Etiquetas (T211)

- [x] `createTag` con un nombre que ya existe devuelve la existente y no duplica, sin
  importar mayúsculas. → `services/demo/__tests__/lists.test.ts`
- [x] Borrar una etiqueta no borra ninguna lista. → `services/demo/__tests__/lists.test.ts`
- [ ] (base de datos) RLS: B no ve las etiquetas de A ni sus vínculos, **aunque comparta la lista**. Es lo
  que sostiene que etiquetar sea de quien mira.
- [x] `tag_ids` solo trae las etiquetas propias en una lista compartida. → `services/demo/__tests__/lists.test.ts`
- [ ] Con una etiqueta activa, "Fijadas" solo muestra las fijadas de esa etiqueta.

## Arrastrar tarjetas del inicio (T226, T227)

- [x] **La que más importa**: soltar tras arrastrar **no** dispara el toque. Ya falló una
  vez sin que se notara, porque la prueba miraba el orden y no lo que se había abierto. → `lib/__tests__/drag.test.ts`
- [ ] Un toque largo **sin mover** sigue comportándose como toque: la guarda solo se activa
  si hubo movimiento real.
- [x] `destinoDe` de la rejilla con filas de alturas distintas y con una última fila
  incompleta (soltar en el hueco vacío cae al final). → `lib/__tests__/drag.test.ts`
- [ ] Las listas compartidas conmigo no se pueden arrastrar.

## Arrastrar entre secciones (T228)

- [x] `soltarEn` resuelve la sección por el encabezado que queda **por encima**, incluida la
  zona sin agrupar cuando no hay ninguno. → `lib/__tests__/drag.test.ts`
- [x] El orden nuevo se calcula entre vecinos **de la sección de destino**, no de la de
  origen. Es el error silencioso más probable aquí. → `lib/__tests__/drag.test.ts`
- [x] Soltar justo debajo del campo de captura de una sección cae en esa sección, no en la
  siguiente. → `lib/__tests__/drag.test.ts`
- [x] Encabezados y campos de captura no se pueden arrastrar pero sí cuentan para medir. → `lib/__tests__/drag.test.ts`

## Crear listas (T229)

- [ ] **La que faltaba**: crear, escribir el nombre y salir **sin confirmar** conserva la
  lista. Es la carrera entre el guardado y la limpieza, y se veía como "el botón no sirve".
- [ ] Crear y salir sin tocar nada sigue sin dejar una lista vacía.
- [ ] Agregar solo un elemento (sin nombrar la lista) también la conserva.
- [ ] Un fallo al crear muestra mensaje.

## Políticas de lectura e INSERT ... RETURNING (T231)

- [ ] (base de datos) **La prueba que faltaba**: crear una lista contra un Postgres real con RLS. Toda la
  verificación corre en modo demo, que no tiene políticas, así que este fallo era invisible
  por construcción. Vale para las seis tablas del módulo.
- [ ] (base de datos) Ninguna política de SELECT depende de una función que consulte su propia tabla.
- [x] Un 42501 distingue en la app entre sesión caducada y operación ajena. → `services/supabase/__tests__/errors-sesion.test.ts`

## Listas que se repiten (T208, T209)

- [x] `occursOn` con DAILY, WEEKLY con y sin `byDay`, MONTHLY en meses sin ese día, y
  respetando `until`. → `lib/__tests__/list-runs.test.ts`
- [x] `graciaVencida`: una vuelta de ayer sigue viva antes de las 15:00 y caduca después.
  Es la regla que decide si algo cuenta como hecho. → `lib/__tests__/list-runs.test.ts`
- [x] `syncRuns` cierra lo caducado con los conteos correctos, abre la de hoy solo si la
  regla cae hoy, y no duplica la vuelta al llamarse dos veces. → `services/demo/__tests__/lists.test.ts`
- [x] Palomear en la vuelta de ayer suma a ayer y no a hoy. → `services/demo/__tests__/lists.test.ts`
- [x] En una rutina, los elementos palomeados **no** se mueven a completados. → `services/demo/__tests__/lists.test.ts`
- [x] Demo y Supabase dan el mismo resultado para la misma regla y la misma fecha. → `los dos usan occursOn y graciaVencida de lib (lib/__tests__/list-runs.test.ts)`

## Resúmenes de rutina (T210)

- [x] `resumirVueltas` cuenta como completa solo si `completed_count >= total_count` y
  `total_count > 0`: una vuelta sin elementos no es un éxito. → `lib/__tests__/list-runs.test.ts`
- [x] Ignora las vueltas vacías para el promedio pero las cuenta como registradas. → `lib/__tests__/list-runs.test.ts`
- [x] **La que importa de verdad**: que el resumen no devuelva porcentaje de incumplimiento
  ni racha. Es una decisión de producto que una prueba puede proteger de un "mejor así". → `lib/__tests__/list-runs.test.ts`

## Fecha de la lista completa (T232)
- [x] `lists.due_date` sobrevive a `update` en los dos backends (demo y Supabase) sin tocar
  `due_date` de los elementos. Es la confusión obvia: dos columnas con el mismo nombre en
  tablas distintas. → `services/demo/__tests__/lists.test.ts`
- [ ] La X bajo el título la quita (`due_date: null`) y la línea desaparece.
- [ ] Con fecha pasada, la línea va en `theme.today`.
- [ ] El subtítulo de la tarjeta la muestra al final, también cuando la lista está vacía.

## Días de la semana en la repetición (T232b)
- [ ] Tocar L, M y J deja `FREQ=WEEKLY;BYDAY=MO,WE,TH` y la hoja los muestra prendidos al
  reabrirse (se leen de la regla guardada, no de un estado aparte).
- [ ] Apagar el último día quita la repetición en vez de dejar una regla sin días.

## Hoy y Algún día (T233, T234)
- [x] `listUndated` deja fuera los elementos de listas que se repiten, los archivados y los
  ya palomeados, en **los dos** backends. Es la regla que más fácil se cae al tocar la
  consulta de Supabase, porque el filtro va sobre la tabla unida (`lists.recurrence_rule`). → `services/demo/__tests__/lists.test.ts`
- [ ] "Pasar todo a hoy" mueve todos los vencidos y deja el grupo "Atrasado" vacío.
- [x] Ponerle día a un elemento desde Algún día lo saca de la bandeja y lo mete en Hoy si la
  fecha es hoy. → `services/demo/__tests__/lists.test.ts`
- [ ] El número del acceso "Hoy" no cuenta lo ya palomeado.
- [ ] Con todo agendado, Algún día muestra su estado vacío y no una lista de grupos vacíos.

## Rutinas en el calendario e inicio/fin (T235 – T237)
- [x] `rutinasEnRango`: una regla de lunes a viernes da cinco días en una semana, ninguno
  antes de `recurrence_start` ni después del `UNTIL`; una lista archivada no da ninguno. → `lib/__tests__/list-runs.test.ts`
- [x] El avance sale de la vuelta cerrada si la hay (conteos congelados) y de la abierta si
  no; sin vuelta es 0/total. Nunca pasa de total aunque se haya borrado algo palomeado. → `lib/__tests__/list-runs.test.ts`
- [x] `listRunsByDateRange` no abre ni cierra vueltas (comparar filas antes y después). → `services/demo/__tests__/lists.test.ts`
- [ ] Cambiar de "todos los días" a chips de días conserva el inicio y el fin.
- [ ] Un fin anterior al inicio se empuja al inicio.
- [ ] En web ≥ 900 px y vista diaria aparece el panel y **no** la franja; a 899 px, al revés.
- [ ] Tocar un chip de rutina o de pendiente en la agenda abre su lista.

## Fitness v2 · G3 logger en vivo (T243)
Ya cubierto con pruebas al escribirlo: `lib/gym/{sets,session,tools,outbox}` y la pantalla
`workout/[id]` (registro, ✓, + Serie, teclado, + Drop, tipo, borrar con deshacer, terminar,
descartar, lectura). Falta:
- [x] `useSetActions` / `flushOutbox`: un envío que falla deja la serie pendiente y se
  reintenta a los 10 s; al volver la app al frente se reenvía; dos cambios durante un envío
  no se pierden. → `hooks/__tests__/use-set-sync.test.tsx`
- [ ] `useLegacyConversion`: convierte, liga al catálogo solo coincidencias únicas, marca
  convertido; si falla a la mitad, la siguiente vez termina sin duplicar.
- [x] `exerciseHistory` en los dos backends: por `exercise_id` y, sin ligar, por nombre exacto;
  sin sesiones borradas ni descartadas; ordenado por fecha de la sesión. → `services/demo/__tests__/workouts-v2.test.ts, services/supabase/__tests__/workouts-v2.test.ts`
- [x] `gym-store`: el descanso se calcula desde `endsAt`; ±15 s reprograma el aviso; uno
  terminado mientras la app estaba cerrada no aparece al hidratar. → `store/__tests__/gym-store.test.ts`
- [x] `RestTimerBar`: al llegar a 0 avisa y se va solo a los 8 s. → `components/fitness/__tests__/timers.test.tsx`
- [x] `NumpadSheet`: la primera tecla reemplaza y las siguientes agregan (bug encontrado a
  mano: 1-0-0 daba 0); modo contador; "Siguiente" peso → reps → esfuerzo. → `components/fitness/__tests__/numpad-sheet.test.tsx`
- [x] `ExerciseBlock`: columnas I/D en unilaterales y aviso de desbalance; etiqueta C/F/T…
  por tipo; el calentamiento no cuenta en la numeración. → `components/fitness/__tests__/exercise-block.test.tsx`
- [ ] Detalle del ejercicio: mejor serie, peso máximo, gráficas con 1 y con 2+ sesiones.
- [ ] Ajustes de gimnasio en Perfil.
- [ ] (manual) Manual en nativo (Android): swipe izquierda/derecha, vibración, notificación de fin de
  descanso con la pantalla bloqueada.

## Fitness v2 · G4 edición (T244)
Probado a mano en el demo (sesión "Pierna"): drop → separar → deshacer ×2 → rehacer → unir →
mover a otro ejercicio → duración y hora → "editado" en encabezado e historial. Falta:
- [x] `splitSet` / `mergeSets`: ids nuevos, órdenes entre vecinos, intensificadores que se
  quitan o se agregan, la unida queda hecha si cualquiera lo estaba. → `lib/gym/__tests__/transforms.test.ts`
- [x] `useEditHistory`: `batch` agrupa en un paso; deshacer en orden inverso; una acción nueva
  borra lo que se podía rehacer; tope de 50 pasos. → `hooks/__tests__/use-edit-history.test.tsx`
- [x] `applyOutbox` con una serie movida a otro ejercicio: sale de uno y aparece en el otro. → `lib/gym/__tests__/transforms.test.ts`
- [ ] La sesión se marca editada una sola vez por visita y nunca en una sesión en curso.
- [x] Duración: `ended_at − performed_at` en los dos backends; suma por ejercicio solo sin
  `ended_at`; el caché de `updateExercise` no la pisa. → `services/demo/__tests__/workouts-v2.test.ts`
- [ ] Cambiar la hora corre también `ended_at`.

## Fitness v2 · G5 intensificadores (T245)
Probado a mano en el demo: 21s + tempo sobre una serie, fallo en Detalles, superserie A1/A2
(sin descanso tras A1, descanso de ronda tras A2), pirámide en otro ejercicio, EMOM con su
timer corriendo. Falta:
- [x] `applyIntensifier` para cada una de las 24 claves (tramos, tipos, descansos, tempo) y
  que aplicar dos veces no duplique la etiqueta. → `lib/gym/__tests__/transforms.test.ts`
- [x] `removeIntensifier` quita solo los tramos que trajo y devuelve el principal a `main`. → `lib/gym/__tests__/transforms.test.ts`
- [x] `protocolSets` para los 14 protocolos: número de series, objetivos, pesos redondeados,
  tipos (top set / back-off / fallo). → `lib/gym/__tests__/transforms.test.ts`
- [x] `unusualCombination`: cada aviso y ningún falso positivo en una serie normal. → `lib/gym/__tests__/transforms.test.ts`
- [x] `createGroup` / `removeGroup` en los dos backends: posiciones contiguas en el lugar del
  primero, `group_position` en orden, desagrupar conserva las series. → `services/demo/__tests__/workouts-v2.test.ts`
- [ ] Descanso en grupos: solo al terminar el último del grupo y con `rest_after_round_sec`.
- [x] `IntervalTimerSheet`: fases trabajo/descanso, rondas, fin; calcula desde el inicio. → `components/fitness/__tests__/timers.test.tsx`
- [x] `SetDetailsSheet`: lb ↔ kg en lastre/asistencia/cadenas; vacío no guarda `load_mods`. → `components/fitness/__tests__/sheets.test.tsx`

## Fitness v2 · G6 notas (T246)
Probado a mano en el demo: energía 4, pump 3 y dos etiquetas en una sesión en curso; nota fija
y nota de hoy en un ejercicio; nota con etiquetas en una serie; las tres se ven en el logger y
en modo lectura; buscar "rodilla" y "lenta" encuentra la nota correcta y abre la sesión; un
término sin coincidencias muestra el vacío. Falta:
- [x] `searchNotes` en los dos backends: los tres niveles, mínimo dos letras, sin borrados ni
  descartados (sesión, ejercicio o serie), orden de lo más reciente a lo más viejo, y que `%`
  y `_` se busquen literales en Supabase. → `services/demo/__tests__/workouts-v2.test.ts, services/supabase/__tests__/workouts-v2.test.ts`
- [ ] `update` de la sesión escribe el parche en el caché al momento: dos chips seguidos no se
  pisan.
- [ ] `saveStickyNote`: optimista en las preferencias; vacío guarda `null`; solo para
  ejercicios del catálogo.
- [x] `NoteSheet`: guarda texto recortado (vacío → `null`) y etiquetas; cerrar sin guardar
  descarta. → `components/fitness/__tests__/sheets.test.tsx`
- [x] `Chip` seleccionado sin color usa `onInk` (antes: blanco sobre tinta clara en oscuro). → `components/ui/__tests__/chip.test.tsx`

## Fitness v2 · G7 Modo Gymrat (T247)
Probado a mano en el demo con el reloj del navegador en el 21 oct: tarjeta de pausa por la
semana del 5 oct, "Viaje" + nota + "Mi racha sigue" → 2 semanas; trato "Reina" en Perfil;
100 kg × 5 en banca → resumen con "Listo, mi reina…", equivalencia, músculos y logro Club 100 kg;
Progreso con racha, semana justificada en el calendario, series por músculo y logros; otra
sesión con 105 kg → badge de PR y "Nuevo récord. Así se gobierna, mi reina." Falta:
- [x] `computeStreak`: semana actual vacía no rompe; hueco sin decidir pausa y congela; "sigue"
  no suma ni rompe; "reiniciar" pone en cero; huecos antes de `STREAK_SINCE` reinician sin
  preguntar; mejor racha. (Siete casos ya revisados a mano en Node.) → `lib/gym/__tests__/progress.test.ts`
- [x] `computeAchievements` / `unlockedBy`: cada meta, warmups y series sin marcar no cuentan,
  clubes solo con barra y reps ≥ 1, el nombre del drop sigue el trato, la racha no se atribuye
  a una sesión. → `lib/gym/__tests__/progress.test.ts`
- [x] `setsByGroup`: primario 1, secundario ½, sin doble conteo; `isLegDay` con 6 series. → `lib/gym/__tests__/progress.test.ts`
- [x] `gymratLine`: nunca la misma frase dos veces seguidas; `null` en Modo serio; `{voc}` por
  trato. `tonnageEquivalence`: rango 2–30, semilla estable, nada bajo 140 kg. → `constants/__tests__/gymrat.test.ts`
- [x] `trainingLog` y `saveStreakEvents` en los dos backends (solo `completed`, sin borradas;
  upsert por semana). → `services/demo/__tests__/workouts-v2.test.ts, services/supabase/__tests__/workouts-v2.test.ts`
- [ ] Modo serio: sin snackbars de humor, sin animación del badge, sin equivalencia ni frase
  en el resumen, sin "¿y la pierna?".

## Fitness v2 · G8 calidad y dependencias nativas (T248)
Probado a mano en el demo (web): descanso con pitidos en 3-2-1 y al terminar (4 sonidos),
chip "Energía 3 de 5" encontrado por su etiqueta accesible, "Compartir" del resumen genera la
imagen y, sin hoja de compartir del navegador, la descarga (`kavi-2026-10-21.png`). Falta:
- [x] **Antes de correr Jest:** mocks de `expo-haptics`, `expo-audio`, `expo-sharing` y
  `react-native-view-shot` en `jest.setup.js`.
- [x] `playSound`: crea un reproductor por sonido una sola vez; un error de audio no rompe. → `lib/__tests__/sounds-and-share.test.ts`
- [x] `RestTimerBar`: pita en 3, 2 y 1; al terminar suena y vibra solo si terminó hace menos
  de 3 s (abrir la app con un descanso viejo no suena); sin sonido si `timerSound` es falso. → `components/fitness/__tests__/timers.test.tsx`
- [x] `IntervalTimerSheet`: pitido por fase y aviso distinto al final. → `components/fitness/__tests__/timers.test.tsx`
- [x] `shareImage`: nativo con `expo-sharing`; web con `navigator.share` de archivos o
  descarga; `SessionSummarySheet` cae a texto si la captura falla. → `lib/__tests__/sounds-and-share.test.ts`
- [x] `Chip`: `accessibilityLabel` opcional y área táctil de 44 con `hitSlop`. → `components/ui/__tests__/chip.test.tsx`
- [ ] (manual) Prueba en dispositivo: háptico en iOS (no hay Xcode en esta máquina) y en Android.

## Arrastrar para reordenar (T250)
Probado a mano en el demo (web): la serie 3 arrastrada hasta arriba queda primera
(40 · 20 · 30), soltar no abre el menú y un toque corto sí; en "Reordenar ejercicios" el
segundo pasa a primero y "Guardar orden" lo aplica en la sesión. Falta:
- [x] `ReorderableColumn`: destino según centros con filas de alto distinto; las demás se
  recorren el alto de la arrastrada; soltar en el mismo lugar no llama `onMove`; cancelar
  restaura; `justDragged` evita abrir el menú al soltar. → `lib/__tests__/drag.test.ts`
- [ ] `moverSerie`: `sort_order` entre los nuevos vecinos (arriba, en medio, al final) y se
  puede deshacer.
- [ ] `reordenarEjercicios`: solo guarda las posiciones que cambiaron; el caché se reordena al
  momento; marca la sesión como editada.
- [ ] (manual) En dispositivo (iOS y Android): mantener presionado no pelea con el deslizar de la fila
  ni con el scroll (el scroll se apaga mientras se arrastra); dentro de la hoja en Android.

## Borrador del formulario de actividad con el logger (T251)
Probado a mano en el demo: nueva actividad → "Actividad de gimnasio" → "Añadir ejercicio"
abre el catálogo; el bloque es el del logger; 100 kg con el teclado y "+ Serie" copia la
anterior; "Crear actividad" guarda la sesión con el ejercicio ligado al catálogo y sus dos
series. Falta:
- [ ] **Reescribir `workout-draft.test.tsx`** (se quitó: probaba las tarjetas de texto de
  v1). Casos: vacío invita a añadir; elegir del catálogo crea el ejercicio con su primera
  serie prellenada con la vez pasada; teclado, + Serie, duplicar, borrar, arrastrar;
  cambiar y quitar ejercicio; con entrenamiento existente ofrece abrirlo.
- [ ] `saveExercises` (activity/new): crea la sesión, cada ejercicio en orden con su
  `exercise_id` y sus series reasignadas al id creado; un fallo no pierde la actividad.
- [x] `useGymProgress.sessions`: excluye sesiones futuras y las que tienen series pero
  ninguna marcada; incluye las de v1 sin series. → `hooks/__tests__/use-gym-progress.test.tsx`
- [ ] Logger tras extraer `set-editing.ts`: el teclado, "Siguiente" y el esfuerzo se
  comportan igual que antes.

## Variante del drop mecánico (T252)
Probado a mano en el demo: press inclinado con barra → "Drop mecánico" abre "Variante del
drop" con press plano y declinado con barra primero; elegir plano lo muestra en el tramo;
tocar el tramo → "Buscar en todo el catálogo" → declinado lo reemplaza. Falta:
- [x] `suggestVariants`: mismo grupo y mecánica; sin equipo ni patrón en común no entra; el
  mismo equipo gana; lo mejor de cada familia primero; excluye el propio y los archivados. → `lib/gym/__tests__/transforms.test.ts`
- [ ] Logger: aplicar `mechanical_drop` abre la hoja en el último tramo `drop`; "Sin
  variante" la quita; se puede deshacer.

## Ocurrencia borrada que reaparecía (T249)
Reproducido antes de arreglar con un script suelto sobre el backend demo (serie lunes a
viernes de 3 semanas, luego `extendRecurrenceHorizon`): fallaban 3 de 6 casos y tras el
arreglo pasan los 6. Migración probada en PGlite (columna, RLS, idempotente) y aplicada en
producción. Falta convertir esos casos en pruebas del repo (demo y Supabase):
- [x] Borrar la última ocurrencia de una serie con fin: no reaparece al reabrir el
  calendario (el caso del reporte). → `src/services/demo/__tests__/activities.test.ts`
- [x] Borrar una de en medio: no reaparece. → `src/services/demo/__tests__/activities.test.ts`
- [x] Mover la última a otro día (antes o después): su día original no se recrea. → `src/services/demo/__tests__/activities.test.ts`
- [x] Cambiar solo la hora de la última (más tarde o más temprano): no se duplica. → `src/services/demo/__tests__/activities.test.ts`
- [x] Borrar la madre: la heredera conserva `recurrence_exdates`. → `src/services/demo/__tests__/activities.test.ts`
- [x] Editar toda la serie (incluso cambiando la hora): los días excluidos siguen excluidos. → `src/services/demo/__tests__/activities.test.ts`
- [x] `missingOccurrences` y `withExdate` en `lib/recurrence.ts`. → `lib/__tests__/list-runs.test.ts`

## Colores de los Nobi (T202)
Migración de datos probada en PGlite (las dos paletas viejas, minúsculas, un color
personalizado intacto, idempotente) y aplicada en producción. Visto en el demo: el menú
"Tu color" muestra los 21 por familias y los oscuros con contorno; la pestaña "Tú" con azul
marino se distingue. `people-colors.test.ts` ya se ajustó a la regla nueva (sin correrlo).
Falta:
- [x] Correr `people-colors.test.ts` y `nobi.test.ts` con los cambios. → `la suite completa pasa`
- [x] `ColorSwatch`: palomita oscura sobre rosa, amarillo, lima y blanco; contorno solo
  cuando el color no llega a 3:1 contra la hoja. → `components/ui/__tests__/color-swatch.test.tsx`
- [x] `lowContrastOutline` en bloque, chip y punto del mes, y en la agenda. → `components/ui/__tests__/color-swatch.test.tsx`
- [x] `currentColor` en el color propio guardado en el dispositivo y en el formulario de
  una lista vieja. → `hooks/__tests__/use-connections.test.tsx`

## Paleta de personas v3 (vibrante sin chillar)
Reajuste en OKLCH tras T202: los 21 pasan 3:1 sobre `#131313` y `#1A1A1A`, par más cercano
a 16.5. Migración v3 probada en PGlite (las tres paletas anteriores, personalizado intacto,
idempotente) y aplicada en producción. Visto en el demo: menú "Tu color" y pestaña "Tú".
Falta:
- [x] `people-colors.test.ts`: que ningún color necesite contorno sobre el fondo y las hojas
  del tema oscuro; que `currentColor` traduzca las tres paletas anteriores. → `constants/__tests__/people-colors.test.ts (ya lo cubría)`

## Formato de 12 horas en toda la app
Probado a mano en el demo (360 px, 12 h): el pendiente con hora muestra "5:30 p.m." en la
lista y al editarlo; el selector de hora usa rueda 12–11 con a.m./p.m. Falta:
- [x] `formatClock` ("17:30:00" → "5:30 p.m." / "17:30") y `formatHour`. → `components/calendar/__tests__/views-and-filters.test.ts`
- [x] `TimePickerSheet` en 12 h: 12 a.m. = 0:00, 12 p.m. = 12:00; cambiar a.m./p.m. conserva
  la hora; devuelve minutos 0–1439 igual que en 24 h. → `components/ui/__tests__/time-picker-sheet.test.tsx`
- [x] Ninguna hora visible se arma a mano (buscar `.slice(0, 5)` sobre horas en la UI). → `__tests__/source-rules.test.ts`

## Glosario y estimaciones (T253, T254)
Probado a mano en el demo (360 px): enlace al glosario en Fitness; pantalla con 8 temas;
buscar "rir" despliega Reps en reserva; tocar "RIR" en el logger abre su explicación con
"Ver todo el glosario"; el detalle del ejercicio muestra "≈ 101.3 kg máximo estimado" y abre
su explicación. Falta:
- [x] `glossary.ts`: ids únicos; cada entrada con significado, ejemplo y "en pocas palabras";
  todo `topic` existe en `GLOSSARY_TOPICS`. → `i18n/__tests__/i18n.test.ts`
- [x] Pantalla Glosario: búsqueda sin acentos (por término, otros nombres y texto); `?term=`
  abre desplegado; vacío con "Ningún término dice eso." → `app/(app)/__tests__/glossary.test.tsx`
- [x] RF-F65: ningún valor calculado sin "≈"/"estimado" (detalle, gráfica, herramientas). → `__tests__/source-rules.test.ts`

## Fitness con datos de salud, base (T255 – T259)
Probado a mano en el demo (360 px): Fitness → Actividad muestra "Conecta tu actividad" con qué
se lee y la nota de privacidad; "Conectar" da totales de hoy con su fuente, pasos de 7 días y
entrenamientos de otras apps (14 días); el del reloj que coincide con "Pierna" dice "Es tu
sesión «Pierna» de KAVI" y en el historial la sesión muestra "214 kcal activas · Reloj";
Perfil → Datos de salud → Desconectar vuelve al estado sin conectar. Falta:
- [x] `matchSessions`/`overlapRatio`/`kaviSpan`: traslape ≥ 50 % de la más corta; cada externa con
  una sola sesión de KAVI (la de mayor traslape); sin hora de fin usa la duración o 1 h. → `lib/health/__tests__/match.test.ts`
- [x] `platform.web.ts` → estado "web" con su mensaje; `platform.ts` → "unsupported". → `services/health/__tests__/health.test.ts`
- [x] Demo: permisos parciales (solo pasos) dejan las otras cifras en "Sin permiso", nunca en 0. → `services/health/__tests__/health.test.ts`
- [ ] Desconectar borra totales y sesiones de la caché y vuelve a "Conecta tu actividad".
- [ ] (manual) Web real (sin demo): Actividad muestra "Tu actividad vive en tu teléfono".

## Eliminar cuenta (T263)
Migración probada en PGlite (10 casos: anon no puede, sin sesión falla con mensaje claro, no
queda ninguna fila de la persona en las 18 tablas con datos de personas, lo de otra persona
sigue, el pendiente ajeno que palomeó sigue hecho sin autora, lo que agregó a una lista ajena se
borra) y aplicada en producción; con la llave anónima la función responde 42501. Visto en el
demo (360 px): `/eliminar-cuenta` sin sesión; contraseña mala → "Credenciales incorrectas";
correcta + "Entiendo…" → vuelve a login. Falta:
- [x] `deleteAccount` en los dos backends: contraseña mala no borra nada; en Supabase llama la
  RPC y cierra la sesión local. → `services/{demo,supabase}/__tests__/auth.test.ts`
- [x] `useDeleteAccount`: limpia la cola de series, el descanso, los avisos y la caché. → `hooks/__tests__/use-auth-actions.test.tsx`
- [x] Hoja: el botón solo se activa con contraseña y el interruptor "Entiendo…". → `components/account/__tests__/delete-account-sheet.test.tsx`
- [ ] (manual) En producción, con una cuenta de prueba creada para eso: eliminarla y comprobar que su
  correo ya no inicia sesión.

## Edad y consentimiento (T264) y aviso publicado (T260)
Migración `20261005110000_consents.sql` probada en PGlite (20 casos: RLS solo lo propio; sin el
secreto no hay token; anon no puede crear; no el correo propio; adultos rechazados; el menor
solo ve la huella y no puede aprobarse; un enlace reemplazado no aprueba; el adulto ve y
aprueba; idempotente; enlace inválido y vencido; límite de 5 al día; cascada al eliminar la
cuenta). Visto en el demo (360 px): cuenta nueva → "Antes de empezar"; 15 años → confirmar y
"Corregir la fecha"; 17 años → correo propio rechazado ("no el tuyo"); correo del adulto →
espera; "Abrir el enlace del correo" → `/consentimiento` → "Apruebo" → "Volver a KAVI" abre el
calendario. `/privacidad` y un enlace inválido se abren sin sesión. Falta:
- [x] `edadEn`: cumpleaños hoy, ayer y mañana; 29 de febrero. → `lib/__tests__/consent.test.ts`
- [x] `consentGate`: sin fecha o con otra versión → aceptar; < 16 → menor; 16–17 sin aprobación
  → adulto; 16–17 con alguna aprobación → listo; ≥ 18 → listo. → `lib/__tests__/consent.test.ts`
- [x] `useConsentGate`: sin red y con la versión recordada abre la app; sin red y sin recordar
  muestra el error con "Reintentar"; con red siempre manda el servidor. → `hooks/__tests__/use-consent.test.tsx`
- [ ] Menor de 16 → "Es correcta: eliminar mi cuenta" borra la cuenta y vuelve a login.
- [ ] Rechazado y vencido muestran su texto; "Volver a enviar" y "Cambiar el correo".
- [x] Función de Vercel `api/guardian-consent`: sin sesión 401; correo inválido 400; mensajes
  22023 de la base pasan tal cual; sin variables de entorno 503. → `lib/__tests__/guardian-consent-api.test.ts`
- [ ] (manual) **Correo real en producción** (Vercel ya tiene SMTP_USER, SMTP_PASSWORD y KAVI_EMAIL_SECRET
  desde el 5 oct 2026; la función responde 401/400 como debe). Lo hace Areli con alias de Gmail:
  en ventana privada, crear `perdue.areli28+prueba@gmail.com`, fecha de hace 17 años, adulto
  `perdue.areli28+tutor@gmail.com`; llega "… te pide permiso para usar KAVI" (revisar spam), el
  enlace abre `/consentimiento`, aprobar abre la app en ≤ 15 s; el enlace ya usado dice
  "Aprobaste…". Al final, eliminar la cuenta de prueba desde Perfil.
- [ ] (manual) Cuentas existentes (la de Areli) ven "Antes de empezar" una vez al entrar.

## Celdas del mes con desborde (T204)
Visto en el demo: 360×560 (un chip por día y "+N" junto al número, alineado a la derecha),
360×480 (antes vacío, ahora puntos), 1280×520 (chip con hora y "+N" en la esquina izquierda) y
390×844 (igual que antes: dos chips y fila de puntos). Falta:
- [x] `cellLayout`: todo cabe → todos sin "+N"; desborde con sitio → chips + fila; sin sitio
  para la fila → 1 chip + "header"; `slots` 0 → nada. → `components/calendar/__tests__/cell-math.test.ts`
- [x] Nunca hay más chips que actividades menos una cuando hay "+N" (el "+N" nunca dice +0). → `components/calendar/__tests__/cell-math.test.ts`
- [ ] (manual) Texto grande del sistema (escala 1.5) en teléfono: el "+N" no se encima al número.
- [ ] (manual) iOS y Android nativos en vertical y acostado.

## Pruebas rotas que ya estaban así
- [x] `activity-form.test.tsx` › gimnasio (RF-F9): 3 casos fallan con "useAuth debe usarse dentro
  de <AuthProvider>". Ya fallaban antes de T263 (comprobado sobre `58c6442`): la captura de
  rutina del formulario usa `useAuth` y la prueba lo renderiza sin el proveedor. Arreglo: envolver
  el render en `AuthProvider` (o simular `useAuth`). No es un fallo de la app.

## Barra configurable y Más (T188, T189)
Web en el demo (360 px): la barra superior sigue con los 4 módulos (RF-N5). Android en el emulador
(demo): barra por omisión con el 2 en Compartido; Más; Perfil apilado y "Atrás"; tercer lugar →
Perfil sin salir de Más; intercambio; Compartido fuera → el 2 pasa a Más; "+ Contactos" abre
Compartido apilado; Fitness en la barra sin flecha. Falta:
- [x] `elegirAcceso`: poner en un lugar el módulo del otro los intercambia; nunca repite. → `constants/__tests__/modules.test.ts`
- [x] `accesosValidos`: guardado inválido (repetidos, módulo que no existe, largo ≠ 2) → omisión. → `constants/__tests__/modules.test.ts`
- [x] `moduleHref`: web → `(tabs)/<id>`; en la barra → `acceso-1/2`; fuera → `modulo/[id]`. → `constants/__tests__/modules.test.ts`
- [ ] (manual) Teléfono: barra por omisión Calendario · Compartido · Fitness · Más; Perfil desde Más con
  "Atrás"; cambiar el tercer lugar a Perfil cambia etiqueta, icono y pantalla sin reiniciar la
  navegación ni sacarte de Más.
- [ ] (manual) Teléfono: con Compartido fuera de la barra, el número de pendientes sale en Más y en su fila.
- [x] Primera vez que se abre la app: lleva a Perfil (apilado si no está en la barra) y "Atrás"
  vuelve al calendario. → `app/__tests__/index.test.tsx`
- [ ] "Ver solicitudes" (Perfil) y "+ Contactos" (calendario) abren Compartido donde esté.
- [ ] (manual) iOS (cuando haya build): iconos SF `square.grid.2x2` y los de cada módulo.
- [x] `profile.test.tsx`: los 23 casos fallan con "No QueryClient set" desde que Perfil tiene la fila
  "Datos de salud" (T259, `useHealthAvailability`). Ya fallaban antes de T188 (comprobado). Arreglo:
  simular `@/hooks/use-health` en la prueba o envolverla en `QueryClientProvider`.

## Listas como módulo (T189b)
Android en el emulador (demo): Listas aparece en Más; la hoja de "Segundo lugar" marca el actual y
avisa "se intercambian"; con Listas en la barra se pinta sin "Atrás"; el botón ○✓ del calendario
cambia a esa pestaña; abrir "Súper" y regresar vuelve a la pestaña. La elección sobrevive a cerrar
sesión y volver a entrar. Falta:
- [ ] Listas en la barra → Archivadas muestra "Atrás" y vuelve a las listas activas.
- [ ] Listas fuera de la barra → desde Más o desde ○✓ se abre apilada con "Atrás".
- [ ] (manual) Web: ○✓ sigue abriendo `/lists` (no es pestaña en web, RF-N5).
- [x] `moduleHref('lists', …)`: en la barra → `acceso-N`; fuera o en web → `/(app)/lists`. → `constants/__tests__/modules.test.ts`

## Barra de personas con muchos contactos (T203)
Web en el demo (390 px) con el tope bajado a 1 a mano: "Tú · Ana · ··· · + Contactos"; la hoja lista
a Ana y Pedro de la A a la Z; "PEDRO" encuentra a Pedro; "zz" → "Nadie se llama así."; superponer a
Pedro desde la hoja lo sube a la barra. Falta:
- [x] `personasEnBarra`: recientes primero (más nuevo antes), luego A–Z; tope 20; un superpuesto
  fuera del tope se agrega; `hayMas` solo si hay más que el tope. → `lib/__tests__/people-bar.test.ts`
- [x] `buscarPersonas`: sin acentos ni mayúsculas, con o sin "@", por nombre o usuario. → `lib/__tests__/people-bar.test.ts`
- [x] `marcarSuperpuesto`: guarda la fecha al superponer (no al quitar) y conserva solo 100. → `lib/__tests__/people-bar.test.ts`
- [ ] (manual) Con 25+ contactos reales en Supabase: la barra muestra 20 y el orden sobrevive a cerrar la app.

## Duplicar y borrar series en web (T265)
Web en el demo, "Pierna" → Editar. A 1280 px: 13 botones de borrar; borrar deja 12 y ofrece "Deshacer",
que la regresa; duplicar deja 14. A 390 px: un "⋮" por serie, la fila cabe completa con el número y el
menú trae Duplicar y Borrar serie. Falta:
- [ ] (manual) Teléfono: sin cambios (deslizar y menú del número); en web no hay deslizar.
- [ ] (manual) Entrenamiento en curso (no solo al editar uno terminado): mismos botones y la cola de series.
- [ ] (manual) Teclado en web: los botones se alcanzan con Tab y tienen foco visible.

## Bloques de la semana en el teléfono (T190b)
Web en el demo a 390 px, antes y después lado a lado: los títulos se leen completos en bloques altos.
Falta:
- [x] `compactTitleLines`: 1 línea mínima; un bloque de 2 h a 48 px/h → varias líneas. → `components/calendar/__tests__/cell-math.test.ts`
- [ ] (manual) Android/iOS nativos: la semana con texto grande del sistema no se encima.

## Health Connect en Android (T261)
Emulador Pixel 8 Pro (Android 16), demo con `EXPO_PUBLIC_HEALTH_SOURCE=platform`: Health Connect disponible;
"Conectar" abre el diálogo nativo con pasos, distancia, calorías activas y ejercicio; permitir todo menos
calorías → Actividad dice "Fuente: Health Connect", pasos 0, 0 km y calorías "Sin permiso" (la consulta
funciona: si fallara diría "—"); Perfil → Datos de salud lo describe; Desconectar → el diálogo vuelve a "0 of
4"; "Don't allow" regresa a "Conecta tu actividad". Falta:
- [ ] (manual) **En un teléfono con datos reales** (Google Fit, Samsung Health o un reloj): pasos, km y kcal de hoy y
  de 7 días coinciden con la app de origen; entrenamientos de otras apps con su nombre y app.
- [ ] (manual) Una sesión del reloj que se traslapa con una de KAVI aparece como la misma (RF-H6) con sus kcal.
- [ ] (manual) Teléfono con Android 13 o anterior sin Health Connect → "Instala o actualiza Health Connect…".
- [ ] (manual) Desconectar y reabrir la app sin reconectar: no lee nada aunque Android tarde en aplicar el retiro.

## Idioma: español e inglés, fase 1 (T196a)
Web en el demo: con el navegador en inglés, el inicio de sesión abre en inglés sin tocar nada; calendario
("October 2026", "Today", "M T W…", horas en 12 h "7:30 AM"), Compartido, Perfil, Listas y detalle de lista en
inglés; los datos de la persona se quedan como se escribieron. Desde Perfil, "English" cambia todo sin
reiniciar. Suite completa: las mismas 64 pruebas que ya fallaban antes, ninguna nueva. Falta:
- [x] `formatRange`, `formatDayTitle`, `formatShortDate`, `formatDate` en inglés (incluye cruce de mes). → `i18n/__tests__/i18n.test.ts`
- [x] `timeFormatFor`: sin elegir → 12 h en inglés y 24 h en español; un "12h" guardado antes cuenta como elegido. → `i18n/__tests__/i18n.test.ts`
- [x] `themeName`: tema del sistema intacto → traducido; renombrado → como lo escribió la persona. → `i18n/__tests__/i18n.test.ts`
- [x] `traducirDeLaBase`: un mensaje 22023 conocido sale en el idioma activo; uno desconocido, tal cual. → `i18n/__tests__/i18n.test.ts`
- [ ] (manual) Teléfono en inglés (Android/iOS): primera apertura en inglés; cambiar a Español en Perfil.
- [ ] (manual) Cambiar de idioma con una hoja abierta y con la app en Fitness (que sigue en español hasta T196b).
- [ ] (manual) Lector de pantalla en inglés: etiquetas de celdas del mes, bloques y botones.

## Idioma: Fitness en inglés (T196b)
Web en el demo con el navegador en inglés: pestaña Fitness, Actividad, Progreso (calendario, series por músculo,
logros), sesión en edición con su menú de serie, herramientas, protocolos, intensificadores, detalles y teclado,
y el glosario, todo en inglés. Los nombres de la sesión demo ("Sentadilla", "Prensa") vienen de v1 escritos a
mano y se quedan en español, como manda RF-I4. Suite completa: las mismas 64 pruebas que ya fallaban. Falta:
- [x] `exerciseName` / `workoutExerciseName`: catálogo con `name_en` → inglés; personalizado o nombre cambiado → tal cual. → `i18n/__tests__/i18n.test.ts`
- [x] `gymratLine` / `gymratLineFor` en inglés con trato rey, reina y neutral; Modo serio sigue sin frases. → `constants/__tests__/gymrat.test.ts`
- [x] `tonnageEquivalence` en inglés (singular y plural) y `streakReasonLabel` en inglés. → `constants/__tests__/gymrat.test.ts`
- [x] `computeAchievements` en inglés: títulos, descripciones y unidades; la realeza sigue el trato. → `lib/gym/__tests__/progress.test.ts`
- [x] `parseLegacy` en inglés: cada uno de los siete motivos. → `lib/gym/__tests__/legacy.test.ts`
- [x] Buscar en el selector de ejercicios y en intensificadores escribiendo en inglés y en español. → `lib/gym/__tests__/search.test.ts, i18n (intensificadores buscan en los dos)`
- [ ] (manual) Sesión en vivo en el teléfono en inglés: aviso de fin de descanso (título y "Next: …"), frases de PR y drop.
- [ ] (manual) Resumen al terminar y "Compartir" en inglés (texto e imagen).
- [ ] (manual) Datos de salud en Android con el teléfono en inglés: textos de Actividad y "no disponible".
- [x] Glosario: buscar "superserie" y "superset" encuentra el mismo término en cada idioma. → `i18n/__tests__/i18n.test.ts`

## Idioma: aviso, consentimiento, correo y notificaciones (T196c)
Web en el demo: `/privacidad?lang=en` sale en inglés con el aviso de "traducción de referencia" y el botón cambia
a español (y la dirección queda en `?lang=es`); `/consentimiento?lang=en` con un enlace inválido muestra el error
en inglés. El correo se armó en los dos idiomas con una copia local de la función: asunto, texto, nombre en
negritas y los dos enlaces con `lang` correctos. Suite completa: las mismas 64 pruebas que ya fallaban. Falta:
- [ ] (manual) Correo real (Vercel ya publicado): pedir aprobación con la app en inglés y en español; revisar en Gmail
  que el botón del otro idioma abre `/consentimiento` en ese idioma y que aprobar funciona desde los dos.
- [ ] (manual) `/consentimiento` con una solicitud real pendiente, en los dos idiomas (fecha de vencimiento, botones).
- [ ] (manual) Teléfono en inglés: un recordatorio de actividad ("Starts at 7:30 PM", "Today", "Shared by…") y uno de
  pendiente de lista; cambiar el idioma y confirmar que los avisos ya programados cambian de idioma.
- [ ] (manual) Solicitud de contacto e invitación recibidas con la app abierta en inglés.

## Fitness: ajustes en Fitness y bento (T266, T267)
Web en el demo a 390, 800 y 1280 px: el ⚙ abre "Ajustes de Fitness" con Registro, Humor y trato y Actividad;
Perfil ya no los muestra. El mosaico sale en 2 columnas, en 4 y lado a lado con el historial; buscar notas no
pierde el foco. Falta:
- [x] `weekSummary`: sesiones y volumen solo de lunes a domingo de esta semana; calentamiento fuera; grupos
  ordenados de más a menos, con medias series del músculo secundario. → `lib/gym/__tests__/progress.test.ts`
- [x] Bento con datos de esta semana (sesión con series hechas): "1 sesión", volumen y los tres músculos. (`fitness.test.tsx`)
- [x] Sesión en curso: la tarjeta grande dice "Sesión en curso" y la retoma. (`fitness.test.tsx`)
- [x] Racha en pausa: la tarjeta de decisión va arriba del mosaico y desaparece al decidir. → `app/(app)/(tabs)/__tests__/fitness.test.tsx`
- [ ] (manual) Teléfono (Android) con letra grande del sistema: las tarjetas crecen sin cortar texto.
- [ ] (manual) Lector de pantalla: cada tarjeta dice su nombre y qué abre.
- [x] Cambiar kg/lb desde el ⚙ y ver el volumen del mosaico en la nueva unidad. → `app/(app)/(tabs)/__tests__/fitness.test.tsx`

