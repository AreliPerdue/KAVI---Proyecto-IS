/**
 * FieldButton: campo que abre un selector (fecha, hora, tema). Se comporta como
 * input pero es un boton, asi que lo importante es que se anuncie con su valor.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { FieldButton } from '@/components/ui/field-button';

describe('FieldButton', () => {
  it('muestra etiqueta y valor', async () => {
    await render(<FieldButton label="Fecha" value="7 sep 2026" onPress={jest.fn()} />);
    expect(screen.getByText('Fecha')).toBeTruthy();
    expect(screen.getByText('7 sep 2026')).toBeTruthy();
  });

  it('sin valor muestra el placeholder', async () => {
    await render(<FieldButton label="Tema" onPress={jest.fn()} />);
    expect(screen.getByText('Elegir')).toBeTruthy();
  });

  it('acepta un placeholder propio', async () => {
    await render(<FieldButton label="Tema" placeholder="Sin tema" onPress={jest.fn()} />);
    expect(screen.getByText('Sin tema')).toBeTruthy();
  });

  it('se anuncia con etiqueta y valor juntos', async () => {
    await render(<FieldButton label="Fecha" value="7 sep 2026" onPress={jest.fn()} />);
    expect(screen.getByLabelText('Fecha: 7 sep 2026')).toBeTruthy();
  });

  it('sin valor se anuncia con el placeholder', async () => {
    await render(<FieldButton label="Tema" onPress={jest.fn()} />);
    expect(screen.getByLabelText('Tema: Elegir')).toBeTruthy();
  });

  it('abre el selector al tocarlo', async () => {
    const onPress = jest.fn();
    await render(<FieldButton label="Fecha" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado no abre nada', async () => {
    const onPress = jest.fn();
    await render(<FieldButton label="Fecha" disabled onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button').props.accessibilityState.disabled).toBe(true);
  });

  it('muestra el error debajo', async () => {
    await render(<FieldButton label="Fecha" error="Elige una fecha" onPress={jest.fn()} />);
    expect(screen.getByText('Elige una fecha')).toBeTruthy();
  });

  it('el valor no envuelve a dos lineas', async () => {
    await render(<FieldButton label="Tema" value="Un tema con nombre larguísimo" onPress={jest.fn()} />);
    expect(screen.getByText('Un tema con nombre larguísimo').props.numberOfLines).toBe(1);
  });

  it('la etiqueta tampoco envuelve', async () => {
    await render(<FieldButton label="Fecha" onPress={jest.fn()} />);
    expect(screen.getByText('Fecha').props.numberOfLines).toBe(1);
  });
});
