/**
 * Agenda (T191): solo los días con algo, y lo que cruza la medianoche aparece en los dos días
 * que toca —no solo en el que empieza—, sin duplicarse dentro de un mismo día.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AgendaView } from '@/components/calendar/agenda-view';
import type { Activity } from '@/types/domain';

const act = (id: string, title: string, inicio: Date, fin: Date) =>
  ({
    id, title, owner_id: 'u1', theme_id: null, dimension: null, color: '#4CAF50', notes: null, visibility: 'default',
    start_at: inicio.toISOString(), end_at: fin.toISOString(), all_day: false, recurrence_rule: null, recurrence_parent_id: null,
  }) as unknown as Activity;

const desde = new Date(2026, 9, 5);
const hasta = new Date(2026, 9, 10);

it('omite los días sin actividades', async () => {
  await render(
    <AgendaView from={desde} to={hasta} onPressActivity={jest.fn()} activities={[act('a', 'Junta', new Date(2026, 9, 5, 9), new Date(2026, 9, 5, 10))]} />,
  );
  expect(screen.getByText('5')).toBeTruthy();
  for (const d of ['6', '7', '8', '9']) expect(screen.queryByText(d)).toBeNull();
});

it('lo que cruza la medianoche aparece en los dos días, una vez en cada uno', async () => {
  const fiesta = act('f', 'Fiesta', new Date(2026, 9, 7, 22), new Date(2026, 9, 8, 2));
  const desayuno = act('d', 'Desayuno', new Date(2026, 9, 8, 9), new Date(2026, 9, 8, 10));
  await render(<AgendaView from={desde} to={hasta} onPressActivity={jest.fn()} activities={[desayuno, fiesta]} />);
  expect(screen.getByText('7')).toBeTruthy();
  expect(screen.getByText('8')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: /^Fiesta, / })).toHaveLength(2);
  // En el día 8, la fiesta (que empezó antes) va primero que el desayuno.
  const del8 = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel as string).filter((l) => /^(Fiesta|Desayuno)/.test(l));
  expect(del8.slice(1).map((l) => l.split(',')[0])).toEqual(['Fiesta', 'Desayuno']);
});

it('tocar una fila la abre', async () => {
  const onPress = jest.fn();
  await render(<AgendaView from={desde} to={hasta} onPressActivity={onPress} activities={[act('a', 'Junta', new Date(2026, 9, 6, 9), new Date(2026, 9, 6, 10))]} />);
  await fireEvent.press(screen.getByRole('button', { name: /^Junta, / }));
  expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
});
