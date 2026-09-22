/**
 * Boton: estados de carga y deshabilitado, que son los que mas se equivocan en
 * formularios, y su contrato de accesibilidad.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('muestra el titulo', async () => {
    await render(<Button title="Guardar" />);
    expect(screen.getByText('Guardar')).toBeTruthy();
  });

  it('se anuncia como boton con su etiqueta', async () => {
    await render(<Button title="Guardar" />);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy();
  });

  it('avisa al tocarlo', async () => {
    const onPress = jest.fn();
    await render(<Button title="Guardar" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no responde cuando esta deshabilitado', async () => {
    const onPress = jest.fn();
    await render(<Button title="Guardar" disabled onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('cargando oculta el titulo y no responde', async () => {
    const onPress = jest.fn();
    await render(<Button title="Guardar" loading onPress={onPress} />);

    expect(screen.queryByText('Guardar')).toBeNull();
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('cargando se anuncia como ocupado y deshabilitado', async () => {
    await render(<Button title="Guardar" loading />);
    const estado = screen.getByRole('button').props.accessibilityState;
    expect(estado.busy).toBe(true);
    expect(estado.disabled).toBe(true);
  });

  it('deshabilitado no se anuncia como ocupado', async () => {
    await render(<Button title="Guardar" disabled />);
    const estado = screen.getByRole('button').props.accessibilityState;
    expect(estado.disabled).toBe(true);
    expect(estado.busy).toBe(false);
  });

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'renderiza la variante %s',
    async (variant) => {
      await render(<Button title="X" variant={variant} />);
      expect(screen.getByRole('button')).toBeTruthy();
    },
  );
});
