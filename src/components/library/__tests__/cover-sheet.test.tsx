/** La hoja "Cambiar portada" (RF-BL23, T314): elegir, ver cómo queda, guardar o volver a la original. */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { es } from '@/i18n/es';

const C = es.library.cover;
const mockPoner = { mutate: jest.fn(), isPending: false };
const mockQuitar = { mutate: jest.fn() };
const mockSnackbar = jest.fn();
const mockPreparar = jest.fn();
const mockArchivo = jest.fn();
const mockPegar = jest.fn();

jest.mock('@/hooks/use-library', () => ({
  useCustomCover: () => ({ poner: mockPoner, quitar: mockQuitar }),
  useLibraryFileUrl: () => ({ data: undefined }),
}));
jest.mock('@/providers', () => ({ useSnackbar: () => mockSnackbar }));
jest.mock('@/lib/library/cover/prepare', () => ({ prepararPortada: (uri: string) => mockPreparar(uri) }));
jest.mock('@/lib/library/cover/sources', () => ({
  PUEDE_TOMAR_FOTO: true,
  desdeArchivo: () => mockArchivo(),
  desdeGaleria: async () => null,
  desdeCamara: async () => null,
  desdePortapapeles: () => mockPegar(),
}));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const { CoverSheet } = require('@/components/library/cover-sheet') as typeof import('@/components/library/cover-sheet');

const libro = (extra: Record<string, unknown> = {}) =>
  ({ id: 'l1', title: 'Ficciones', authors: [], cover_path: 'u1/l1/cover.png', cover_color: '#1E2761', custom_cover_path: null, custom_cover_color: null, ...extra }) as never;

beforeEach(() => {
  for (const m of [mockPoner.mutate, mockQuitar.mutate, mockSnackbar, mockPreparar, mockArchivo, mockPegar]) m.mockReset();
});

it('ofrece galería, cámara, archivo y pegar; sin portada propia no ofrece volver', async () => {
  await render(<CoverSheet item={libro()} onClose={jest.fn()} />);
  for (const texto of [C.gallery, C.camera, C.file, C.paste]) expect(screen.getByRole('button', { name: texto })).toBeTruthy();
  expect(screen.queryByRole('button', { name: C.restore })).toBeNull();
});

it('elegir un archivo muestra la vista previa y guardar la sube con su color', async () => {
  const onClose = jest.fn();
  mockArchivo.mockResolvedValue('file:///rosa.png');
  mockPreparar.mockResolvedValue({ jpeg: new Uint8Array([1]), color: '#EC4899', vistaPrevia: 'data:image/jpeg;base64,AQ==' });
  await render(<CoverSheet item={libro()} onClose={onClose} />);
  await fireEvent.press(screen.getByRole('button', { name: C.file }));
  expect(mockPreparar).toHaveBeenCalledWith('file:///rosa.png');
  await fireEvent.press(screen.getByRole('button', { name: C.save }));
  const [datos, opciones] = mockPoner.mutate.mock.calls[0];
  expect(datos).toEqual({ item: expect.objectContaining({ id: 'l1' }), jpeg: new Uint8Array([1]), color: '#EC4899' });
  opciones.onSuccess();
  expect(mockSnackbar).toHaveBeenCalledWith({ message: C.saved });
  expect(onClose).toHaveBeenCalled();
});

it('"Elegir otra" vuelve a las opciones sin guardar', async () => {
  mockArchivo.mockResolvedValue('file:///rosa.png');
  mockPreparar.mockResolvedValue({ jpeg: new Uint8Array([1]), color: null, vistaPrevia: 'data:image/jpeg;base64,AQ==' });
  await render(<CoverSheet item={libro()} onClose={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: C.file }));
  await fireEvent.press(screen.getByRole('button', { name: C.choose }));
  expect(screen.getByRole('button', { name: C.file })).toBeTruthy();
  expect(mockPoner.mutate).not.toHaveBeenCalled();
});

it('pegar sin imagen copiada lo dice; una imagen ilegible también', async () => {
  mockPegar.mockResolvedValue(null);
  await render(<CoverSheet item={libro()} onClose={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: C.paste }));
  expect(screen.getByText(C.nothingToPaste)).toBeTruthy();
  mockArchivo.mockResolvedValue('file:///rota');
  mockPreparar.mockRejectedValue(new Error(C.unreadable));
  await fireEvent.press(screen.getByRole('button', { name: C.file }));
  expect(screen.getByText(C.unreadable)).toBeTruthy();
});

it('con portada propia ofrece volver a la original', async () => {
  const onClose = jest.fn();
  await render(<CoverSheet item={libro({ custom_cover_path: 'u1/l1/cover-custom.jpg', custom_cover_color: '#EC4899' })} onClose={onClose} />);
  await fireEvent.press(screen.getByRole('button', { name: C.restore }));
  expect(mockQuitar.mutate.mock.calls[0][0]).toBe('l1');
  expect(onClose).toHaveBeenCalled();
});
