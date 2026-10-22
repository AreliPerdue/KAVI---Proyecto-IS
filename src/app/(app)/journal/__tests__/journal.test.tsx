/** Crear, editar y ver un Journal (spec 13i, RF-JC1 – RF-JC9; T345). */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { es } from '@/i18n/es';

let mockPieza: { data?: Record<string, unknown>; isError: boolean; refetch: jest.Mock };
const mockCrear = jest.fn();
const mockActualizar = jest.fn();
jest.mock('@/hooks/use-library', () => ({
  useLibraryItem: () => mockPieza,
  useCreateJournal: () => ({ mutate: mockCrear, isPending: false }),
  useUpdateLibraryItem: () => ({ mutate: mockActualizar }),
}));
const mockAvisar = jest.fn();
jest.mock('@/providers', () => ({ useSnackbar: () => mockAvisar }));
jest.mock('@/hooks/use-saved-colors', () => ({ useSavedColors: () => ({ data: [] }), useSaveColors: () => ({ mutate: jest.fn() }) }));

/* eslint-disable @typescript-eslint/no-require-imports -- tras los mocks */
const Editar = require('@/app/(app)/journal/edit').default as () => React.ReactElement;
const Ver = require('@/app/(app)/journal/[id]').default as () => React.ReactElement;
/* eslint-enable @typescript-eslint/no-require-imports */

const J = es.library.journal;
const C = es.library.canvas;
const portada = { orientation: 'portrait', binding: 'sewn', material: 'linen', color: '#3B2A20', back: null, edges: '#F7F5EF', accent: '#B9B9B9' };

beforeEach(() => {
  mockPieza = { data: undefined, isError: false, refetch: jest.fn() };
  for (const m of [mockCrear, mockActualizar, mockAvisar]) m.mockReset();
});

describe('crear', () => {
  beforeEach(() => globalThis.setParametrosDeRuta({}));

  it('se eligen forma, encuadernación, material y su color, nombre y páginas, y se crea con todo eso', async () => {
    await render(<Editar />);
    await fireEvent.press(screen.getByRole('tab', { name: C.landscape }));
    await fireEvent.press(screen.getByRole('button', { name: J.bindings.spiral }));
    expect(screen.getByRole('button', { name: J.accentMetal })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: J.materials.wood }));
    await fireEvent.press(screen.getByRole('button', { name: J.color }));
    await fireEvent.changeText(screen.getByLabelText(C.color.hex), '#6b3e26');
    await fireEvent.press(screen.getByRole('button', { name: C.color.use }));
    await fireEvent.changeText(screen.getByLabelText(J.name), 'Mi año lector');
    await fireEvent.press(screen.getByRole('button', { name: J.more }));
    await fireEvent.press(screen.getByRole('button', { name: J.create }));
    expect(mockCrear).toHaveBeenCalledWith(
      { title: 'Mi año lector', pages: 140, journal: expect.objectContaining({ orientation: 'landscape', binding: 'spiral', material: 'wood', color: '#6B3E26' }) },
      expect.anything(),
    );
  });

  it('sin nombre se llama "Mi Journal"; la contraportada puede tener su propio material', async () => {
    await render(<Editar />);
    await fireEvent.press(screen.getByRole('tab', { name: J.backOwn }));
    await fireEvent.press(screen.getAllByRole('button', { name: J.materials.velvet }).at(-1)!);
    await fireEvent.press(screen.getByRole('button', { name: J.create }));
    expect(mockCrear.mock.calls[0][0]).toMatchObject({ title: J.defaultTitle, journal: { back: { material: 'velvet' } } });
  });
});

describe('editar y ver', () => {
  beforeEach(() => {
    globalThis.setParametrosDeRuta({ id: 'j1' });
    mockPieza = { data: { id: 'j1', title: 'Mi año', kind: 'journal', family: 'creation', page_count: 120, journal: portada }, isError: false, refetch: jest.fn() };
  });

  it('editar empieza con lo que tiene y guarda los cambios sin perder nada', async () => {
    await render(<Editar />);
    expect(screen.getByDisplayValue('Mi año')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: J.materials.velvet }));
    await fireEvent.press(screen.getByRole('button', { name: J.save }));
    expect(mockActualizar).toHaveBeenCalledWith(
      { id: 'j1', patch: { title: 'Mi año', page_count: 120, journal: { ...portada, material: 'velvet' } } },
      expect.anything(),
    );
  });

  it('la ficha dice qué es, se gira a lomo y contraportada, y lleva a editar', async () => {
    await render(<Ver />);
    expect(screen.getByText('Mi año')).toBeTruthy();
    expect(screen.getByText(`${J.bindings.sewn} · ${J.materials.linen} · ${J.pagesValue(120)}`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: J.faces.spine }));
    expect(screen.getByRole('image', { name: J.faces.spine })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: J.edit }));
    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/journal/edit', params: { id: 'j1' } });
  });

  it('si ya no existe, lo dice', async () => {
    mockPieza = { data: undefined, isError: true, refetch: jest.fn() };
    await render(<Ver />);
    expect(screen.getByText(J.notFound)).toBeTruthy();
  });
});
