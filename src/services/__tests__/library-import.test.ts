/** Guardar un libro importado (T278): fila primero, después archivos; si algo falla, no queda nada. */
import type { LibroLeido } from '@/lib/library/import';

const mockApi = {
  createItem: jest.fn(async (_u: string, input: Record<string, unknown>) => ({ ...input, owner_id: 'u1' })),
  uploadFile: jest.fn(async (u: string, id: string, nombre: string) => `${u}/${id}/${nombre}`),
  removeItem: jest.fn(async () => undefined),
};
jest.mock('@/services/backend', () => ({ libraryApi: mockApi }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock del backend */
const { importLibraryBook } = require('@/services/library') as typeof import('@/services/library');

const bytes = new Uint8Array([1, 2, 3, 4]);
const portada = new Uint8Array([9, 9]);
const libro = (extra: Partial<LibroLeido> = {}): LibroLeido => ({
  formato: 'epub',
  archivo: { name: 'Rayuela (2ª ed.).epub', mime: 'application/epub+zip', bytes },
  datos: { title: 'Rayuela', authors: ['Julio Cortázar'], genres: [], pageCount: null, cover: { bytes: portada, mime: 'image/png', ext: 'png' } },
  color: '#1E2761',
  ...extra,
});

beforeEach(() => jest.clearAllMocks());

it('crea la pieza con sus rutas y luego sube el libro y la portada', async () => {
  await importLibraryBook('u1', { id: 'p1', libro: libro(), title: ' Rayuela ', authors: ['Julio Cortázar'], genres: ['Novela'] });
  expect(mockApi.createItem).toHaveBeenCalledWith('u1', {
    id: 'p1',
    family: 'book',
    kind: 'epub',
    title: 'Rayuela',
    authors: ['Julio Cortázar'],
    genres: ['Novela'],
    file_path: 'u1/p1/Rayuela-2-ed.epub',
    cover_path: 'u1/p1/cover.png',
    cover_color: '#1E2761',
    file_size: 4,
    page_count: null,
  });
  expect(mockApi.uploadFile).toHaveBeenNthCalledWith(1, 'u1', 'p1', 'Rayuela (2ª ed.).epub', bytes, 'application/epub+zip');
  expect(mockApi.uploadFile).toHaveBeenNthCalledWith(2, 'u1', 'p1', 'cover.png', portada, 'image/png');
  expect(mockApi.createItem.mock.invocationCallOrder[0]).toBeLessThan(mockApi.uploadFile.mock.invocationCallOrder[0]);
});

it('un título en blanco usa el del archivo; un PDF sin extensión la recibe', async () => {
  const pdf = libro({ formato: 'pdf', archivo: { name: 'descarga', mime: '', bytes }, datos: { title: 'Aura', authors: [], genres: [], pageCount: 60, cover: null }, color: null });
  await importLibraryBook('u1', { id: 'p2', libro: pdf, title: '  ', authors: [], genres: [] });
  expect(mockApi.createItem).toHaveBeenCalledWith('u1', expect.objectContaining({ title: 'Aura', file_path: 'u1/p2/descarga.pdf', cover_path: null, page_count: 60 }));
  expect(mockApi.uploadFile).toHaveBeenCalledTimes(1);
  expect(mockApi.uploadFile).toHaveBeenCalledWith('u1', 'p2', 'descarga.pdf', bytes, 'application/pdf');
});

it('si la subida falla, borra la pieza y avisa el error (RF-BR2)', async () => {
  mockApi.uploadFile.mockRejectedValueOnce(new Error('Sin conexión.'));
  await expect(importLibraryBook('u1', { id: 'p3', libro: libro(), title: 'Rayuela', authors: [], genres: [] })).rejects.toThrow('Sin conexión.');
  // Con `force`: aunque R2 sea justo lo que falló, la pieza vacía no se queda en la librería.
  expect(mockApi.removeItem).toHaveBeenCalledWith('p3', { force: true });
});

it('si la base rechaza la pieza (tope de espacio), no sube nada', async () => {
  mockApi.createItem.mockRejectedValueOnce(new Error('Tu biblioteca llegó a su límite.'));
  await expect(importLibraryBook('u1', { id: 'p4', libro: libro(), title: 'Rayuela', authors: [], genres: [] })).rejects.toThrow('límite');
  expect(mockApi.uploadFile).not.toHaveBeenCalled();
});

describe('portada de un PDF (RF-BL12, T279)', () => {
  const mockUpdate = jest.fn(async () => ({}));
  beforeAll(() => {
    (mockApi as Record<string, unknown>).updateItem = mockUpdate;
  });
  beforeEach(() => mockUpdate.mockClear());

  it('primero la ruta en la fila y después la imagen', async () => {
    const { saveLibraryCover } = require('@/services/library') as typeof import('@/services/library');
    await saveLibraryCover('u1', 'p1', new Uint8Array([7]), '#1E2761');
    expect(mockUpdate).toHaveBeenCalledWith('p1', { cover_path: 'u1/p1/cover.jpg', cover_color: '#1E2761' });
    expect(mockApi.uploadFile).toHaveBeenCalledWith('u1', 'p1', 'cover.jpg', new Uint8Array([7]), 'image/jpeg');
    expect(mockUpdate.mock.invocationCallOrder[0]).toBeLessThan(mockApi.uploadFile.mock.invocationCallOrder[0]);
  });

  it('si la subida falla, la fila vuelve a quedar sin portada', async () => {
    const { saveLibraryCover } = require('@/services/library') as typeof import('@/services/library');
    mockApi.uploadFile.mockRejectedValueOnce(new Error('sin red'));
    await expect(saveLibraryCover('u1', 'p1', new Uint8Array([7]), null)).rejects.toThrow('sin red');
    expect(mockUpdate).toHaveBeenLastCalledWith('p1', { cover_path: null, cover_color: null });
  });
});

describe('portada propia (RF-BL23, T314)', () => {
  const mockUpdate = jest.fn(async () => ({}));
  beforeAll(() => {
    (mockApi as Record<string, unknown>).updateItem = mockUpdate;
  });
  beforeEach(() => mockUpdate.mockClear());
  const pieza = { id: 'p1', custom_cover_path: null, custom_cover_color: null };

  it('va aparte de la del archivo: ruta propia en la fila y después la imagen', async () => {
    const { setCustomCover } = require('@/services/library') as typeof import('@/services/library');
    await setCustomCover('u1', pieza, new Uint8Array([5]), '#EC4899');
    expect(mockUpdate).toHaveBeenCalledWith('p1', { custom_cover_path: 'u1/p1/cover-custom.jpg', custom_cover_color: '#EC4899' });
    expect(mockApi.uploadFile).toHaveBeenLastCalledWith('u1', 'p1', 'cover-custom.jpg', new Uint8Array([5]), 'image/jpeg');
  });

  it('si la subida falla, se queda la portada que tenía', async () => {
    const { setCustomCover } = require('@/services/library') as typeof import('@/services/library');
    mockApi.uploadFile.mockRejectedValueOnce(new Error('sin red'));
    const conPropia = { id: 'p1', custom_cover_path: 'u1/p1/cover-custom.jpg', custom_cover_color: '#111111' };
    await expect(setCustomCover('u1', conPropia, new Uint8Array([5]), '#EC4899')).rejects.toThrow('sin red');
    expect(mockUpdate).toHaveBeenLastCalledWith('p1', { custom_cover_path: 'u1/p1/cover-custom.jpg', custom_cover_color: '#111111' });
  });

  it('volver a la original solo quita la propia', async () => {
    const { clearCustomCover } = require('@/services/library') as typeof import('@/services/library');
    await clearCustomCover('p1');
    expect(mockUpdate).toHaveBeenCalledWith('p1', { custom_cover_path: null, custom_cover_color: null });
  });
});
