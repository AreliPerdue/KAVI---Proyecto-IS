/**
 * Fecha escrita en vez de navegada.
 *
 * El calendario mensual exige tantos toques como meses de distancia: para una fecha
 * de nacimiento son cientos. Lo delicado al teclear es validar: `new Date(2026, 1, 31)`
 * no falla, se desborda al 3 de marzo, así que hay que comprobar que los tres
 * componentes sobrevivan a la construcción.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { DateInputSheet, fechaDesde } from '@/components/ui';

describe('fechaDesde', () => {
  it('construye una fecha válida', () => {
    expect(fechaDesde('15', '9', '1998')?.getFullYear()).toBe(1998);
  });

  it('el 31 de febrero no existe y no se desborda a marzo', () => {
    expect(fechaDesde('31', '2', '2026')).toBeNull();
  });

  it('el 29 de febrero vale en año bisiesto', () => {
    expect(fechaDesde('29', '2', '2028')).not.toBeNull();
  });

  it('y no vale en año no bisiesto', () => {
    expect(fechaDesde('29', '2', '2026')).toBeNull();
  });

  it('un mes fuera de rango es nulo', () => {
    expect(fechaDesde('15', '13', '1998')).toBeNull();
  });

  it('un año absurdo es nulo', () => {
    expect(fechaDesde('15', '9', '1200')).toBeNull();
  });

  it('campos vacíos son nulos', () => {
    expect(fechaDesde('', '', '')).toBeNull();
  });

  it('texto que no es número es nulo', () => {
    expect(fechaDesde('ab', '9', '1998')).toBeNull();
  });
});

describe('la hoja', () => {
  /** `render` es asíncrono en Testing Library 14: hay que esperarlo. */
  const montar = async (props: Partial<React.ComponentProps<typeof DateInputSheet>> = {}) => {
    const onSelect = jest.fn();
    await render(
      <DateInputSheet visible value={null} title="Tu cumpleaños" onClose={jest.fn()} onSelect={onSelect} {...props} />,
    );
    return { onSelect };
  };

  const escribir = async (dia: string, mes: string, anio: string) => {
    await fireEvent.changeText(screen.getByLabelText('Día'), dia);
    await fireEvent.changeText(screen.getByLabelText('Mes'), mes);
    await fireEvent.changeText(screen.getByLabelText('Año'), anio);
  };

  it('ofrece los tres campos', async () => {
    await montar();
    for (const campo of ['Día', 'Mes', 'Año']) expect(screen.getByLabelText(campo)).toBeTruthy();
  });

  it('parte de la fecha ya guardada', async () => {
    await montar({ value: new Date(1998, 8, 15) });
    expect(screen.getByLabelText('Día').props.value).toBe('15');
    expect(screen.getByLabelText('Mes').props.value).toBe('9');
    expect(screen.getByLabelText('Año').props.value).toBe('1998');
  });

  it('sin una fecha completa no deja guardar', async () => {
    await montar();
    expect(screen.getByLabelText('Guardar').props.accessibilityState.disabled).toBe(true);
  });

  it('con una fecha válida la confirma antes de guardar', async () => {
    await montar();
    await escribir('15', '9', '1998');
    expect(screen.getByText(/15 sep 1998/i)).toBeTruthy();
  });

  it('devuelve la fecha escrita', async () => {
    const { onSelect } = await montar();
    await escribir('15', '9', '1998');
    await fireEvent.press(screen.getByLabelText('Guardar'));

    const fecha = onSelect.mock.calls[0][0] as Date;
    expect([fecha.getDate(), fecha.getMonth() + 1, fecha.getFullYear()]).toEqual([15, 9, 1998]);
  });

  it('una fecha que no existe se explica', async () => {
    await montar();
    await escribir('31', '2', '2026');
    expect(screen.getByText(/esa fecha no existe/i)).toBeTruthy();
  });

  /**
   * Regresión: escribir solo el día disparaba «esa fecha no existe». Es cierto,
   * pero inútil: todavía no has terminado de escribirla.
   */
  it('a medio escribir no acusa de fecha inválida', async () => {
    await montar();
    await fireEvent.changeText(screen.getByLabelText('Día'), '28');

    expect(screen.queryByText(/esa fecha no existe/i)).toBeNull();
    expect(screen.getByLabelText('Guardar').props.accessibilityState.disabled).toBe(true);
  });

  it('con día y mes pero sin año tampoco', async () => {
    await montar();
    await fireEvent.changeText(screen.getByLabelText('Día'), '28');
    await fireEvent.changeText(screen.getByLabelText('Mes'), '6');

    expect(screen.queryByText(/esa fecha no existe/i)).toBeNull();
  });

  it('el error aparece al completar los tres campos', async () => {
    await montar();
    await escribir('31', '2', '2026');
    expect(screen.getByText(/esa fecha no existe/i)).toBeTruthy();
  });

  /** Nadie ha nacido mañana. */
  it('una fecha futura se rechaza cuando hay tope', async () => {
    await montar({ maxDate: new Date(2026, 8, 23) });
    await escribir('1', '1', '2030');
    expect(screen.getByText(/todavía no ha llegado/i)).toBeTruthy();
  });

  it('cerrada no pinta los campos', async () => {
    await montar({ visible: false });
    expect(screen.queryByLabelText('Día')).toBeNull();
  });
});
