/**
 * Mis fragmentos (spec 13c, RF-BH21; T317): el más nuevo primero, filtros por tipo y libro, tocar uno abre su
 * libro en ese lugar, la nota se guarda, y uno de un libro borrado se queda con su título.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { es } from '@/i18n/es';

const C = es.library.clips;
const mockConfirm = jest.fn(async () => true);
const mockSnackbar = jest.fn();
const mockNota = jest.fn();
const mockBorrar = jest.fn();
const mockCopiar = jest.fn(async (_t: string) => true);
let mockClips: { data?: unknown[]; isPending: boolean; isError: boolean; isSuccess: boolean; error: Error | null; refetch: jest.Mock };

jest.mock('@/hooks/use-clips', () => ({
  useClips: () => mockClips,
  useClipImages: () => new Map([['img', 'https://r2/img.jpg']]),
  useUpdateClipNote: () => ({ mutate: mockNota, isPending: false }),
  useRemoveClip: () => ({ mutate: mockBorrar }),
}));
jest.mock('@/providers', () => ({ useConfirm: () => mockConfirm, useSnackbar: () => mockSnackbar }));
jest.mock('expo-clipboard', () => ({ setStringAsync: (t: string) => mockCopiar(t) }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/fragments').default as () => React.ReactElement;
const router = (globalThis as unknown as { mockRouter: { push: jest.Mock } }).mockRouter;

const base = { owner_id: 'u1', path: null, ar: null, note: null, created_at: '2026-10-19T10:00:00Z', updated_at: '2026-10-19T10:00:00Z' };
const TEXTO = { ...base, id: 'txt', item_id: 'l1', book_title: 'Rayuela', kind: 'text', text: 'la ciudad era un mapa', locator: { page: 12 } };
const IMAGEN = { ...base, id: 'img', item_id: 'l2', book_title: 'Atlas', kind: 'image', text: null, path: 'u1/clips/img.jpg', ar: 0.5, locator: { page: 3, x: 0, y: 0, w: 1, h: 0.5 } };
const HUERFANO = { ...base, id: 'sin', item_id: null, book_title: 'Ficciones', kind: 'text', text: 'el jardín', locator: { cfi: 'epubcfi(/6/8)' } };
const listo = (data: unknown[]) => ({ data, isPending: false, isError: false, isSuccess: true, error: null, refetch: jest.fn() });

beforeEach(() => {
  mockClips = listo([TEXTO, IMAGEN, HUERFANO]);
  for (const m of [mockSnackbar, mockNota, mockBorrar, mockCopiar]) m.mockClear();
  mockConfirm.mockClear();
});

it('sin fragmentos invita a guardar uno', async () => {
  mockClips = listo([]);
  await render(<Pantalla />);
  expect(screen.getByText(C.emptyTitle)).toBeTruthy();
});

it('muestra el texto, la imagen y su libro con la página', async () => {
  await render(<Pantalla />);
  expect(screen.getByText('la ciudad era un mapa')).toBeTruthy();
  expect(screen.getByText(/Rayuela · p\. 12/)).toBeTruthy();
  expect(screen.getByRole('button', { name: new RegExp(C.imageA11y('Atlas')) })).toBeTruthy();
});

it('filtra por tipo y por libro', async () => {
  await render(<Pantalla />);
  await fireEvent.press(screen.getByRole('tab', { name: C.kinds.image }));
  expect(screen.queryByText('la ciudad era un mapa')).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: C.kinds.all }));
  await fireEvent.press(screen.getByRole('button', { name: 'Ficciones' }));
  expect(screen.getByText('el jardín')).toBeTruthy();
  expect(screen.queryByText('la ciudad era un mapa')).toBeNull();
});

it('tocar uno abre su libro en ese lugar', async () => {
  await render(<Pantalla />);
  await fireEvent.press(screen.getByRole('button', { name: /^la ciudad era un mapa/ }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/(app)/book/[id]', params: { id: 'l1', ir: JSON.stringify({ page: 12 }) } });
});

it('uno de un libro borrado se queda con su título y avisa que el libro ya no está', async () => {
  await render(<Pantalla />);
  await fireEvent.press(screen.getByRole('button', { name: /^el jardín/ }));
  expect(router.push).not.toHaveBeenCalled();
  expect(mockSnackbar).toHaveBeenCalledWith({ message: C.bookGone });
});

it('Nota y más: guarda la nota, copia el texto y borra con confirmación', async () => {
  await render(<Pantalla />);
  await fireEvent.press(screen.getAllByRole('button', { name: C.more })[0]);
  await fireEvent.changeText(screen.getByLabelText(C.note), '  para el journal ');
  await fireEvent.press(screen.getByRole('button', { name: C.saveNote }));
  expect(mockNota).toHaveBeenCalledWith({ id: 'txt', note: 'para el journal' }, expect.anything());
  await fireEvent.press(screen.getByRole('button', { name: C.copy }));
  expect(mockCopiar).toHaveBeenCalledWith('la ciudad era un mapa');
  await fireEvent.press(screen.getByRole('button', { name: C.remove }));
  expect(mockConfirm).toHaveBeenCalled();
  expect(mockBorrar).toHaveBeenCalledWith('txt', expect.anything());
});
