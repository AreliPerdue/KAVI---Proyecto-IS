# Pruebas pendientes

Bitácora de lo que queda por verificar. Durante las sesiones de diseño no se corre la suite:
la verificación que sirve ahí es visual. Aquí se anota lo que habría que comprobar para
juntarlo en una sesión dedicada a pruebas.

## Densidad del calendario (T190a, T190b)

- [ ] `month-view.test.tsx` — los chips cambiaron de alto (20→18 base, 28→20 tope) y de
  separación (3→2). Revisar si alguna aserción daba por buenos los valores viejos.
- [ ] `timeline.test.tsx` — `BASE_MIN_BLOCK_HEIGHT` bajó de 28 a 22 con la tipografía. Una
  actividad corta ahora ocupa menos alto; comprobar que el título sigue sin cortarse.
- [ ] Prueba nueva: el número del día se alinea a la derecha en web y centrado en nativo.
  Hoy no hay ninguna que lo fije, así que un cambio de `alignItems` pasaría inadvertido.
- [ ] Prueba nueva: que la variante `micro` (11 px) no se use fuera del calendario. Es la
  única excepción al mínimo de 12 px de `kavi-design` §2 y conviene que una prueba la
  mantenga acotada en vez de la disciplina.
- [ ] Revisar a mano en 375 px de ancho: con la tipografía en 12, comprobar que la vista
  semanal en móvil no encima títulos entre columnas.

## Nobi coral (T197)

- [x] Contraste y distancia perceptual: los comprueba `people-colors.test.ts` y pasaron al
  agregarlo (son un cálculo barato, no una suite).
- [ ] Revisar el coral en tema claro dentro de la app, no solo el PNG suelto.

## Cascarón de Lists (T198)

- [ ] `services/demo/lists.ts` no tiene pruebas. Lo que más las pide: `duplicate` (copia
  solo pendientes y remapea las secciones), `removeSection` (los ítems vuelven a la lista
  sin agrupar, no se borran) y `listByDateRange` (compara fechas `YYYY-MM-DD` como texto,
  que es correcto solo con cero a la izquierda).
- [ ] Pantalla de inicio: que los grupos se pinten como bloques y que una fila impar no
  estire la última tarjeta.
- [ ] Detalle: que un ítem palomeado salga de su sección y baje a completados, y que
  despalomearlo lo devuelva a la sección de donde salió.
- [ ] `supabaseLists` falla a propósito hasta T195; conviene una prueba que fije que el
  mensaje llega a la UI en vez de convertirse en una lista vacía.

## Alta y gestión de listas (T199)

- [ ] Que el botón de acciones **no** quede anidado dentro del Pressable de la tarjeta: es
  HTML inválido en web y ya ocurrió una vez. Una prueba que lo fije vale más que recordarlo.
- [ ] Crear una lista navega a su detalle, no al inicio.
- [ ] Eliminar pide confirmación y el mensaje menciona cuántos elementos se pierden.
- [ ] Archivar la saca del inicio y aparece en Archivadas; restaurar la devuelve.
- [ ] `listFormSchema` rechaza un color fuera de la paleta.
- [ ] `ModalHeader` con `back`: dice "Atrás" y usa flecha, no X. Y que dentro de Archivadas
  el botón vuelva a las listas activas en vez de salir del módulo.

## Vistas nuevas y pastilla configurable (T191-T193)

- [ ] `rangeForView` y `shiftAnchor` con `threeDays` y `agenda`: son switches exhaustivos y
  un caso nuevo sin rama rompería en silencio.
- [ ] `togglePinnedView`: no deja la pastilla vacía, y conserva el orden canónico en vez del
  orden en que se fijaron.
- [ ] `AgendaView` omite los días sin actividades y agrupa bien las que cruzan medianoche.
- [ ] `formatThreeDaysTitle` cuando el rango cruza de mes.
- [ ] Que el alfiler del menú no quede anidado dentro del Pressable de su fila.
- [ ] Encabezado del calendario en dos filas por debajo de 720 px, con el título completo.
  Es la clase de regresión que solo se ve en una captura, así que conviene una prueba que
  fije que el título no se trunca a 390 px.

## FAB que encoge (T193c)

- [ ] `useShrinkOnScroll`: encoge al bajar, vuelve al subir, y no reacciona dentro de la
  zona superior ni a desplazamientos por debajo del umbral.
- [ ] El FAB encogido **no** baja del mínimo táctil (44 iOS / 48 Android). Es la garantía
  que justifica la escala elegida y la que se rompería al retocar el tamaño a ojo.
- [ ] Con movimiento reducido cambia de tamaño sin transición.

## Captura de ítems (T200)

- [ ] `ItemComposer`: al confirmar limpia el campo y **conserva el foco**; con el campo
  vacío se cierra en vez de agregar algo en blanco. Es el comportamiento del que depende
  capturar de corrido y el más fácil de romper sin darse cuenta.
- [ ] Agregar dentro de una sección deja el ítem en esa sección, no al final de la lista.
- [ ] Mover un ítem entre secciones desde la hoja de edición.
- [ ] Eliminar pide confirmación y el mensaje distingue palomear de eliminar.
- [ ] El lápiz de cada renglón no queda anidado dentro del Pressable de la fila.

## Franja de pendientes del día (T201)

- [ ] Sin pendientes del día la franja **no se dibuja** (no una franja vacía que robe alto).
- [ ] Un ítem con fecha y **con hora** sigue en la franja y no aparece en la rejilla. Es la
  regla que define el módulo y la que se rompería al "mejorar" la integración.
- [ ] Palomear desde la franja marca la misma fila que en su lista.
- [ ] `useListItemsByDate` con el día como `YYYY-MM-DD`, no como ISO.

## Vencidos y filtro de listas (T205, T206)

- [ ] `listOverdue` excluye lo ya palomeado y lo de listas archivadas, y ordena de más
  viejo a más reciente.
- [ ] Los vencidos **no** se muestran al abrir un día que no es hoy.
- [ ] `rescheduleItems` mueve todos los indicados y no toca el resto.
- [ ] `hasActiveFilters` es verdadero con `onlyListItems` aunque no haya dimensión ni tema
  —si no, el punto del botón de filtros no se enciende y el filtro queda invisible.
- [ ] `applyFilters` ignora `onlyListItems`: recibe actividades y devuelve actividades.

## Migración de Lists (T195)

- [ ] Ampliar `supabase/tests/rls.sql`: con dos usuarios, que B no vea ni toque las listas,
  secciones ni elementos de A. Es la garantía que sostiene todo el módulo.
- [ ] Que `can_edit_list` no sea ejecutable por `anon`.
- [ ] `listByDateRange` y `listOverdue` excluyen las listas archivadas por el join.
- [ ] `duplicate` en Supabase remapea las secciones y copia solo los pendientes, igual que
  el demo. Son dos implementaciones del mismo contrato y es donde más fácil divergen.
- [ ] El check de `completed_at`/`completed_by`: palomear sin usuario debe fallar.

## Alta estilo Keep (T207)

- [ ] "+" crea y navega sin pantalla intermedia, con el título enfocado.
- [ ] Al salir, una lista intacta se borra; una con nombre cambiado **o** con un elemento,
  no. Es la regla que evita basura sin tragarse trabajo de nadie.
- [ ] El título guarda al perder el foco y se repone si se deja vacío.
- [ ] Cambiar color o icono desde la paleta se refleja en la tarjeta del inicio.

## Fechas en elementos (T212)

- [ ] Quitar el día quita también la hora.
- [ ] Un elemento con fecha pasada **ya palomeado** no se pinta como vencido.
- [ ] La fecha viaja como `YYYY-MM-DD` y no como instante, en las dos implementaciones.
- [ ] Un elemento al que se le pone la fecha de hoy aparece en la franja del día.

## Recordatorios de elementos de lista (T215)

- [ ] `syncNotifications` recibe actividades **y** elementos juntos: la prueba clave es que
  programar unos no cancele los otros, que es justo lo que pasaría llamándola por fuente.
- [ ] Un elemento con fecha y **sin** hora no programa nada.
- [ ] Un elemento ya palomeado no programa nada.
- [ ] La hora se interpreta como local, no como UTC.

## Buscar y reordenar (T213, T214, T216)

- [ ] **La más importante**: el backend demo no devuelve referencias vivas de su almacén.
  Mutar lo devuelto no debe cambiar lo guardado. Es la prueba que habría atrapado T216.
- [ ] `search` con menos de dos letras no consulta.
- [ ] `search` encuentra elementos ya palomeados.
- [ ] En Supabase, buscar "50%" no trae de más: `%` y `_` van escapados.
- [ ] Subir/bajar solo permuta dentro del grupo y los extremos van deshabilitados.
- [ ] El intercambio lee ambos `sort_order` antes de escribir.

## Pendientes en el calendario y áreas táctiles (T217, T218)

- [ ] **La que más importa**: un pendiente con fecha **no** aparece en las vistas de horas
  (día, 3 días, semana). Es la regla que define el módulo y la más fácil de romper al
  "mejorar" la integración.
- [ ] En mes, el chip de un pendiente no pinta hora aunque el elemento tenga `due_time`.
- [ ] `isDerivedActivity` reconoce el prefijo de pendientes: no se pueden editar ni compartir
  como actividades.
- [ ] Tocar el texto de un elemento abre la edición y **no** lo palomea.

## Compartir listas (T219-T221)

- [ ] **La más importante**: ampliar `supabase/tests/rls.sql`. Con tres usuarios, que quien
  tiene permiso de *ver* no pueda escribir, que quien no tiene acceso no vea nada, y que
  nadie salvo el dueño pueda borrar la lista.
- [ ] Compartir solo funciona con contactos aceptados (`are_connected` en el `with check`).
- [ ] Retirar el acceso no borra contenido.
- [ ] **Ninguna implementación usa `this`.** Es la prueba que habría atrapado T221 y que
  seguirá atrapándolo: la fachada desprende los métodos del objeto.
- [ ] `sharedWithMe` no devuelve listas archivadas ni las propias.

## Tiempo real en listas (T222)

- [ ] Que las cuatro tablas de listas estén en la lista vigilada y que `['lists']` esté en
  la invalidación: son dos listas que se editan a mano y es fácil agregar una tabla nueva a
  una y olvidarla en la otra.
- [ ] Verificación manual con dos sesiones: A palomea un elemento y B lo ve sin recargar.
- [ ] Comprobar en el proyecto real que las tablas quedaron en `supabase_realtime`
  (`select * from pg_publication_tables where pubname = 'supabase_realtime'`).

## Recordatorio con desfase (T223)

- [ ] Un elemento **sin** recordatorio no programa nada, aunque tenga hora.
- [ ] Con hora y "2 días antes", el aviso cae dos días antes **a esa hora**.
- [ ] Sin hora y "2 días antes", el aviso cae dos días antes a las 9:00.
- [ ] Quitar la fecha deja el recordatorio sin efecto (no hay de qué contar hacia atrás).

## Arrastrar elementos (T225)

- [ ] `destinoDe` con filas de **alturas distintas**: es toda la razón de medirlas y donde
  un error se ve como "lo solté aquí y cayó allá".
- [ ] Arrastrar menos de media fila no cambia nada.
- [ ] El orden nuevo cae entre los vecinos del destino y no pisa a ninguno.
- [ ] Tocar sin mantener sigue abriendo la edición, no arrastra.
- [ ] Verificación manual en teléfono: el arrastre no pelea con el scroll de la pantalla.

## Etiquetas (T211)

- [ ] `createTag` con un nombre que ya existe devuelve la existente y no duplica, sin
  importar mayúsculas.
- [ ] Borrar una etiqueta no borra ninguna lista.
- [ ] RLS: B no ve las etiquetas de A ni sus vínculos, **aunque comparta la lista**. Es lo
  que sostiene que etiquetar sea de quien mira.
- [ ] `tag_ids` solo trae las etiquetas propias en una lista compartida.
- [ ] Con una etiqueta activa, "Fijadas" solo muestra las fijadas de esa etiqueta.

## Arrastrar tarjetas del inicio (T226, T227)

- [ ] **La que más importa**: soltar tras arrastrar **no** dispara el toque. Ya falló una
  vez sin que se notara, porque la prueba miraba el orden y no lo que se había abierto.
- [ ] Un toque largo **sin mover** sigue comportándose como toque: la guarda solo se activa
  si hubo movimiento real.
- [ ] `destinoDe` de la rejilla con filas de alturas distintas y con una última fila
  incompleta (soltar en el hueco vacío cae al final).
- [ ] Las listas compartidas conmigo no se pueden arrastrar.

## Arrastrar entre secciones (T228)

- [ ] `soltarEn` resuelve la sección por el encabezado que queda **por encima**, incluida la
  zona sin agrupar cuando no hay ninguno.
- [ ] El orden nuevo se calcula entre vecinos **de la sección de destino**, no de la de
  origen. Es el error silencioso más probable aquí.
- [ ] Soltar justo debajo del campo de captura de una sección cae en esa sección, no en la
  siguiente.
- [ ] Encabezados y campos de captura no se pueden arrastrar pero sí cuentan para medir.

## Crear listas (T229)

- [ ] **La que faltaba**: crear, escribir el nombre y salir **sin confirmar** conserva la
  lista. Es la carrera entre el guardado y la limpieza, y se veía como "el botón no sirve".
- [ ] Crear y salir sin tocar nada sigue sin dejar una lista vacía.
- [ ] Agregar solo un elemento (sin nombrar la lista) también la conserva.
- [ ] Un fallo al crear muestra mensaje.

## Políticas de lectura e INSERT ... RETURNING (T231)

- [ ] **La prueba que faltaba**: crear una lista contra un Postgres real con RLS. Toda la
  verificación corre en modo demo, que no tiene políticas, así que este fallo era invisible
  por construcción. Vale para las seis tablas del módulo.
- [ ] Ninguna política de SELECT depende de una función que consulte su propia tabla.
- [ ] Un 42501 distingue en la app entre sesión caducada y operación ajena.

## Listas que se repiten (T208, T209)

- [ ] `occursOn` con DAILY, WEEKLY con y sin `byDay`, MONTHLY en meses sin ese día, y
  respetando `until`.
- [ ] `graciaVencida`: una vuelta de ayer sigue viva antes de las 15:00 y caduca después.
  Es la regla que decide si algo cuenta como hecho.
- [ ] `syncRuns` cierra lo caducado con los conteos correctos, abre la de hoy solo si la
  regla cae hoy, y no duplica la vuelta al llamarse dos veces.
- [ ] Palomear en la vuelta de ayer suma a ayer y no a hoy.
- [ ] En una rutina, los elementos palomeados **no** se mueven a completados.
- [ ] Demo y Supabase dan el mismo resultado para la misma regla y la misma fecha.

## Resúmenes de rutina (T210)

- [ ] `resumirVueltas` cuenta como completa solo si `completed_count >= total_count` y
  `total_count > 0`: una vuelta sin elementos no es un éxito.
- [ ] Ignora las vueltas vacías para el promedio pero las cuenta como registradas.
- [ ] **La que importa de verdad**: que el resumen no devuelva porcentaje de incumplimiento
  ni racha. Es una decisión de producto que una prueba puede proteger de un "mejor así".

## Fecha de la lista completa (T232)
- [ ] `lists.due_date` sobrevive a `update` en los dos backends (demo y Supabase) sin tocar
  `due_date` de los elementos. Es la confusión obvia: dos columnas con el mismo nombre en
  tablas distintas.
- [ ] La X bajo el título la quita (`due_date: null`) y la línea desaparece.
- [ ] Con fecha pasada, la línea va en `theme.today`.
- [ ] El subtítulo de la tarjeta la muestra al final, también cuando la lista está vacía.

## Días de la semana en la repetición (T232b)
- [ ] Tocar L, M y J deja `FREQ=WEEKLY;BYDAY=MO,WE,TH` y la hoja los muestra prendidos al
  reabrirse (se leen de la regla guardada, no de un estado aparte).
- [ ] Apagar el último día quita la repetición en vez de dejar una regla sin días.

## Hoy y Algún día (T233, T234)
- [ ] `listUndated` deja fuera los elementos de listas que se repiten, los archivados y los
  ya palomeados, en **los dos** backends. Es la regla que más fácil se cae al tocar la
  consulta de Supabase, porque el filtro va sobre la tabla unida (`lists.recurrence_rule`).
- [ ] "Pasar todo a hoy" mueve todos los vencidos y deja el grupo "Atrasado" vacío.
- [ ] Ponerle día a un elemento desde Algún día lo saca de la bandeja y lo mete en Hoy si la
  fecha es hoy.
- [ ] El número del acceso "Hoy" no cuenta lo ya palomeado.
- [ ] Con todo agendado, Algún día muestra su estado vacío y no una lista de grupos vacíos.

## Rutinas en el calendario e inicio/fin (T235 – T237)
- [ ] `rutinasEnRango`: una regla de lunes a viernes da cinco días en una semana, ninguno
  antes de `recurrence_start` ni después del `UNTIL`; una lista archivada no da ninguno.
- [ ] El avance sale de la vuelta cerrada si la hay (conteos congelados) y de la abierta si
  no; sin vuelta es 0/total. Nunca pasa de total aunque se haya borrado algo palomeado.
- [ ] `listRunsByDateRange` no abre ni cierra vueltas (comparar filas antes y después).
- [ ] Cambiar de "todos los días" a chips de días conserva el inicio y el fin.
- [ ] Un fin anterior al inicio se empuja al inicio.
- [ ] En web ≥ 900 px y vista diaria aparece el panel y **no** la franja; a 899 px, al revés.
- [ ] Tocar un chip de rutina o de pendiente en la agenda abre su lista.

## Fitness v2 · G3 logger en vivo (T243)
Ya cubierto con pruebas al escribirlo: `lib/gym/{sets,session,tools,outbox}` y la pantalla
`workout/[id]` (registro, ✓, + Serie, teclado, + Drop, tipo, borrar con deshacer, terminar,
descartar, lectura). Falta:
- [ ] `useSetActions` / `flushOutbox`: un envío que falla deja la serie pendiente y se
  reintenta a los 10 s; al volver la app al frente se reenvía; dos cambios durante un envío
  no se pierden.
- [ ] `useLegacyConversion`: convierte, liga al catálogo solo coincidencias únicas, marca
  convertido; si falla a la mitad, la siguiente vez termina sin duplicar.
- [ ] `exerciseHistory` en los dos backends: por `exercise_id` y, sin ligar, por nombre exacto;
  sin sesiones borradas ni descartadas; ordenado por fecha de la sesión.
- [ ] `gym-store`: el descanso se calcula desde `endsAt`; ±15 s reprograma el aviso; uno
  terminado mientras la app estaba cerrada no aparece al hidratar.
- [ ] `RestTimerBar`: al llegar a 0 avisa y se va solo a los 8 s.
- [ ] `NumpadSheet`: la primera tecla reemplaza y las siguientes agregan (bug encontrado a
  mano: 1-0-0 daba 0); modo contador; "Siguiente" peso → reps → esfuerzo.
- [ ] `ExerciseBlock`: columnas I/D en unilaterales y aviso de desbalance; etiqueta C/F/T…
  por tipo; el calentamiento no cuenta en la numeración.
- [ ] Detalle del ejercicio: mejor serie, peso máximo, gráficas con 1 y con 2+ sesiones.
- [ ] Ajustes de gimnasio en Perfil.
- [ ] Manual en nativo (Android): swipe izquierda/derecha, vibración, notificación de fin de
  descanso con la pantalla bloqueada.

## Fitness v2 · G4 edición (T244)
Probado a mano en el demo (sesión "Pierna"): drop → separar → deshacer ×2 → rehacer → unir →
mover a otro ejercicio → duración y hora → "editado" en encabezado e historial. Falta:
- [ ] `splitSet` / `mergeSets`: ids nuevos, órdenes entre vecinos, intensificadores que se
  quitan o se agregan, la unida queda hecha si cualquiera lo estaba.
- [ ] `useEditHistory`: `batch` agrupa en un paso; deshacer en orden inverso; una acción nueva
  borra lo que se podía rehacer; tope de 50 pasos.
- [ ] `applyOutbox` con una serie movida a otro ejercicio: sale de uno y aparece en el otro.
- [ ] La sesión se marca editada una sola vez por visita y nunca en una sesión en curso.
- [ ] Duración: `ended_at − performed_at` en los dos backends; suma por ejercicio solo sin
  `ended_at`; el caché de `updateExercise` no la pisa.
- [ ] Cambiar la hora corre también `ended_at`.

## Fitness v2 · G5 intensificadores (T245)
Probado a mano en el demo: 21s + tempo sobre una serie, fallo en Detalles, superserie A1/A2
(sin descanso tras A1, descanso de ronda tras A2), pirámide en otro ejercicio, EMOM con su
timer corriendo. Falta:
- [ ] `applyIntensifier` para cada una de las 24 claves (tramos, tipos, descansos, tempo) y
  que aplicar dos veces no duplique la etiqueta.
- [ ] `removeIntensifier` quita solo los tramos que trajo y devuelve el principal a `main`.
- [ ] `protocolSets` para los 14 protocolos: número de series, objetivos, pesos redondeados,
  tipos (top set / back-off / fallo).
- [ ] `unusualCombination`: cada aviso y ningún falso positivo en una serie normal.
- [ ] `createGroup` / `removeGroup` en los dos backends: posiciones contiguas en el lugar del
  primero, `group_position` en orden, desagrupar conserva las series.
- [ ] Descanso en grupos: solo al terminar el último del grupo y con `rest_after_round_sec`.
- [ ] `IntervalTimerSheet`: fases trabajo/descanso, rondas, fin; calcula desde el inicio.
- [ ] `SetDetailsSheet`: lb ↔ kg en lastre/asistencia/cadenas; vacío no guarda `load_mods`.

## Fitness v2 · G6 notas (T246)
Probado a mano en el demo: energía 4, pump 3 y dos etiquetas en una sesión en curso; nota fija
y nota de hoy en un ejercicio; nota con etiquetas en una serie; las tres se ven en el logger y
en modo lectura; buscar "rodilla" y "lenta" encuentra la nota correcta y abre la sesión; un
término sin coincidencias muestra el vacío. Falta:
- [ ] `searchNotes` en los dos backends: los tres niveles, mínimo dos letras, sin borrados ni
  descartados (sesión, ejercicio o serie), orden de lo más reciente a lo más viejo, y que `%`
  y `_` se busquen literales en Supabase.
- [ ] `update` de la sesión escribe el parche en el caché al momento: dos chips seguidos no se
  pisan.
- [ ] `saveStickyNote`: optimista en las preferencias; vacío guarda `null`; solo para
  ejercicios del catálogo.
- [ ] `NoteSheet`: guarda texto recortado (vacío → `null`) y etiquetas; cerrar sin guardar
  descarta.
- [ ] `Chip` seleccionado sin color usa `onInk` (antes: blanco sobre tinta clara en oscuro).

## Fitness v2 · G7 Modo Gymrat (T247)
Probado a mano en el demo con el reloj del navegador en el 21 oct: tarjeta de pausa por la
semana del 5 oct, "Viaje" + nota + "Mi racha sigue" → 2 semanas; trato "Reina" en Perfil;
100 kg × 5 en banca → resumen con "Listo, mi reina…", equivalencia, músculos y logro Club 100 kg;
Progreso con racha, semana justificada en el calendario, series por músculo y logros; otra
sesión con 105 kg → badge de PR y "Nuevo récord. Así se gobierna, mi reina." Falta:
- [ ] `computeStreak`: semana actual vacía no rompe; hueco sin decidir pausa y congela; "sigue"
  no suma ni rompe; "reiniciar" pone en cero; huecos antes de `STREAK_SINCE` reinician sin
  preguntar; mejor racha. (Siete casos ya revisados a mano en Node.)
- [ ] `computeAchievements` / `unlockedBy`: cada meta, warmups y series sin marcar no cuentan,
  clubes solo con barra y reps ≥ 1, el nombre del drop sigue el trato, la racha no se atribuye
  a una sesión.
- [ ] `setsByGroup`: primario 1, secundario ½, sin doble conteo; `isLegDay` con 6 series.
- [ ] `gymratLine`: nunca la misma frase dos veces seguidas; `null` en Modo serio; `{voc}` por
  trato. `tonnageEquivalence`: rango 2–30, semilla estable, nada bajo 140 kg.
- [ ] `trainingLog` y `saveStreakEvents` en los dos backends (solo `completed`, sin borradas;
  upsert por semana).
- [ ] Modo serio: sin snackbars de humor, sin animación del badge, sin equivalencia ni frase
  en el resumen, sin "¿y la pierna?".

## Fitness v2 · G8 calidad y dependencias nativas (T248)
Probado a mano en el demo (web): descanso con pitidos en 3-2-1 y al terminar (4 sonidos),
chip "Energía 3 de 5" encontrado por su etiqueta accesible, "Compartir" del resumen genera la
imagen y, sin hoja de compartir del navegador, la descarga (`kavi-2026-10-21.png`). Falta:
- [ ] **Antes de correr Jest:** mocks de `expo-haptics`, `expo-audio`, `expo-sharing` y
  `react-native-view-shot` en `jest.setup.js`.
- [ ] `playSound`: crea un reproductor por sonido una sola vez; un error de audio no rompe.
- [ ] `RestTimerBar`: pita en 3, 2 y 1; al terminar suena y vibra solo si terminó hace menos
  de 3 s (abrir la app con un descanso viejo no suena); sin sonido si `timerSound` es falso.
- [ ] `IntervalTimerSheet`: pitido por fase y aviso distinto al final.
- [ ] `shareImage`: nativo con `expo-sharing`; web con `navigator.share` de archivos o
  descarga; `SessionSummarySheet` cae a texto si la captura falla.
- [ ] `Chip`: `accessibilityLabel` opcional y área táctil de 44 con `hitSlop`.
- [ ] Prueba en dispositivo: háptico en iOS (no hay Xcode en esta máquina) y en Android.

## Arrastrar para reordenar (T250)
Probado a mano en el demo (web): la serie 3 arrastrada hasta arriba queda primera
(40 · 20 · 30), soltar no abre el menú y un toque corto sí; en "Reordenar ejercicios" el
segundo pasa a primero y "Guardar orden" lo aplica en la sesión. Falta:
- [ ] `ReorderableColumn`: destino según centros con filas de alto distinto; las demás se
  recorren el alto de la arrastrada; soltar en el mismo lugar no llama `onMove`; cancelar
  restaura; `justDragged` evita abrir el menú al soltar.
- [ ] `moverSerie`: `sort_order` entre los nuevos vecinos (arriba, en medio, al final) y se
  puede deshacer.
- [ ] `reordenarEjercicios`: solo guarda las posiciones que cambiaron; el caché se reordena al
  momento; marca la sesión como editada.
- [ ] En dispositivo (iOS y Android): mantener presionado no pelea con el deslizar de la fila
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
- [ ] `useGymProgress.sessions`: excluye sesiones futuras y las que tienen series pero
  ninguna marcada; incluye las de v1 sin series.
- [ ] Logger tras extraer `set-editing.ts`: el teclado, "Siguiente" y el esfuerzo se
  comportan igual que antes.

## Variante del drop mecánico (T252)
Probado a mano en el demo: press inclinado con barra → "Drop mecánico" abre "Variante del
drop" con press plano y declinado con barra primero; elegir plano lo muestra en el tramo;
tocar el tramo → "Buscar en todo el catálogo" → declinado lo reemplaza. Falta:
- [ ] `suggestVariants`: mismo grupo y mecánica; sin equipo ni patrón en común no entra; el
  mismo equipo gana; lo mejor de cada familia primero; excluye el propio y los archivados.
- [ ] Logger: aplicar `mechanical_drop` abre la hoja en el último tramo `drop`; "Sin
  variante" la quita; se puede deshacer.

## Ocurrencia borrada que reaparecía (T249)
Reproducido antes de arreglar con un script suelto sobre el backend demo (serie lunes a
viernes de 3 semanas, luego `extendRecurrenceHorizon`): fallaban 3 de 6 casos y tras el
arreglo pasan los 6. Migración probada en PGlite (columna, RLS, idempotente) y aplicada en
producción. Falta convertir esos casos en pruebas del repo (demo y Supabase):
- [ ] Borrar la última ocurrencia de una serie con fin: no reaparece al reabrir el
  calendario (el caso del reporte).
- [ ] Borrar una de en medio: no reaparece.
- [ ] Mover la última a otro día (antes o después): su día original no se recrea.
- [ ] Cambiar solo la hora de la última (más tarde o más temprano): no se duplica.
- [ ] Borrar la madre: la heredera conserva `recurrence_exdates`.
- [ ] Editar toda la serie (incluso cambiando la hora): los días excluidos siguen excluidos.
- [ ] `missingOccurrences` y `withExdate` en `lib/recurrence.ts`.

## Colores de los Nobi (T202)
Migración de datos probada en PGlite (las dos paletas viejas, minúsculas, un color
personalizado intacto, idempotente) y aplicada en producción. Visto en el demo: el menú
"Tu color" muestra los 21 por familias y los oscuros con contorno; la pestaña "Tú" con azul
marino se distingue. `people-colors.test.ts` ya se ajustó a la regla nueva (sin correrlo).
Falta:
- [ ] Correr `people-colors.test.ts` y `nobi.test.ts` con los cambios.
- [ ] `ColorSwatch`: palomita oscura sobre rosa, amarillo, lima y blanco; contorno solo
  cuando el color no llega a 3:1 contra la hoja.
- [ ] `lowContrastOutline` en bloque, chip y punto del mes, y en la agenda.
- [ ] `currentColor` en el color propio guardado en el dispositivo y en el formulario de
  una lista vieja.

## Paleta de personas v3 (vibrante sin chillar)
Reajuste en OKLCH tras T202: los 21 pasan 3:1 sobre `#131313` y `#1A1A1A`, par más cercano
a 16.5. Migración v3 probada en PGlite (las tres paletas anteriores, personalizado intacto,
idempotente) y aplicada en producción. Visto en el demo: menú "Tu color" y pestaña "Tú".
Falta:
- [ ] `people-colors.test.ts`: que ningún color necesite contorno sobre el fondo y las hojas
  del tema oscuro; que `currentColor` traduzca las tres paletas anteriores.
