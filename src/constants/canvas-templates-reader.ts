import { plantillasDeJournal } from '@/constants/canvas-templates';
import { type NombreDeAsset } from '@/constants/canvas-assets';
import { animo, asset, calificacion, cancion, documento, fecha, linea, lista, type Pieza, texto, type Textos } from '@/constants/canvas-template-kit';
import { type ElementoDeLienzo, PROPORCION_DE_DATO, PROPORCION_DE_MUESTRA, PROPORCION_DE_POLAROID } from '@/lib/library/canvas';
import { ESTE_LIBRO, type PlantillaDeLienzo } from '@/lib/library/canvas-templates';
import type { DatoDeBiblioteca } from '@/lib/library/journal-stats';

/**
 * "Yo como lector" (spec 13h, RF-CC21; T374, T376, T377): las páginas sobre quien lee, no sobre un libro, en recortes y
 * en el Journal. Las seis que ya había en el Journal y trece más a partir de los journals lectores más comunes.
 *
 * **Con estilo KAVI (T377, Areli eligió los tres de la comparación del 26 oct 2026):**
 * - **Zine:** blanco y negro de la app con un solo color de dimensión; título con la letra del logo, una regla y el
 *   subtítulo con la del eslogan; tarjetas blancas con borde negro, cintas negras y una mancha sólida.
 * - **Bloques:** neobrutalista; el título en un bloque de color; tarjetas de colores claros de las dimensiones con borde
 *   grueso y sombra dura; manchas con borde, como un Nobi.
 * - **Noche:** fondo tinta como KAVI en oscuro, letras claras, halos de color y tarjetas con contorno fino.
 * Cada plantilla tiene su estilo y el color de una dimensión; todo se cambia después ("Colores de la página"). Sus libros
 * son **por elegir** (en un recorte no se vuelven el libro del recorte).
 */

/** Las de "yo como lector" que ya estaban en el Journal: salen de esa fila para no repetirse. */
export const DEL_JOURNAL_A_LECTOR = ['kavi/get-to-know', 'kavi/reading-eras', 'kavi/reading-year', 'kavi/reading-stats', 'kavi/reading-awards', 'kavi/year-goal'] as const;

/** Los colores de las 7 dimensiones (spec 05) y su versión clara, para los bloques. */
const DIMENSION = {
  emocional: { fuerte: '#E91E63', claro: '#F8BBD0' },
  social: { fuerte: '#FF9800', claro: '#FFE0B2' },
  intelectual: { fuerte: '#2196F3', claro: '#BBDEFB' },
  fisica: { fuerte: '#4CAF50', claro: '#C8E6C9' },
  espiritual: { fuerte: '#9C27B0', claro: '#E1BEE7' },
  financiera: { fuerte: '#009688', claro: '#B2DFDB' },
  ocupacional: { fuerte: '#607D8B', claro: '#CFD8DC' },
} as const;
type Dimension = keyof typeof DIMENSION;

export type EstiloDeLector = { tipo: 'zine' | 'bloques' | 'noche'; dimension: Dimension; segunda: Dimension };
/** El estilo y los colores de cada una. */
export const ESTILO_DE_LECTOR: Record<string, EstiloDeLector> = {
  'kavi/get-to-know': { tipo: 'zine', dimension: 'espiritual', segunda: 'emocional' },
  'kavi/reading-eras': { tipo: 'noche', dimension: 'espiritual', segunda: 'emocional' },
  'kavi/reading-year': { tipo: 'bloques', dimension: 'emocional', segunda: 'social' },
  'kavi/reading-stats': { tipo: 'zine', dimension: 'financiera', segunda: 'intelectual' },
  'kavi/reading-awards': { tipo: 'bloques', dimension: 'social', segunda: 'intelectual' },
  'kavi/year-goal': { tipo: 'noche', dimension: 'fisica', segunda: 'intelectual' },
  'kavi/reading-personality': { tipo: 'zine', dimension: 'emocional', segunda: 'espiritual' },
  'kavi/favorite-things': { tipo: 'bloques', dimension: 'social', segunda: 'intelectual' },
  'kavi/favorite-books': { tipo: 'zine', dimension: 'intelectual', segunda: 'social' },
  'kavi/favorite-authors': { tipo: 'noche', dimension: 'social', segunda: 'emocional' },
  'kavi/favorite-genres': { tipo: 'bloques', dimension: 'intelectual', segunda: 'fisica' },
  'kavi/reading-habits': { tipo: 'bloques', dimension: 'fisica', segunda: 'social' },
  'kavi/reading-memories': { tipo: 'noche', dimension: 'espiritual', segunda: 'intelectual' },
  'kavi/reading-goals': { tipo: 'zine', dimension: 'fisica', segunda: 'social' },
  'kavi/reader-aesthetic': { tipo: 'noche', dimension: 'emocional', segunda: 'espiritual' },
  'kavi/reading-space': { tipo: 'bloques', dimension: 'financiera', segunda: 'social' },
  'kavi/why-i-read': { tipo: 'zine', dimension: 'emocional', segunda: 'social' },
  'kavi/books-that-changed-me': { tipo: 'zine', dimension: 'social', segunda: 'intelectual' },
  'kavi/relationship-with-reading': { tipo: 'noche', dimension: 'intelectual', segunda: 'emocional' },
};

const BLANCO = '#FFFFFF';
const TINTA = '#131313';
const PAPEL = '#F2F2F2';
const NOCHE_TARJETA = '#1E1E1E';
const AMARILLO = '#FFF59D';
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
const rectangulo = (x: number, y: number, w: number, ar: number, rot: number, color: string, borde?: { width: number; color: string }): Pieza => ({
  type: 'shape',
  x,
  y,
  w,
  ar,
  rot,
  style: { color, ...(borde ? { border: borde } : {}) },
  content: { shape: 'rect' },
});

/** Lo que es del título (no se mueve al acomodar lo de abajo). */
const DEL_TITULO = new WeakSet<Pieza>();
/** Las manchas de fondo (no cuentan para dónde empieza el contenido, ni se mueven). */
const DE_FONDO = new WeakSet<Pieza>();
const marcar = <T extends Pieza>(conjunto: WeakSet<Pieza>, p: T): T => {
  conjunto.add(p);
  return p;
};

/**
 * El título con la letra del logo, en uno o dos renglones, tan grande como quepa: en minúsculas mide ~0.56 em por letra
 * (1.18 % del ancho por punto de tamaño, medido en el motor); la palabra más larga cabe en un renglón y todo en dos.
 */
function medidaDeTitulo(txt: string): { size: number; ar: number; renglones: number } {
  // Con holgura: la caja tiene su margen interno y cada pantalla mide la letra un poco distinto.
  const F = 0.0126;
  const ANCHO = 0.74;
  const palabras = txt.split(/\s+/).filter(Boolean);
  // Cuántos renglones salen con ese tamaño, partiendo por palabras como el navegador.
  const renglonesCon = (size: number) => {
    let renglones = 1;
    let actual = 0;
    for (const p of palabras) {
      const largo = (actual ? actual + 1 : 0) + p.length;
      if (largo * F * size > ANCHO && actual) {
        renglones++;
        actual = p.length;
      } else actual = largo;
    }
    return renglones;
  };
  let size = 5;
  while (size > 2 && (renglonesCon(size) > 2 || Math.max(...palabras.map((p) => p.length), 1) * F * size > ANCHO)) size = Math.round((size - 0.1) * 10) / 10;
  const renglones = renglonesCon(size);
  return { size, ar: ((renglones * 1.35 + 0.5) * size * 0.021) / 0.86, renglones };
}

/** Las piezas con el estilo de cada plantilla: la misma forma de llamarlas, distinto dibujo. */
function kit(t: Textos, anio: number, e: EstiloDeLector) {
  const n = t.assetLabels;
  const d = DIMENSION[e.dimension];
  const d2 = DIMENSION[e.segunda];
  const noche = e.tipo === 'noche';
  const tinta = noche ? PAPEL : TINTA;
  // Los tres "acentos" con que los acomodos piden variar (el blanco es el cuarto).
  const a1 = d.fuerte;
  const a2 = d2.fuerte;
  const a3 = AMARILLO;
  const variante = (color: string) => (color === a1 ? 1 : color === a2 ? 2 : color === a3 ? 3 : 0);
  const relleno = (v: number) => (e.tipo === 'bloques' ? [BLANCO, d.claro, d2.claro, AMARILLO][v] : noche ? NOCHE_TARJETA : BLANCO);
  const proporcion = (nombre: NombreDeAsset) => asset(nombre, '', 0, 0, 1).ar ?? 1;

  const titulo = (txt: string): Pieza[] => {
    const m = medidaDeTitulo(txt);
    const alto = (0.86 * m.ar) / Math.SQRT2;
    if (e.tipo === 'bloques') {
      const ar = ((alto + 0.03) * Math.SQRT2) / 0.9;
      return [
        rectangulo(0.062, 0.03, 0.9, ar, -1.5, TINTA),
        rectangulo(0.045, 0.018, 0.9, ar, -1.5, d.fuerte, { width: 0.005, color: TINTA }),
        con(texto(txt, 0.08, 0.028, 0.86, m.size, m.ar), { font: 'brand', color: TINTA }),
      ].map((p) => marcar(DEL_TITULO, { ...p, rot: -1.5 }));
    }
    const fin = 0.03 + alto;
    const sub = noche ? 'plan more. read more.' : `${t.reader.toUpperCase()} · ${anio}`;
    return [
      con(texto(txt, 0.07, 0.03, 0.86, m.size, m.ar), { font: 'brand', color: tinta }),
      // Zine: una barra corta del color de la página bajo el título (el lienzo no hace líneas más delgadas que esto).
      ...(noche ? [] : [rectangulo(0.08, fin + 0.008, 0.14, 0.06, 0, d.fuerte)]),
      con(texto(sub, noche ? 0.07 : 0.24, fin + (noche ? 0.004 : 0.002), noche ? 0.86 : 0.69, 1.15, 0.07), { font: 'slogan', color: noche ? d.claro : TINTA }),
    ].map((p) => marcar(DEL_TITULO, p));
  };

  return {
    titulo,
    etiqueta: (txt: string, x: number, y: number, w: number, size = 1.1, ar = 0.1): Pieza =>
      con(texto(txt, x, y, w, size * 1.15, ar), e.tipo === 'bloques' ? { font: 'serif', color: tinta } : { font: 'slogan', color: tinta }),
    nota: (txt: string, x: number, y: number, w: number, size = 1.1, ar = 0.15): Pieza => con(texto(txt, x, y, w, size * 1.35, ar), { font: 'hand', color: tinta }),
    /** Una tarjeta del tamaño de ese papel: blanca con borde (zine), de color con sombra dura (bloques) u oscura con contorno (noche). */
    papel: (nombre: NombreDeAsset, x: number, y: number, w: number, rot: number, color: string = BLANCO): Pieza[] => {
      const ar = proporcion(nombre);
      const v = variante(color);
      if (e.tipo === 'bloques') return [rectangulo(x + 0.012, y + 0.008, w, ar, rot, TINTA), rectangulo(x, y, w, ar, rot, relleno(v), { width: 0.005, color: TINTA })];
      if (noche) return [rectangulo(x, y, w, ar, rot, NOCHE_TARJETA, { width: 0.0025, color: v % 2 ? d.claro : PAPEL })];
      return [rectangulo(x, y, w, ar, rot, BLANCO, { width: 0.0045, color: TINTA })];
    },
    cinta: (x: number, y: number, w: number, rot: number, color: string = a1, nombre: NombreDeAsset = 'cinta-lisa'): Pieza => {
      const v = variante(color);
      const tono = e.tipo === 'zine' ? TINTA : e.tipo === 'bloques' ? [d.fuerte, d.fuerte, d2.fuerte, AMARILLO][v] : [d.claro, d.claro, d2.claro, d.claro][v];
      return con(asset(e.tipo === 'zine' ? 'cinta-lisa' : nombre, n.tape, x, y, w, rot), { color: tono, opacity: e.tipo === 'zine' ? 0.88 : 0.95 });
    },
    doodle: (nombre: NombreDeAsset, x: number, y: number, w: number, rot = 0): Pieza => con(asset(nombre, n.sparkles, x, y, w, rot), { color: tinta }),
    tinta: (pz: Pieza): Pieza => con(pz, { color: tinta }),
    /** La mancha: sólida (zine), con borde como un Nobi (bloques) o un halo (noche). */
    mancha: (x: number, y: number, w: number, rot = 0, ar = 0.9, color: string = a1): Pieza => {
      const principal = variante(color) <= 1;
      const base: Pieza = { type: 'shape', x, y, w, ar, rot, content: { shape: 'blob' } };
      if (e.tipo === 'zine') return marcar(DE_FONDO, { ...base, style: principal ? { color: d.fuerte } : { color: d2.fuerte, opacity: 0.25 } });
      if (e.tipo === 'bloques') return marcar(DE_FONDO, { ...base, style: { color: principal ? d.claro : d2.claro, border: { width: 0.005, color: TINTA } } });
      return marcar(DE_FONDO, { ...base, style: { color: principal ? d.fuerte : d2.fuerte, opacity: 0.45 } });
    },
    a1,
    a2,
    a3,
    estilo: e,
  };
}
type Kit = ReturnType<typeof kit>;

/**
 * Arma la página: el fondo del estilo, el título arriba y lo demás encogido lo justo para empezar debajo del título
 * (todo junto, sin desacomodar nada); lo decorativo que quedaba en la franja del título se quita.
 */
function vertical(id: string, nombre: string, k: Kit, piezas: (Pieza | Pieza[])[]): PlantillaDeLienzo {
  const todas = piezas.flat();
  const titulo = todas.filter((p) => DEL_TITULO.has(p));
  const finDelTitulo = Math.max(0.12, ...titulo.map((p) => (p.y ?? 0) + ((p.w ?? 0) * (p.ar ?? 0)) / Math.SQRT2));
  const contenido = todas.filter((p) => !DEL_TITULO.has(p) && !DE_FONDO.has(p) && (p.y ?? 0) >= 0.1);
  // Las manchas no van detrás del título: las que subían hasta él empiezan a su altura.
  const fondo = todas.filter((p) => DE_FONDO.has(p)).map((p) => ((p.y ?? 0) < finDelTitulo - 0.03 ? { ...p, y: finDelTitulo - 0.03 } : p));
  const BASE = 0.975;
  const arriba = Math.min(...contenido.map((p) => p.y ?? 1));
  const empieza = finDelTitulo + 0.025;
  const s = arriba < empieza ? (BASE - empieza) / (BASE - arriba) : 1;
  const encoger = (p: Pieza): Pieza => {
    if (s === 1) return p;
    const w = (p.w ?? 0) * s;
    const centro = 0.5 + ((p.x ?? 0) + (p.w ?? 0) / 2 - 0.5) * s;
    return { ...p, x: centro - w / 2, y: BASE - (BASE - (p.y ?? 0)) * s, w, ...(p.type === 'textbox' ? { style: { ...(p.style ?? {}), size: (p.style?.size ?? 1) * s } } : {}) };
  };
  return {
    id,
    nombre,
    orientacion: 'portrait',
    doc: { ...documento([...fondo, ...titulo, ...contenido.map(encoger)]), background: k.estilo.tipo === 'noche' ? TINTA : PAPEL },
  };
}

/**
 * Viste una de las del Journal con su estilo: el título de la marca en lugar del suyo, los textos y módulos en la tinta,
 * los papeles como tarjetas del estilo, las cintas y doodles con sus colores; "este libro" queda por elegir.
 */
function vestir(p: PlantillaDeLienzo, k: Kit): PlantillaDeLienzo {
  const textos = p.doc.elements.filter((e) => e.type === 'textbox');
  const suTitulo = textos.reduce<ElementoDeLienzo | null>((m, e) => (!m || e.y < m.y ? e : m), null);
  let turno = 0;
  const colores = [BLANCO, k.a1, k.a2];
  const piezas = p.doc.elements
    .filter((e) => e !== suTitulo)
    .flatMap((e): Pieza | Pieza[] => {
      const { id: _id, z: _z, ...resto } = e;
      const pz: Pieza = e.type === 'book' && e.content.itemId === ESTE_LIBRO ? { ...resto, content: { ...e.content, itemId: undefined } } : resto;
      if (e.type === 'textbox') return con(pz, { font: 'serif', color: k.tinta(pz).style?.color });
      if (e.type === 'asset' && e.content.mode === 'trazo') return k.doodle(e.content.asset?.replace('basicos/', '') as NombreDeAsset, e.x, e.y, e.w, e.rot);
      if (e.type === 'asset' && e.content.asset?.includes('cinta')) return k.cinta(e.x, e.y, e.w, e.rot, colores[turno++ % 3]);
      if (e.type === 'asset') return k.papel(e.content.asset?.replace('basicos/', '') as NombreDeAsset, e.x, e.y, e.w, e.rot, colores[turno++ % 3]);
      if (e.type === 'shape') return con(pz, { color: [k.a1, k.a2][turno++ % 2] });
      if (['quote', 'checklist', 'timeline', 'date', 'stat', 'mood', 'song', 'rating'].includes(e.type)) return k.tinta(pz);
      return pz;
    });
  return vertical(p.id, p.nombre, k, [...k.titulo(suTitulo?.content.text ?? p.nombre), ...piezas]);
}

export function plantillasDeLector(t: Textos, anio: number): PlantillaDeLienzo[] {
  const nm = t.names;
  const dato = (stat: DatoDeBiblioteca, x: number, y: number, w: number): Pieza => ({ type: 'stat', x, y, w, ar: PROPORCION_DE_DATO, content: { stat, year: anio } });
  const estilo = (id: string) => kit(t, anio, ESTILO_DE_LECTOR[id]);
  const yaEstaban = plantillasDeJournal(t, anio)
    .filter((p) => (DEL_JOURNAL_A_LECTOR as readonly string[]).includes(p.id))
    .map((p) => vestir(p, estilo(p.id)));

  const personalidad = (() => {
    const k = estilo('kavi/reading-personality');
    const p = t.personality;
    return vertical('kavi/reading-personality', nm.readingPersonality, k, [
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
    const k = estilo('kavi/favorite-things');
    const tintes = [BLANCO, k.a1, k.a2, BLANCO, k.a3, BLANCO, k.a1, k.a2];
    return vertical('kavi/favorite-things', nm.favoriteThings, k, [
      k.mancha(0.02, 0.58, 0.46, -10),
      k.mancha(0.56, 0.12, 0.4, 20, 0.8, k.a3),
      k.titulo(t.favorites.title),
      k.doodle('estrella-a-mano', 0.84, 0.04, 0.09, 8),
      ...t.favorites.boxes.flatMap((nombre, i): (Pieza | Pieza[])[] => {
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
    const k = estilo('kavi/favorite-books');
    return vertical('kavi/favorite-books', nm.favoriteBooks, k, [
      k.mancha(0.5, 0.06, 0.48, 15),
      k.mancha(0.0, 0.62, 0.42, -15, 1, k.a2),
      k.titulo(t.favoriteBooks.title),
      ...[0, 1, 2, 3, 4].flatMap((i): (Pieza | Pieza[])[] => {
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
    const k = estilo('kavi/favorite-authors');
    const a = t.favoriteAuthors;
    const lugares: [number, number, number][] = [
      [0.07, 0.16, -4],
      [0.56, 0.15, 3],
      [0.09, 0.55, 3],
      [0.57, 0.54, -3],
    ];
    return vertical('kavi/favorite-authors', nm.favoriteAuthors, k, [
      k.mancha(0.3, 0.38, 0.42, 0, 0.9),
      k.titulo(a.title),
      ...lugares.flatMap(([x, y, rot], i): (Pieza | Pieza[])[] => [
        polaroid('caption', x, y, 0.34, rot, a.author),
        k.cinta(x + 0.09, y - 0.012, 0.16, rot * 2, [k.a1, k.a3, k.a2, k.a1][i], i % 2 ? 'cinta-cuadros' : 'cinta-lisa'),
        k.etiqueta(a.best, x, y + 0.35, 0.36, 0.9, 0.1),
      ]),
      k.doodle('rama', 0.86, 0.82, 0.1, 10),
      k.doodle('destellos', 0.45, 0.47, 0.1),
    ]);
  })();

  const generos = (() => {
    const k = estilo('kavi/favorite-genres');
    const g = t.genres;
    return vertical('kavi/favorite-genres', nm.favoriteGenres, k, [
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
    const k = estilo('kavi/reading-habits');
    const h = t.habits;
    return vertical('kavi/reading-habits', nm.readingHabits, k, [
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
    const k = estilo('kavi/reading-memories');
    return vertical('kavi/reading-memories', nm.readingMemories, k, [
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
    const k = estilo('kavi/reading-goals');
    return vertical('kavi/reading-goals', nm.readingGoals, k, [
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
    const k = estilo('kavi/reader-aesthetic');
    const a = t.aesthetic;
    return vertical('kavi/reader-aesthetic', nm.readerAesthetic, k, [
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
    const k = estilo('kavi/reading-space');
    const s = t.space;
    return vertical('kavi/reading-space', nm.readingSpace, k, [
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
    const k = estilo('kavi/why-i-read');
    const w = t.why;
    return vertical('kavi/why-i-read', nm.whyIRead, k, [
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
    const k = estilo('kavi/books-that-changed-me');
    const c = t.changed;
    return vertical('kavi/books-that-changed-me', nm.booksThatChangedMe, k, [
      k.mancha(0.4, 0.3, 0.56, 10, 1),
      k.titulo(c.title),
      ...[0.16, 0.43, 0.7].flatMap((y, i): (Pieza | Pieza[])[] => [
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
    const k = estilo('kavi/relationship-with-reading');
    const r = t.relationship;
    const cuadros: [string, number, number, number, string][] = [
      [r.enjoy, 0.05, 0.33, -2, BLANCO],
      [r.hard, 0.52, 0.33, 2, k.a2],
      [r.best, 0.05, 0.64, 1, k.a1],
      [r.change, 0.52, 0.64, -1, BLANCO],
    ];
    return vertical('kavi/relationship-with-reading', nm.relationshipWithReading, k, [
      k.mancha(0.25, 0.4, 0.5, 0, 0.9, k.a3),
      k.titulo(r.title),
      k.tinta(animo('happy', 0.07, 0.15, 0.17)),
      k.nota(r.lately, 0.28, 0.17, 0.64, 1.25, 0.15),
      ...cuadros.flatMap(([txt, x, y, rot, color], i): (Pieza | Pieza[])[] => [
        k.papel('memo', x, y, 0.42, rot, color),
        k.cinta(x + 0.14, y - 0.012, 0.14, rot * 3, [k.a1, k.a3, k.a2, k.a1][i], i % 2 ? 'cinta-rayas' : 'cinta-lisa'),
        k.nota(txt, x + 0.04, y + 0.07, 0.34, 1.05, 0.5),
      ]),
    ]);
  })();

  return [...yaEstaban, personalidad, favoritos, librosFavoritos, autores, generos, habitos, recuerdos, metas, estetica, rincon, porQue, cambiaron, relacion];
}
