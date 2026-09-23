/**
 * Recordatorios de una actividad (RF-C9).
 *
 * Los cinco atajos cubren lo habitual, pero no todo: alguien quiere el aviso dos
 * minutos antes de una llamada o una semana antes de un vuelo. Lo que hay que fijar
 * es que la antelacion libre valide antes de aceptar —un cero o un numero absurdo no
 * son un recordatorio— y que lo elegido a mano se pueda quitar igual que un atajo,
 * porque si no queda pegado a la actividad sin forma de deshacerlo.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { RemindersField, offsetDesde } from '@/components/calendar/reminders-field';

describe('antelacion escrita a mano', () => {
  it('convierte la cantidad segun la unidad', () => {
    expect(offsetDesde('2', 'min')).toBe(2);
    expect(offsetDesde('2', 'h')).toBe(120);
    expect(offsetDesde('2', 'd')).toBe(2880);
    expect(offsetDesde('2', 'sem')).toBe(20160);
  });

  /** Un aviso «cero minutos antes» ya existe como atajo («Al momento»). */
  it('rechaza el cero y los negativos', () => {
    expect(offsetDesde('0', 'min')).toBeNull();
    expect(offsetDesde('-5', 'min')).toBeNull();
  });

  it('rechaza lo que no es un numero', () => {
    expect(offsetDesde('', 'min')).toBeNull();
    expect(offsetDesde('dos', 'min')).toBeNull();
  });

  /** Mas de un mes antes el recordatorio deja de tener sentido practico. */
  it('rechaza mas de un mes de antelacion', () => {
    expect(offsetDesde('31', 'd')).toBe(44640);
    expect(offsetDesde('32', 'd')).toBeNull();
    expect(offsetDesde('5', 'sem')).toBeNull();
  });
});

describe('los atajos', () => {
  it('se ofrecen los cinco', async () => {
    await render(<RemindersField value={[]} onChange={jest.fn()} />);

    for (const etiqueta of ['Al momento', '10 min antes', '30 min antes', '1 h antes', '1 día antes']) {
      expect(screen.getByText(etiqueta)).toBeTruthy();
    }
  });

  it('tocar uno lo agrega', async () => {
    const onChange = jest.fn();
    await render(<RemindersField value={[]} onChange={onChange} />);

    await fireEvent.press(screen.getByText('30 min antes'));

    expect(onChange).toHaveBeenCalledWith([30]);
  });

  it('tocar uno ya elegido lo quita', async () => {
    const onChange = jest.fn();
    await render(<RemindersField value={[30]} onChange={onChange} />);

    await fireEvent.press(screen.getByText('30 min antes'));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  /** Se ordenan para que la lista no dependa del orden en que se fueron tocando. */
  it('se guardan ordenados de menor a mayor', async () => {
    const onChange = jest.fn();
    await render(<RemindersField value={[60]} onChange={onChange} />);

    await fireEvent.press(screen.getByText('10 min antes'));

    expect(onChange).toHaveBeenCalledWith([10, 60]);
  });
});

describe('lo elegido a mano', () => {
  /**
   * Sin este chip, un valor propio quedaria guardado y sin forma de quitarlo: los
   * atajos solo saben desmarcar sus propios valores.
   */
  it('aparece como un chip mas, para poder quitarlo', async () => {
    const onChange = jest.fn();
    await render(<RemindersField value={[2]} onChange={onChange} />);

    const chip = screen.getByText(/2 min/i);
    await fireEvent.press(chip);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('no se duplica con los atajos', async () => {
    await render(<RemindersField value={[30]} onChange={jest.fn()} />);

    expect(screen.getAllByText('30 min antes')).toHaveLength(1);
  });
});

describe('la hoja de antelacion personalizada', () => {
  async function abrir() {
    const onChange = jest.fn();
    await render(<RemindersField value={[]} onChange={onChange} />);
    await fireEvent.press(screen.getByText('Personalizar'));
    return onChange;
  }

  it('se abre desde su chip', async () => {
    await abrir();

    expect(screen.getByText('Antelación personalizada')).toBeTruthy();
  });

  it('el boton empieza deshabilitado, sin nada escrito', async () => {
    await abrir();

    expect(screen.getByRole('button', { name: 'Agregar' }).props.accessibilityState.disabled).toBe(true);
  });

  it('con una cantidad valida dice cuando avisara', async () => {
    await abrir();

    await fireEvent.changeText(screen.getByLabelText('Cantidad'), '2');

    expect(screen.getByText(/te avisaremos/i)).toBeTruthy();
  });

  /** El error explica que corregir, no solo que algo esta mal. */
  it('con una cantidad invalida lo explica', async () => {
    await abrir();

    await fireEvent.changeText(screen.getByLabelText('Cantidad'), '0');

    expect(screen.getByText(/mayor que cero/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agregar' }).props.accessibilityState.disabled).toBe(true);
  });

  it('agregar lo devuelve junto a lo que ya habia', async () => {
    const onChange = jest.fn();
    await render(<RemindersField value={[60]} onChange={onChange} />);
    await fireEvent.press(screen.getByText('Personalizar'));

    await fireEvent.changeText(screen.getByLabelText('Cantidad'), '5');
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar' }));

    expect(onChange).toHaveBeenCalledWith([5, 60]);
  });

  /** Repetir un recordatorio avisaria dos veces de lo mismo. */
  it('avisa si esa antelacion ya estaba, y no deja agregarla', async () => {
    await render(<RemindersField value={[30]} onChange={jest.fn()} />);
    await fireEvent.press(screen.getByText('Personalizar'));

    await fireEvent.changeText(screen.getByLabelText('Cantidad'), '30');

    expect(screen.getByText(/ya tienes un recordatorio/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agregar' }).props.accessibilityState.disabled).toBe(true);
  });
});
