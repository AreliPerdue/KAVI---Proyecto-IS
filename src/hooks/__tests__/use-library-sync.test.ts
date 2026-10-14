/** Subir lo pendiente de la librería (RF-BR3, T285): sin red se queda y se reintenta; lo demás se resuelve. */
const mockPendientes = jest.fn();
const mockConfirmar = jest.fn(async (_e: unknown[]) => undefined);
const mockActualizar = jest.fn();
const mockGuardarNotas = jest.fn();
const mockQuitarNotas = jest.fn();
jest.mock('@/lib/library/offline/outbox', () => ({
  pendientes: () => mockPendientes(),
  confirmar: (e: unknown[]) => mockConfirmar(e),
}));
jest.mock('@/services/library', () => ({
  updateLibraryItem: (...a: unknown[]) => mockActualizar(...a),
  saveAnnotations: (...a: unknown[]) => mockGuardarNotas(...a),
  removeAnnotations: (...a: unknown[]) => mockQuitarNotas(...a),
}));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const { subirPendientes } = require('@/hooks/use-library-sync') as typeof import('@/hooks/use-library-sync');

const entrada = (itemId: string) => ({ op: 'position', itemId, patch: { progress: 0.5, last_position: { page: 50 } }, at: 1 });

beforeEach(() => {
  jest.useFakeTimers();
  for (const m of [mockPendientes, mockConfirmar, mockActualizar, mockGuardarNotas, mockQuitarNotas]) m.mockReset();
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
