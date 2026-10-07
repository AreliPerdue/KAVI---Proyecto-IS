/**
 * Teclado numérico propio (spec 07 v2, RF-F28).
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { type NumpadField, NumpadSheet } from '@/components/fitness/numpad-sheet';

const peso: NumpadField = { title: 'Banca · serie 1 · Peso', value: 80, step: 2.5, decimals: true, suffix: 'kg', min: 0 };
const reps: NumpadField = { title: 'Banca · serie 1 · Reps', value: 8, step: 1, decimals: false, counter: true, max: 999 };

async function montar(field: NumpadField) {
  const onChange = jest.fn();
  await render(<NumpadSheet visible field={field} onChange={onChange} onClose={jest.fn()} />);
  const tecla = (t: string) => fireEvent.press(screen.getByLabelText(t));
  return { onChange, tecla };
}

describe('NumpadSheet', () => {
  it('la primera tecla reemplaza lo sugerido y las siguientes agregan (escribir 1-0-0 da 100)', async () => {
    const { onChange, tecla } = await montar(peso);
    await tecla('1');
    await tecla('0');
    await tecla('0');
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([1, 10, 100]);
  });

  it('el punto solo vale una vez y solo donde hay decimales', async () => {
    const { onChange, tecla } = await montar(peso);
    await tecla('7');
    await tecla('Punto decimal');
    await tecla('5');
    await tecla('Punto decimal');
    expect(onChange).toHaveBeenLastCalledWith(7.5);
    const otro = await montar(reps);
    await otro.tecla('Punto decimal');
    expect(otro.onChange).not.toHaveBeenCalled();
  });

  it('± suma o resta el paso y cuenta como empezar a editar', async () => {
    const { onChange, tecla } = await montar(peso);
    await tecla('Sumar 2.5');
    expect(onChange).toHaveBeenLastCalledWith(82.5);
    await tecla('5');
    expect(onChange).toHaveBeenLastCalledWith(82.55);
  });

  it('no baja del mínimo', async () => {
    const { onChange, tecla } = await montar({ ...peso, value: 1 });
    await tecla('Restar 2.5');
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('borrar todo deja el campo vacío (null), no en cero', async () => {
    const { onChange, tecla } = await montar(peso);
    await tecla('Borrar');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('el modo contador suma una rep por toque', async () => {
    const { onChange, tecla } = await montar(reps);
    await tecla('Contar reps con un toque');
    await tecla('Una rep más');
    await tecla('Una rep más');
    expect(onChange).toHaveBeenLastCalledWith(10);
  });
});
