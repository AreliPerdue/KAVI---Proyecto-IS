/** Mi libreta de un libro (spec 13h, RF-CC23; T342): recortes con miniatura, nuevo recorte, borrar, fragmentos y fichas. */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { es } from '@/i18n/es';

let mockRecortes: { data?: Record<string, unknown>[]; isPending: boolean; isError: boolean; refetch: jest.Mock };
const mockCrear = jest.fn(() => 'r-nuevo');
const mockBorrar = jest.fn();
jest.mock('@/hooks/use-canvases', () => ({
  useCanvases: () => mockRecortes,
  useCreateCanvas: () => mockCrear,
  useRemoveCanvas: () => mockBorrar,
}));
const mockPiezas = { data: [{ id: 'l1', title: 'Rayuela', family: 'book', kind: 'pdf', cover_path: null, cover_color: '#2E7D32' }] };
jest.mock('@/hooks/use-library', () => ({ useLibraryItem: () => ({ data: { id: 'l1', title: 'Rayuela', family: 'book', kind: 'pdf' } }), useLibraryItems: () => mockPiezas }));
jest.mock('@/hooks/use-clips', () => ({ useClips: () => ({ data: [{ id: 'c1', item_id: 'l1' }, { id: 'c2', item_id: 'l1' }, { id: 'c3', item_id: 'otro' }] }) }));
const mockVacio = new Map<string, string>();
jest.mock('@/hooks/use-annotations', () => ({ useLibraryImageUrls: () => mockVacio }));
jest.mock('@/hooks/use-sticker-packs', () => ({ useStickerPacks: () => ({ data: undefined }), useStickerSources: () => mockVacio }));
jest.mock('@/hooks/use-user-stickers', () => ({ useUserStickers: () => ({ data: [] }), useUserStickerImages: () => mockVacio, useUserStickerSources: () => mockVacio }));
const mockConfirmar = jest.fn(async () => true);
const mockAvisar = jest.fn();
jest.mock('@/providers', () => ({ useConfirm: () => mockConfirmar, useSnackbar: () => mockAvisar }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/notebook/[id]').default as () => React.ReactElement;

const N = es.library.notebook;
const C = es.library.canvas;
const recorte = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
  id,
  owner_id: 'u1',
  context: 'book',
  item_id: 'l1',
  title,
  orientation: 'portrait',
  doc: { pages: 1, elements: [{ id: 'e1', type: 'shape', page: 1, x: 0.1, y: 0.1, w: 0.3, ar: 1, rot: 0, z: 1, locked: false, group: null, style: {}, content: { shape: 'heart' } }] },
  version: 1,
  thumb_path: null,
  created_at: 'c',
  updated_at: 'u',
  ...extra,
});

beforeEach(() => {
  globalThis.setParametrosDeRuta({ id: 'l1' });
  mockRecortes = { data: [recorte('r1', 'Personajes'), recorte('r2', '', { orientation: 'landscape' })], isPending: false, isError: false, refetch: jest.fn() };
  for (const m of [mockCrear, mockBorrar, mockConfirmar, mockAvisar]) m.mockClear();
});

it('muestra el libro y sus recortes con su nombre; tocar uno lo abre', async () => {
  await render(<Pantalla />);
  expect(screen.getByText(N.title)).toBeTruthy();
  expect(screen.getByText('Rayuela')).toBeTruthy();
  expect(screen.getByText(C.untitled)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Personajes' }));
  expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/canvas/[id]', params: { id: 'r1', item: 'l1' } });
});

it('sin recortes invita a hacer uno; "Nuevo recorte" pregunta la forma, lo crea y lo abre', async () => {
  mockRecortes = { data: [], isPending: false, isError: false, refetch: jest.fn() };
  await render(<Pantalla />);
  expect(screen.getByText(N.empty)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: C.newCanvas }));
  await fireEvent.press(screen.getByRole('tab', { name: C.landscape }));
  await fireEvent.press(screen.getByRole('button', { name: C.create }));
  expect(mockCrear).toHaveBeenCalledWith('l1', 'landscape');
  expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/canvas/[id]', params: { id: 'r-nuevo', item: 'l1' } });
});

it('si no cargan, lo dice y deja reintentar', async () => {
  mockRecortes = { data: undefined, isPending: false, isError: true, refetch: jest.fn() };
  await render(<Pantalla />);
  expect(screen.getByText(N.error)).toBeTruthy();
});

it('borrar un recorte pide confirmar y avisa', async () => {
  await render(<Pantalla />);
  await fireEvent.press(screen.getByRole('button', { name: N.actionsFor('Personajes') }));
  await fireEvent.press(screen.getByRole('button', { name: N.remove }));
  expect(mockConfirmar).toHaveBeenCalledWith(expect.objectContaining({ title: N.removeTitle, destructive: true }));
  expect(mockBorrar).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));
  expect(mockAvisar).toHaveBeenCalledWith({ message: N.removed });
});

it('si no confirma, no se borra', async () => {
  mockConfirmar.mockResolvedValueOnce(false);
  await render(<Pantalla />);
  await fireEvent.press(screen.getByRole('button', { name: N.actionsFor('Personajes') }));
  await fireEvent.press(screen.getByRole('button', { name: N.remove }));
  expect(mockBorrar).not.toHaveBeenCalled();
});

it('los fragmentos de este libro se cuentan y se abren filtrados; las fichas, en su pantalla', async () => {
  await render(<Pantalla />);
  await fireEvent.press(screen.getByRole('button', { name: `${N.fragments} · ${N.fragmentsCount(2)}` }));
  expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/fragments', params: { libro: 'l1' } });
  await fireEvent.press(screen.getByRole('button', { name: N.cards }));
  expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/book-cards/[id]', params: { id: 'l1' } });
});
