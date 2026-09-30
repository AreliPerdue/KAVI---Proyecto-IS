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
