/**
 * Detalle de una lista (RF-L2, RF-L5 – RF-L10, RF-L23; T199, T200, T207, T212, T229).
 *
 * Fija lo que se rompe sin hacer ruido: palomear es del círculo y el texto abre la edición,
 * lo palomeado baja a completados y vuelve a su sección, la hoja mueve entre secciones y
 * ordena solo dentro del grupo, y al salir solo se borra una lista que nadie tocó.
 */
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet, TextInput } from 'react-native';

import { es } from '@/i18n/es';

const L = es.lists;
const mockConfirm = jest.fn();
const mockSnackbar = jest.fn();
const nombres = ['toggleItem', 'addItem', 'updateItem', 'removeItem', 'addSection', 'update', 'remove', 'swapItems', 'placeItem', 'toggleRunItem'] as const;
const mockMut = Object.fromEntries(nombres.map((n) => [n, { mutate: jest.fn(), isPending: false }])) as Record<(typeof nombres)[number], { mutate: jest.Mock; isPending: boolean }>;
let mockDetalle: { data?: unknown; isPending: boolean; isError: boolean; error: null; refetch: jest.Mock };

jest.mock('@/hooks/use-lists', () => ({
  useList: () => mockDetalle,
  useListMutations: () => mockMut,
  useListRuns: () => ({ data: [] }),
}));
jest.mock('@/providers', () => ({ useConfirm: () => mockConfirm, useSnackbar: () => mockSnackbar }));
// Hojas con sus propias consultas: aquí no se abren.
jest.mock('@/components/lists/list-history-sheet', () => ({ ListHistorySheet: () => null }));
jest.mock('@/components/lists/list-share-sheet', () => ({ ListShareSheet: () => null }));
jest.mock('@/components/lists/list-tags-sheet', () => ({ ListTagsSheet: () => null }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/list/[id]').default as () => React.ReactElement;

const item = (id: string, title: string, over = {}) => ({
  id, list_id: 'l1', section_id: null as string | null, title, note: null, sort_order: 1024, due_date: null as string | null, due_time: null,
  reminder_offset_minutes: null, completed_at: null as string | null, ...over,
});
const detalle = (over: { list?: object; items?: unknown[]; sections?: unknown[] } = {}) => ({
  list: { id: 'l1', name: 'Súper', color: '#4CAF50', icon: 'cart', due_date: null, recurrence_rule: null, recurrence_start: null, ...over.list },
  items: over.items ?? [],
  sections: over.sections ?? [],
});

beforeEach(() => {
  mockConfirm.mockReset().mockResolvedValue(true);
  mockSnackbar.mockReset();
  for (const m of Object.values(mockMut)) m.mutate.mockReset();
  mockDetalle = { data: detalle(), isPending: false, isError: false, error: null, refetch: jest.fn() };
  globalThis.setParametrosDeRuta({ id: 'l1' });
});

const ver = async (d = detalle()) => {
  mockDetalle = { ...mockDetalle, data: d };
  return render(<Pantalla />);
};

describe('renglones', () => {
  it('tocar el texto abre la edición y no palomea', async () => {
    await ver(detalle({ items: [item('i1', 'Leche')] }));
    await fireEvent.press(screen.getByRole('button', { name: L.editItem('Leche') }));
    expect(mockMut.toggleItem.mutate).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Leche')).toBeTruthy();
  });

  it('el círculo palomea', async () => {
    await ver(detalle({ items: [item('i1', 'Leche')] }));
    await fireEvent.press(screen.getByRole('checkbox', { name: L.markDone('Leche') }));
    expect(mockMut.toggleItem.mutate).toHaveBeenCalledWith({ id: 'i1', done: true });
  });

  it('el lápiz de la fila (abrir edición) no va anidado dentro del círculo, ni al revés', async () => {
    await ver(detalle({ items: [item('i1', 'Leche')] }));
    const abrir = screen.getByRole('button', { name: L.editItem('Leche') });
    const circulo = screen.getByRole('checkbox', { name: L.markDone('Leche') });
    expect(within(abrir).queryByRole('checkbox')).toBeNull();
    expect(within(circulo).queryByRole('button')).toBeNull();
  });

  it('palomeado sale de su sección y baja a completados; despalomeado vuelve a su sección', async () => {
    const seccion = { id: 's1', list_id: 'l1', name: 'Lácteos', sort_order: 1 };
    const { rerender } = await ver(detalle({ sections: [seccion], items: [item('i1', 'Leche', { section_id: 's1', completed_at: '2026-10-07T10:00:00Z' })] }));
    // En la sección solo queda su campo de captura; el elemento está en completados (plegados).
    expect(screen.queryByText('Leche')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: L.completedA11y(1) }));
    expect(screen.getByText('Leche')).toBeTruthy();

    mockDetalle = { ...mockDetalle, data: detalle({ sections: [seccion], items: [item('i1', 'Leche', { section_id: 's1' })] }) };
    await rerender(<Pantalla />);
    expect(screen.queryByRole('button', { name: /^Completados/ })).toBeNull();
    // Vuelve justo debajo del encabezado de su sección, antes de su campo de captura.
    const textos = screen.getAllByText(/LÁCTEOS|Leche|Agregar en Lácteos/).map((n) => n.props.children);
    expect(textos).toEqual(['LÁCTEOS', 'Leche', L.addIn('Lácteos')]);
  });

  it('una fecha pasada ya palomeada no se pinta como vencida', async () => {
    await ver(detalle({ items: [item('v', 'Pendiente', { due_date: '2026-01-02' }), item('h', 'Hecho', { due_date: '2026-01-02', completed_at: '2026-01-02T10:00:00Z' })] }));
    await fireEvent.press(screen.getByRole('button', { name: L.completedA11y(1) }));
    const fechas = screen.getAllByText(/2 ene/);
    const colores = fechas.map((f) => StyleSheet.flatten(f.props.style)?.color);
    // La del pendiente lleva el acento de aviso; la del hecho, no.
    expect(colores[0]).not.toBe(colores[1]);
  });
});

describe('hoja de edición', () => {
  const seccion = (id: string, name: string) => ({ id, list_id: 'l1', name, sort_order: 1 });

  it('mueve un elemento a otra sección', async () => {
    await ver(detalle({ sections: [seccion('s1', 'Frutas'), seccion('s2', 'Lácteos')], items: [item('i1', 'Leche', { section_id: 's1' })] }));
    await fireEvent.press(screen.getByRole('button', { name: L.editItem('Leche') }));
    await fireEvent.press(screen.getByRole('button', { name: 'Lácteos' }));
    expect(mockMut.updateItem.mutate).toHaveBeenCalledWith({ id: 'i1', patch: { section_id: 's2' } }, expect.anything());
  });

  it('subir/bajar solo dentro de su grupo, con los extremos deshabilitados', async () => {
    await ver(detalle({
      sections: [seccion('s1', 'Frutas')],
      items: [item('suelto', 'Pan'), item('a', 'Manzana', { section_id: 's1', sort_order: 1 }), item('b', 'Pera', { section_id: 's1', sort_order: 2 })],
    }));
    await fireEvent.press(screen.getByRole('button', { name: L.editItem('Manzana') }));
    const subir = screen.getByRole('button', { name: L.moveUp });
    // "Manzana" es la primera de Frutas aunque arriba haya un suelto: no puede subir.
    expect(subir.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: L.moveDown }));
    expect(mockMut.swapItems.mutate).toHaveBeenCalledWith({ a: expect.objectContaining({ id: 'a' }), b: expect.objectContaining({ id: 'b' }) });
  });

  it('eliminar pide confirmación y el mensaje distingue palomear de eliminar', async () => {
    await ver(detalle({ items: [item('i1', 'Leche')] }));
    await fireEvent.press(screen.getByRole('button', { name: L.editItem('Leche') }));
    await fireEvent.press(screen.getByRole('button', { name: L.deleteItem }));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: L.deleteItemTitle, message: L.deleteItemMessage, destructive: true }));
    expect(L.deleteItemMessage).toMatch(/palom/i);
    expect(mockMut.removeItem.mutate).toHaveBeenCalledWith('i1', expect.anything());
  });
});

describe('fecha de la lista (RF-L23)', () => {
  it('la X bajo el título la quita (due_date: null)', async () => {
    await ver(detalle({ list: { due_date: '2030-01-10' } }));
    await fireEvent.press(screen.getByRole('button', { name: L.removeDueDate }));
    expect(mockMut.update.mutate).toHaveBeenCalledWith({ id: 'l1', patch: { due_date: null } });
  });

  it('sin fecha no hay línea', async () => {
    await ver();
    expect(screen.queryByRole('button', { name: L.changeDueDate })).toBeNull();
  });

  it('con fecha pasada la línea va en el acento de aviso', async () => {
    const color = async (dia: string) => {
      const r = await ver(detalle({ list: { due_date: dia } }));
      const texto = screen.getByText(new RegExp(`^${L.dueOn('')}`));
      const c = StyleSheet.flatten(texto.props.style)?.color;
      await r.unmount();
      return c;
    };
    const pasada = await color('2020-01-10');
    const futura = await color('2099-01-10');
    expect(pasada).not.toBe(futura);
  });
});

describe('título y salida (T207, T229)', () => {
  const salir = () => fireEvent.press(screen.getByRole('button', { name: es.common.back }));
  const intacta = () => detalle({ list: { name: L.untitled } });

  it('una lista nueva enfoca y preselecciona el título', async () => {
    globalThis.setParametrosDeRuta({ id: 'l1', nueva: '1' });
    await ver(intacta());
    const titulo = screen.getByLabelText(L.listName);
    expect(titulo.props.autoFocus).toBe(true);
    expect(titulo.props.selectTextOnFocus).toBe(true);
  });

  it('crear y salir sin tocar nada no deja una lista vacía', async () => {
    await ver(intacta());
    await salir();
    expect(mockMut.remove.mutate).toHaveBeenCalledWith('l1');
  });

  it('escribir el nombre y salir sin confirmar conserva la lista (la carrera con la caché)', async () => {
    await ver(intacta());
    const titulo = screen.getByLabelText(L.listName);
    await fireEvent(titulo, 'focus');
    await fireEvent.changeText(titulo, 'Viaje');
    // Salir dispara el blur que guarda; la caché sigue con "Sin título" porque no volvió el servidor.
    await fireEvent(titulo, 'blur');
    await salir();
    expect(mockMut.update.mutate).toHaveBeenCalledWith({ id: 'l1', patch: { name: 'Viaje' } });
    expect(mockMut.remove.mutate).not.toHaveBeenCalled();
  });

  it('agregar solo un elemento (sin nombrarla) también la conserva', async () => {
    jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });
    jest.spyOn(TextInput.prototype, 'focus').mockImplementation(() => undefined);
    await ver(intacta());
    await fireEvent.press(screen.getByRole('button', { name: L.addItem }));
    const campo = screen.getAllByLabelText(L.addItem).find((n) => n.type === 'TextInput') ?? screen.getByPlaceholderText(L.itemPlaceholder(1));
    await fireEvent.changeText(campo, 'Pilas');
    await fireEvent(campo, 'submitEditing');
    await salir();
    expect(mockMut.addItem.mutate).toHaveBeenCalledWith({ listId: 'l1', input: { title: 'Pilas', section_id: null } });
    expect(mockMut.remove.mutate).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('el título guarda al perder el foco y se repone si se deja vacío', async () => {
    await ver(detalle());
    const titulo = screen.getByLabelText(L.listName);
    await fireEvent(titulo, 'focus');
    await fireEvent.changeText(titulo, '   ');
    await fireEvent(titulo, 'blur');
    expect(mockMut.update.mutate).not.toHaveBeenCalled();
    expect(screen.getByLabelText(L.listName).props.value).toBe('Súper');

    await fireEvent(titulo, 'focus');
    await fireEvent.changeText(titulo, 'Súper del sábado');
    await fireEvent(titulo, 'blur');
    expect(mockMut.update.mutate).toHaveBeenCalledWith({ id: 'l1', patch: { name: 'Súper del sábado' } });
  });
});
