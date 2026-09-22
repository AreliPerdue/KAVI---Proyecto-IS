/**
 * Seccion de recurrencia del formulario (RF-C8).
 *
 * El componente no guarda estado propio: cada toque emite la regla completa hacia
 * arriba. Lo que se prueba es que esa regla salga coherente —que cambiar de
 * frecuencia no arrastre dias de la anterior, que la semanal nunca se quede sin
 * ningun dia marcado y que la fecha de fin no pueda caer antes del arranque—.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { RecurrenceField } from '@/components/calendar/recurrence-field';
import type { RecurrenceRule } from '@/lib/recurrence';

/** 7 de septiembre de 2026 es lunes, asi que el dia base de la semana es el indice 0. */
const DIA_BASE = '2026-09-07';

const montar = async (value: RecurrenceRule | null, extra: { disabled?: boolean } = {}) => {
  const onChange = jest.fn();
  await render(<RecurrenceField value={value} onChange={onChange} baseDayKey={DIA_BASE} {...extra} />);
  return onChange;
};

/** Los dias comparten inicial (Lunes/Martes/Miercoles/…): se piden por posicion. */
const chipDeDia = (indice: number) => screen.getAllByRole('button').filter((n) => n.props.accessibilityLabel?.length === 1)[indice];

describe('elegir frecuencia', () => {
  it('arranca en "No" cuando no hay regla', async () => {
    await montar(null);
    expect(screen.getByLabelText('No').props.accessibilityState.selected).toBe(true);
  });

  it('marca la frecuencia que ya tiene la regla', async () => {
    await montar({ freq: 'MONTHLY', byDay: [], until: null });
    expect(screen.getByLabelText('Mensual').props.accessibilityState.selected).toBe(true);
  });

  it('volver a "No" borra la regla entera', async () => {
    const onChange = await montar({ freq: 'DAILY', byDay: [], until: null });

    await fireEvent.press(screen.getByLabelText('No'));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('la diaria no arrastra dias de la semana', async () => {
    const onChange = await montar({ freq: 'WEEKLY', byDay: [0, 3], until: null });

    await fireEvent.press(screen.getByLabelText('Diaria'));

    expect(onChange).toHaveBeenCalledWith({ freq: 'DAILY', byDay: [], until: null });
  });

  /** Sin esto, activar "Semanal" dejaria una regla que no se repite ningun dia. */
  it('la semanal se estrena con el dia de la propia actividad', async () => {
    const onChange = await montar(null);

    await fireEvent.press(screen.getByLabelText('Semanal'));

    expect(onChange).toHaveBeenCalledWith({ freq: 'WEEKLY', byDay: [0], until: null });
  });

  it('al volver a semanal se recuperan los dias que ya habia', async () => {
    const onChange = await montar({ freq: 'WEEKLY', byDay: [2, 4], until: null });

    await fireEvent.press(screen.getByLabelText('Semanal'));

    expect(onChange).toHaveBeenCalledWith({ freq: 'WEEKLY', byDay: [2, 4], until: null });
  });

  it('cambiar de frecuencia conserva la fecha de fin', async () => {
    const onChange = await montar({ freq: 'WEEKLY', byDay: [0], until: '2026-12-31' });

    await fireEvent.press(screen.getByLabelText('Mensual'));

    expect(onChange).toHaveBeenCalledWith({ freq: 'MONTHLY', byDay: [], until: '2026-12-31' });
  });
});

describe('dias de la semana', () => {
  it('solo aparecen en la frecuencia semanal', async () => {
    await montar({ freq: 'DAILY', byDay: [], until: null });
    expect(screen.queryByLabelText('L')).toBeNull();
  });

  it('se marcan los dias de la regla', async () => {
    await montar({ freq: 'WEEKLY', byDay: [0], until: null });
    expect(chipDeDia(0).props.accessibilityState.selected).toBe(true);
    expect(chipDeDia(1).props.accessibilityState.selected).toBe(false);
  });

  it('tocar un dia libre lo anade', async () => {
    const onChange = await montar({ freq: 'WEEKLY', byDay: [0], until: null });

    await fireEvent.press(chipDeDia(3));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ byDay: [0, 3] }));
  });

  it('tocar un dia marcado lo quita', async () => {
    const onChange = await montar({ freq: 'WEEKLY', byDay: [0, 3], until: null });

    await fireEvent.press(chipDeDia(0));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ byDay: [3] }));
  });

  /** Una regla semanal sin dias no se repetiria nunca, asi que el ultimo no se suelta. */
  it('quitar el unico dia lo vuelve a poner', async () => {
    const onChange = await montar({ freq: 'WEEKLY', byDay: [2], until: null });

    await fireEvent.press(chipDeDia(2));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ byDay: [2] }));
  });
});

describe('fecha de fin', () => {
  it('sin regla no se ofrece', async () => {
    await montar(null);
    expect(screen.queryByLabelText('Termina en una fecha')).toBeNull();
  });

  it('se explica que sin fecha se repite indefinidamente', async () => {
    await montar({ freq: 'DAILY', byDay: [], until: null });
    expect(screen.getByText(/se repite sin fin/i)).toBeTruthy();
  });

  it('activarla propone el dia de la actividad', async () => {
    const onChange = await montar({ freq: 'DAILY', byDay: [], until: null });

    await fireEvent(screen.getByLabelText('Termina en una fecha'), 'valueChange', true);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ until: DIA_BASE }));
  });

  it('desactivarla la borra', async () => {
    const onChange = await montar({ freq: 'DAILY', byDay: [], until: '2026-12-31' });

    await fireEvent(screen.getByLabelText('Termina en una fecha'), 'valueChange', false);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ until: null }));
  });

  it('con fecha puesta se muestra para poder cambiarla', async () => {
    await montar({ freq: 'DAILY', byDay: [], until: '2026-12-31' });
    expect(screen.getByLabelText(/^Hasta/)).toBeTruthy();
  });

  it('sin fecha no hay boton que abrir', async () => {
    await montar({ freq: 'DAILY', byDay: [], until: null });
    expect(screen.queryByLabelText(/^Hasta/)).toBeNull();
  });

  it('elegir un dia en el calendario lo fija', async () => {
    const onChange = await montar({ freq: 'DAILY', byDay: [], until: '2026-09-30' });

    await fireEvent.press(screen.getByLabelText(/^Hasta/));
    await fireEvent.press(screen.getByLabelText(/^miércoles 30 de septiembre/i));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ until: '2026-09-30' }));
  });

  /** Terminar antes de empezar no significa nada: la fecha se empuja al dia base. */
  it('una fecha anterior al arranque se corrige al dia base', async () => {
    const onChange = await montar({ freq: 'DAILY', byDay: [], until: '2026-09-30' });

    await fireEvent.press(screen.getByLabelText(/^Hasta/));
    await fireEvent.press(screen.getByLabelText(/^martes 1 de septiembre/i));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ until: DIA_BASE }));
  });
});

describe('editando una sola ocurrencia', () => {
  it('no deja tocar la repeticion y dice por que', async () => {
    await montar({ freq: 'WEEKLY', byDay: [0], until: '2026-12-31' }, { disabled: true });

    expect(screen.getByText(/se edita desde la serie completa/i)).toBeTruthy();
    expect(screen.queryByLabelText('Semanal')).toBeNull();
    expect(screen.queryByLabelText('L')).toBeNull();
    expect(screen.queryByLabelText('Termina en una fecha')).toBeNull();
  });
});
