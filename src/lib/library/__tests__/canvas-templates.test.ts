/** Plantillas del lienzo creativo (13h, RF-CC18 – RF-CC21; T344): usarlas copia; guardarlas quita lo personal. */
import { plantillasDeJournal, plantillasDeKavi } from '@/constants/canvas-templates';
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
  it('son siete, con nombre en los dos idiomas y todo lo que traen es válido (T344, T349b)', () => {
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
      expect(lista.map((p) => p.id)).toEqual(['kavi/get-to-know', 'kavi/reading-year', 'kavi/reading-stats', 'kavi/reading-awards']);
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
    expect(plantillasDeJournal(en.library.canvas.templates, 2026).map((p) => p.nombre)).toEqual(['Get to Know the Reader', 'My Reading Year', 'Reading Stats', 'Reading Awards']);
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
