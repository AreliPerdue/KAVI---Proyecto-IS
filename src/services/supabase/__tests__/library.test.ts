/**
 * KAVI Library sobre Supabase (T275): las consultas que arma, las rutas de Storage y los errores.
 * La RLS y el tope se probaron contra Postgres (PGlite) al escribir la migración.
 */
import { fakeSupabase } from '@/services/supabase/__tests__/fake-supabase';
import { es } from '@/i18n/es';

const mockSb = fakeSupabase();
jest.mock('@/lib/supabase', () => ({ getSupabase: () => mockSb.client }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const { supabaseLibrary } = require('@/services/supabase/library') as typeof import('@/services/supabase/library');

beforeEach(() => {
  mockSb.llamadas.length = 0;
  mockSb.responder({ data: [], error: null });
});

it('listar pide las piezas de la persona, de la más nueva a la más vieja', async () => {
  await supabaseLibrary.listItems('u1');
  expect(mockSb.argsDe('from')).toEqual(['library_items']);
  expect(mockSb.argsDe('eq')).toEqual(['owner_id', 'u1']);
  expect(mockSb.argsDe('order')).toEqual(['created_at', { ascending: false }]);
});

it('crear manda el dueño y el título recortado', async () => {
  mockSb.responder({ data: { id: 'l1' }, error: null });
  await supabaseLibrary.createItem('u1', { family: 'book', kind: 'pdf', title: '  Rayuela  ' });
  expect(mockSb.argsDe('insert')?.[0]).toEqual(expect.objectContaining({ owner_id: 'u1', title: 'Rayuela', family: 'book' }));
});

it('el error de tope de la base se traduce a un mensaje para la persona', async () => {
  mockSb.responder({ data: null, error: { message: 'library_quota', code: 'P0001', hint: 'library_quota' } as never });
  await expect(supabaseLibrary.createItem('u1', { family: 'book', kind: 'pdf', title: 'X', file_size: 10 })).rejects.toThrow(es.errors.libraryQuota);
});

it('un archivo de más de 50 MB ni siquiera se sube', async () => {
  const grande = new Uint8Array(50 * 1024 * 1024 + 1);
  await expect(supabaseLibrary.uploadFile('u1', 'l1', 'x.pdf', grande, 'application/pdf')).rejects.toThrow(es.errors.libraryFileTooBig);
  expect(mockSb.secuencia).not.toContain('upload');
});

it('subir va a la carpeta de la persona, con un nombre seguro', async () => {
  mockSb.responder({ data: { path: 'x' }, error: null });
  const ruta = await supabaseLibrary.uploadFile('u1', 'l1', 'Cien años/de soledad.pdf', new Uint8Array([1]), 'application/pdf');
  expect(ruta).toBe('u1/l1/Cien-anos-de-soledad.pdf');
  expect(mockSb.argsDe('storage')).toEqual(['library']);
  expect(mockSb.argsDe('upload')).toEqual(['u1/l1/Cien-anos-de-soledad.pdf', { contentType: 'application/pdf', upsert: true }]);
});

it('borrar una pieza borra primero sus archivos y después la fila', async () => {
  mockSb.encolar(
    { data: { id: 'l1', owner_id: 'u1' }, error: null },
    { data: [{ name: 'rayuela.pdf', id: 'o1' }, { name: 'portada.jpg', id: 'o2' }], error: null },
    { data: [], error: null },
    { data: null, error: null },
  );
  await supabaseLibrary.removeItem('l1');
  expect(mockSb.argsDe('list')?.[0]).toBe('u1/l1');
  expect(mockSb.argsDe('remove')).toEqual([['u1/l1/rayuela.pdf', 'u1/l1/portada.jpg']]);
  const s = mockSb.secuencia;
  expect(s.indexOf('remove')).toBeLessThan(s.indexOf('delete'));
});

it('borrar todos los archivos baja por las subcarpetas', async () => {
  mockSb.encolar(
    { data: [{ name: 'l1', id: null }, { name: 'fonts', id: null }], error: null },
    { data: [{ name: 'a.pdf', id: 'o1' }], error: null },
    { data: [{ name: 'Mi-letra.ttf', id: 'o2' }], error: null },
    { data: [], error: null },
  );
  await supabaseLibrary.removeAllFiles('u1');
  expect(mockSb.argsDe('remove')).toEqual([['u1/l1/a.pdf', 'u1/fonts/Mi-letra.ttf']]);
});

it('la dirección para leer es firmada y temporal', async () => {
  mockSb.responder({ data: { signedUrl: 'https://x/firmada' }, error: null });
  expect(await supabaseLibrary.fileUrl('u1/l1/a.pdf')).toBe('https://x/firmada');
  expect(mockSb.argsDe('createSignedUrl')).toEqual(['u1/l1/a.pdf', 3600]);
});

it('guardar una ficha reemplaza la de esa plantilla en esa pieza', async () => {
  mockSb.responder({ data: { id: 'c1' }, error: null });
  await supabaseLibrary.saveCard('u1', { item_id: 'l1', template_id: 't1', values: { f1: 5 } });
  expect(mockSb.argsDe('upsert')).toEqual([{ item_id: 'l1', template_id: 't1', values: { f1: 5 }, owner_id: 'u1' }, { onConflict: 'item_id,template_id' }]);
});

it('agregar a un librero dos veces no es error (ignora duplicados)', async () => {
  mockSb.encolar({ data: [{ sort_order: 2048 }], error: null }, { data: null, error: null });
  await supabaseLibrary.addToShelf('u1', 's1', 'l1');
  expect(mockSb.argsDe('upsert')).toEqual([
    { shelf_id: 's1', item_id: 'l1', owner_id: 'u1', sort_order: 3072 },
    { onConflict: 'shelf_id,item_id', ignoreDuplicates: true },
  ]);
});
