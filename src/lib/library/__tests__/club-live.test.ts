/** Sesión en vivo de un club (spec 13f, RF-BC10 – RF-BC14; T309): quién dirige y a dónde se sigue. */
import { enLaSesion, mismoLugar, posicionParaSeguir, quienDirige } from '@/lib/library/club-live';
import type { PresenteEnVivo } from '@/types/domain';

const p = (id: string, desde: number, extra: Partial<PresenteEnVivo> = {}): PresenteEnVivo => ({ id, nombre: id, desde, enSesion: true, dirige: false, ...extra });

it('en la sesión, del que llegó primero al último; quien solo tiene abierto el libro no cuenta', () => {
  expect(enLaSesion([p('b', 20), p('a', 10), p('c', 5, { enSesion: false })]).map((x) => x.id)).toEqual(['a', 'b']);
});

it('dirige quien lo dice; si se fue, quien lleva más tiempo dentro (RF-BC14); sin nadie, no hay sesión', () => {
  expect(quienDirige([p('a', 10), p('b', 20, { dirige: true })])?.id).toBe('b');
  expect(quienDirige([p('a', 10), p('b', 20)])?.id).toBe('a');
  // Si dos dicen dirigir a la vez, el que llegó primero.
  expect(quienDirige([p('b', 20, { dirige: true }), p('a', 10, { dirige: true })])?.id).toBe('a');
  expect(quienDirige([p('a', 10, { enSesion: false })])).toBeNull();
});

it('en EPUB se sigue por CFI (cada quien puede tener otra letra); en PDF, por página', () => {
  expect(posicionParaSeguir({ page: 4, cfi: 'epubcfi(/6/8)', fraction: 0.2 }, true)).toEqual({ cfi: 'epubcfi(/6/8)' });
  expect(posicionParaSeguir({ fraction: 0.2 }, true)).toEqual({ fraction: 0.2 });
  expect(posicionParaSeguir({ page: 40, fraction: 0.3 }, false)).toEqual({ page: 40 });
  expect(posicionParaSeguir({}, false)).toBeNull();
  expect(mismoLugar({ page: 40 }, { page: 40 })).toBe(true);
  expect(mismoLugar({ page: 40 }, { page: 41 })).toBe(false);
});
