/**
 * Llenar una ficha y las fichas de un libro (spec 13d, RF-BF4, RF-BF5, RF-BF7; T294).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { es } from '@/i18n/es';

const C = es.library.cards;
const F = C.fill;
const mockConfirm = jest.fn(async (_o: unknown) => true);
const mockSnackbar = jest.fn();
const mockGuardar = jest.fn();
const mockQuitar = jest.fn();
let mockFichas: Record<string, unknown>[] = [];

const mockRomance = {
  id: 'r',
  owner_id: 'u1',
  name: 'Romance',
  fields: [
    { id: 'stars', type: 'scale', label: 'Estrellas', max: 5, symbol: 'heart' },
    { id: 'tropes', type: 'choice', label: 'Tropes', options: ['Slow burn', 'Fake dating'], multiple: true },
    { id: 'reread', type: 'boolean', label: '¿Lo releerías?' },
    { id: 'quote', type: 'text', label: 'Frase favorita', long: true },
  ],
  look: {},
  created_at: '2026-10-19',
  updated_at: '2026-10-19',
};
const mockRapida = { ...mockRomance, id: 'q', name: 'Reseña rápida' };

jest.mock('@/hooks/use-cards', () => ({
  useCardTemplates: () => ({ data: [mockRomance, mockRapida], isPending: false, isSuccess: true, refetch: jest.fn() }),
  useCards: () => ({ data: mockFichas, isPending: false, isSuccess: true, isError: false, refetch: jest.fn() }),
  useSaveCard: () => ({ mutate: mockGuardar, isPending: false }),
  useRemoveCard: () => ({ mutate: mockQuitar }),
}));
jest.mock('@/hooks/use-library', () => ({ useLibraryItem: () => ({ data: { id: 'l1', title: 'Rayuela' }, isPending: false }) }));
jest.mock('@/hooks/use-sticker-elegible', () => ({ useStickerElegible: () => () => null }));
jest.mock('@/providers', () => ({ useConfirm: () => mockConfirm, useSnackbar: () => mockSnackbar }));

/* eslint-disable @typescript-eslint/no-require-imports -- tras los mocks */
const Llenar = require('@/app/(app)/card/[itemId]').default as () => React.ReactElement;
const DelLibro = require('@/app/(app)/book-cards/[id]').default as () => React.ReactElement;
/* eslint-enable @typescript-eslint/no-require-imports */
const router = (globalThis as unknown as { mockRouter: { push: jest.Mock } }).mockRouter;
const conParametros = (globalThis as unknown as { setParametrosDeRuta: (p: Record<string, string>) => void }).setParametrosDeRuta;

beforeEach(() => {
  mockFichas = [];
  for (const m of [mockConfirm, mockSnackbar, mockGuardar, mockQuitar]) m.mockClear();
});

describe('llenar', () => {
  it('estrellas, tropes, sí/no, frase y dónde va pegada se guardan', async () => {
    conParametros({ itemId: 'l1', plantilla: 'r' });
    await render(<Llenar />);
    await fireEvent.press(screen.getByRole('radio', { name: C.scaleValue(4, 5) }));
    await fireEvent.press(screen.getByRole('button', { name: 'Slow burn' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Fake dating' }));
    await fireEvent.press(screen.getByRole('button', { name: C.yes }));
    await fireEvent.changeText(screen.getByLabelText('Frase favorita'), 'La Maga');
    await fireEvent.press(screen.getByRole('button', { name: F.placements.last_page }));
    await fireEvent.press(screen.getByRole('button', { name: F.save }));
    expect(mockGuardar).toHaveBeenCalledWith(
      { item_id: 'l1', template_id: 'r', values: { stars: 4, tropes: ['Slow burn', 'Fake dating'], reread: true, quote: 'La Maga' }, placement: 'last_page' },
      expect.anything(),
    );
  });

  it('tocar la estrella elegida la borra; por omisión va en la contraportada', async () => {
    conParametros({ itemId: 'l1', plantilla: 'r' });
    await render(<Llenar />);
    await fireEvent.press(screen.getByRole('radio', { name: C.scaleValue(3, 5) }));
    await fireEvent.press(screen.getByRole('radio', { name: C.scaleValue(3, 5) }));
    await fireEvent.press(screen.getByRole('button', { name: F.save }));
    expect(mockGuardar.mock.calls[0][0]).toMatchObject({ values: {}, placement: 'back' });
  });

  it('los valores de un campo quitado se ven aparte y se borran a propósito (RF-BF5)', async () => {
    mockFichas = [{ id: 'f1', item_id: 'l1', template_id: 'r', owner_id: 'u1', values: { stars: 2, escena: 'El baile' }, placement: 'back', created_at: 'c', updated_at: 'u' }];
    conParametros({ itemId: 'l1', plantilla: 'r' });
    await render(<Llenar />);
    expect(screen.getByText(F.hidden)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: F.save }));
    expect(mockGuardar.mock.calls[0][0].values).toEqual({ stars: 2, escena: 'El baile' });
    await fireEvent.press(screen.getByRole('button', { name: F.deleteHidden('El baile') }));
    await fireEvent.press(screen.getByRole('button', { name: F.save }));
    expect(mockGuardar.mock.calls[1][0].values).toEqual({ stars: 2 });
  });

  it('quitar una ficha pide confirmación', async () => {
    mockFichas = [{ id: 'f1', item_id: 'l1', template_id: 'r', owner_id: 'u1', values: {}, placement: 'back', created_at: 'c', updated_at: 'u' }];
    conParametros({ itemId: 'l1', plantilla: 'r' });
    await render(<Llenar />);
    await fireEvent.press(screen.getByRole('button', { name: F.remove }));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: F.removeTitle, destructive: true }));
    await waitFor(() => expect(mockQuitar).toHaveBeenCalledWith('f1', expect.anything()));
  });
});

describe('fichas del libro', () => {
  it('sin fichas lo dice; agregar elige entre los diseños que aún no tiene', async () => {
    mockFichas = [{ id: 'f1', item_id: 'otro', template_id: 'r', owner_id: 'u1', values: {}, placement: 'back', created_at: 'c', updated_at: 'u' }];
    conParametros({ id: 'l1' });
    await render(<DelLibro />);
    expect(screen.getByText(C.book.empty)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: C.book.add }));
    await fireEvent.press(screen.getByRole('button', { name: 'Reseña rápida' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/(app)/card/[itemId]', params: { itemId: 'l1', plantilla: 'q' } });
  });

  it('cada ficha dice dónde va pegada y tocarla la abre; no se ofrece el mismo diseño otra vez', async () => {
    mockFichas = [{ id: 'f1', item_id: 'l1', template_id: 'r', owner_id: 'u1', values: { stars: 5 }, placement: 'back', created_at: 'c', updated_at: 'u' }];
    conParametros({ id: 'l1' });
    await render(<DelLibro />);
    await fireEvent.press(screen.getByRole('button', { name: C.book.openCard('Romance', F.placedOn.back) }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/(app)/card/[itemId]', params: { itemId: 'l1', plantilla: 'r' } });
    await fireEvent.press(screen.getByRole('button', { name: C.book.add }));
    expect(screen.queryByRole('button', { name: 'Romance' })).toBeNull();
  });
});
