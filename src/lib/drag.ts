/**
 * A dónde cae lo que se arrastra (spec 10, T225 – T228; spec 07 v2, RF-F33). Funciones puras para
 * poder probarlas: los componentes miden y aquí se decide.
 */

/**
 * A cuántos lugares equivale un desplazamiento vertical en una lista de filas de alto distinto.
 *
 * Se avanza fila por fila sumando alturas reales hasta cubrir la distancia recorrida, y se salta
 * a la siguiente cuando se pasa de su mitad: es el punto en que el hueco ya se ve del otro lado y
 * soltar ahí es lo que la persona espera.
 */
export function destinoEnFilas(alturas: readonly (number | undefined)[], desde: number, dy: number, total: number, separacion = 0): number {
  /*
   * Hacia abajo y hacia arriba van por separado. Antes eran dos ciclos seguidos y, tras saltar
   * a la siguiente fila, lo que sobraba (negativo) hacía que el segundo ciclo regresara: con una
   * fila más alta debajo (una con nota) había que arrastrar casi tres cuartos de ella para que
   * se moviera un lugar, en vez de la mitad.
   */
  let i = desde;
  let restante = Math.abs(dy);
  const paso = dy > 0 ? 1 : -1;
  while (restante > 0 && i + paso >= 0 && i + paso <= total - 1) {
    const alto = (alturas[i + paso] ?? 0) + separacion;
    if (restante < alto / 2) break;
    restante -= alto;
    i += paso;
  }
  return i;
}

/**
 * Destino en una rejilla (las tarjetas del inicio de Listas): la columna sale del desplazamiento
 * horizontal y la fila, igual que en una lista, de las alturas de cada fila.
 */
export function destinoEnRejilla(opciones: {
  desde: number;
  dx: number;
  dy: number;
  columnas: number;
  total: number;
  anchoCelda: number;
  separacion: number;
  alturasFila: readonly (number | undefined)[];
}): number {
  const { desde, dx, dy, columnas, total, anchoCelda, separacion, alturasFila } = opciones;
  if (anchoCelda === 0) return desde;
  const filas = Math.ceil(total / columnas);
  const colActual = desde % columnas;
  const col = Math.min(columnas - 1, Math.max(0, colActual + Math.round(dx / (anchoCelda + separacion))));
  const fila = destinoEnFilas(alturasFila, Math.floor(desde / columnas), dy, filas, separacion);
  // La última fila puede estar incompleta: soltar en su hueco vacío es soltar al final.
  return Math.min(total - 1, fila * columnas + col);
}

/**
 * Para la columna de series del logger: el destino es cuántas filas quedan con el centro por
 * encima del centro de la arrastrada. Corre en el hilo de la interfaz (Reanimated).
 */
export function destinoPorCentros(medidas: readonly ({ y: number; h: number } | undefined)[], index: number, dy: number): number {
  'worklet';
  const propia = medidas[index];
  if (!propia) return index;
  const centro = propia.y + propia.h / 2 + dy;
  let t = 0;
  for (let i = 0; i < medidas.length; i++) {
    const otra = medidas[i];
    if (i !== index && otra && otra.y + otra.h / 2 < centro) t += 1;
  }
  return t;
}

/** Lo que hay en la columna del detalle de una lista, en orden. */
export type EntradaDeLista =
  | { kind: 'item'; item: { id: string; section_id: string | null; sort_order: number } }
  | { kind: 'header'; sectionId: string }
  | { kind: 'composer'; sectionId: string | null };

/**
 * Dónde cayó un elemento en el detalle de una lista (T228): en qué sección y con qué orden.
 *
 * La sección es la del encabezado que quede **por encima** del destino —un campo de captura
 * marca el final de su grupo—; si no hay ninguno, la zona sin agrupar. El orden es el punto medio
 * entre los elementos de **esa** sección justo antes y justo después.
 */
export function ubicarSoltado(entradas: readonly EntradaDeLista[], from: number, to: number): { sectionId: string | null; sortOrder: number } | null {
  const origen = entradas[from];
  if (!origen || origen.kind !== 'item') return null;
  const sin = entradas.filter((_, i) => i !== from);
  const destino = Math.min(sin.length, Math.max(0, to));

  let sectionId: string | null = null;
  for (let i = destino - 1; i >= 0; i--) {
    const e = sin[i];
    if (e?.kind === 'header' || e?.kind === 'composer') {
      sectionId = e.sectionId;
      break;
    }
  }

  const mismos = (e: EntradaDeLista | undefined) => (e?.kind === 'item' && (e.item.section_id ?? null) === sectionId ? e.item : null);
  let antes: { sort_order: number } | null = null;
  for (let i = destino - 1; i >= 0 && !antes; i--) antes = mismos(sin[i]);
  let despues: { sort_order: number } | null = null;
  for (let i = destino; i < sin.length && !despues; i++) despues = mismos(sin[i]);

  const sortOrder =
    antes && despues ? (antes.sort_order + despues.sort_order) / 2 : antes ? antes.sort_order + 1024 : despues ? despues.sort_order / 2 : 1024;
  return { sectionId, sortOrder };
}
