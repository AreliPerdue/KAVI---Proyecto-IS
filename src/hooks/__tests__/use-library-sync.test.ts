/** Subir lo pendiente de la librería (RF-BR3, T285): sin red se queda y se reintenta; lo demás se resuelve. */
const mockPendientes = jest.fn();
const mockConfirmar = jest.fn(async (_e: unknown[]) => undefined);
const mockActualizar = jest.fn();
const mockGuardarNotas = jest.fn();
const mockQuitarNotas = jest.fn();
const mockGuardarSesion = jest.fn();
const mockListarNotas = jest.fn();
const mockBorrarImagen = jest.fn();
jest.mock('@/lib/library/offline/outbox', () => ({
  pendientes: () => mockPendientes(),
  confirmar: (e: unknown[]) => mockConfirmar(e),
}));
jest.mock('@/services/library', () => ({
  updateLibraryItem: (...a: unknown[]) => mockActualizar(...a),
  saveAnnotations: (...a: unknown[]) => mockGuardarNotas(...a),
  removeAnnotations: (...a: unknown[]) => mockQuitarNotas(...a),
  saveReadingSession: (...a: unknown[]) => mockGuardarSesion(...a),
  listAnnotations: (...a: unknown[]) => mockListarNotas(...a),
  removeAnnotationImage: (...a: unknown[]) => mockBorrarImagen(...a),
}));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const { subirPendientes } = require('@/hooks/use-library-sync') as typeof import('@/hooks/use-library-sync');

const entrada = (itemId: string) => ({ op: 'position', itemId, patch: { progress: 0.5, last_position: { page: 50 } }, at: 1 });

beforeEach(() => {
  jest.useFakeTimers();
  for (const m of [mockPendientes, mockConfirmar, mockActualizar, mockGuardarNotas, mockQuitarNotas, mockGuardarSesion, mockListarNotas, mockBorrarImagen]) m.mockReset();
});
afterEach(() => jest.useRealTimers());

it('sube cada avance y confirma lo que llegó', async () => {
  mockPendientes.mockResolvedValue([entrada('l1'), entrada('l2')]);
  mockActualizar.mockResolvedValue({});
  await subirPendientes();
  expect(mockActualizar).toHaveBeenCalledWith('l1', { progress: 0.5, last_position: { page: 50 } });
  expect(mockConfirmar).toHaveBeenCalledWith([entrada('l1'), entrada('l2')]);
});

it('sin red lo deja en la cola y lo reintenta a los 10 s', async () => {
  mockPendientes.mockResolvedValue([entrada('l1')]);
  mockActualizar.mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValue({});
  await subirPendientes();
  expect(mockConfirmar).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(10_000);
  expect(mockActualizar).toHaveBeenCalledTimes(2);
  expect(mockConfirmar).toHaveBeenCalledWith([entrada('l1')]);
});

it('si el servidor lo rechaza por otra razón (el libro ya no existe), lo descarta', async () => {
  mockPendientes.mockResolvedValue([entrada('borrado')]);
  mockActualizar.mockRejectedValue(new Error('No tienes permiso'));
  await subirPendientes();
  expect(mockConfirmar).toHaveBeenCalledWith([entrada('borrado')]);
});

it('sube las anotaciones: guarda la fila completa con su dueño y quita por id (T286)', async () => {
  const fila = { id: 'a1', item_id: 'l1', kind: 'postit', locator: { page: 1, x: 0, y: 0, w: 0.2 }, content: {}, z: 1, removed: false, locked: false };
  const guardar = { op: 'annotation', itemId: 'l1', userId: 'u1', annotation: fila, at: 1 };
  const quitar = { op: 'annotationRemove', itemId: 'l1', id: 'a2', at: 2 };
  mockPendientes.mockResolvedValue([guardar, quitar]);
  mockGuardarNotas.mockResolvedValue(undefined);
  mockQuitarNotas.mockRejectedValueOnce(new TypeError('Network request failed'));
  await subirPendientes();
  expect(mockGuardarNotas).toHaveBeenCalledWith('u1', [fila]);
  expect(mockQuitarNotas).toHaveBeenCalledWith(['a2']);
  // Lo que no subió por la red se queda para el reintento.
  expect(mockConfirmar).toHaveBeenCalledWith([guardar]);
});

it('sube las sesiones de lectura con su dueño (T318)', async () => {
  const sesion = { id: 's1', item_id: 'l1', started_at: 'a', ended_at: 'b', seconds: 120, start_locator: null, end_locator: null, start_progress: null, end_progress: null };
  const entrada = { op: 'session', itemId: 'l1', userId: 'u1', session: sesion, at: 1 };
  mockPendientes.mockResolvedValue([entrada]);
  mockGuardarSesion.mockResolvedValue(undefined);
  await subirPendientes();
  expect(mockGuardarSesion).toHaveBeenCalledWith('u1', sesion);
  expect(mockConfirmar).toHaveBeenCalledWith([entrada]);
});

describe('la imagen de una anotación quitada (T333)', () => {
  const HORA = 60 * 60 * 1000;
  const limpieza = (due: number) => ({ op: 'imageCleanup', itemId: 'l1', userId: 'u1', id: 'img1', due, at: 1 });

  it('antes de su hora no se borra: se queda en la cola y se intenta al vencer', async () => {
    const e = limpieza(Date.now() + HORA);
    mockPendientes.mockResolvedValue([e]);
    mockListarNotas.mockResolvedValue([]);
    mockBorrarImagen.mockResolvedValue(undefined);
    await subirPendientes();
    expect(mockBorrarImagen).not.toHaveBeenCalled();
    expect(mockConfirmar).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(HORA);
    expect(mockBorrarImagen).toHaveBeenCalledWith('u1', 'l1', 'img1');
    expect(mockConfirmar).toHaveBeenCalledWith([e]);
  });

  it('pasada la hora, si nadie la deshizo, se borra el archivo', async () => {
    const e = limpieza(Date.now() - 1);
    mockPendientes.mockResolvedValue([e]);
    mockListarNotas.mockResolvedValue([{ id: 'otra' }]);
    mockBorrarImagen.mockResolvedValue(undefined);
    await subirPendientes();
    expect(mockBorrarImagen).toHaveBeenCalledWith('u1', 'l1', 'img1');
    expect(mockConfirmar).toHaveBeenCalledWith([e]);
  });

  it('si la anotación volvió a existir, no se borra y sale de la cola', async () => {
    const e = limpieza(Date.now() - 1);
    mockPendientes.mockResolvedValue([e]);
    mockListarNotas.mockResolvedValue([{ id: 'img1' }]);
    await subirPendientes();
    expect(mockBorrarImagen).not.toHaveBeenCalled();
    expect(mockConfirmar).toHaveBeenCalledWith([e]);
  });

  it('sin red se queda para después', async () => {
    mockPendientes.mockResolvedValue([limpieza(Date.now() - 1)]);
    mockListarNotas.mockRejectedValue(new TypeError('Network request failed'));
    await subirPendientes();
    expect(mockConfirmar).not.toHaveBeenCalled();
  });
});
