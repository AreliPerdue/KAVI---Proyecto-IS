/**
 * Chip: filtros del calendario y dias de la semana. El estado seleccionado tiene
 * que anunciarse, no solo pintarse: el color nunca es el unico indicador
 * (kavi-design §5).
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Chip } from '@/components/ui/chip';

describe('Chip', () => {
  it('muestra la etiqueta', async () => {
    await render(<Chip label="Deporte" selected={false} onPress={jest.fn()} />);
    expect(screen.getByText('Deporte')).toBeTruthy();
  });

  it('anuncia que esta seleccionado', async () => {
    await render(<Chip label="Deporte" selected onPress={jest.fn()} />);
    expect(screen.getByRole('button').props.accessibilityState.selected).toBe(true);
  });

  it('anuncia que no lo esta', async () => {
    await render(<Chip label="Deporte" selected={false} onPress={jest.fn()} />);
    expect(screen.getByRole('button').props.accessibilityState.selected).toBe(false);
  });

  it('avisa al tocarlo', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Deporte" selected={false} onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('acepta un color de acento de la dimension', async () => {
    await render(<Chip label="Física" selected color="#4CAF50" onPress={jest.fn()} />);
    expect(screen.getByText('Física')).toBeTruthy();
  });

  it('la variante compacta sigue mostrando la etiqueta', async () => {
    await render(<Chip label="L" selected={false} compact onPress={jest.fn()} />);
    expect(screen.getByText('L')).toBeTruthy();
  });
});
