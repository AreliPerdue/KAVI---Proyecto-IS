/**
 * Selector de hora (RF-C5). Formato 24 h, minuto a minuto: se puede agendar a
 * las 14:07 igual que a las 14:00, y no solo en saltos de media hora.
 *
 * El cuerpo se remonta al abrir (`key={value}`) para partir siempre del valor
 * actual: si no, reabrirlo mostraria lo que se estuvo hojeando la vez anterior.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TimePickerSheet } from '@/components/ui/time-picker-sheet';

const montar = (props: Partial<Parameters<typeof TimePickerSheet>[0]> = {}) =>
  render(
    <TimePickerSheet
      visible
      value={9 * 60 + 30}
      onClose={jest.fn()}
      onSelect={jest.fn()}
      {...props}
    />,
  );

/** Valor dentro de la ventana inicial de ambas listas: 01:05. */
const montarConValorBajo = () => montar({ value: 65 });

describe('apertura', () => {
  it('cerrado no pinta el selector', async () => {
    await montar({ visible: false });
    expect(screen.queryByText('09:30')).toBeNull();
  });

  it('abierto muestra la hora recibida', async () => {
    await montar();
    expect(screen.getByText('09:30')).toBeTruthy();
  });

  it('usa un titulo por defecto', async () => {
    await montar();
    expect(screen.getByText('Hora')).toBeTruthy();
  });

  it('acepta un titulo propio', async () => {
    await montar({ title: 'Hora de inicio' });
    expect(screen.getByText('Hora de inicio')).toBeTruthy();
  });

  it('la medianoche se muestra como 00:00', async () => {
    await montar({ value: 0 });
    expect(screen.getByText('00:00')).toBeTruthy();
  });
});

/**
 * Las columnas son listas virtualizadas: solo existe en el arbol la ventana
 * inicial de elementos. Por eso las pruebas usan valores bajos, que siempre
 * estan renderizados, en vez de hojear hasta uno lejano.
 */
describe('columnas', () => {
  it('cada hora y cada minuto se anuncian con su etiqueta', async () => {
    await montar();

    expect(screen.getByLabelText('Hora 00')).toBeTruthy();
    expect(screen.getByLabelText('Minuto 00')).toBeTruthy();
  });

  it('marca como seleccionadas la hora y el minuto actuales', async () => {

    await montarConValorBajo();

    expect(screen.getByLabelText('Hora 01').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Minuto 05').props.accessibilityState.selected).toBe(true);
  });

  it('elegir otra hora actualiza la vista previa', async () => {
    await montar();

    await fireEvent.press(screen.getByLabelText('Hora 07'));

    await waitFor(() => expect(screen.getByText('07:30')).toBeTruthy());
  });

  it('elegir otro minuto tambien', async () => {
    await montar();

    await fireEvent.press(screen.getByLabelText('Minuto 07'));

    await waitFor(() => expect(screen.getByText('09:07')).toBeTruthy());
  });

  it('se pueden combinar hora y minuto', async () => {
    await montar();

    await fireEvent.press(screen.getByLabelText('Hora 07'));
    await fireEvent.press(screen.getByLabelText('Minuto 05'));

    await waitFor(() => expect(screen.getByText('07:05')).toBeTruthy());
  });
});

describe('confirmar', () => {
  it('devuelve los minutos desde medianoche', async () => {
    const onSelect = jest.fn();
    await montar({ onSelect });

    await fireEvent.press(screen.getByRole('button', { name: 'Listo' }));

    expect(onSelect).toHaveBeenCalledWith(570);
  });

  it('devuelve lo elegido, no lo inicial', async () => {
    const onSelect = jest.fn();
    await montar({ onSelect });

    await fireEvent.press(screen.getByLabelText('Hora 07'));
    await fireEvent.press(screen.getByLabelText('Minuto 05'));
    await fireEvent.press(screen.getByRole('button', { name: 'Listo' }));

    expect(onSelect).toHaveBeenCalledWith(7 * 60 + 5);
  });
});
