/** Subir lo pendiente de la librería (RF-BR3, T285): sin red se queda y se reintenta; lo demás se resuelve. */
const mockPendientes = jest.fn();
const mockConfirmar = jest.fn(async (_e: unknown[]) => undefined);
const mockActualizar = jest.fn();
jest.mock('@/lib/library/offline/outbox', () => ({
  pendientes: () => mockPendientes(),
  confirmar: (e: unknown[]) => mockConfirmar(e),
}));
jest.mock('@/services/library', () => ({ updateLibraryItem: (...a: unknown[]) => mockActualizar(...a) }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const { subirPendientes } = require('@/hooks/use-library-sync') as typeof import('@/hooks/use-library-sync');

const entrada = (itemId: string) => ({ op: 'position', itemId, patch: { progress: 0.5, last_position: { page: 50 } }, at: 1 });

beforeEach(() => {
  jest.useFakeTimers();
  for (const m of [mockPendientes, mockConfirmar, mockActualizar]) m.mockReset();
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
