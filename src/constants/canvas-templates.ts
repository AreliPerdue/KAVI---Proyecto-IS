import {
  type DocumentoDeLienzo,
  documentoValido,
  type ElementoDeLienzo,
  PROPORCION_DE_DATO,
  PROPORCION_DE_MUESTRA,
  PROPORCION_DE_POLAROID,
  PROPORCION_NUEVA,
} from '@/lib/library/canvas';
import type { DatoDeBiblioteca } from '@/lib/library/journal-stats';
import { ESTE_LIBRO, type PlantillaDeLienzo } from '@/lib/library/canvas-templates';
import { ASSETS_DE_LIENZO, type NombreDeAsset } from '@/constants/canvas-assets';
import type { Dictionary } from '@/i18n/types';

/**
 * Las plantillas de Recortes de KAVI (spec 13h, RF-CC21; T344): Reseña del libro, Collage de personaje, Citas
 * favoritas, Experiencia de lectura y Cementerio DNF. Son puntos de partida en neutros —sin colores ni Nobi puestos
 * (criterio de 13h §13)— con texto de ejemplo en el idioma de la app; al usarlas se copian y todo se cambia.
 *
 * Viven en el cliente, como el catálogo de ejercicios: crecen sin migraciones (13h §10). Las medidas van en 0–1 de la
 * página (vertical, 1 : √2): `y` y la altura cuentan sobre el alto de la página.
 */

type Textos = Dictionary['library']['canvas']['templates'];
type Pieza = Partial<Omit<ElementoDeLienzo, 'id' | 'type' | 'z'>> & Pick<ElementoDeLienzo, 'type'>;

const proporcion = (nombre: NombreDeAsset) => ASSETS_DE_LIENZO.find((a) => a.id === `basicos/${nombre}`)?.ar ?? 1;

function documento(piezas: Pieza[]): DocumentoDeLienzo {
  return documentoValido({
    pages: 1,
    elements: piezas.map((p, i) => ({ id: `k${i + 1}`, z: i + 1, page: 1, rot: 0, locked: false, group: null, style: {}, content: {}, ...p })),
  });
}

const texto = (text: string, x: number, y: number, w: number, size = 1, ar = 0.3): Pieza => ({ type: 'textbox', x, y, w, ar, style: { size }, content: { text } });
const asset = (nombre: NombreDeAsset, label: string, x: number, y: number, w: number, rot = 0): Pieza => ({
  type: 'asset',
  x,
  y,
  w,
  ar: proporcion(nombre),
  rot,
  content: { asset: `basicos/${nombre}`, label, mode: /destellos|flecha|rama|lazo|costura|a-mano/.test(nombre) ? 'trazo' : 'textura' },
});

/**
 * Las plantillas de página del Journal (13h, RF-CC21; T347, T349): "yo como lector". Conoce a quien lee y Mi año
 * lector, con los datos de la biblioteca de `anio` (los libros terminados, las páginas y las horas, contados en vivo;
 * RF-CC22). Sus libros quedan por elegir (en un Journal no hay "este libro").
 */
export function plantillasDeJournal(t: Textos, anio: number): PlantillaDeLienzo[] {
  const n = t.assetLabels;
  const g = t.getToKnow;
  const y = t.readingYear;
  const dato = (stat: DatoDeBiblioteca, x: number, alto = 0.12, w = 0.27): Pieza => ({ type: 'stat', x, y: alto, w, ar: PROPORCION_DE_DATO, content: { stat, year: anio } });
  const st = t.stats;
  const aw = t.awards;
  return [
    {
      id: 'kavi/get-to-know',
      nombre: t.names.getToKnow,
      orientacion: 'portrait',
      doc: documento([
        texto(g.title, 0.08, 0.04, 0.84, 1.8, 0.12),
        { type: 'polaroid', x: 0.07, y: 0.13, w: 0.4, ar: PROPORCION_DE_POLAROID.caption, rot: -3, content: { variant: 'caption', paths: [''], text: g.caption } },
        asset('cinta-lisa', n.tape, 0.17, 0.115, 0.2, -6),
        asset('hoja-de-libreta', n.notebook, 0.52, 0.12, 0.42, 2),
        texto(g.me, 0.58, 0.16, 0.32, 0.9, 1.1),
        asset('memo', n.memo, 0.07, 0.5, 0.44, -1),
        texto(g.book, 0.12, 0.55, 0.34, 0.9, 0.8),
        texto(g.how, 0.56, 0.52, 0.38, 0.9, 1),
        texto(g.love, 0.3, 0.83, 0.4, 1, 0.12),
        { type: 'rating', x: 0.3, y: 0.88, w: 0.4, ar: 0.2, content: { scale: 'hearts', value: 0 } },
        asset('corazon-a-mano', n.heart, 0.08, 0.85, 0.13),
        asset('destellos', n.sparkles, 0.8, 0.85, 0.13),
      ]),
    },
    {
      id: 'kavi/reading-year',
      nombre: t.names.readingYear,
      orientacion: 'portrait',
      doc: documento([
        texto(y.title(anio), 0.08, 0.04, 0.84, 1.8, 0.12),
        dato('booksFinished', 0.06),
        dato('pagesRead', 0.365),
        dato('hoursRead', 0.67),
        texto(y.favorite, 0.08, 0.27, 0.3, 1, 0.12),
        { type: 'book', x: 0.1, y: 0.31, w: 0.26, ar: 1.5, rot: -3, content: { itemId: ESTE_LIBRO } },
        asset('cinta-lisa', n.tape, 0.15, 0.3, 0.16, -6),
        asset('hoja-de-libreta', n.notebook, 0.46, 0.27, 0.46, 2),
        texto(y.lists, 0.52, 0.31, 0.36, 0.9, 1),
        { type: 'quote', x: 0.08, y: 0.6, w: 0.62, ar: 0.36, content: { text: y.quote, who: '', chapter: '', note: '' } },
        texto(y.rating, 0.28, 0.82, 0.44, 1, 0.12),
        { type: 'rating', x: 0.3, y: 0.87, w: 0.4, ar: 0.2, content: { scale: 'hearts', value: 0 } },
        asset('destellos', n.sparkles, 0.82, 0.84, 0.12),
      ]),
    },
    {
      // T349b: los números del año más grandes, por trimestre, y las metas del siguiente.
      id: 'kavi/reading-stats',
      nombre: t.names.readingStats,
      orientacion: 'portrait',
      doc: documento([
        texto(st.title(anio), 0.08, 0.04, 0.84, 1.8, 0.12),
        dato('booksFinished', 0.08, 0.12, 0.38),
        dato('pagesRead', 0.54, 0.12, 0.38),
        dato('hoursRead', 0.31, 0.3, 0.38),
        { type: 'timeline', x: 0.06, y: 0.5, w: 0.44, ar: PROPORCION_NUEVA.timeline, content: { items: st.quarters.map((text) => ({ text })) } },
        { type: 'checklist', x: 0.54, y: 0.52, w: 0.4, ar: PROPORCION_NUEVA.checklist, content: { text: st.goals, items: [{ text: '' }, { text: '' }, { text: '' }] } },
        asset('destellos', n.sparkles, 0.82, 0.86, 0.12),
      ]),
    },
    {
      // T349b: seis premios, cada uno con su libro por elegir.
      id: 'kavi/reading-awards',
      nombre: t.names.readingAwards,
      orientacion: 'portrait',
      doc: documento([
        texto(aw.title(anio), 0.08, 0.04, 0.84, 1.8, 0.12),
        ...aw.list.flatMap((premio, i): Pieza[] => {
          const x = i % 2 === 0 ? 0.08 : 0.54;
          const alto = 0.13 + Math.floor(i / 2) * 0.29;
          return [texto(premio, x, alto, 0.38, 1, 0.16), { type: 'book', x: x + 0.1, y: alto + 0.05, w: 0.17, ar: 1.5, rot: i % 2 ? 3 : -3, content: { itemId: ESTE_LIBRO } }];
        }),
        asset('estrella-a-mano', n.star, 0.86, 0.05, 0.1),
      ]),
    },
  ];
}

export function plantillasDeKavi(t: Textos): PlantillaDeLienzo[] {
  const n = t.assetLabels;
  return [
    {
      id: 'kavi/book-review',
      nombre: t.names.bookReview,
      orientacion: 'portrait',
      doc: documento([
        asset('papel-con-fibras', n.paper, 0.06, 0.04, 0.5, -2),
        { type: 'book', x: 0.14, y: 0.08, w: 0.34, ar: 1.5, rot: -2, content: { itemId: ESTE_LIBRO } },
        asset('cinta-lisa', n.tape, 0.18, 0.05, 0.24, -8),
        texto(t.bookReview.title, 0.6, 0.07, 0.36, 1.6),
        { type: 'rating', x: 0.6, y: 0.15, w: 0.34, ar: 0.2, content: { scale: 'stars', value: 0 } },
        { type: 'quote', x: 0.58, y: 0.22, w: 0.38, ar: 0.6, content: { text: t.bookReview.quote, who: '', chapter: '', note: '' } },
        asset('memo', n.memo, 0.2, 0.5, 0.6),
        texto(t.bookReview.body, 0.27, 0.6, 0.46, 1, 0.6),
        asset('destellos', n.sparkles, 0.82, 0.86, 0.14),
      ]),
    },
    {
      id: 'kavi/character-collage',
      nombre: t.names.characterCollage,
      orientacion: 'portrait',
      doc: documento([
        texto(t.character.name, 0.08, 0.04, 0.84, 2, 0.12),
        { type: 'polaroid', x: 0.28, y: 0.12, w: 0.44, ar: PROPORCION_DE_POLAROID.classic, rot: -3, content: { variant: 'classic', paths: [''], text: t.character.caption } },
        asset('cinta-rayas', n.tape, 0.4, 0.11, 0.2, 4),
        { type: 'polaroid', x: 0.05, y: 0.52, w: 0.26, ar: PROPORCION_DE_POLAROID.mini, rot: 5, content: { variant: 'mini', paths: [''], text: '' } },
        { type: 'polaroid', x: 0.69, y: 0.52, w: 0.26, ar: PROPORCION_DE_POLAROID.mini, rot: -6, content: { variant: 'mini', paths: [''], text: '' } },
        asset('papel-rasgado', n.paper, 0.33, 0.55, 0.34),
        texto(t.character.traits, 0.37, 0.6, 0.26, 0.9, 0.9),
        asset('corazon-a-mano', n.heart, 0.08, 0.86, 0.14),
        asset('flecha-curva', n.arrow, 0.66, 0.86, 0.26),
      ]),
    },
    {
      id: 'kavi/favorite-quotes',
      nombre: t.names.favoriteQuotes,
      orientacion: 'portrait',
      doc: documento([
        texto(t.quotes.title, 0.08, 0.04, 0.84, 1.8, 0.12),
        { type: 'quote', x: 0.08, y: 0.13, w: 0.7, ar: 0.42, content: { text: t.quotes.example, who: '', chapter: '', note: '' } },
        asset('cinta-puntos', n.tape, 0.6, 0.12, 0.22, 12),
        { type: 'quote', x: 0.22, y: 0.41, w: 0.7, ar: 0.42, content: { text: t.quotes.example, who: '', chapter: '', note: '' } },
        asset('cinta-cuadros', n.tape, 0.18, 0.4, 0.22, -10),
        { type: 'quote', x: 0.08, y: 0.69, w: 0.7, ar: 0.42, content: { text: t.quotes.example, who: '', chapter: '', note: '' } },
        asset('estrella-a-mano', n.star, 0.8, 0.82, 0.14),
      ]),
    },
    {
      id: 'kavi/reading-experience',
      nombre: t.names.readingExperience,
      orientacion: 'portrait',
      doc: documento([
        texto(t.experience.title, 0.08, 0.04, 0.84, 1.8, 0.12),
        asset('hoja-de-libreta', n.notebook, 0.06, 0.12, 0.5, -2),
        texto(t.experience.when, 0.16, 0.17, 0.36, 0.9, 1),
        { type: 'polaroid', x: 0.6, y: 0.13, w: 0.34, ar: PROPORCION_DE_POLAROID.caption, rot: 4, content: { variant: 'caption', paths: [''], text: t.experience.caption } },
        texto(t.experience.felt, 0.55, 0.47, 0.4, 1, 0.12),
        { type: 'rating', x: 0.56, y: 0.52, w: 0.38, ar: 0.2, content: { scale: 'hearts', value: 0 } },
        asset('papel-cuadriculado', n.paper, 0.08, 0.63, 0.42),
        texto(t.experience.left, 0.12, 0.67, 0.34, 0.9, 0.7),
        asset('circulo-a-mano', n.circle, 0.55, 0.66, 0.38),
        texto(t.experience.recommend, 0.61, 0.74, 0.26, 1, 0.3),
      ]),
    },
    {
      id: 'kavi/dnf-graveyard',
      nombre: t.names.dnfGraveyard,
      orientacion: 'portrait',
      doc: documento([
        asset('papel-arrugado', n.paper, 0.08, 0.05, 0.84, 1),
        texto(t.dnf.title, 0.2, 0.1, 0.6, 2.2, 0.16),
        { type: 'book', x: 0.36, y: 0.2, w: 0.28, ar: 1.5, rot: -4, content: { itemId: ESTE_LIBRO } },
        texto(t.dnf.page, 0.2, 0.52, 0.6, 1, 0.1),
        texto(t.dnf.why, 0.2, 0.58, 0.6, 1, 0.3),
        asset('costura', n.stitches, 0.2, 0.72, 0.6),
        texto(t.dnf.rest, 0.2, 0.79, 0.6, 1.4, 0.12),
        asset('rama', n.branch, 0.1, 0.76, 0.12),
        asset('rama', n.branch, 0.78, 0.76, 0.12, 8),
      ]),
    },
    {
      // T349b: la estética del libro: fotos, sus colores, el mood, palabras y su canción.
      id: 'kavi/moodboard',
      nombre: t.names.moodboard,
      orientacion: 'portrait',
      doc: documento([
        texto(t.moodboard.title, 0.08, 0.04, 0.84, 1.8, 0.12),
        { type: 'polaroid', x: 0.05, y: 0.12, w: 0.3, ar: PROPORCION_DE_POLAROID.classic, rot: -4, content: { variant: 'classic', paths: [''], text: '' } },
        asset('cinta-lisa', n.tape, 0.11, 0.11, 0.16, -8),
        { type: 'polaroid', x: 0.39, y: 0.11, w: 0.24, ar: PROPORCION_DE_POLAROID.mini, rot: 3, content: { variant: 'mini', paths: [''], text: '' } },
        { type: 'polaroid', x: 0.67, y: 0.13, w: 0.28, ar: PROPORCION_DE_POLAROID.classic, rot: 5, content: { variant: 'classic', paths: [''], text: '' } },
        { type: 'swatch', x: 0.06, y: 0.45, w: 0.16, ar: PROPORCION_DE_MUESTRA, content: { text: '' } },
        { type: 'swatch', x: 0.25, y: 0.45, w: 0.16, ar: PROPORCION_DE_MUESTRA, content: { text: '' } },
        { type: 'swatch', x: 0.44, y: 0.45, w: 0.16, ar: PROPORCION_DE_MUESTRA, content: { text: '' } },
        { type: 'mood', x: 0.7, y: 0.45, w: 0.22, ar: PROPORCION_NUEVA.mood, content: { mood: 'calm', text: '' } },
        texto(t.moodboard.words, 0.08, 0.66, 0.4, 1.1, 0.7),
        { type: 'song', x: 0.54, y: 0.68, w: 0.4, ar: PROPORCION_NUEVA.song, content: { text: t.moodboard.song, who: '' } },
        asset('destellos', n.sparkles, 0.82, 0.88, 0.12),
      ]),
    },
    {
      // T349b: un personaje a fondo: su foto, quién es, sus rasgos, su frase y lo que se siente por él.
      id: 'kavi/character-analysis',
      nombre: t.names.characterAnalysis,
      orientacion: 'portrait',
      doc: documento([
        texto(t.analysis.title, 0.08, 0.04, 0.84, 1.8, 0.12),
        { type: 'polaroid', x: 0.06, y: 0.12, w: 0.38, ar: PROPORCION_DE_POLAROID.caption, rot: -3, content: { variant: 'caption', paths: [''], text: t.analysis.caption } },
        texto(t.analysis.about, 0.5, 0.13, 0.44, 0.9, 0.7),
        { type: 'checklist', x: 0.5, y: 0.36, w: 0.42, ar: PROPORCION_NUEVA.checklist, content: { text: t.analysis.traits, items: [{ text: '' }, { text: '' }, { text: '' }] } },
        { type: 'quote', x: 0.06, y: 0.6, w: 0.5, ar: 0.42, content: { text: t.analysis.quote, who: '', chapter: '', note: '' } },
        { type: 'mood', x: 0.66, y: 0.66, w: 0.22, ar: PROPORCION_NUEVA.mood, content: { mood: 'inLove', text: '' } },
        texto(t.analysis.loves, 0.06, 0.8, 0.5, 0.9, 0.35),
        { type: 'rating', x: 0.6, y: 0.88, w: 0.34, ar: 0.2, content: { scale: 'hearts', value: 0 } },
      ]),
    },
  ];
}
