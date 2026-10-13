/** La hoja de portada, lomo y contraportada (RF-BL20, RF-BL21, RF-BL23; T311, T314): imagen y color de cada cara. */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { es } from '@/i18n/es';

const C = es.library.cover;
const mockPoner = { mutate: jest.fn(), isPending: false };
const mockQuitar = { mutate: jest.fn() };
const mockColorear = { mutate: jest.fn() };
const mockMuestra = jest.fn();
const mockSnackbar = jest.fn();
const mockPreparar = jest.fn();
const mockArchivo = jest.fn();
const mockPegar = jest.fn();

jest.mock('@/hooks/use-library', () => ({
  useCoverParts: () => ({ poner: mockPoner, quitar: mockQuitar, colorear: mockColorear }),
  useLibraryItem: () => ({ data: undefined }),
  useLibraryFileUrl: (ruta: string | null) => ({ data: ruta ? `https://r2.test/${ruta}` : undefined }),
}));
jest.mock('@/lib/library/cover/eyedropper', () => ({
  muestraDe: (uri: string) => mockMuestra(uri),
  colorEn: () => '#ABCDEF',
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
  for (const m of [mockPoner.mutate, mockQuitar.mutate, mockColorear.mutate, mockMuestra, mockSnackbar, mockPreparar, mockArchivo, mockPegar]) m.mockReset();
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
  await fireEvent.press(screen.getByRole('button', { name: C.saveFor(C.front) }));
  const [datos, opciones] = mockPoner.mutate.mock.calls[0];
  expect(datos).toEqual({ item: expect.objectContaining({ id: 'l1' }), parte: 'front', jpeg: new Uint8Array([1]), color: '#EC4899' });
  await act(async () => opciones.onSuccess());
  expect(mockSnackbar).toHaveBeenCalledWith({ message: C.saved });
  // Se queda abierta para seguir con el lomo o la contraportada.
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: C.file })).toBeTruthy();
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
  expect(mockQuitar.mutate.mock.calls[0][0]).toEqual({ id: 'l1', parte: 'front' });
  expect(onClose).toHaveBeenCalled();
});

it('en la pestaña del lomo, la imagen se guarda para el lomo y se puede quitar sin cerrar', async () => {
  const onClose = jest.fn();
  mockArchivo.mockResolvedValue('file:///lomo.png');
  mockPreparar.mockResolvedValue({ jpeg: new Uint8Array([2]), color: '#222222', vistaPrevia: 'data:image/jpeg;base64,Ag==' });
  await render(<CoverSheet item={libro({ spine_path: 'u1/l1/spine.jpg', spine_color: '#333333' })} onClose={onClose} />);
  await fireEvent.press(screen.getByRole('tab', { name: C.spine }));
  expect(screen.getByText(`${C.colorOf(C.spine)} · #333333`)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: C.removeImage }));
  expect(mockQuitar.mutate.mock.calls[0][0]).toEqual({ id: 'l1', parte: 'spine' });
  expect(onClose).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: C.file }));
  await fireEvent.press(screen.getByRole('button', { name: C.saveFor(C.spine) }));
  expect(mockPoner.mutate.mock.calls[0][0]).toMatchObject({ parte: 'spine', color: '#222222' });
});

it('la contraportada sin color propio toma el de la portada; la paleta y el hex lo cambian', async () => {
  await render(<CoverSheet item={libro({ back_cover_path: null, back_cover_color: null })} onClose={jest.fn()} />);
  await fireEvent.press(screen.getByRole('tab', { name: C.back }));
  expect(screen.getByText(`${C.colorOf(C.back)} · #1E2761`)).toBeTruthy();
  // Sin imagen no hay cuentagotas.
  expect(screen.queryByRole('button', { name: C.eyedropper })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: es.library.find.colorNames.red }));
  expect(mockColorear.mutate.mock.calls[0][0]).toMatchObject({ parte: 'back', hex: expect.stringMatching(/^#[0-9A-F]{6}$/) });
  const aplicar = screen.getByRole('button', { name: C.apply });
  expect(aplicar.props.accessibilityState?.disabled).toBe(true);
  await fireEvent.changeText(screen.getByLabelText(C.hex), '1e2761');
  await fireEvent.press(screen.getByRole('button', { name: C.apply }));
  expect(mockColorear.mutate.mock.calls[1][0]).toMatchObject({ parte: 'back', hex: '#1E2761' });
});

it('el cuentagotas toma el color del punto que se toca', async () => {
  mockMuestra.mockResolvedValue({ ancho: 2, alto: 3, pixeles: new Uint8Array(24) });
  await render(<CoverSheet item={libro()} onClose={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: C.eyedropper }));
  expect(mockMuestra).toHaveBeenCalledWith('https://r2.test/u1/l1/cover.png');
  expect(screen.getByText(C.eyedropperHint)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: C.eyedropperTap }), { nativeEvent: { locationX: 70, locationY: 105 } });
  expect(mockColorear.mutate.mock.calls[0][0]).toMatchObject({ parte: 'front', hex: '#ABCDEF' });
});

it('si la imagen no se puede leer, el cuentagotas lo dice', async () => {
  mockMuestra.mockResolvedValue(null);
  await render(<CoverSheet item={libro()} onClose={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: C.eyedropper }));
  expect(await screen.findByText(C.eyedropperUnavailable)).toBeTruthy();
});
