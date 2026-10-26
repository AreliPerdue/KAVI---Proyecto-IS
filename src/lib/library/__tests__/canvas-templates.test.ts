/** Plantillas del lienzo creativo (13h, RF-CC18 – RF-CC21; T344): usarlas copia; guardarlas quita lo personal. */
import { plantillasDeJournal, plantillasDeKavi } from '@/constants/canvas-templates';
import { DEL_JOURNAL_A_LECTOR, ESTILO_DE_LECTOR, plantillasDeLector } from '@/constants/canvas-templates-reader';
import { coloresDe, conColores } from '@/lib/library/canvas';
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';
import { documentoValido } from '@/lib/library/canvas';
import { comoPlantilla, ESTE_LIBRO, usarPlantilla } from '@/lib/library/canvas-templates';

const base = { page: 1, x: 0.1, y: 0.1, w: 0.3, ar: 1, rot: 0, locked: false, style: {} };
const doc = documentoValido({
  pages: 1,
  elements: [
    { ...base, id: 'a', z: 1, type: 'shape', group: 'g1', content: { shape: 'heart' } },
    { ...base, id: 'b', z: 2, type: 'textbox', group: 'g1', content: { text: 'Hola' } },
    { ...base, id: 'c', z: 3, type: 'book', content: { itemId: 'l1' } },
    { ...base, id: 'd', z: 4, type: 'book', content: { itemId: 'otro' } },
    { ...base, id: 'e', z: 5, type: 'image', content: { path: 'u/l1/anotaciones/e.jpg' } },
    { ...base, id: 'f', z: 6, type: 'polaroid', content: { variant: 'double', paths: ['u/l1/anotaciones/f1.jpg', ''], text: 'París' } },
  ],
});

it('guardar como plantilla quita imágenes y fotos, y el libro del recorte queda como "este libro"', () => {
  const p = comoPlantilla(doc, 'l1');
  expect(p.elements.map((e) => e.id)).toEqual(['a', 'b', 'c', 'd', 'f']);
  expect(p.elements.find((e) => e.id === 'c')?.content.itemId).toBe(ESTE_LIBRO);
  expect(p.elements.find((e) => e.id === 'd')?.content.itemId).toBe('otro');
  expect(p.elements.find((e) => e.id === 'f')?.content).toEqual({ variant: 'double', paths: ['', ''], text: 'París' });
});

it('usar una plantilla da ids nuevos (también a sus grupos) y pone el libro donde se usa', () => {
  let n = 0;
  const nuevo = usarPlantilla(comoPlantilla(doc, 'l1'), 'l9', () => `n${++n}`);
  expect(nuevo.elements.every((e) => e.id.startsWith('n'))).toBe(true);
  const [a, b] = nuevo.elements;
  expect(a.group).toBe(b.group);
  expect(a.group).not.toBe('g1');
  expect(nuevo.elements.find((e) => e.type === 'book' && e.content.itemId === 'l9')).toBeTruthy();
});

describe('plantillas de KAVI', () => {
  it('las de recortes: con nombre en los dos idiomas y todo lo que traen es válido (T344, T349b, T368)', () => {
    for (const idioma of [es, en]) {
      const lista = plantillasDeKavi(idioma.library.canvas.templates);
      expect(lista.map((p) => p.id)).toEqual([
        'kavi/book-review',
        'kavi/character-collage',
        'kavi/favorite-quotes',
        'kavi/reading-experience',
        'kavi/dnf-graveyard',
        'kavi/moodboard',
        'kavi/character-analysis',
        'kavi/theory-board',
        'kavi/predictions',
        'kavi/soundtrack',
        'kavi/book-dna',
        'kavi/book-passport',
        'kavi/emotional-damage',
        'kavi/would-i-survive',
        'kavi/book-club',
      ]);
      for (const p of lista) {
        expect(p.nombre).toBeTruthy();
        expect(p.doc.elements.length).toBeGreaterThan(5);
      }
    }
    expect(plantillasDeKavi(en.library.canvas.templates)[0].nombre).toBe('Book Review');
  });

  it('no traen colores ni Nobi puestos (13h §13), y el libro es "este libro"', () => {
    for (const p of plantillasDeKavi(es.library.canvas.templates)) {
      expect(p.doc.background).toBeUndefined();
      for (const e of p.doc.elements) {
        expect(e.style.color).toBeUndefined();
        expect(e.type).not.toBe('sticker');
        if (e.type === 'book') expect(e.content.itemId).toBe(ESTE_LIBRO);
        expect(e.x).toBeGreaterThanOrEqual(0);
        expect(e.x + e.w).toBeLessThanOrEqual(1.01);
      }
    }
  });
});

describe('plantillas del Journal (T347, T349)', () => {
  it('Conoce a quien lee, Mi año lector, Mis números y Premios: en los dos idiomas, verticales, en neutros, sin Nobi', () => {
    for (const idioma of [es, en]) {
      const lista = plantillasDeJournal(idioma.library.canvas.templates, 2026);
      expect(lista.map((p) => p.id)).toEqual([
        'kavi/get-to-know',
        'kavi/reading-year',
        'kavi/reading-stats',
        'kavi/reading-awards',
        'kavi/reading-eras',
        'kavi/monthly-tbr',
        'kavi/bookshelf',
        'kavi/bingo',
        'kavi/series-tracker',
        'kavi/tropes',
        'kavi/alphabet',
        'kavi/year-goal',
        'kavi/month-wrap-up',
      ]);
      for (const p of lista) {
        expect(p.orientacion).toBe('portrait');
        expect(p.doc.elements.length).toBeGreaterThan(5);
        expect(p.doc.background).toBeUndefined();
        for (const e of p.doc.elements) {
          expect(e.style.color).toBeUndefined();
          expect(e.type).not.toBe('sticker');
          // Un libro en una plantilla del Journal queda por elegir.
          if (e.type === 'book') expect(e.content.itemId).toBe(ESTE_LIBRO);
          expect(e.x + e.w).toBeLessThanOrEqual(1.01);
        }
      }
    }
    expect(plantillasDeJournal(en.library.canvas.templates, 2026).map((p) => p.nombre).slice(0, 4)).toEqual(['Get to Know the Reader', 'My Reading Year', 'Reading Stats', 'Reading Awards']);
  });

  it('Mi año lector trae los tres datos del año en que se usa (RF-CC22)', () => {
    const [, anio] = plantillasDeJournal(es.library.canvas.templates, 2027);
    expect(anio.doc.elements.filter((e) => e.type === 'stat').map((e) => [e.content.stat, e.content.year])).toEqual([
      ['booksFinished', 2027],
      ['pagesRead', 2027],
      ['hoursRead', 2027],
    ]);
    expect(anio.doc.elements.find((e) => e.type === 'textbox')?.content.text).toBe('Mi año lector 2027');
  });
});

it('las nuevas traen sus módulos: Moodboard (muestras, mood, canción), Análisis (checklist, mood) y Premios (seis libros por elegir) (T349b)', () => {
  const kavi = plantillasDeKavi(es.library.canvas.templates);
  const tipos = (id: string) => kavi.find((p) => p.id === id)?.doc.elements.map((e) => e.type) ?? [];
  expect(tipos('kavi/moodboard')).toEqual(expect.arrayContaining(['swatch', 'mood', 'song', 'polaroid']));
  expect(tipos('kavi/character-analysis')).toEqual(expect.arrayContaining(['checklist', 'mood', 'quote', 'rating']));
  const premios = plantillasDeJournal(es.library.canvas.templates, 2026).find((p) => p.id === 'kavi/reading-awards');
  expect(premios?.doc.elements.filter((e) => e.type === 'book')).toHaveLength(6);
  const numeros = plantillasDeJournal(es.library.canvas.templates, 2026).find((p) => p.id === 'kavi/reading-stats');
  expect(numeros?.doc.elements.filter((e) => e.type === 'stat').map((e) => e.content.year)).toEqual([2026, 2026, 2026]);
});

describe('más plantillas y sus colores (T368)', () => {
  it('cada una cabe en la página y no repite id; el bingo trae sus 25 casillas y el A–Z sus 26 letras', () => {
    const todas = [...plantillasDeKavi(es.library.canvas.templates), ...plantillasDeJournal(es.library.canvas.templates, 2026)];
    expect(new Set(todas.map((p) => p.id)).size).toBe(todas.length);
    for (const p of todas) for (const e of p.doc.elements) expect(e.y + (e.w * e.ar) / Math.SQRT2).toBeLessThanOrEqual(1.02);
    const bingo = todas.find((p) => p.id === 'kavi/bingo');
    expect(bingo?.doc.elements.filter((e) => e.type === 'shape')).toHaveLength(25);
    const az = todas.find((p) => p.id === 'kavi/alphabet');
    expect(az?.doc.elements.filter((e) => e.type === 'textbox').map((e) => e.content.text?.[0]).slice(1).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  });

  it('se personalizan: papel de fondo, tinta en textos y módulos, acento en papeles y formas; las muestras no cambian', () => {
    const p = plantillasDeKavi(es.library.canvas.templates).find((x) => x.id === 'kavi/moodboard');
    const doc = conColores(p!.doc, { papel: '#FDF2E9', tinta: '#3a2a5c', acento: '#C9A227' });
    expect(doc.background).toBe('#FDF2E9');
    const de = (tipo: string) => doc.elements.filter((e) => e.type === tipo).map((e) => e.style.color);
    expect(new Set(de('textbox'))).toEqual(new Set(['#3A2A5C']));
    expect(new Set(de('mood'))).toEqual(new Set(['#3A2A5C']));
    expect(new Set(de('asset'))).toEqual(new Set(['#C9A227']));
    expect(new Set(de('swatch'))).toEqual(new Set([undefined]));
    expect(coloresDe(doc)).toEqual({ papel: '#FDF2E9', tinta: '#3A2A5C', acento: '#C9A227' });
    // Lo que no se da, no cambia.
    expect(conColores(p!.doc, {})).toEqual(p!.doc);
  });
});

describe('yo como lector (T374)', () => {
  const IDS = [
    'kavi/get-to-know',
    'kavi/reading-year',
    'kavi/reading-stats',
    'kavi/reading-awards',
    'kavi/reading-eras',
    'kavi/year-goal',
    'kavi/reading-personality',
    'kavi/favorite-things',
    'kavi/favorite-books',
    'kavi/favorite-authors',
    'kavi/favorite-genres',
    'kavi/reading-habits',
    'kavi/reading-memories',
    'kavi/reading-goals',
    'kavi/reader-aesthetic',
    'kavi/reading-space',
    'kavi/why-i-read',
    'kavi/books-that-changed-me',
    'kavi/relationship-with-reading',
  ];

  it('las 18 de la lista de Areli (y Meta del año), en los dos idiomas, verticales y sin repetir', () => {
    for (const idioma of [es, en]) {
      const lista = plantillasDeLector(idioma.library.canvas.templates, 2026);
      expect([...lista.map((p) => p.id)].sort()).toEqual([...IDS].sort());
      for (const p of lista) {
        expect(p.nombre).toBeTruthy();
        expect(p.orientacion).toBe('portrait');
        expect(p.doc.elements.length).toBeGreaterThan(4);
      }
    }
    expect(plantillasDeLector(en.library.canvas.templates, 2026).find((p) => p.id === 'kavi/why-i-read')?.nombre).toBe('Why I Read');
  });

  it('caben en la página, sin Nobi, y sus libros son por elegir (no "este libro", también en un recorte)', () => {
    for (const p of plantillasDeLector(es.library.canvas.templates, 2026)) {
      for (const e of p.doc.elements) {
        expect(e.type).not.toBe('sticker');
        if (e.type === 'book') expect(e.content.itemId).toBeUndefined();
        expect(e.x).toBeGreaterThanOrEqual(0);
        expect(e.x + e.w).toBeLessThanOrEqual(1.01);
        expect(e.y + (e.w * e.ar) / Math.SQRT2).toBeLessThanOrEqual(1.02);
      }
    }
  });

  it('con estilo KAVI (T377): zine y bloques en papel claro, noche en tinta; el título con la letra del logo', () => {
    const lista = plantillasDeLector(es.library.canvas.templates, 2026);
    for (const p of lista) {
      const estilo = ESTILO_DE_LECTOR[p.id];
      expect(estilo).toBeDefined();
      expect(p.doc.background).toBe(estilo.tipo === 'noche' ? '#131313' : '#F2F2F2');
      const textos = p.doc.elements.filter((e) => e.type === 'textbox');
      const titulo = textos.reduce((m, e) => (e.y < m.y ? e : m));
      expect(titulo.style.font).toBe('brand');
      // Las letras se ven sobre su fondo: claras de noche, tinta de día.
      expect(titulo.style.color).toBe(estilo.tipo === 'noche' ? '#F2F2F2' : '#131313');
    }
    // Los tres estilos están en la fila y cada uno con más de una plantilla.
    const porEstilo = lista.reduce<Record<string, number>>((m, p) => ({ ...m, [ESTILO_DE_LECTOR[p.id].tipo]: (m[ESTILO_DE_LECTOR[p.id].tipo] ?? 0) + 1 }), {});
    expect(Object.keys(porEstilo).sort()).toEqual(['bloques', 'noche', 'zine']);
    for (const n of Object.values(porEstilo)) expect(n).toBeGreaterThanOrEqual(5);
    // Las trece nuevas traen su mancha (el blob de los Nobi).
    for (const p of lista.filter((x) => !(DEL_JOURNAL_A_LECTOR as readonly string[]).includes(x.id))) expect(p.doc.elements.some((e) => e.type === 'shape' && e.content.shape === 'blob')).toBe(true);
  });

  it('en bloques, cada tarjeta lleva su sombra dura detrás (un rectángulo de tinta desplazado)', () => {
    const favoritos = plantillasDeLector(es.library.canvas.templates, 2026).find((p) => p.id === 'kavi/favorite-things');
    const rects = favoritos?.doc.elements.filter((e) => e.type === 'shape' && e.content.shape === 'rect') ?? [];
    const sombras = rects.filter((e) => e.style.color === '#131313');
    const tarjetas = rects.filter((e) => e.style.border);
    expect(sombras.length).toBeGreaterThanOrEqual(8);
    expect(tarjetas.length).toBeGreaterThanOrEqual(8);
  });

  it('se siguen personalizando: "Colores de la página" cambia su papel y su tinta', () => {
    const favoritos = plantillasDeLector(es.library.canvas.templates, 2026).find((p) => p.id === 'kavi/why-i-read');
    const otra = conColores(favoritos?.doc ?? documentoValido({}), { papel: '#101010', tinta: '#ABCDEF' });
    expect(otra.background).toBe('#101010');
    for (const e of otra.elements.filter((x) => x.type === 'textbox')) expect(e.style.color).toBe('#ABCDEF');
  });

  it('usar una en un recorte no pone el libro del recorte en "Mis libros favoritos"', () => {
    const favoritos = plantillasDeLector(es.library.canvas.templates, 2026).find((p) => p.id === 'kavi/favorite-books');
    let i = 0;
    const usado = usarPlantilla(favoritos?.doc ?? documentoValido({}), 'l1', () => `n${i++}`);
    const libros = usado.elements.filter((e) => e.type === 'book');
    expect(libros).toHaveLength(5);
    for (const l of libros) expect(l.content.itemId).toBeUndefined();
  });

  it('las seis que ya estaban en el Journal salen de su fila de KAVI y viven aquí', () => {
    expect(DEL_JOURNAL_A_LECTOR).toEqual(expect.arrayContaining(['kavi/get-to-know', 'kavi/reading-eras', 'kavi/year-goal']));
    const deLector = plantillasDeLector(es.library.canvas.templates, 2026).map((p) => p.id);
    for (const id of DEL_JOURNAL_A_LECTOR) expect(deLector).toContain(id);
    // Hábitos y metas cuentan con los datos de la biblioteca de ese año (RF-CC22).
    const habitos = plantillasDeLector(es.library.canvas.templates, 2026).find((p) => p.id === 'kavi/reading-habits');
    expect(habitos?.doc.elements.filter((e) => e.type === 'stat').map((e) => [e.content.stat, e.content.year])).toEqual([
      ['hoursRead', 2026],
      ['pagesRead', 2026],
    ]);
  });
});
