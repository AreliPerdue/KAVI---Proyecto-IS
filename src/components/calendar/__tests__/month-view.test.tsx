/**
 * Vista mensual (RF-C1).
 *
 * Lo que importa comprobar es la etiqueta accesible de cada celda: la rejilla es
 * un mosaico de 42 celdas y, sin un texto que diga el dia y cuantas actividades
 * tiene, quien usa lector de pantalla no puede orientarse (kavi-design §5).
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { MonthView } from '@/components/calendar/month-view';
import type { Activity } from '@/types/domain';

const actividad = (over: Partial<Activity> = {}): Activity =>
  ({
    id: 'a1', owner_id: 'u1', title: 'Junta', description: null, theme_id: null,
    dimension: null, color: '#4CAF50', icon: null, all_day: false, is_gym: false,
    recurrence_rule: null, recurrence_parent_id: null, created_at: 'x', updated_at: 'x',
    start_at: new Date(2026, 8, 7, 9).toISOString(),
    end_at: new Date(2026, 8, 7, 10).toISOString(),
    ...over,
  }) as Activity;

const ANCLA = new Date(2026, 8, 15);

/**
 * La rejilla reparte el alto entre las seis semanas y solo entrega actividades a
 * las celdas cuando ya se midio (`onLayout`). En Jest ese evento no ocurre, asi
 * que se simula disparandolo desde una celda: `fireEvent` sube por el arbol
 * hasta encontrar el manejador. Sin esto todas las celdas saldrian vacias.
 */
async function medir() {
  const celda = screen.getAllByRole('button')[0];
  await fireEvent(celda as never, 'layout', { nativeEvent: { layout: { width: 390, height: 600 } } });
}

describe('rejilla', () => {
  it('pinta siempre seis semanas completas', async () => {
    await render(<MonthView anchor={ANCLA} activities={[]} onSelectDay={jest.fn()} />);
    await medir();

    expect(screen.getAllByRole('button')).toHaveLength(42);
  });

  it('cada celda dice el dia y que no tiene nada', async () => {
    await render(<MonthView anchor={ANCLA} activities={[]} onSelectDay={jest.fn()} />);
    await medir();

    expect(screen.getByLabelText(/lunes 7 de septiembre, sin actividades/i)).toBeTruthy();
  });

  it('una celda con una actividad lo dice en singular', async () => {
    await render(<MonthView anchor={ANCLA} activities={[actividad()]} onSelectDay={jest.fn()} />);
    await medir();

    expect(screen.getByLabelText(/lunes 7 de septiembre, 1 actividad$/i)).toBeTruthy();
  });

  it('con varias lo dice en plural', async () => {
    const dos = [actividad(), actividad({ id: 'a2', title: 'Otra' })];
    await render(<MonthView anchor={ANCLA} activities={dos} onSelectDay={jest.fn()} />);
    await medir();

    expect(screen.getByLabelText(/lunes 7 de septiembre, 2 actividades/i)).toBeTruthy();
  });

  it('incluye dias del mes anterior y del siguiente', async () => {
    await render(<MonthView anchor={ANCLA} activities={[]} onSelectDay={jest.fn()} />);
    await medir();

    // Septiembre de 2026 empieza en martes: la rejilla arranca el lunes 31 de agosto.
    expect(screen.getByLabelText(/31 de agosto/i)).toBeTruthy();
  });
});

describe('interaccion', () => {
  it('tocar un dia lo comunica', async () => {
    const onSelectDay = jest.fn();
    await render(<MonthView anchor={ANCLA} activities={[]} onSelectDay={onSelectDay} />);
    await medir();

    await fireEvent.press(screen.getByLabelText(/lunes 7 de septiembre/i));

    expect(onSelectDay).toHaveBeenCalledTimes(1);
    const dia = onSelectDay.mock.calls[0][0] as Date;
    expect(dia.getDate()).toBe(7);
    expect(dia.getMonth()).toBe(8);
  });

  it('tambien se pueden tocar los dias de relleno', async () => {
    const onSelectDay = jest.fn();
    await render(<MonthView anchor={ANCLA} activities={[]} onSelectDay={onSelectDay} />);
    await medir();

    await fireEvent.press(screen.getByLabelText(/31 de agosto/i));

    expect(onSelectDay).toHaveBeenCalledTimes(1);
  });
});

describe('actividades de varios dias', () => {
  it('aparecen contadas en cada dia que tocan', async () => {
    const larga = actividad({
      start_at: new Date(2026, 8, 7, 22).toISOString(),
      end_at: new Date(2026, 8, 9, 3).toISOString(),
    });
    await render(<MonthView anchor={ANCLA} activities={[larga]} onSelectDay={jest.fn()} />);
    await medir();

    expect(screen.getByLabelText(/7 de septiembre, 1 actividad/i)).toBeTruthy();
    expect(screen.getByLabelText(/8 de septiembre, 1 actividad/i)).toBeTruthy();
    expect(screen.getByLabelText(/9 de septiembre, 1 actividad/i)).toBeTruthy();
  });

  it('las de otro mes no se cuentan en este', async () => {
    const otroMes = actividad({
      start_at: new Date(2026, 10, 7, 9).toISOString(),
      end_at: new Date(2026, 10, 7, 10).toISOString(),
    });
    await render(<MonthView anchor={ANCLA} activities={[otroMes]} onSelectDay={jest.fn()} />);
    await medir();

    expect(screen.getByLabelText(/lunes 7 de septiembre, sin actividades/i)).toBeTruthy();
  });
});
