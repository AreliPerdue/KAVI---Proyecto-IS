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
