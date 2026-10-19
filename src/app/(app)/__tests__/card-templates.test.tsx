/**
 * Fichas (spec 13d, RF-BF1 – RF-BF5; T293): la lista de diseños y su editor. Se fija que editar, duplicar y
 * borrar (avisando cuántas fichas llenas se van) hagan lo suyo, que el editor no guarde un diseño incompleto,
 * y que con fichas llenas pregunte si el cambio vale para ellas.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { es } from '@/i18n/es';

const C = es.library.cards;
const E = C.editor;
const mockConfirm = jest.fn(async (_o: unknown) => true);
const mockSnackbar = jest.fn();
const mockGuardar = jest.fn();
const mockBorrar = jest.fn();
let mockPlantillas: Record<string, unknown>[] = [];
let mockFichas: Record<string, unknown>[] = [];

jest.mock('@/hooks/use-cards', () => ({
  useCardTemplates: () => ({ data: mockPlantillas, isPending: false, isSuccess: true, isError: false, refetch: jest.fn() }),
  useCards: () => ({ data: mockFichas }),
  useSaveCardTemplate: () => ({ mutate: mockGuardar, isPending: false }),
  useRemoveCardTemplate: () => ({ mutate: mockBorrar }),
}));
jest.mock('@/hooks/use-sticker-elegible', () => ({ useStickerElegible: () => () => null }));
jest.mock('@/hooks/use-user-stickers', () => ({ useUserStickers: () => ({ data: [] }), useUserStickerImages: () => new Map() }));
jest.mock('@/components/library/sticker-sheet', () => ({ StickerSheet: () => null }));
jest.mock('@/providers', () => ({ useConfirm: () => mockConfirm, useSnackbar: () => mockSnackbar }));

/* eslint-disable @typescript-eslint/no-require-imports -- tras los mocks */
const Lista = require('@/app/(app)/card-templates').default as () => React.ReactElement;
const Editor = require('@/app/(app)/card-template/[id]').default as () => React.ReactElement;
/* eslint-enable @typescript-eslint/no-require-imports */
const router = (globalThis as unknown as { mockRouter: { push: jest.Mock; back: jest.Mock; canGoBack: jest.Mock } }).mockRouter;
const conParametros = (globalThis as unknown as { setParametrosDeRuta: (p: Record<string, string>) => void }).setParametrosDeRuta;

const ROMANCE = {
  id: 'r',
  owner_id: 'u1',
  name: 'Romance',
  fields: [
    { id: 'stars', type: 'scale', label: 'Estrellas', max: 5, symbol: 'heart' },
    { id: 'tropes', type: 'choice', label: 'Tropes', options: ['Slow burn'], multiple: true },
  ],
  look: { color: '#F6A9CD', background: 'dots', font: 'hand', stickers: [] },
  created_at: '2026-10-19',
  updated_at: '2026-10-19',
};

beforeEach(() => {
  mockPlantillas = [ROMANCE, { ...ROMANCE, id: 'vieja', name: 'Romance viejo', archived: true }];
  mockFichas = [{ id: 'f1', template_id: 'r' }, { id: 'f2', template_id: 'r' }];
  for (const m of [mockConfirm, mockSnackbar, mockGuardar, mockBorrar]) m.mockClear();
});

describe('lista de diseños', () => {
  it('muestra los vigentes con sus campos y fichas llenas; no las versiones archivadas', async () => {
    await render(<Lista />);
    expect(screen.getByRole('button', { name: C.edit('Romance') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: C.edit('Romance viejo') })).toBeNull();
    expect(screen.getByText(`${C.fieldsCount(2)} · ${C.usedBy(2)}`)).toBeTruthy();
  });

  it('tocar uno lo edita; Nueva ficha abre uno en blanco', async () => {
    await render(<Lista />);
    await fireEvent.press(screen.getByRole('button', { name: C.edit('Romance') }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/(app)/card-template/[id]', params: { id: 'r' } });
    await fireEvent.press(screen.getByRole('button', { name: C.newTemplate }));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/(app)/card-template/[id]', params: { id: 'nueva' } });
  });

  it('duplicar guarda una copia; borrar avisa cuántas fichas llenas se van', async () => {
    await render(<Lista />);
    await fireEvent.press(screen.getByRole('button', { name: C.duplicate('Romance') }));
    expect(mockGuardar).toHaveBeenCalledWith({ diseno: { name: C.copyName('Romance'), fields: ROMANCE.fields, look: ROMANCE.look } }, expect.anything());
    await fireEvent.press(screen.getByRole('button', { name: C.remove('Romance') }));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ message: C.removeMessage(2), destructive: true }));
    await waitFor(() => expect(mockBorrar).toHaveBeenCalledWith('r', expect.anything()));
  });
});

describe('editor', () => {
  it('agregar un campo de texto "Escena favorita" y guardar (con fichas llenas, pregunta)', async () => {
    conParametros({ id: 'r' });
    await render(<Editor />);
    await fireEvent.press(screen.getByRole('button', { name: E.addField }));
    await fireEvent.press(screen.getByRole('button', { name: `${C.types.text}. ${C.typeHints.text}` }));
    await fireEvent.changeText(screen.getByLabelText(C.field.label), 'Escena favorita');
    await fireEvent.press(screen.getByRole('tab', { name: C.field.long }));
    await fireEvent.press(screen.getByRole('button', { name: C.field.done }));
    await fireEvent.press(screen.getByRole('button', { name: E.save }));
    expect(screen.getByText(E.applyMessage(2))).toBeTruthy();
    expect(mockGuardar).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: E.applyNew }));
    const [{ id, diseno, aplicar }] = mockGuardar.mock.calls[0];
    expect({ id, aplicar }).toEqual({ id: 'r', aplicar: 'nuevas' });
    expect(diseno.fields.at(-1)).toMatchObject({ type: 'text', label: 'Escena favorita', long: true });
  });

  it('sin nombre no guarda y dice qué falta', async () => {
    conParametros({ id: 'r' });
    await render(<Editor />);
    await fireEvent.changeText(screen.getByLabelText(E.name), '   ');
    await fireEvent.press(screen.getByRole('button', { name: E.save }));
    expect(screen.getByText(E.problems.name)).toBeTruthy();
    expect(mockGuardar).not.toHaveBeenCalled();
  });

  it('una nueva se guarda directo; salir con cambios pregunta', async () => {
    mockFichas = [];
    conParametros({ id: 'nueva' });
    await render(<Editor />);
    await fireEvent.changeText(screen.getByLabelText(E.name), 'Mi ficha');
    await fireEvent.press(screen.getByRole('button', { name: C.backgrounds.grid }));
    await fireEvent.press(screen.getByRole('button', { name: E.save }));
    expect(mockGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ id: undefined, aplicar: 'todas', diseno: expect.objectContaining({ name: 'Mi ficha', look: expect.objectContaining({ background: 'grid' }) }) }),
      expect.anything(),
    );
    await fireEvent.press(screen.getByRole('button', { name: es.common.back }));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: E.discardTitle }));
  });

  it('el símbolo y el máximo de una escala se cambian en su hoja', async () => {
    conParametros({ id: 'r' });
    await render(<Editor />);
    await fireEvent.press(screen.getByRole('button', { name: E.fieldA11y('Estrellas', C.types.scale) }));
    await fireEvent.press(screen.getByRole('tab', { name: '10' }));
    await fireEvent.press(screen.getByRole('radio', { name: C.symbols.flame }));
    await fireEvent.press(screen.getByRole('button', { name: C.field.done }));
    expect(screen.getByText(C.scaleSummary(10, C.symbols.flame))).toBeTruthy();
  });
});
