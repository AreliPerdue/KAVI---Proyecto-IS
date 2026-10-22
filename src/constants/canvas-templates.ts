import { type DocumentoDeLienzo, documentoValido, type ElementoDeLienzo, PROPORCION_DE_POLAROID } from '@/lib/library/canvas';
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
 * Las plantillas de página del Journal (13h, RF-CC21; T347): "yo como lector". Por ahora, Conoce a quien lee; el año
 * lector, las estadísticas y los premios llegan con los datos (C6).
 */
export function plantillasDeJournal(t: Textos): PlantillaDeLienzo[] {
  const n = t.assetLabels;
  const g = t.getToKnow;
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
  ];
}
