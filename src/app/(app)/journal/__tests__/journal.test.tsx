/** Crear, editar y ver un Journal (spec 13i, RF-JC1 – RF-JC9; T345) y sus páginas (13h, RF-CC2; T347). */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { es } from '@/i18n/es';
import type { MensajeAlMotor, MensajeDelMotor } from '@/lib/library/reader-protocol';

let mockPieza: { data?: Record<string, unknown>; isError: boolean; refetch: jest.Mock };
const mockCrear = jest.fn();
const mockActualizar = jest.fn();
jest.mock('@/hooks/use-library', () => ({
  useLibraryItem: () => mockPieza,
  useCreateJournal: () => ({ mutate: mockCrear, isPending: false }),
  useUpdateLibraryItem: () => ({ mutate: mockActualizar }),
}));
const mockAvisar = jest.fn();
const mockConfirmar = jest.fn(async () => true);
jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }), useSnackbar: () => mockAvisar, useConfirm: () => mockConfirmar }));
jest.mock('@/hooks/use-profile', () => ({ useMyProfile: () => ({ data: { display_name: 'Areli Perdue', username: 'areli' } }) }));
// Las páginas (T347).
let mockLienzos: { data?: Record<string, unknown>[]; isPending: boolean; isError: boolean; refetch: jest.Mock };
const mockCrearLienzo = jest.fn(() => 'nueva');
const mockBorrarLienzo = jest.fn();
jest.mock('@/hooks/use-canvases', () => ({ useCanvases: () => mockLienzos, useCreateCanvas: () => mockCrearLienzo, useRemoveCanvas: () => mockBorrarLienzo }));
const mockVacio = new Map<string, string>();
const mockFuentes = { miniatura: { imagenes: mockVacio, stickers: mockVacio }, motor: { imagenes: mockVacio, stickers: mockVacio, libros: new Map() } };
jest.mock('@/hooks/use-canvas-sources', () => ({ useFuentesDeLienzos: () => mockFuentes }));
const mockMisPlantillas = { data: [] };
jest.mock('@/hooks/use-canvas-templates', () => ({ useCanvasTemplates: () => mockMisPlantillas, useRemoveCanvasTemplate: () => ({ mutate: jest.fn() }) }));
jest.mock('@/hooks/use-annotations', () => ({ useLibraryImageUrls: () => mockVacio }));
const mockEnviados: MensajeAlMotor[] = [];
let mockResponder: (m: MensajeDelMotor) => void = () => undefined;
jest.mock('@/components/library/reader-engine', () => {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- dentro de la fábrica del mock */
  const React = require('react') as typeof import('react');
  const Motor = React.forwardRef(function Motor({ onMessage }: { onMessage: (m: MensajeDelMotor) => void }, ref) {
    mockResponder = onMessage;
    React.useImperativeHandle(ref, () => ({ send: (m: MensajeAlMotor) => mockEnviados.push(m) }));
    return null;
  });
  Motor.displayName = 'MotorDeLectura';
  return { ReaderEngine: Motor };
});
jest.mock('@/hooks/use-saved-colors', () => ({ useSavedColors: () => ({ data: [] }), useSaveColors: () => ({ mutate: jest.fn() }) }));

/* eslint-disable @typescript-eslint/no-require-imports -- tras los mocks */
const Editar = require('@/app/(app)/journal/edit').default as () => React.ReactElement;
const Ver = require('@/app/(app)/journal/[id]').default as () => React.ReactElement;
const Hojear = require('@/app/(app)/journal/flip').default as () => React.ReactElement;
/* eslint-enable @typescript-eslint/no-require-imports */

const J = es.library.journal;
const C = es.library.canvas;
const portada = { orientation: 'portrait', binding: 'sewn', material: 'linen', color: '#3B2A20', back: null, edges: '#F7F5EF', accent: '#B9B9B9' };

beforeEach(() => {
  mockPieza = { data: undefined, isError: false, refetch: jest.fn() };
  mockLienzos = { data: [], isPending: false, isError: false, refetch: jest.fn() };
  for (const m of [mockCrear, mockActualizar, mockAvisar, mockBorrarLienzo]) m.mockReset();
  mockCrearLienzo.mockClear();
  mockEnviados.length = 0;
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
      // Quien lo escribe es su dueña (ajuste de Areli del 22 oct).
      { title: 'Mi año lector', pages: 140, author: 'Areli Perdue', journal: expect.objectContaining({ orientation: 'landscape', binding: 'spiral', material: 'wood', color: '#6B3E26' }) },
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

describe('páginas (T347)', () => {
  const pagina = (id: string, created_at: string, extra: Record<string, unknown> = {}) => ({
    id,
    context: 'journal',
    item_id: 'j1',
    title: '',
    orientation: 'portrait',
    doc: { pages: 1, elements: [] },
    version: 1,
    created_at,
    updated_at: created_at,
    ...extra,
  });
  beforeEach(() => {
    globalThis.setParametrosDeRuta({ id: 'j1' });
    mockPieza = { data: { id: 'j1', title: 'Mi año', kind: 'journal', family: 'creation', page_count: 120, journal: portada }, isError: false, refetch: jest.fn() };
  });

  it('en blanco invita a empezar; una página nueva tiene la forma del Journal y se abre', async () => {
    await render(<Ver />);
    expect(screen.getByText(J.pagesEmpty)).toBeTruthy();
    expect(screen.getByText(J.used(0, 120))).toBeTruthy();
    expect(screen.queryByRole('button', { name: J.flip })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: J.newPage }));
    // La forma no se elige: es la del Journal.
    expect(screen.queryByRole('tab', { name: C.landscape })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: J.createPage }));
    expect(mockCrearLienzo).toHaveBeenCalledWith('j1', 'portrait', J.pageN(1), undefined, 'journal');
    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/canvas/[id]', params: { id: 'nueva', item: 'j1' } });
  });

  it('"Conoce a quien lee" empieza la página con su acomodo y su nombre', async () => {
    await render(<Ver />);
    await fireEvent.press(screen.getByRole('button', { name: J.newPage }));
    await fireEvent.press(screen.getByRole('button', { name: C.templates.use(C.templates.names.getToKnow) }));
    const [item, forma, titulo, doc, contexto] = mockCrearLienzo.mock.calls[0] as unknown as [string, string, string, { elements: unknown[] }, string];
    expect([item, forma, titulo, contexto]).toEqual(['j1', 'portrait', C.templates.names.getToKnow, 'journal']);
    expect(doc.elements.length).toBeGreaterThan(5);
  });

  it('las páginas van en el orden en que se hicieron; tocar una la abre y su ⋯ la borra', async () => {
    mockLienzos.data = [pagina('p2', '2026-10-22T10:00:00Z', { title: 'Conoce a quien lee' }), pagina('p1', '2026-10-21T10:00:00Z')];
    await render(<Ver />);
    expect(screen.getByText(J.used(2, 120))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: J.pageN(1) }));
    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/canvas/[id]', params: { id: 'p1', item: 'j1' } });
    expect(screen.getByRole('button', { name: `${J.pageN(2)}: Conoce a quien lee` })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: J.pageActions(J.pageN(2)) }));
    await fireEvent.press(screen.getByRole('button', { name: J.removePage }));
    await waitFor(() => expect(mockBorrarLienzo).toHaveBeenCalledWith(expect.objectContaining({ id: 'p2' })));
    await fireEvent.press(screen.getByRole('button', { name: J.flip }));
    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/journal/flip', params: { id: 'j1' } });
  });

  it('un Journal lleno no deja agregar más y dice cómo', async () => {
    mockPieza.data = { ...mockPieza.data, page_count: 20 };
    mockLienzos.data = Array.from({ length: 20 }, (_, i) => pagina(`p${i}`, `2026-10-${String(i + 1).padStart(2, '0')}T10:00:00Z`));
    await render(<Ver />);
    expect(screen.getByText(J.full)).toBeTruthy();
    expect(screen.getByRole('button', { name: J.newPage })).toBeDisabled();
  });

  it('hojear abre con la portada, sigue con cada página (bloqueada y con su color) y cierra con la contraportada', async () => {
    const texto = (id: string) => ({ id, type: 'textbox', page: 1, x: 0.1, y: 0.1, w: 0.3, ar: 0.3, rot: 0, z: 1, locked: false, group: null, style: {}, content: { text: id } });
    mockLienzos.data = [
      pagina('p2', '2026-10-22T10:00:00Z', { doc: { pages: 1, background: '#112233', elements: [texto('b')] } }),
      pagina('p1', '2026-10-21T10:00:00Z', { doc: { pages: 1, elements: [texto('a')] } }),
      pagina('tapa', '2026-10-23T10:00:00Z', { context: 'cover', face: 'front', doc: { pages: 1, elements: [texto('titulo')] } }),
    ];
    await render(<Hojear />);
    expect(mockEnviados[0]).toEqual({ type: 'openCanvas', orientation: 'portrait', pages: 4, mode: 'book' });
    await act(async () => mockResponder({ type: 'opened', total: 4 }));
    const anotaciones = mockEnviados.find((m) => m.type === 'annotations');
    expect(anotaciones && 'items' in anotaciones ? anotaciones.items.map((a) => [a.id, a.locator.page, a.locked]) : null).toEqual([
      ['titulo', 1, true],
      ['a', 2, true],
      ['b', 3, true],
    ]);
    // Las tapas con su material: la contraportada, la de la portada (no tiene propia).
    const tapa = { color: '#3B2A20', material: 'linen' };
    expect(mockEnviados).toContainEqual({ type: 'canvasBackground', color: null, pages: { '1': tapa, '3': '#112233', '4': tapa } });
  });

  it('cada cara se decora en su lienzo: la primera vez se crea su tapa en blanco', async () => {
    await render(<Ver />);
    await fireEvent.press(screen.getByRole('button', { name: J.decorate.front }));
    expect(mockCrearLienzo).toHaveBeenCalledWith('j1', 'portrait', '', undefined, 'cover', 'front');
    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/canvas/[id]', params: { id: 'nueva', item: 'j1' } });
  });

  it('una cara ya decorada abre su tapa; las tapas no cuentan como páginas', async () => {
    mockLienzos.data = [pagina('lomo', '2026-10-21T10:00:00Z', { context: 'cover', face: 'spine' })];
    await render(<Ver />);
    expect(screen.getByText(J.used(0, 120))).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: J.faces.spine }));
    await fireEvent.press(screen.getByRole('button', { name: J.decorate.spine }));
    expect(mockCrearLienzo).not.toHaveBeenCalled();
    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/canvas/[id]', params: { id: 'lomo', item: 'j1' } });
  });
});
