/** La tienda de stickers sin React (13c, RF-BH13b; T338): direcciones, ids, peso y orden. */
jest.mock('@/lib/env', () => ({ env: { supabaseUrl: 'https://kavi.supabase.co/', supabaseAnonKey: '', isDemoMode: false } }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const m = require('@/lib/library/sticker-packs') as typeof import('@/lib/library/sticker-packs');

const pack = (id: string, collection: string, sort_order: number) => ({ id, collection, color: null, name_es: 'X', name_en: 'X', sort_order, stickers: [], bytes: 0, version: 3 });

it('las imágenes salen del bucket público, con la versión para no quedarse con las viejas', () => {
  expect(m.urlDeSticker({ id: 'primer-rebote-blue', version: 3 }, 'popcorn')).toBe('https://kavi.supabase.co/storage/v1/object/public/stickers/primer-rebote-blue/popcorn.png?v=3');
  expect(m.urlDeMuestra({ id: 'primer-rebote-blue', version: 3 })).toBe('https://kavi.supabase.co/storage/v1/object/public/stickers/primer-rebote-blue/muestra.png?v=3');
});

it('el id de un sticker es <pack>/<nombre> y se separa igual', () => {
  expect(m.idDeSticker('primer-rebote-blue', 'good-note')).toBe('primer-rebote-blue/good-note');
  expect(m.partesDeSticker('primer-rebote-blue/good-note')).toEqual({ pack: 'primer-rebote-blue', nombre: 'good-note' });
  expect(m.partesDeSticker('../otro')).toBeNull();
});

it('el peso para la tarjeta y el orden del catálogo', () => {
  expect(m.pesoDe(1_150_000)).toBe('1.1 MB');
  expect(m.pesoDe(850 * 1024)).toBe('850 KB');
  expect(m.ordenarPacks([pack('b2', 'b', 2), pack('a1', 'a', 1), pack('b1', 'b', 1)]).map((p) => p.id)).toEqual(['a1', 'b1', 'b2']);
});
