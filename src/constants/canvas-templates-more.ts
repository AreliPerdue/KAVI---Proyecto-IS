import { animo, asset, caja, calificacion, cancion, documento, fecha, libro, linea, lista, type Pieza, texto, type Textos } from '@/constants/canvas-template-kit';
import { PROPORCION_DE_DATO, PROPORCION_DE_MUESTRA, PROPORCION_DE_POLAROID } from '@/lib/library/canvas';
import type { PlantillaDeLienzo } from '@/lib/library/canvas-templates';

/**
 * Más plantillas de KAVI (spec 13h, RF-CC21; T368, pedido de Areli del 22 oct 2026): las que faltaban de la lista de
 * la spec y las más comunes de los journals lectores (TBR, librero para colorear, bingo, sagas, tropes, A–Z, meta y
 * resumen del mes). Como las demás: en neutros, sin Nobi, con texto de ejemplo en el idioma de la app; sus colores se
 * eligen al usarlas ("Colores de la página").
 */

const titulo = (t: string, size = 1.8): Pieza => texto(t, 0.08, 0.04, 0.84, size, 0.12);
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
const cita = (text: string, x: number, y: number, w: number, ar = 0.4): Pieza => ({ type: 'quote', x, y, w, ar, content: { text, who: '', chapter: '', note: '' } });
const vertical = (id: string, nombre: string, piezas: Pieza[]): PlantillaDeLienzo => ({ id, nombre, orientacion: 'portrait', doc: documento(piezas) });

/** Las de un recorte de un libro ("yo con este libro"). */
export function plantillasDeRecorteMas(t: Textos): PlantillaDeLienzo[] {
  const n = t.assetLabels;
  const nm = t.names;
  return [
    vertical('kavi/theory-board', nm.theoryBoard, [
      titulo(t.theory.title),
      asset('memo', n.memo, 0.06, 0.12, 0.42, -2),
      texto(t.theory.theory(1), 0.11, 0.16, 0.34, 0.9, 0.7),
      asset('memo', n.memo, 0.52, 0.14, 0.42, 2),
      texto(t.theory.theory(2), 0.57, 0.18, 0.34, 0.9, 0.7),
      asset('flecha-curva', n.arrow, 0.4, 0.42, 0.2),
      lista(t.theory.clues, ['', '', ''], 0.06, 0.48, 0.42, 1),
      asset('papel-cuadriculado', n.paper, 0.5, 0.46, 0.44),
      texto(t.theory.theory(3), 0.55, 0.5, 0.36, 0.9, 0.7),
      texto(t.theory.right, 0.08, 0.84, 0.4, 1, 0.12),
      animo('surprised', 0.5, 0.8, 0.14),
      calificacion('stars', 0.66, 0.84, 0.28),
    ]),
    vertical('kavi/predictions', nm.predictions, [
      titulo(t.predictions.title),
      libro(0.08, 0.12, 0.22, -3),
      lista(t.predictions.list, ['', '', '', ''], 0.36, 0.12, 0.56, 0.9),
      asset('hoja-de-libreta', n.notebook, 0.06, 0.52, 0.5, -1),
      texto(t.predictions.ending, 0.12, 0.56, 0.4, 1, 0.8),
      texto(t.predictions.sure, 0.6, 0.62, 0.34, 1, 0.12),
      calificacion('stars', 0.6, 0.67, 0.34),
      asset('destellos', n.sparkles, 0.82, 0.86, 0.12),
    ]),
    vertical('kavi/soundtrack', nm.soundtrack, [
      titulo(t.soundtrack.title),
      cancion(t.soundtrack.song(1), 0.08, 0.13, 0.6),
      cancion(t.soundtrack.song(2), 0.32, 0.33, 0.6),
      cancion(t.soundtrack.song(3), 0.08, 0.53, 0.6),
      cancion(t.soundtrack.song(4), 0.32, 0.73, 0.6),
      asset('cinta-rayas', n.tape, 0.7, 0.12, 0.22, 10),
      asset('destellos', n.sparkles, 0.8, 0.55, 0.12),
      asset('corazon-a-mano', n.heart, 0.06, 0.78, 0.12),
    ]),
    vertical('kavi/book-dna', nm.bookDna, [
      titulo(t.dna.title),
      libro(0.08, 0.12, 0.26, -2),
      asset('papel-con-fibras', n.paper, 0.4, 0.11, 0.54),
      texto(t.dna.rows, 0.46, 0.15, 0.44, 0.95, 1.1),
      texto(t.dna.colors, 0.08, 0.5, 0.4, 1, 0.12),
      muestra(0.08, 0.55, 0.14),
      muestra(0.24, 0.55, 0.14),
      muestra(0.4, 0.55, 0.14),
      animo('happy', 0.62, 0.52, 0.2),
      asset('costura', n.stitches, 0.08, 0.76, 0.4),
      calificacion('hearts', 0.56, 0.8, 0.36),
    ]),
    vertical('kavi/book-passport', nm.bookPassport, [
      titulo(t.passport.title),
      texto(t.passport.start, 0.08, 0.12, 0.38, 0.9, 0.1),
      fecha(0.08, 0.16, 0.38),
      texto(t.passport.end, 0.54, 0.12, 0.38, 0.9, 0.1),
      fecha(0.54, 0.16, 0.38),
      polaroid('caption', 0.08, 0.3, 0.34, -3, t.passport.caption),
      asset('ticket', n.paper, 0.5, 0.32, 0.42, 4),
      texto(t.passport.places, 0.54, 0.36, 0.36, 0.9, 0.9),
      asset('etiqueta', n.paper, 0.64, 0.62, 0.26, -6),
      libro(0.14, 0.7, 0.2, 4),
      asset('destellos', n.sparkles, 0.85, 0.88, 0.1),
    ]),
    vertical('kavi/emotional-damage', nm.emotionalDamage, [
      titulo(t.damage.title, 1.6),
      animo('crying', 0.08, 0.13, 0.24),
      texto(t.damage.level, 0.4, 0.14, 0.5, 1, 0.1),
      calificacion('number', 0.42, 0.19, 0.36),
      lista(t.damage.symptoms, t.damage.symptomList, 0.08, 0.38, 0.5, 0.9),
      texto(t.damage.guilty, 0.62, 0.4, 0.32, 1, 0.4),
      cita(t.damage.quote, 0.08, 0.74, 0.6, 0.36),
      asset('corazon-a-mano', n.heart, 0.78, 0.8, 0.14),
    ]),
    vertical('kavi/would-i-survive', nm.wouldISurvive, [
      titulo(t.survive.title, 1.6),
      polaroid('caption', 0.08, 0.12, 0.36, -3, t.survive.caption),
      texto(t.survive.role, 0.5, 0.13, 0.44, 0.95, 0.75),
      lista(t.survive.skills, ['', '', ''], 0.5, 0.4, 0.42, 0.9),
      texto(t.survive.odds, 0.08, 0.56, 0.38, 1, 0.12),
      calificacion('stars', 0.08, 0.61, 0.38),
      animo('scared', 0.2, 0.7, 0.18),
      asset('rama', n.branch, 0.06, 0.8, 0.12),
      asset('flecha-curva', n.arrow, 0.7, 0.78, 0.22),
    ]),
    vertical('kavi/book-club', nm.bookClub, [
      titulo(t.club.title),
      fecha(0.08, 0.12, 0.4),
      libro(0.62, 0.11, 0.2, 3),
      lista(t.club.questions, ['', '', '', ''], 0.08, 0.24, 0.5, 0.9),
      texto(t.club.others, 0.64, 0.42, 0.3, 0.9, 1.2),
      cita('', 0.06, 0.6, 0.56, 0.4),
      texto(t.club.verdict, 0.08, 0.86, 0.4, 1, 0.1),
      calificacion('stars', 0.5, 0.85, 0.4),
    ]),
  ];
}

/** Las de una página del Journal ("yo como lector"). `anio`: el año de la meta. */
export function plantillasDeJournalMas(t: Textos, anio: number): PlantillaDeLienzo[] {
  const n = t.assetLabels;
  const nm = t.names;
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  return [
    vertical('kavi/reading-eras', nm.readingEras, [
      titulo(t.eras.title),
      linea(t.eras.list, 0.08, 0.14, 0.5, 2.2),
      libro(0.66, 0.14, 0.2, 3),
      libro(0.66, 0.36, 0.2, -3),
      libro(0.66, 0.58, 0.2, 3),
      libro(0.67, 0.78, 0.18, -2),
    ]),
    vertical('kavi/monthly-tbr', nm.monthlyTbr, [
      titulo(t.tbr.title),
      lista('', ['', '', '', '', '', '', '', ''], 0.08, 0.12, 0.5, 1.4),
      libro(0.62, 0.12, 0.15, -3),
      libro(0.78, 0.14, 0.15, 3),
      libro(0.62, 0.36, 0.15, 2),
      libro(0.78, 0.38, 0.15, -2),
      texto(t.tbr.excited, 0.08, 0.68, 0.5, 1, 0.12),
      libro(0.12, 0.74, 0.16, -2),
      animo('happy', 0.62, 0.66, 0.2),
      asset('destellos', n.sparkles, 0.84, 0.88, 0.1),
    ]),
    vertical('kavi/bookshelf', nm.bookshelf, [
      titulo(t.shelf.title),
      texto(t.shelf.hint, 0.08, 0.1, 0.84, 0.9, 0.08),
      // Tres repisas de diez lomos de distintas alturas, todos apoyados en su repisa: se colorean con Estilo.
      ...[0, 1, 2].flatMap((r): Pieza[] => {
        const base = 0.17 + r * 0.27 + 0.21;
        const lomos = Array.from({ length: 10 }, (_, i): Pieza => {
          const ar = 4.4 + ((i * 7 + r * 3) % 5) * 0.2;
          return caja(0.1 + i * 0.08, base - (0.06 * ar) / Math.SQRT2, 0.06, ar);
        });
        return [...lomos, caja(0.06, base + 0.004, 0.88, 0.02)];
      }),
    ]),
    vertical('kavi/bingo', nm.bingo, [
      titulo(t.bingo.title),
      ...t.bingo.squares.flatMap((casilla, i): Pieza[] => {
        const x = 0.065 + (i % 5) * 0.175;
        const y = 0.13 + Math.floor(i / 5) * 0.165;
        return [caja(x, y, 0.17, 1), texto(casilla, x + 0.01, y + 0.034, 0.15, 0.75, 0.5)];
      }),
    ]),
    vertical('kavi/series-tracker', nm.seriesTracker, [
      titulo(t.series.title),
      ...[
        [0.08, 0.12],
        [0.52, 0.12],
        [0.08, 0.5],
        [0.52, 0.5],
      ].map(([x, y]) => lista(t.series.saga, ['#1', '#2', '#3', '#4', '#5'], x, y, 0.4, 1)),
      asset('destellos', n.sparkles, 0.84, 0.88, 0.1),
    ]),
    vertical('kavi/tropes', nm.tropes, [
      titulo(t.tropes.title, 1.6),
      asset('corazon-a-mano', n.heart, 0.08, 0.12, 0.1),
      lista(t.tropes.love, t.tropes.loveList, 0.08, 0.2, 0.5, 0.9),
      animo('inLove', 0.66, 0.2, 0.2),
      lista(t.tropes.nope, t.tropes.nopeList, 0.44, 0.56, 0.5, 0.8),
      animo('angry', 0.12, 0.62, 0.2),
    ]),
    vertical('kavi/alphabet', nm.alphabet, [
      titulo(t.alphabet.title),
      ...letras.map((letra, i) => texto(`${letra} — `, i < 13 ? 0.08 : 0.52, 0.12 + (i % 13) * 0.062, 0.4, 0.95, 0.12)),
    ]),
    vertical('kavi/year-goal', nm.yearGoal, [
      titulo(t.goal.title(anio), 1.6),
      // El termómetro: el tubo y el bulbo, para colorearlo conforme se avanza.
      caja(0.14, 0.14, 0.1, 7.4),
      { type: 'shape', x: 0.09, y: 0.64, w: 0.2, ar: 1, style: { border: { width: 0.003, color: '#1A1A1A' } }, content: { shape: 'ellipse' } },
      { type: 'stat', x: 0.42, y: 0.16, w: 0.46, ar: PROPORCION_DE_DATO, content: { stat: 'booksFinished', year: anio } },
      texto(t.goal.steps, 0.42, 0.42, 0.46, 1, 0.1),
      lista('', t.goal.milestones, 0.42, 0.47, 0.46, 0.8),
      asset('destellos', n.sparkles, 0.8, 0.85, 0.12),
    ]),
    vertical('kavi/month-wrap-up', nm.monthWrapUp, [
      titulo(t.month.title, 1.6),
      ...[0.08, 0.31, 0.54, 0.77].flatMap((x, i): Pieza[] => [libro(x, 0.14, 0.17, i % 2 ? 3 : -3), calificacion('stars', x - 0.01, 0.34, 0.19)]),
      texto(t.month.best, 0.08, 0.44, 0.4, 1, 0.3),
      texto(t.month.worst, 0.54, 0.44, 0.4, 1, 0.3),
      animo('happy', 0.08, 0.62, 0.18),
      texto(t.month.feel, 0.3, 0.66, 0.5, 1, 0.12),
      fecha(0.54, 0.82, 0.38),
      asset('destellos', n.sparkles, 0.1, 0.86, 0.1),
    ]),
  ];
}
