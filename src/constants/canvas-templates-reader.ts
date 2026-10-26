import { plantillasDeJournal } from '@/constants/canvas-templates';
import { type NombreDeAsset } from '@/constants/canvas-assets';
import { animo, asset, calificacion, cancion, documento, fecha, linea, lista, type Pieza, texto, type Textos } from '@/constants/canvas-template-kit';
import { type DocumentoDeLienzo, type ElementoDeLienzo, PROPORCION_DE_DATO, PROPORCION_DE_MUESTRA, PROPORCION_DE_POLAROID } from '@/lib/library/canvas';
import { ESTE_LIBRO, type PlantillaDeLienzo } from '@/lib/library/canvas-templates';
import type { DatoDeBiblioteca } from '@/lib/library/journal-stats';

/**
 * "Yo como lector" (spec 13h, RF-CC21; T374, T376): las páginas sobre quien lee, no sobre un libro, en recortes y en el
 * Journal. Las seis que ya había en el Journal y trece más a partir de los journals lectores más comunes.
 *
 * **Como las de Pinterest (T376, pedido de Areli del 26 oct 2026: "más bonitas, más KAVI"):** cada una trae su paleta
 * suave (papel de fondo, tinta y tres acentos), papeles encimados y girados con cintas en las esquinas, una mancha suave
 * de fondo (el blob de los Nobi), título manuscrito, etiquetas con serifa y doodles en tinta. Todo se cambia después
 * ("Colores de la página"). Sus libros son **por elegir** (en un recorte no se vuelven el libro del recorte).
 */

/** Las de "yo como lector" que ya estaban en el Journal: salen de esa fila para no repetirse. */
export const DEL_JOURNAL_A_LECTOR = ['kavi/get-to-know', 'kavi/reading-eras', 'kavi/reading-year', 'kavi/reading-stats', 'kavi/reading-awards', 'kavi/year-goal'] as const;

/** Las paletas, de Pinterest: papel, tinta y tres acentos (el primero, el de las manchas de fondo). */
type Paleta = { papel: string; tinta: string; acentos: readonly [string, string, string] };
export const PALETAS_DE_LECTOR = {
  rosa: { papel: '#F8F0EB', tinta: '#4A3A3C', acentos: ['#EBC1C2', '#F3D9C8', '#BFC9AF'] },
  salvia: { papel: '#F1F3EB', tinta: '#38433A', acentos: ['#C4D1B2', '#EBDFC8', '#DDB1AA'] },
  lavanda: { papel: '#F4F1F8', tinta: '#3E3850', acentos: ['#CEC4E6', '#F3DAE2', '#C3DCEA'] },
  cafe: { papel: '#F7F0E4', tinta: '#4B3A2D', acentos: ['#DDBF9F', '#EDDCC4', '#B5C2A8'] },
  cielo: { papel: '#EFF4F7', tinta: '#2E3D4A', acentos: ['#B3CDE0', '#F4E2CB', '#E6BCB6'] },
} as const satisfies Record<string, Paleta>;

const BLANCO = '#FFFFFF';
const con = (p: Pieza, style: ElementoDeLienzo['style']): Pieza => ({ ...p, style: { ...(p.style ?? {}), ...style } });
const muestra = (x: number, y: number, w: number): Pieza => ({ type: 'swatch', x, y, w, ar: PROPORCION_DE_MUESTRA, content: { text: '' } });
const polaroid = (variant: 'classic' | 'mini' | 'caption', x: number, y: number, w: number, rot: number, pie = ''): Pieza => ({
  type: 'polaroid',
  x,
  y,
  w,
  ar: PROPORCION_DE_POLAROID[variant],
  rot,
  content: { variant, paths: [''], text: pie },
});
/** Un libro por elegir: sin libro puesto, también en un recorte. */
const porElegir = (x: number, y: number, w: number, rot = 0): Pieza => ({ type: 'book', x, y, w, ar: 1.5, rot, content: {} });
/** Una mancha suave de fondo, como un Nobi. */
const mancha = (x: number, y: number, w: number, color: string, rot = 0, ar = 0.9): Pieza => ({ type: 'shape', x, y, w, ar, rot, style: { color, opacity: 0.5 }, content: { shape: 'blob' } });

/**
 * El título en manuscrita, tan grande como quepa en un renglón de la página (en los dos idiomas): la manuscrita mide
 * ~0.81 % del ancho por letra y por punto de tamaño; tope en 4.6 para que no tape lo de abajo.
 */
function tituloManuscrito(txt: string, tinta: string): Pieza {
  const size = Math.round(Math.min(4.6, Math.max(2.6, 0.78 / (Math.max(txt.length, 1) * 0.0081))) * 10) / 10;
  // Un renglón: 1.35 de interlineado más el relleno, sobre el ancho de la caja.
  const ar = (size * 0.021 * 1.35 + size * 0.021 * 0.5) / 0.86;
  return con(texto(txt, 0.07, 0.025, 0.86, size, ar), { font: 'hand', color: tinta });
}

/** Las piezas con la paleta de cada plantilla. */
function piezasCon(t: Textos, p: Paleta) {
  const n = t.assetLabels;
  const [a1, a2, a3] = p.acentos;
  return {
    titulo: (txt: string): Pieza => tituloManuscrito(txt, p.tinta),
    // Las etiquetas y notas un poco más grandes que el texto normal: la manuscrita es más angosta y bajita.
    etiqueta: (txt: string, x: number, y: number, w: number, size = 1.1, ar = 0.1): Pieza => con(texto(txt, x, y, w, size * 1.2, ar), { font: 'serif', color: p.tinta }),
    nota: (txt: string, x: number, y: number, w: number, size = 1.1, ar = 0.15): Pieza => con(texto(txt, x, y, w, size * 1.35, ar), { font: 'hand', color: p.tinta }),
    papel: (nombre: NombreDeAsset, x: number, y: number, w: number, rot: number, color: string = BLANCO): Pieza => con(asset(nombre, n.paper, x, y, w, rot), { color }),
    cinta: (x: number, y: number, w: number, rot: number, color: string = a1, nombre: NombreDeAsset = 'cinta-lisa'): Pieza => con(asset(nombre, n.tape, x, y, w, rot), { color, opacity: 0.85 }),
    doodle: (nombre: NombreDeAsset, x: number, y: number, w: number, rot = 0): Pieza => con(asset(nombre, n.sparkles, x, y, w, rot), { color: p.tinta }),
    tinta: (pz: Pieza): Pieza => con(pz, { color: p.tinta }),
    mancha: (x: number, y: number, w: number, rot = 0, ar = 0.9, color: string = a1) => mancha(x, y, w, color, rot, ar),
    a1,
    a2,
    a3,
  };
}

const vertical = (id: string, nombre: string, paleta: Paleta, piezas: Pieza[]): PlantillaDeLienzo => ({
  id,
  nombre,
  orientacion: 'portrait',
  doc: { ...documento(piezas), background: paleta.papel },
});

/**
 * Viste una de las del Journal con una paleta (T376): su papel, el título en manuscrita y más grande, los textos y
 * módulos en tinta, los papeles y cintas en los acentos (por turnos), los doodles en tinta; "este libro" queda por elegir.
 */
function vestir(doc: DocumentoDeLienzo, p: Paleta): DocumentoDeLienzo {
  const textos = doc.elements.filter((e) => e.type === 'textbox');
  const titulo = textos.reduce<ElementoDeLienzo | null>((m, e) => (!m || e.y < m.y ? e : m), null);
  let turno = 0;
  const elements = doc.elements.map((e): ElementoDeLienzo => {
    if (e.type === 'book' && e.content.itemId === ESTE_LIBRO) return { ...e, content: { ...e.content, itemId: undefined } };
    if (e === titulo) {
      const nuevo = tituloManuscrito(e.content.text ?? '', p.tinta);
      return { ...e, x: nuevo.x ?? e.x, y: nuevo.y ?? e.y, w: nuevo.w ?? e.w, ar: nuevo.ar ?? e.ar, style: { ...e.style, ...nuevo.style } };
    }
    if (e.type === 'textbox') return { ...e, style: { ...e.style, font: 'serif', color: p.tinta } };
    if (e.type === 'asset') return { ...e, style: { ...e.style, color: e.content.mode === 'trazo' ? p.tinta : p.acentos[turno++ % 3] } };
    if (e.type === 'shape') return { ...e, style: { ...e.style, color: p.acentos[turno++ % 3] } };
    if (['quote', 'checklist', 'timeline', 'date', 'stat', 'mood', 'song', 'rating'].includes(e.type)) return { ...e, style: { ...e.style, color: p.tinta } };
    return e;
  });
  return { ...doc, background: p.papel, elements };
}

/** La paleta de cada una de las seis que vienen del Journal. */
const PALETA_DE_LAS_DEL_JOURNAL: Record<(typeof DEL_JOURNAL_A_LECTOR)[number], Paleta> = {
  'kavi/get-to-know': PALETAS_DE_LECTOR.rosa,
  'kavi/reading-eras': PALETAS_DE_LECTOR.lavanda,
  'kavi/reading-year': PALETAS_DE_LECTOR.cafe,
  'kavi/reading-stats': PALETAS_DE_LECTOR.cielo,
  'kavi/reading-awards': PALETAS_DE_LECTOR.salvia,
  'kavi/year-goal': PALETAS_DE_LECTOR.rosa,
};

export function plantillasDeLector(t: Textos, anio: number): PlantillaDeLienzo[] {
  const nm = t.names;
  const dato = (stat: DatoDeBiblioteca, x: number, y: number, w: number): Pieza => ({ type: 'stat', x, y, w, ar: PROPORCION_DE_DATO, content: { stat, year: anio } });
  const yaEstaban = plantillasDeJournal(t, anio)
    .filter((p) => (DEL_JOURNAL_A_LECTOR as readonly string[]).includes(p.id))
    .map((p) => ({ ...p, doc: vestir(p.doc, PALETA_DE_LAS_DEL_JOURNAL[p.id as (typeof DEL_JOURNAL_A_LECTOR)[number]]) }));
  const { rosa, salvia, lavanda, cafe, cielo } = PALETAS_DE_LECTOR;

  const personalidad = (() => {
    const k = piezasCon(t, rosa);
    const p = t.personality;
    return vertical('kavi/reading-personality', nm.readingPersonality, rosa, [
      k.mancha(0.48, 0.07, 0.5, 12),
      k.titulo(p.title),
      k.papel('hoja-de-libreta', 0.05, 0.16, 0.52, -2),
      k.cinta(0.2, 0.145, 0.22, -6, k.a1, 'cinta-rayas'),
      k.tinta(lista(p.listTitle, p.list, 0.09, 0.2, 0.44, 1.3)),
      polaroid('caption', 0.62, 0.17, 0.3, 4, p.caption),
      k.cinta(0.69, 0.155, 0.16, 8, k.a3),
      k.tinta(animo('happy', 0.7, 0.5, 0.18)),
      k.doodle('destellos', 0.88, 0.47, 0.09),
      k.papel('memo', 0.06, 0.68, 0.42, -2, k.a2),
      k.nota(p.character, 0.1, 0.75, 0.34, 1.1, 0.6),
      k.papel('papel-cuadriculado', 0.54, 0.69, 0.38, 2),
      k.cinta(0.64, 0.675, 0.16, -4, k.a1, 'cinta-puntos'),
      k.nota(p.superpower, 0.58, 0.74, 0.3, 1.1, 0.6),
      k.doodle('corazon-a-mano', 0.44, 0.62, 0.08, -8),
    ]);
  })();

  const favoritos = (() => {
    const k = piezasCon(t, salvia);
    const tintes = [BLANCO, k.a1, k.a2, BLANCO, k.a3, BLANCO, k.a1, k.a2];
    return vertical('kavi/favorite-things', nm.favoriteThings, salvia, [
      k.mancha(0.02, 0.58, 0.46, -10),
      k.mancha(0.56, 0.12, 0.4, 20, 0.8, k.a3),
      k.titulo(t.favorites.title),
      k.doodle('estrella-a-mano', 0.84, 0.04, 0.09, 8),
      ...t.favorites.boxes.flatMap((nombre, i): Pieza[] => {
        const x = i % 2 ? 0.52 : 0.06;
        const y = 0.16 + Math.floor(i / 2) * 0.2;
        const rot = i % 3 === 0 ? -2 : i % 3 === 1 ? 2 : -1;
        return [k.papel('ticket', x, y, 0.42, rot, tintes[i]), k.etiqueta(nombre, x + 0.05, y + 0.025, 0.3, 1.05, 0.12)];
      }),
      k.cinta(0.3, 0.15, 0.16, -10, k.a2, 'cinta-rayas'),
      k.cinta(0.76, 0.55, 0.16, 12, k.a1),
      k.doodle('corazon-a-mano', 0.06, 0.92, 0.07),
    ]);
  })();

  const librosFavoritos = (() => {
    const k = piezasCon(t, lavanda);
    return vertical('kavi/favorite-books', nm.favoriteBooks, lavanda, [
      k.mancha(0.5, 0.06, 0.48, 15),
      k.mancha(0.0, 0.62, 0.42, -15, 1, k.a2),
      k.titulo(t.favoriteBooks.title),
      ...[0, 1, 2, 3, 4].flatMap((i): Pieza[] => {
        const y = 0.15 + i * 0.163;
        return [
          k.nota(`${i + 1}`, 0.03, y + 0.03, 0.07, 2.4, 0.5),
          porElegir(0.1, y, 0.13, i % 2 ? 3 : -3),
          k.tinta(calificacion('hearts', 0.3, y + 0.01, 0.28)),
          k.papel('tira-rasgada', 0.28, y + 0.055, 0.64, i % 2 ? 1 : -1, i % 2 ? k.a2 : BLANCO),
          k.nota(t.favoriteBooks.why, 0.33, y + 0.073, 0.5, 0.95, 0.12),
        ];
      }),
      k.doodle('destellos', 0.88, 0.05, 0.08),
    ]);
  })();

  const autores = (() => {
    const k = piezasCon(t, cafe);
    const a = t.favoriteAuthors;
    const lugares: [number, number, number][] = [
      [0.07, 0.16, -4],
      [0.56, 0.15, 3],
      [0.09, 0.55, 3],
      [0.57, 0.54, -3],
    ];
    return vertical('kavi/favorite-authors', nm.favoriteAuthors, cafe, [
      k.mancha(0.3, 0.38, 0.42, 0, 0.9),
      k.titulo(a.title),
      ...lugares.flatMap(([x, y, rot], i): Pieza[] => [
        polaroid('caption', x, y, 0.34, rot, a.author),
        k.cinta(x + 0.09, y - 0.012, 0.16, rot * 2, [k.a1, k.a3, k.a2, k.a1][i], i % 2 ? 'cinta-cuadros' : 'cinta-lisa'),
        k.etiqueta(a.best, x, y + 0.35, 0.36, 0.9, 0.1),
      ]),
      k.doodle('rama', 0.86, 0.82, 0.1, 10),
      k.doodle('destellos', 0.45, 0.47, 0.1),
    ]);
  })();

  const generos = (() => {
    const k = piezasCon(t, cielo);
    const g = t.genres;
    return vertical('kavi/favorite-genres', nm.favoriteGenres, cielo, [
      k.mancha(0.52, 0.12, 0.44, 10, 1),
      k.titulo(g.title),
      k.papel('hoja-de-libreta', 0.05, 0.15, 0.5, -2),
      k.cinta(0.2, 0.14, 0.2, -5, k.a2, 'cinta-puntos'),
      k.tinta(lista('', g.list, 0.09, 0.19, 0.42, 1.4)),
      k.etiqueta(g.colors, 0.61, 0.16, 0.32, 1.1, 0.1),
      ...[0, 1, 2, 3, 4, 5].map((i) => muestra(i % 2 ? 0.78 : 0.61, 0.21 + Math.floor(i / 2) * 0.13, 0.14)),
      k.papel('memo', 0.06, 0.66, 0.42, -2, k.a1),
      k.nota(g.comfort, 0.1, 0.73, 0.34, 1.1, 0.5),
      k.papel('memo', 0.52, 0.66, 0.42, 2, k.a2),
      k.nota(g.tryNext, 0.56, 0.73, 0.34, 1.1, 0.5),
      k.doodle('destellos', 0.87, 0.04, 0.08),
    ]);
  })();

  const habitos = (() => {
    const k = piezasCon(t, cafe);
    const h = t.habits;
    return vertical('kavi/reading-habits', nm.readingHabits, cafe, [
      k.mancha(0.5, 0.5, 0.48, -10, 0.9, k.a3),
      k.titulo(h.title),
      k.papel('memo', 0.05, 0.15, 0.42, -2),
      k.cinta(0.18, 0.14, 0.16, -6, k.a1),
      k.tinta(lista(h.when, h.whenList, 0.09, 0.2, 0.34, 0.85)),
      k.papel('memo', 0.53, 0.15, 0.42, 2, k.a2),
      k.cinta(0.66, 0.14, 0.16, 7, k.a3, 'cinta-rayas'),
      k.tinta(lista(h.format, h.formatList, 0.57, 0.2, 0.34, 0.7)),
      k.papel('memo', 0.05, 0.5, 0.42, 1, k.a1),
      k.tinta(lista(h.with, h.withList, 0.09, 0.55, 0.34, 0.85)),
      k.tinta(dato('hoursRead', 0.55, 0.52, 0.38)),
      k.tinta(dato('pagesRead', 0.55, 0.7, 0.38)),
      k.nota(h.pace, 0.08, 0.86, 0.5, 1.2, 0.12),
      k.doodle('flecha-curva', 0.4, 0.88, 0.16, -8),
    ]);
  })();

  const recuerdos = (() => {
    const k = piezasCon(t, lavanda);
    return vertical('kavi/reading-memories', nm.readingMemories, lavanda, [
      k.mancha(0.02, 0.18, 0.56, 0, 1.4),
      k.titulo(t.memories.title),
      k.tinta(linea(t.memories.list, 0.08, 0.18, 0.47, 1.9)),
      polaroid('caption', 0.62, 0.16, 0.3, 4, t.memories.caption),
      k.cinta(0.69, 0.145, 0.16, -6, k.a2, 'cinta-puntos'),
      k.tinta(fecha(0.6, 0.52, 0.34)),
      k.doodle('corazon-a-mano', 0.7, 0.64, 0.12, 6),
      k.papel('ticket', 0.58, 0.8, 0.36, -3, k.a3),
      k.doodle('destellos', 0.88, 0.04, 0.08),
    ]);
  })();

  const metas = (() => {
    const k = piezasCon(t, rosa);
    return vertical('kavi/reading-goals', nm.readingGoals, rosa, [
      k.mancha(0.03, 0.13, 0.44, -8),
      k.titulo(t.goals.title(anio)),
      k.tinta(dato('booksFinished', 0.08, 0.16, 0.36)),
      k.doodle('destellos', 0.4, 0.15, 0.09),
      k.papel('hoja-de-libreta', 0.5, 0.14, 0.45, 3),
      k.cinta(0.64, 0.13, 0.18, 6, k.a2, 'cinta-rayas'),
      k.tinta(lista('', t.goals.list, 0.54, 0.19, 0.37, 1.25)),
      k.papel('tira-rasgada', 0.06, 0.62, 0.88, -1, k.a2),
      k.nota(t.goals.word, 0.1, 0.655, 0.8, 1.4, 0.12),
      k.doodle('estrella-a-mano', 0.12, 0.8, 0.13, -8),
      k.doodle('lazo', 0.4, 0.8, 0.2),
      k.doodle('corazon-a-mano', 0.78, 0.82, 0.11, 8),
    ]);
  })();

  const estetica = (() => {
    const k = piezasCon(t, salvia);
    const a = t.aesthetic;
    return vertical('kavi/reader-aesthetic', nm.readerAesthetic, salvia, [
      k.mancha(0.5, 0.7, 0.46, 10, 0.8),
      k.titulo(a.title),
      polaroid('classic', 0.06, 0.15, 0.4, -4),
      k.cinta(0.18, 0.135, 0.18, -8, k.a2),
      polaroid('mini', 0.52, 0.13, 0.24, 4),
      k.cinta(0.56, 0.12, 0.14, 10, k.a3, 'cinta-puntos'),
      polaroid('classic', 0.6, 0.4, 0.34, 3),
      k.cinta(0.7, 0.385, 0.15, -5, k.a1, 'cinta-rayas'),
      k.etiqueta(a.palette, 0.07, 0.52, 0.4, 1.1, 0.1),
      ...[0, 1, 2, 3].map((i) => muestra(0.07 + i * 0.1, 0.57, 0.09)),
      k.papel('memo', 0.06, 0.68, 0.42, -2),
      k.nota(a.words, 0.1, 0.735, 0.34, 1.05, 0.6),
      k.tinta(cancion(a.song, 0.52, 0.76, 0.42)),
      k.doodle('destellos', 0.88, 0.04, 0.08),
    ]);
  })();

  const rincon = (() => {
    const k = piezasCon(t, cafe);
    const s = t.space;
    return vertical('kavi/reading-space', nm.readingSpace, cafe, [
      k.mancha(0.52, 0.48, 0.44, 15, 0.9, k.a3),
      k.titulo(s.title),
      polaroid('caption', 0.06, 0.15, 0.52, -2, s.caption),
      k.cinta(0.22, 0.135, 0.22, -4, k.a1),
      k.papel('hoja-de-libreta', 0.6, 0.16, 0.36, 3, k.a2),
      k.tinta(lista(s.never, s.neverList, 0.63, 0.2, 0.3, 1.2)),
      k.doodle('rama', 0.84, 0.5, 0.1, 8),
      k.papel('tira-rasgada', 0.05, 0.69, 0.9, 1),
      k.nota(s.outside, 0.09, 0.715, 0.8, 1.05, 0.12),
      k.tinta(cancion(s.song, 0.08, 0.86, 0.5)),
    ]);
  })();

  const porQue = (() => {
    const k = piezasCon(t, rosa);
    const w = t.why;
    return vertical('kavi/why-i-read', nm.whyIRead, rosa, [
      k.mancha(0.5, 0.08, 0.46, 12),
      k.mancha(0.04, 0.58, 0.5, -10, 0.7, k.a2),
      k.titulo(w.title),
      k.papel('hoja-de-libreta', 0.06, 0.15, 0.48, -2),
      k.cinta(0.2, 0.14, 0.2, -6, k.a3, 'cinta-puntos'),
      k.tinta(lista(w.reasons, w.reasonsList, 0.1, 0.19, 0.4, 1.1)),
      k.doodle('corazon-a-mano', 0.66, 0.18, 0.2, 6),
      k.doodle('destellos', 0.86, 0.38, 0.09),
      k.tinta({ type: 'quote', x: 0.08, y: 0.6, w: 0.84, ar: 0.42, content: { text: w.quote, who: '', chapter: '', note: '' } }),
      k.papel('tira-rasgada', 0.05, 0.82, 0.9, -1),
      k.nota(w.saved, 0.09, 0.845, 0.8, 1.1, 0.12),
    ]);
  })();

  const cambiaron = (() => {
    const k = piezasCon(t, cielo);
    const c = t.changed;
    return vertical('kavi/books-that-changed-me', nm.booksThatChangedMe, cielo, [
      k.mancha(0.4, 0.3, 0.56, 10, 1),
      k.titulo(c.title),
      ...[0.16, 0.43, 0.7].flatMap((y, i): Pieza[] => [
        porElegir(0.07, y, 0.17, i % 2 ? 3 : -3),
        k.cinta(0.09, y - 0.012, 0.13, i % 2 ? 8 : -8, [k.a1, k.a2, k.a3][i]),
        k.papel('tira-rasgada', 0.3, y, 0.62, i % 2 ? 1 : -1),
        k.nota(c.before, 0.34, y + 0.022, 0.54, 1, 0.12),
        k.papel('tira-rasgada', 0.32, y + 0.13, 0.62, i % 2 ? -1 : 1, k.a2),
        k.nota(c.after, 0.36, y + 0.152, 0.54, 1, 0.12),
        k.doodle('flecha-curva', 0.82, y + 0.085, 0.12, 30),
      ]),
    ]);
  })();

  const relacion = (() => {
    const k = piezasCon(t, lavanda);
    const r = t.relationship;
    const cuadros: [string, number, number, number, string][] = [
      [r.enjoy, 0.05, 0.33, -2, BLANCO],
      [r.hard, 0.52, 0.33, 2, k.a2],
      [r.best, 0.05, 0.64, 1, k.a1],
      [r.change, 0.52, 0.64, -1, BLANCO],
    ];
    return vertical('kavi/relationship-with-reading', nm.relationshipWithReading, lavanda, [
      k.mancha(0.25, 0.4, 0.5, 0, 0.9, k.a3),
      k.titulo(r.title),
      k.tinta(animo('happy', 0.07, 0.15, 0.17)),
      k.nota(r.lately, 0.28, 0.17, 0.64, 1.25, 0.15),
      ...cuadros.flatMap(([txt, x, y, rot, color], i): Pieza[] => [
        k.papel('memo', x, y, 0.42, rot, color),
        k.cinta(x + 0.14, y - 0.012, 0.14, rot * 3, [k.a1, k.a3, k.a2, k.a1][i], i % 2 ? 'cinta-rayas' : 'cinta-lisa'),
        k.nota(txt, x + 0.04, y + 0.07, 0.34, 1.05, 0.5),
      ]),
    ]);
  })();

  return [...yaEstaban, personalidad, favoritos, librosFavoritos, autores, generos, habitos, recuerdos, metas, estetica, rincon, porQue, cambiaron, relacion];
}
