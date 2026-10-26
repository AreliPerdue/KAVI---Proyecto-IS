import { plantillasDeJournal } from '@/constants/canvas-templates';
import { animo, asset, caja, calificacion, cancion, documento, fecha, linea, lista, type Pieza, texto, type Textos } from '@/constants/canvas-template-kit';
import { type DocumentoDeLienzo, PROPORCION_DE_DATO, PROPORCION_DE_MUESTRA, PROPORCION_DE_POLAROID } from '@/lib/library/canvas';
import { ESTE_LIBRO, type PlantillaDeLienzo } from '@/lib/library/canvas-templates';
import type { DatoDeBiblioteca } from '@/lib/library/journal-stats';

/**
 * "Yo como lector" (spec 13h, RF-CC21; T374, pedido de Areli del 26 oct 2026): las páginas sobre quien lee, no sobre un
 * libro, en recortes y en el Journal. Las seis que ya había en el Journal (Conoce a quien lee, Mis eras lectoras, Mi año
 * lector, Mis números, Premios lectores y Meta del año) y trece más a partir de los journals lectores más comunes:
 * personalidad, favoritos (cosas, libros, autores y géneros), hábitos, recuerdos, metas, estética, rincón, por qué leo,
 * libros que me cambiaron y mi relación con la lectura. Como las demás: en neutros, sin Nobi y con texto de ejemplo.
 *
 * Sus libros son **por elegir** (sin libro puesto): en un recorte no se vuelven el libro del recorte, porque hablan de
 * quien lee.
 */

/** Las de "yo como lector" que ya estaban en el Journal: salen de esa fila para no repetirse. */
export const DEL_JOURNAL_A_LECTOR = ['kavi/get-to-know', 'kavi/reading-eras', 'kavi/reading-year', 'kavi/reading-stats', 'kavi/reading-awards', 'kavi/year-goal'] as const;

const titulo = (t: string, size = 1.7): Pieza => texto(t, 0.08, 0.04, 0.84, size, 0.12);
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
const cita = (text: string, x: number, y: number, w: number, ar = 0.3): Pieza => ({ type: 'quote', x, y, w, ar, content: { text, who: '', chapter: '', note: '' } });
/** Un libro por elegir: sin libro puesto, también en un recorte. */
const porElegir = (x: number, y: number, w: number, rot = 0): Pieza => ({ type: 'book', x, y, w, ar: 1.5, rot, content: {} });
const vertical = (id: string, nombre: string, piezas: Pieza[]): PlantillaDeLienzo => ({ id, nombre, orientacion: 'portrait', doc: documento(piezas) });

/** "Este libro" de una plantilla del Journal pasa a ser por elegir. */
function sinEsteLibro(doc: DocumentoDeLienzo): DocumentoDeLienzo {
  return { ...doc, elements: doc.elements.map((e) => (e.type === 'book' && e.content.itemId === ESTE_LIBRO ? { ...e, content: { ...e.content, itemId: undefined } } : e)) };
}

export function plantillasDeLector(t: Textos, anio: number): PlantillaDeLienzo[] {
  const n = t.assetLabels;
  const nm = t.names;
  const dato = (stat: DatoDeBiblioteca, x: number, y: number, w: number): Pieza => ({ type: 'stat', x, y, w, ar: PROPORCION_DE_DATO, content: { stat, year: anio } });
  const yaEstaban = plantillasDeJournal(t, anio)
    .filter((p) => (DEL_JOURNAL_A_LECTOR as readonly string[]).includes(p.id))
    .map((p) => ({ ...p, doc: sinEsteLibro(p.doc) }));
  const p = t.personality;
  const g = t.genres;
  const h = t.habits;
  const a = t.aesthetic;
  const s = t.space;
  const w = t.why;
  const c = t.changed;
  const r = t.relationship;
  const nuevas: PlantillaDeLienzo[] = [
    vertical('kavi/reading-personality', nm.readingPersonality, [
      titulo(p.title),
      lista(p.listTitle, p.list, 0.08, 0.13, 0.5, 1.3),
      polaroid('caption', 0.62, 0.13, 0.3, 4, p.caption),
      asset('cinta-lisa', n.tape, 0.68, 0.115, 0.18, -6),
      animo('happy', 0.66, 0.47, 0.2),
      texto(p.character, 0.08, 0.66, 0.84, 1, 0.12),
      texto(p.superpower, 0.08, 0.77, 0.84, 1, 0.12),
      asset('destellos', n.sparkles, 0.8, 0.86, 0.12),
    ]),
    vertical('kavi/favorite-things', nm.favoriteThings, [
      titulo(t.favorites.title),
      ...t.favorites.boxes.flatMap((nombre, i): Pieza[] => {
        const x = i % 2 ? 0.52 : 0.08;
        const y = 0.13 + Math.floor(i / 2) * 0.205;
        // Cajitas claras para llenar (la forma gris al 25 %), con su nombre arriba.
        const marco: Pieza = { ...caja(x, y, 0.4, 0.62), style: { ...caja(x, y, 0.4, 0.62).style, opacity: 0.25 } };
        return [marco, texto(nombre, x + 0.02, y + 0.015, 0.36, 0.9, 0.1)];
      }),
    ]),
    vertical('kavi/favorite-books', nm.favoriteBooks, [
      titulo(t.favoriteBooks.title),
      ...[0, 1, 2, 3, 4].flatMap((i): Pieza[] => {
        const y = 0.12 + i * 0.165;
        return [
          texto(`${i + 1}.`, 0.05, y + 0.04, 0.08, 1.4, 0.4),
          porElegir(0.14, y, 0.12, i % 2 ? 3 : -3),
          calificacion('hearts', 0.32, y + 0.005, 0.3),
          texto(t.favoriteBooks.why, 0.32, y + 0.06, 0.6, 0.9, 0.12),
        ];
      }),
    ]),
    vertical('kavi/favorite-authors', nm.favoriteAuthors, [
      titulo(t.favoriteAuthors.title),
      ...[
        [0.08, 0.12, -3],
        [0.54, 0.12, 2],
        [0.08, 0.52, 2],
        [0.54, 0.52, -2],
      ].flatMap(([x, y, rot]): Pieza[] => [polaroid('caption', x, y, 0.36, rot, t.favoriteAuthors.author), texto(t.favoriteAuthors.best, x, y + 0.36, 0.38, 0.85, 0.1)]),
      asset('destellos', n.sparkles, 0.45, 0.46, 0.1),
    ]),
    vertical('kavi/favorite-genres', nm.favoriteGenres, [
      titulo(g.title),
      lista('', g.list, 0.08, 0.12, 0.5, 1.5),
      texto(g.colors, 0.62, 0.12, 0.3, 0.9, 0.1),
      ...[0, 1, 2, 3, 4, 5].map((i) => muestra(i % 2 ? 0.78 : 0.62, 0.17 + Math.floor(i / 2) * 0.13, 0.13)),
      texto(g.comfort, 0.08, 0.7, 0.84, 1, 0.1),
      texto(g.tryNext, 0.08, 0.8, 0.84, 1, 0.1),
      asset('destellos', n.sparkles, 0.82, 0.88, 0.1),
    ]),
    vertical('kavi/reading-habits', nm.readingHabits, [
      titulo(h.title),
      lista(h.when, h.whenList, 0.08, 0.12, 0.4, 0.9),
      lista(h.format, h.formatList, 0.52, 0.12, 0.4, 0.8),
      lista(h.with, h.withList, 0.08, 0.42, 0.4, 0.9),
      dato('hoursRead', 0.52, 0.42, 0.4),
      dato('pagesRead', 0.52, 0.62, 0.4),
      texto(h.pace, 0.08, 0.74, 0.4, 1, 0.3),
      asset('flecha-curva', n.arrow, 0.56, 0.84, 0.24),
    ]),
    vertical('kavi/reading-memories', nm.readingMemories, [
      titulo(t.memories.title),
      linea(t.memories.list, 0.08, 0.13, 0.5, 2.2),
      polaroid('caption', 0.62, 0.15, 0.3, 3, t.memories.caption),
      fecha(0.6, 0.52, 0.34),
      asset('corazon-a-mano', n.heart, 0.7, 0.72, 0.15),
    ]),
    vertical('kavi/reading-goals', nm.readingGoals, [
      titulo(t.goals.title(anio), 1.6),
      dato('booksFinished', 0.08, 0.12, 0.4),
      asset('destellos', n.sparkles, 0.74, 0.14, 0.14),
      lista('', t.goals.list, 0.08, 0.34, 0.6, 1.1),
      asset('estrella-a-mano', n.star, 0.74, 0.58, 0.18),
      texto(t.goals.word, 0.08, 0.86, 0.6, 1, 0.12),
    ]),
    vertical('kavi/reader-aesthetic', nm.readerAesthetic, [
      titulo(a.title),
      polaroid('classic', 0.07, 0.12, 0.4, -3),
      polaroid('mini', 0.52, 0.12, 0.26, 3),
      polaroid('classic', 0.56, 0.44, 0.36, 2),
      texto(a.palette, 0.08, 0.5, 0.4, 0.9, 0.1),
      ...[0, 1, 2, 3].map((i) => muestra(0.08 + i * 0.105, 0.55, 0.09)),
      texto(a.words, 0.08, 0.68, 0.42, 1, 0.5),
      cancion(a.song, 0.08, 0.86, 0.5),
      animo('calm', 0.64, 0.78, 0.16),
    ]),
    vertical('kavi/reading-space', nm.readingSpace, [
      titulo(s.title),
      polaroid('caption', 0.08, 0.12, 0.5, -2, s.caption),
      asset('cinta-lisa', n.tape, 0.22, 0.105, 0.22, -4),
      lista(s.never, s.neverList, 0.62, 0.14, 0.32, 1.3),
      asset('rama', n.branch, 0.78, 0.48, 0.12),
      texto(s.outside, 0.08, 0.68, 0.84, 1, 0.12),
      cancion(s.song, 0.08, 0.8, 0.55),
    ]),
    vertical('kavi/why-i-read', nm.whyIRead, [
      titulo(w.title),
      lista(w.reasons, w.reasonsList, 0.08, 0.12, 0.5, 1),
      asset('corazon-a-mano', n.heart, 0.66, 0.16, 0.2),
      cita(w.quote, 0.08, 0.5, 0.84, 0.36),
      texto(w.saved, 0.08, 0.74, 0.84, 1, 0.25),
      asset('destellos', n.sparkles, 0.84, 0.88, 0.1),
    ]),
    vertical('kavi/books-that-changed-me', nm.booksThatChangedMe, [
      titulo(c.title),
      ...[0.13, 0.41, 0.69].flatMap((y, i): Pieza[] => [
        porElegir(0.08, y, 0.17, i % 2 ? 3 : -3),
        texto(c.before, 0.32, y, 0.6, 0.95, 0.15),
        asset('flecha-curva', n.arrow, 0.36, y + 0.075, 0.2),
        texto(c.after, 0.32, y + 0.16, 0.6, 0.95, 0.15),
      ]),
    ]),
    vertical('kavi/relationship-with-reading', nm.relationshipWithReading, [
      titulo(r.title, 1.6),
      animo('happy', 0.08, 0.13, 0.18),
      texto(r.lately, 0.32, 0.16, 0.6, 1.1, 0.15),
      ...[
        [r.enjoy, 0.06, 0.32, -1],
        [r.hard, 0.52, 0.32, 1],
        [r.best, 0.06, 0.64, 1],
        [r.change, 0.52, 0.64, -1],
      ].flatMap(([txt, x, y, rot]): Pieza[] => [asset('memo', n.memo, x as number, y as number, 0.42, rot as number), texto(txt as string, (x as number) + 0.04, (y as number) + 0.08, 0.34, 0.9, 0.5)]),
    ]),
  ];
  return [...yaEstaban, ...nuevas];
}
