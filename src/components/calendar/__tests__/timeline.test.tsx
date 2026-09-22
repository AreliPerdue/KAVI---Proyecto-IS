/**
 * Rejilla vertical de horas, compartida por la vista diaria (una columna) y la
 * semanal (siete) — RF-C3, RF-C6.
 *
 * Su razon de ser: crear una actividad tocando la hora. Por eso cada hueco de 30
 * minutos es un boton con su hora en la etiqueta, y no un area muda.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Timeline } from '@/components/calendar/timeline';
import { groupByDay } from '@/components/calendar/group-by-day';
import { SLOTS_PER_DAY } from '@/lib/dates';
import type { Activity } from '@/types/domain';

const DIA = new Date(2026, 8, 7);

const actividad = (over: Partial<Activity> = {}): Activity =>
  ({
    id: 'a1', owner_id: 'u1', title: 'Junta', description: null, theme_id: null,
    dimension: null, color: '#4CAF50', icon: null, all_day: false, is_gym: false,
    recurrence_rule: null, recurrence_parent_id: null, created_at: 'x', updated_at: 'x',
    start_at: new Date(2026, 8, 7, 9).toISOString(),
    end_at: new Date(2026, 8, 7, 10).toISOString(),
    ...over,
  }) as Activity;

const montar = (props: Partial<Parameters<typeof Timeline>[0]> = {}) =>
  render(
    <Timeline
      days={[DIA]}
      activitiesByDay={groupByDay([])}
      onPressSlot={jest.fn()}
      onPressActivity={jest.fn()}
      {...props}
    />,
  );

describe('huecos para crear', () => {
  it('cada media hora del dia es un boton', async () => {
    await montar();

    const huecos = screen.getAllByLabelText(/^crear actividad a las/i);
    expect(huecos).toHaveLength(SLOTS_PER_DAY);
  });

  it('la etiqueta lleva la hora en formato 24 h', async () => {
    await montar();

    expect(screen.getByLabelText('Crear actividad a las 09:30')).toBeTruthy();
    expect(screen.getByLabelText('Crear actividad a las 00:00')).toBeTruthy();
  });

  it('tocar un hueco da el dia y los minutos desde medianoche', async () => {
    const onPressSlot = jest.fn();
    await montar({ onPressSlot });

    await fireEvent.press(screen.getByLabelText('Crear actividad a las 09:30'));

    expect(onPressSlot).toHaveBeenCalledTimes(1);
    const [dia, minutos] = onPressSlot.mock.calls[0];
    expect((dia as Date).getDate()).toBe(7);
    expect(minutos).toBe(570);
  });

  it('en vista semanal hay huecos para los siete dias', async () => {
    const semana = Array.from({ length: 7 }, (_, i) => new Date(2026, 8, 7 + i));
    await montar({ days: semana });

    expect(screen.getAllByLabelText(/^crear actividad a las/i)).toHaveLength(SLOTS_PER_DAY * 7);
  });
});

describe('bloques de actividad', () => {
  it('pinta la actividad del dia', async () => {
    await montar({ activitiesByDay: groupByDay([actividad()]) });

    expect(screen.getByText('Junta')).toBeTruthy();
  });

  it('tocar el bloque devuelve la actividad completa', async () => {
    const onPressActivity = jest.fn();
    await montar({ activitiesByDay: groupByDay([actividad()]), onPressActivity });

    await fireEvent.press(screen.getByText('Junta'));

    expect(onPressActivity).toHaveBeenCalledTimes(1);
    expect(onPressActivity.mock.calls[0][0]).toMatchObject({ id: 'a1', title: 'Junta' });
  });

  it('no pinta actividades de otro dia', async () => {
    const otroDia = actividad({
      title: 'De otro día',
      start_at: new Date(2026, 8, 20, 9).toISOString(),
      end_at: new Date(2026, 8, 20, 10).toISOString(),
    });
    await montar({ activitiesByDay: groupByDay([otroDia]) });

    expect(screen.queryByText('De otro día')).toBeNull();
  });

  it('varias actividades a la vez se pintan todas', async () => {
    const dos = [actividad(), actividad({ id: 'a2', title: 'Otra' })];
    await montar({ activitiesByDay: groupByDay(dos) });

    expect(screen.getByText('Junta')).toBeTruthy();
    expect(screen.getByText('Otra')).toBeTruthy();
  });
});

describe('franja de todo el dia', () => {
  it('las de todo el dia van en su propia franja, fuera de la rejilla', async () => {
    const todoElDia = actividad({ title: 'Vacaciones', all_day: true });
    await montar({ activitiesByDay: groupByDay([todoElDia]) });

    expect(screen.getByText('Vacaciones')).toBeTruthy();
  });

  it('sin actividades de todo el dia no se reserva esa franja', async () => {
    await montar({ activitiesByDay: groupByDay([actividad()]) });

    expect(screen.queryByText('Vacaciones')).toBeNull();
  });
});

describe('actividades compartidas', () => {
  it('se puede distinguir cuales son de otra persona', async () => {
    const ajena = actividad({ id: 'a2', title: 'De Ana', owner_id: 'u2' });
    const esCompartida = jest.fn((a: Activity) => a.owner_id !== 'u1');

    await montar({
      activitiesByDay: groupByDay([actividad(), ajena]),
      isSharedActivity: esCompartida,
    });

    expect(esCompartida).toHaveBeenCalled();
    expect(screen.getByText('De Ana')).toBeTruthy();
  });
});
