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
