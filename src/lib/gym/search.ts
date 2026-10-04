import type { Exercise } from '@/types/domain';

/**
 * Búsqueda de ejercicios (RF-F22).
 *
 * Tolerante a acentos, mayúsculas, alias y slang: "rdl", "jalon", "banca" y "vuelos
 * posteriores" encuentran lo que la persona tiene en la cabeza. Todo en el cliente: el
 * catálogo cabe entero en memoria (~530 filas) y buscar no debe esperar a la red.
 *
 * Orden: recientes > favoritos > qué tan bien coincide. Quien entrena repite sus
 * ejercicios, así que lo último que usó es casi siempre lo que busca.
 */

/** Minúsculas, sin acentos, sin signos y con un solo espacio. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Texto ya normalizado por ejercicio, para no recalcularlo en cada tecla. */
export type SearchIndex = Map<string, { nombre: string; ingles: string; alias: string[] }>;

export function buildSearchIndex(exercises: readonly Exercise[]): SearchIndex {
  return new Map(
    exercises.map((e) => [e.id, { nombre: normalizar(e.name_es), ingles: normalizar(e.name_en ?? ''), alias: e.aliases.map(normalizar) }]),
  );
}

/**
 * Qué tan bien coincide un ejercicio con la búsqueda; 0 = no coincide.
 *
 * - 100: el nombre o un alias es exactamente lo buscado ("rdl").
 * - 80: el nombre o un alias empieza con lo buscado ("sentad").
 * - 60: alguna palabra de un alias empieza con lo buscado.
 * - 50: alguna palabra del nombre empieza con lo buscado ("muerto" → "Peso muerto…").
 * - 30: cada palabra de la búsqueda es el inicio de alguna palabra, en cualquier orden
 *   ("curl martillo polea" encuentra "Curl martillo en polea con cuerda").
 * - El inglés cuenta un poco menos que el español: la app está en español.
 *
 * Las coincidencias parciales tienen que **empezar una palabra**. Buscar dentro de las
 * palabras hacía que "rdl" encontrara "hu*rdl*e hops" (saltos con vallas): con búsquedas
 * cortas, casi todo contiene casi todo.
 */
export function scoreMatch(q: string, entrada: { nombre: string; ingles: string; alias: string[] }): number {
  if (!q) return 0;
  const { nombre, ingles, alias } = entrada;
  if (nombre === q || alias.includes(q)) return 100;
  if (ingles === q) return 95;
  if (nombre.startsWith(q) || alias.some((a) => a.startsWith(q))) return 80;
  if (ingles.startsWith(q)) return 75;
  if (alias.some((a) => iniciaPalabra(a, q))) return 60;
  if (iniciaPalabra(nombre, q)) return 50;
  if (iniciaPalabra(ingles, q)) return 45;
  const palabras = q.split(' ').filter(Boolean);
  if (palabras.length > 1) {
    const todo = `${nombre} ${ingles} ${alias.join(' ')}`;
    if (palabras.every((p) => iniciaPalabra(todo, p))) return 30;
  }
  return 0;
}

/** ¿Empieza alguna palabra de `texto` con `q`? Ambos ya normalizados. */
function iniciaPalabra(texto: string, q: string): boolean {
  return ` ${texto}`.includes(` ${q}`);
}

/**
 * ¿Lo escrito ya es el nombre (o un alias) exacto de un ejercicio? Si lo es, no tiene
 * sentido ofrecer crearlo como personalizado.
 */
export function isExactExercise(query: string, index: SearchIndex): boolean {
  const q = normalizar(query);
  if (!q) return true;
  for (const x of index.values()) if (x.nombre === q || x.ingles === q || x.alias.includes(q)) return true;
  return false;
}

export type SearchOptions = {
  /** Ids del más reciente al menos reciente. */
  recentIds?: readonly string[];
  favoriteIds?: ReadonlySet<string>;
  limit?: number;
};

/**
 * Busca y ordena. Sin búsqueda devuelve recientes y favoritos primero y luego el resto en
 * orden alfabético, que es lo que se quiere ver al abrir el selector.
 */
export function searchExercises(
  exercises: readonly Exercise[],
  query: string,
  index: SearchIndex = buildSearchIndex(exercises),
  { recentIds = [], favoriteIds = new Set(), limit }: SearchOptions = {},
): Exercise[] {
  const q = normalizar(query);
  const reciente = new Map(recentIds.map((id, i) => [id, i]));
  const conPuntaje = exercises
    .map((e) => ({ e, score: q ? scoreMatch(q, index.get(e.id) ?? { nombre: '', ingles: '', alias: [] }) : 1 }))
    .filter((x) => x.score > 0);

  conPuntaje.sort((a, b) => {
    const ra = reciente.get(a.e.id);
    const rb = reciente.get(b.e.id);
    if (ra !== undefined || rb !== undefined) {
      if (ra === undefined) return 1;
      if (rb === undefined) return -1;
      if (ra !== rb) return ra - rb;
    }
    const fa = favoriteIds.has(a.e.id) ? 1 : 0;
    const fb = favoriteIds.has(b.e.id) ? 1 : 0;
    if (fa !== fb) return fb - fa;
    if (a.score !== b.score) return b.score - a.score;
    return a.e.name_es.localeCompare(b.e.name_es, 'es');
  });

  const resultado = conPuntaje.map((x) => x.e);
  return limit ? resultado.slice(0, limit) : resultado;
}

/**
 * Liga un nombre libre de v1 a un ejercicio del catálogo (RF-F63).
 *
 * Solo si la coincidencia es **única y exacta** (nombre o alias, sin acentos): "Sentadilla"
 * es alias de un solo ejercicio y se liga; "Press" coincide con muchos y no se adivina.
 * Lo que no se liga se queda como nombre libre, que sigue siendo válido.
 */
export function matchCatalog(nombreLibre: string, exercises: readonly Exercise[], index: SearchIndex = buildSearchIndex(exercises)): Exercise | null {
  const q = normalizar(nombreLibre);
  if (!q) return null;
  const exactos = exercises.filter((e) => {
    const x = index.get(e.id);
    return !!x && (x.nombre === q || x.ingles === q || x.alias.includes(q));
  });
  return exactos.length === 1 ? exactos[0] : null;
}
