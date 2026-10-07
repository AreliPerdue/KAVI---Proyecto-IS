/**
 * Captura de corrido (RF-L5, T200): confirmar limpia el campo y conserva el foco; vacío se
 * cierra en vez de agregar algo en blanco.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TextInput } from 'react-native';

import { ItemComposer } from '@/components/lists/item-composer';

const abrir = async (onSubmit = jest.fn()) => {
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });
  await render(<ItemComposer label="Agregar elemento" placeholder="Elemento 1" onSubmit={onSubmit} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Agregar elemento' }));
  return onSubmit;
};

afterEach(() => jest.restoreAllMocks());

it('al confirmar manda el texto recortado, limpia el campo y conserva el foco', async () => {
  const foco = jest.spyOn(TextInput.prototype, 'focus').mockImplementation(() => undefined);
  const onSubmit = await abrir();
  const campo = screen.getByPlaceholderText('Elemento 1');
  await fireEvent.changeText(campo, '  leche ');
  const antes = foco.mock.calls.length;
  await fireEvent(campo, 'submitEditing');
  expect(onSubmit).toHaveBeenCalledWith('leche');
  expect(screen.getByPlaceholderText('Elemento 1').props.value).toBe('');
  expect(foco.mock.calls.length).toBeGreaterThan(antes);

  // Sigue abierto para el siguiente.
  await fireEvent.changeText(screen.getByPlaceholderText('Elemento 1'), 'huevos');
  await fireEvent(screen.getByPlaceholderText('Elemento 1'), 'submitEditing');
  expect(onSubmit).toHaveBeenLastCalledWith('huevos');
});

it('con el campo vacío (o solo espacios) se cierra sin agregar nada', async () => {
  const onSubmit = await abrir();
  await fireEvent.changeText(screen.getByPlaceholderText('Elemento 1'), '   ');
  await fireEvent(screen.getByPlaceholderText('Elemento 1'), 'submitEditing');
  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.queryByPlaceholderText('Elemento 1')).toBeNull();
  expect(screen.getByRole('button', { name: 'Agregar elemento' })).toBeTruthy();
});

it('el teclado no se cierra al confirmar (blurOnSubmit apagado)', async () => {
  await abrir();
  expect(screen.getByPlaceholderText('Elemento 1').props.blurOnSubmit).toBe(false);
});
