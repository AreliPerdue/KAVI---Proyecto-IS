/**
 * Inicio de Listas (RF-L1 – RF-L3, RF-L23, RF-L24, T199, T207, T211, T226).
 *
 * Lo que fija esta prueba: crear entra directo a la lista nueva, borrar dice cuánto se pierde,
 * el botón de acciones no va dentro de la tarjeta, la etiqueta activa filtra también las
 * fijadas, lo compartido conmigo no se reordena, y el número de Hoy cuenta solo lo que falta.
 */
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ModuleInBarContext } from '@/components/navigation/stacked-module';
import { es } from '@/i18n/es';
import { toDayKey } from '@/lib/dates';

const L = es.lists;
const mockConfirm = jest.fn();
const mockSnackbar = jest.fn();
const mockMut = {
  create: { mutate: jest.fn() }, update: { mutate: jest.fn() }, remove: { mutate: jest.fn() },
  duplicate: { mutate: jest.fn() }, swapLists: { mutate: jest.fn() }, moveList: { mutate: jest.fn() },
};
let mockDatos: { lists: unknown[]; archivadas: unknown[]; compartidas: unknown[]; tags: unknown[]; deHoy: unknown[]; atrasados: unknown[] };
/** Qué listas recibió cada rejilla reordenable. */
const mockRejillas: string[][] = [];

const ok = (data: unknown) => ({ data, isPending: false, isError: false, isSuccess: true, error: null, refetch: jest.fn() });
jest.mock('@/hooks/use-lists', () => ({
  useLists: () => ok(mockDatos.lists),
  useArchivedLists: () => ok(mockDatos.archivadas),
  useListsSharedWithMe: () => ok(mockDatos.compartidas),
  useListTags: () => ok(mockDatos.tags),
  useListItemsByDate: () => ok(mockDatos.deHoy),
  useOverdueListItems: () => ok(mockDatos.atrasados),
  useListSearch: () => ok({ lists: [], items: [] }),
  useListMutations: () => mockMut,
}));
jest.mock('@/providers', () => ({ useConfirm: () => mockConfirm, useSnackbar: () => mockSnackbar }));
jest.mock('@/components/lists/draggable-grid', () => {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- fábrica elevada */
  const React = require('react');
  return {
    DraggableGrid: (p: { items: { id: string }[]; renderItem: (i: unknown) => ReactNode }) => {
      mockRejillas.push(p.items.map((i) => i.id));
      return React.createElement(React.Fragment, null, ...p.items.map((i) => p.renderItem(i)));
    },
  };
});

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/lists').default as () => React.ReactElement;

const lista = (id: string, name: string, over = {}) => ({
  id, name, color: '#4CAF50', icon: 'home', is_pinned: false, is_archived: false, tag_ids: [] as string[],
  due_date: null as string | null, total_count: 0, pending_count: 0, sort_order: 1, ...over,
});
const elemento = (id: string, over = {}) => ({ id, list_id: 'l1', title: id, completed_at: null, due_date: toDayKey(new Date()), ...over });

beforeEach(() => {
  mockConfirm.mockReset().mockResolvedValue(true);
  mockSnackbar.mockReset();
  for (const m of Object.values(mockMut)) m.mutate.mockReset();
  mockRejillas.length = 0;
  mockDatos = { lists: [], archivadas: [], compartidas: [], tags: [], deHoy: [], atrasados: [] };
});

const tarjeta = (nombre: string) => screen.getByRole('button', { name: new RegExp(`^${nombre}, `) });

describe('crear (RF-L2, T207)', () => {
  it('"+" crea y entra directo a la lista nueva, sin pantalla intermedia', async () => {
    mockMut.create.mutate.mockImplementation((_v, o: { onSuccess: (l: unknown) => void }) => o.onSuccess({ id: 'nueva' }));
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.newList }));
    expect(mockMut.create.mutate.mock.calls[0][0]).toEqual(expect.objectContaining({ name: L.untitled }));
    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/list/[id]', params: { id: 'nueva', nueva: '1' } });
  });

  it('un fallo al crear muestra mensaje', async () => {
    mockMut.create.mutate.mockImplementation((_v, o: { onError: (e: unknown) => void }) => o.onError('raro'));
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.newList }));
    expect(mockSnackbar).toHaveBeenCalledWith({ message: L.createFailed });
  });
});

describe('eliminar (T199)', () => {
  it('pide confirmación y el mensaje dice cuántos elementos se pierden', async () => {
    mockDatos.lists = [lista('l1', 'Súper', { total_count: 7, pending_count: 3 })];
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.actionsFor('Súper') }));
    await fireEvent.press(screen.getByRole('button', { name: L.delete }));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ message: L.deleteWithItems(7), destructive: true }));
    expect(mockMut.remove.mutate).toHaveBeenCalledWith('l1', expect.anything());
  });

  it('cancelar no borra', async () => {
    mockConfirm.mockResolvedValue(false);
    mockDatos.lists = [lista('l1', 'Vacía')];
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: L.actionsFor('Vacía') }));
    await fireEvent.press(screen.getByRole('button', { name: L.delete }));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ message: L.cantUndo }));
    expect(mockMut.remove.mutate).not.toHaveBeenCalled();
  });
});

describe('tarjetas', () => {
  it('el botón de acciones no queda anidado dentro de la tarjeta', async () => {
    mockDatos.lists = [lista('l1', 'Casa')];
    await render(<Pantalla />);
    expect(within(tarjeta('Casa')).queryByRole('button', { name: L.actionsFor('Casa') })).toBeNull();
    expect(screen.getByRole('button', { name: L.actionsFor('Casa') })).toBeTruthy();
  });

  it('el subtítulo lleva la fecha al final, también con la lista vacía (RF-L23)', async () => {
    mockDatos.lists = [lista('l1', 'Viaje', { due_date: '2026-12-20' }), lista('l2', 'Mudanza', { due_date: '2026-12-21', total_count: 4, pending_count: 1 })];
    await render(<Pantalla />);
    expect(screen.getByText(new RegExp(`^${L.subtitle.empty} · .*20 dic$`))).toBeTruthy();
    expect(screen.getByText(new RegExp(`^${L.subtitle.pending(1, 4)} · .*21 dic$`))).toBeTruthy();
  });

  it('cambiar color o icono se refleja en la tarjeta', async () => {
    mockDatos.lists = [lista('l1', 'Casa')];
    const { rerender } = await render(<Pantalla />);
    mockDatos.lists = [lista('l1', 'Casa', { color: '#E91E63', icon: 'heart' })];
    await rerender(<Pantalla />);
    const estilo = [tarjeta('Casa').props.style].flat(3).reduce((a, s) => ({ ...a, ...(s ?? {}) }), {});
    expect(estilo.borderColor).toBe('#E91E63');
  });
});

describe('grupos (RF-L1, T211)', () => {
  it('fijadas y mías van en bloques separados con su encabezado', async () => {
    mockDatos.lists = [lista('f', 'Fijada', { is_pinned: true }), lista('m', 'Mía')];
    await render(<Pantalla />);
    expect(screen.getByText(L.pinned)).toBeTruthy();
    expect(screen.getByText(L.myLists)).toBeTruthy();
    expect(mockRejillas).toEqual([['f'], ['m']]);
  });

  it('con una etiqueta activa, "Fijadas" solo muestra las fijadas de esa etiqueta', async () => {
    mockDatos.tags = [{ id: 't1', name: 'Casa', list_count: 2 }];
    mockDatos.lists = [
      lista('f1', 'Fijada con', { is_pinned: true, tag_ids: ['t1'] }),
      lista('f2', 'Fijada sin', { is_pinned: true }),
      lista('m1', 'Mía con', { tag_ids: ['t1'] }),
    ];
    await render(<Pantalla />);
    mockRejillas.length = 0;
    await fireEvent.press(screen.getByRole('button', { name: L.tagCount('Casa', 2) }));
    expect(mockRejillas.slice(-2)).toEqual([['f1'], ['m1']]);
    expect(screen.queryByText('Fijada sin')).toBeNull();
  });

  it('las compartidas conmigo no se pueden arrastrar y una fila impar no estira la tarjeta', async () => {
    mockDatos.lists = [lista('m', 'Mía')];
    mockDatos.compartidas = [lista('c1', 'De Ana'), lista('c2', 'De Luis'), lista('c3', 'De Mara')];
    await render(<Pantalla />);
    expect(mockRejillas.flat()).not.toContain('c1');
    expect(screen.getByText(L.sharedWithMe)).toBeTruthy();
    // La última fila (una sola tarjeta) lleva un hueco al lado para no ocupar las dos columnas.
    const celdaDe = (nombre: string) => tarjeta(nombre).parent;
    // Fila completa: dos tarjetas. Fila impar: la tarjeta y un hueco del mismo ancho.
    expect(celdaDe('De Ana')?.parent?.children).toHaveLength(2);
    const ultima = celdaDe('De Mara')?.parent;
    expect(ultima?.children).toHaveLength(2);
    expect(ultima?.children[1]).not.toBe(celdaDe('De Mara'));
  });
});

describe('acceso a Hoy (RF-L24)', () => {
  it('el número no cuenta lo ya palomeado', async () => {
    mockDatos.lists = [lista('l1', 'Casa')];
    mockDatos.deHoy = [elemento('a'), elemento('b', { completed_at: '2026-10-07T10:00:00Z' })];
    mockDatos.atrasados = [elemento('c', { due_date: '2026-01-01' })];
    await render(<Pantalla />);
    expect(screen.getByRole('button', { name: L.todayPending(2) })).toBeTruthy();
  });
});

describe('Archivadas en la barra (RF-N6)', () => {
  it('muestra "Atrás" y vuelve a las listas activas', async () => {
    mockDatos.lists = [lista('l1', 'Casa')];
    await render(
      <ModuleInBarContext.Provider value>
        <Pantalla />
      </ModuleInBarContext.Provider>,
    );
    expect(screen.queryByRole('button', { name: es.common.back })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: L.seeArchived }));
    expect(screen.getByText(L.archivedTitle)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: es.common.back }));
    expect(screen.getByText(L.title)).toBeTruthy();
    expect(globalThis.mockRouter.back).not.toHaveBeenCalled();
  });
});
