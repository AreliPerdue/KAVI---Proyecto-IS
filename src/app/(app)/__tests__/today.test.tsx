/**
 * Hoy y Algún día (RF-L24, RF-L25, T233, T234): lo atrasado arriba con "Pasar todo a hoy", y la
 * bandeja sin fecha agrupada por lista, con su estado vacío cuando todo está agendado.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { es } from '@/i18n/es';
import { toDayKey } from '@/lib/dates';

const L = es.lists;
const mockReschedule = jest.fn();
const mockSnackbar = jest.fn();
let mockDatos: { lists: unknown[]; delDia: unknown[]; atrasados: unknown[]; sinFecha: unknown[] };

const ok = (data: unknown[]) => ({ data, isPending: false, isError: false, isSuccess: true, error: null, refetch: jest.fn() });
jest.mock('@/hooks/use-lists', () => ({
  useLists: () => ok(mockDatos.lists),
  useListItemsByDate: () => ok(mockDatos.delDia),
  useOverdueListItems: () => ok(mockDatos.atrasados),
  useUndatedListItems: () => ok(mockDatos.sinFecha),
  useListMutations: () => ({ toggleItem: { mutate: jest.fn() }, reschedule: { mutate: mockReschedule }, updateItem: { mutate: jest.fn() } }),
}));
jest.mock('@/providers', () => ({ useSnackbar: () => mockSnackbar }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/today').default as () => React.ReactElement;

const lista = (id: string, name: string) => ({ id, name, color: '#4CAF50', icon: 'home', due_date: null, pending_count: 1 });
const item = (id: string, title: string, over = {}) => ({
  id, list_id: 'l1', section_id: null, title, notes: null, sort_order: 1, due_date: null, due_time: null, completed_at: null, ...over,
});
const hoy = () => toDayKey(new Date());

beforeEach(() => {
  mockReschedule.mockReset();
  mockSnackbar.mockReset();
  mockDatos = { lists: [lista('l1', 'Casa')], delDia: [], atrasados: [], sinFecha: [] };
  globalThis.setParametrosDeRuta({});
});

describe('Hoy', () => {
  it('"Pasar todo a hoy" mueve todos los atrasados y el grupo "Atrasado" queda vacío', async () => {
    mockDatos.atrasados = [item('a', 'Pagar luz', { due_date: '2026-01-02' }), item('b', 'Llamar', { due_date: '2026-01-03' })];
    mockReschedule.mockImplementation((_v, opts: { onSuccess: () => void }) => {
      // Lo que hace el servidor: ya no hay atrasados y aparecen en el día.
      mockDatos.delDia = mockDatos.atrasados.map((i) => ({ ...(i as object), due_date: hoy() }));
      mockDatos.atrasados = [];
      opts.onSuccess();
    });
    const { rerender } = await render(<Pantalla />);
    expect(screen.getByText(L.late)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: L.moveAllToToday }));
    expect(mockReschedule).toHaveBeenCalledWith({ ids: ['a', 'b'], dueDate: hoy() }, expect.anything());
    expect(mockSnackbar).toHaveBeenCalledWith({ message: L.movedToToday(2) });

    await rerender(<Pantalla />);
    expect(screen.queryByText(L.late)).toBeNull();
    expect(screen.getByText('Pagar luz')).toBeTruthy();
  });

  it('sin nada que hacer muestra su estado vacío', async () => {
    await render(<Pantalla />);
    expect(screen.getByText(L.nothingTodayTitle)).toBeTruthy();
  });
});

describe('Algún día', () => {
  beforeEach(() => globalThis.setParametrosDeRuta({ vista: 'algun-dia' }));

  it('con todo agendado muestra su estado vacío, no grupos vacíos', async () => {
    mockDatos.lists = [lista('l1', 'Casa'), lista('l2', 'Súper')];
    await render(<Pantalla />);
    expect(screen.getByText(L.nothingUndatedTitle)).toBeTruthy();
    expect(screen.queryByRole('button', { name: L.openList('Casa') })).toBeNull();
    expect(screen.queryByRole('button', { name: L.openList('Súper') })).toBeNull();
  });

  it('agrupa por lista en el orden del inicio y solo las que tienen algo', async () => {
    mockDatos.lists = [lista('l1', 'Casa'), lista('l2', 'Súper'), lista('l3', 'Vacía')];
    mockDatos.sinFecha = [item('x', 'Leche', { list_id: 'l2' }), item('y', 'Foco', { list_id: 'l1' })];
    await render(<Pantalla />);
    const grupos = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel).filter((t: string) => t?.startsWith(L.openList('')));
    expect(grupos).toEqual([L.openList('Casa'), L.openList('Súper')]);
  });
});
