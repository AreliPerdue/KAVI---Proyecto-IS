/** Mis reseñas (spec 13d, RF-BF8 – RF-BF10; T295): la lista con portada, los totales, filtrar y ordenar. */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { es } from '@/i18n/es';

const R = es.library.cards.reviews;
let mockFichas: Record<string, unknown>[] = [];
const mockRomance = {
  id: 'r',
  owner_id: 'u1',
  name: 'Romance',
  fields: [
    { id: 'stars', type: 'scale', label: 'Estrellas', max: 5, symbol: 'star' },
    { id: 'spice', type: 'scale', label: 'Picante', max: 5, symbol: 'flame' },
    { id: 'genre', type: 'choice', label: 'Género', options: ['Fantasía', 'Romance'] },
  ],
  look: {},
  created_at: 'c',
  updated_at: 'u',
};
jest.mock('@/hooks/use-cards', () => ({
  useCardTemplates: () => ({ data: [mockRomance], isPending: false, isSuccess: true }),
  useCards: () => ({ data: mockFichas, isPending: false, isSuccess: true, isError: false, refetch: jest.fn() }),
}));
jest.mock('@/hooks/use-library', () => ({
  useLibraryItems: () => ({
    data: [
      { id: 'l1', title: 'Alas de sangre' },
      { id: 'l2', title: 'Rayuela' },
      { id: 'l3', title: 'Mistborn' },
    ],
  }),
}));
jest.mock('@/components/library/book-cover', () => ({ BookCover: () => null }));
jest.mock('@/hooks/use-sticker-elegible', () => ({ useStickerElegible: () => () => null }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/reviews').default as () => React.ReactElement;
const router = (globalThis as unknown as { mockRouter: { push: jest.Mock } }).mockRouter;
const ficha = (id: string, item_id: string, values: Record<string, unknown>, updated_at: string) => ({ id, item_id, template_id: 'r', owner_id: 'u1', values, placement: 'back', created_at: updated_at, updated_at });

beforeEach(() => {
  mockFichas = [
    ficha('f1', 'l1', { stars: 5, spice: 5, genre: ['Fantasía'] }, '2026-10-03'),
    ficha('f2', 'l2', { stars: 3, spice: 1, genre: ['Romance'] }, '2026-10-02'),
    ficha('f3', 'l3', { stars: 4, spice: 4, genre: ['Fantasía'] }, '2026-10-01'),
  ];
});

it('sin fichas invita a llenar una', async () => {
  mockFichas = [];
  await render(<Pantalla />);
  expect(screen.getByText(R.emptyTitle)).toBeTruthy();
});

it('muestra cada ficha con su libro y los totales de arriba', async () => {
  await render(<Pantalla />);
  expect(screen.getByRole('button', { name: R.open('Rayuela', 'Romance') })).toBeTruthy();
  expect(screen.getByLabelText(`${R.books}: 3`)).toBeTruthy();
  expect(screen.getByLabelText(`${R.topGenre}: Fantasía`)).toBeTruthy();
});

it('"picante 4 o más" deja solo esas y actualiza los totales; el filtro se quita con su chip', async () => {
  await render(<Pantalla />);
  await fireEvent.press(screen.getByRole('button', { name: R.filter(0) }));
  await fireEvent.press(screen.getByRole('button', { name: 'Picante' }));
  await fireEvent.press(screen.getByRole('button', { name: R.atLeast(4) }));
  expect(screen.queryByRole('button', { name: R.open('Rayuela', 'Romance') })).toBeNull();
  expect(screen.getByLabelText(`${R.books}: 2`)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: R.removeFilter(R.chip('Picante', R.atLeast(4))) }));
  expect(screen.getByRole('button', { name: R.open('Rayuela', 'Romance') })).toBeTruthy();
});

it('ordenar por estrellas pone primero la de 5; tocar una la abre', async () => {
  await render(<Pantalla />);
  await fireEvent.press(screen.getByRole('button', { name: R.order(R.recent) }));
  await fireEvent.press(screen.getByRole('button', { name: R.byField('Estrellas') }));
  const nombres = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel).filter((x: string) => x?.includes('Toca para abrirla'));
  expect(nombres).toEqual([R.open('Alas de sangre', 'Romance'), R.open('Mistborn', 'Romance'), R.open('Rayuela', 'Romance')]);
  await fireEvent.press(screen.getByRole('button', { name: R.open('Mistborn', 'Romance') }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/(app)/card/[itemId]', params: { itemId: 'l3', plantilla: 'r' } });
});
