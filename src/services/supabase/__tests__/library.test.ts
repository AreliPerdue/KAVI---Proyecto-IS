/**
 * KAVI Library sobre Supabase (T275, T313): las consultas que arma, los archivos en R2 y los errores.
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

/** Archivos en R2 (T313): la app pide la firma a `api/library-files` y sube o baja directo. */
describe('archivos en R2', () => {
  const mockFetch = jest.fn();
  const original = globalThis.fetch;
  const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
  /** Cuerpo de la llamada número `n` a la función. */
  const cuerpoDe = (n: number) => JSON.parse((mockFetch.mock.calls[n][1] as { body: string }).body) as Record<string, unknown>;

  beforeAll(() => {
    (mockSb.client as Record<string, unknown>).auth = { getSession: async () => ({ data: { session: { access_token: 'jwt-1' } } }) };
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });
  afterAll(() => {
    globalThis.fetch = original;
  });
  beforeEach(() => mockFetch.mockReset());

  it('un archivo de más de 50 MB ni siquiera pide firma', async () => {
    const grande = new Uint8Array(50 * 1024 * 1024 + 1);
    await expect(supabaseLibrary.uploadFile('u1', 'l1', 'x.pdf', grande, 'application/pdf')).rejects.toThrow(es.errors.libraryFileTooBig);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('subir pide la firma con la sesión y manda el archivo a R2 con un nombre seguro', async () => {
    mockFetch.mockResolvedValueOnce(json(200, { url: 'https://r2/firmada', headers: { 'content-type': 'application/pdf' } })).mockResolvedValueOnce(json(200, {}));
    const cuerpo = new Uint8Array([1, 2, 3]);
    const ruta = await supabaseLibrary.uploadFile('u1', 'l1', 'Cien años/de soledad.pdf', cuerpo, 'application/pdf');
    expect(ruta).toBe('u1/l1/Cien-anos-de-soledad.pdf');
    expect(mockFetch.mock.calls[0][0]).toBe('https://kavi-proyecto-is.vercel.app/api/library-files');
    expect((mockFetch.mock.calls[0][1] as { headers: Record<string, string> }).headers.authorization).toBe('Bearer jwt-1');
    expect(cuerpoDe(0)).toEqual({ action: 'upload', itemId: 'l1', path: 'u1/l1/Cien-anos-de-soledad.pdf', contentType: 'application/pdf', size: 3 });
    expect(mockFetch.mock.calls[1]).toEqual(['https://r2/firmada', { method: 'PUT', headers: { 'content-type': 'application/pdf' }, body: cuerpo }]);
  });

  it('si R2 rechaza la subida, falla con un mensaje claro', async () => {
    mockFetch.mockResolvedValueOnce(json(200, { url: 'https://r2/firmada', headers: {} })).mockResolvedValueOnce(json(403, {}));
    await expect(supabaseLibrary.uploadFile('u1', 'l1', 'a.pdf', new Uint8Array([1]), 'application/pdf')).rejects.toThrow(es.errors.libraryFilesFailed);
  });

  it.each([
    ['unavailable', es.errors.libraryFilesUnavailable],
    ['forbidden', es.errors.noPermission],
    ['tooBig', es.errors.libraryFileTooBig],
    ['otro', es.errors.libraryFilesFailed],
  ])('el error "%s" de la función sale en el idioma de la app', async (code, mensaje) => {
    mockFetch.mockResolvedValueOnce(json(403, { code, error: 'en español' }));
    await expect(supabaseLibrary.fileUrl('u1/l1/a.pdf')).rejects.toThrow(mensaje);
  });

  it('la dirección para leer la firma la función', async () => {
    mockFetch.mockResolvedValueOnce(json(200, { url: 'https://r2/leer' }));
    expect(await supabaseLibrary.fileUrl('u1/l1/a.pdf')).toBe('https://r2/leer');
    expect(cuerpoDe(0)).toEqual({ action: 'read', path: 'u1/l1/a.pdf' });
  });

  it('borrar una pieza borra primero sus archivos y después la fila', async () => {
    mockSb.encolar({ data: { id: 'l1', owner_id: 'u1' }, error: null }, { data: null, error: null });
    mockFetch.mockResolvedValueOnce(json(200, { removed: 2 }));
    await supabaseLibrary.removeItem('l1');
    expect(cuerpoDe(0)).toEqual({ action: 'delete', itemId: 'l1' });
    expect(mockSb.secuencia).toContain('delete');
  });

  it('si no se pudieron borrar los archivos, la fila se queda (no deja archivos huérfanos)', async () => {
    mockSb.encolar({ data: { id: 'l1', owner_id: 'u1' }, error: null });
    mockFetch.mockResolvedValueOnce(json(502, { code: 'failed' }));
    await expect(supabaseLibrary.removeItem('l1')).rejects.toThrow(es.errors.libraryFilesFailed);
    expect(mockSb.secuencia).not.toContain('delete');
  });

  it('borrar todos los archivos lo decide la sesión, no un id de la app', async () => {
    mockFetch.mockResolvedValueOnce(json(200, { removed: 3 }));
    await supabaseLibrary.removeAllFiles('u1');
    expect(cuerpoDe(0)).toEqual({ action: 'deleteAll' });
  });

  it('sin conexión lo dice así', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(supabaseLibrary.fileUrl('u1/l1/a.pdf')).rejects.toThrow(/conexión/i);
  });

  it('una fuente: primero la fila, luego el archivo; si la subida falla, se borra la fila', async () => {
    mockSb.encolar({ data: { id: 'f1' }, error: null }, { data: null, error: null });
    mockFetch.mockResolvedValueOnce(json(200, { url: 'https://r2/f', headers: {} })).mockResolvedValueOnce(json(500, {}));
    await expect(
      supabaseLibrary.addFont('u1', { name: 'Mi letra', format: 'ttf', body: new Uint8Array([1]), size: 1, licenseAcceptedAt: '2026-10-12T00:00:00Z' }),
    ).rejects.toThrow(es.errors.libraryFilesFailed);
    expect(cuerpoDe(0)).toEqual({ action: 'upload', fontId: 'f1', path: 'u1/fonts/Mi-letra.ttf', contentType: 'font/ttf', size: 1 });
    expect(mockSb.secuencia.filter((m) => m === 'delete')).toHaveLength(1);
  });
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
