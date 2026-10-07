/**
 * Chip: filtros del calendario y dias de la semana. El estado seleccionado tiene
 * que anunciarse, no solo pintarse: el color nunca es el unico indicador
 * (kavi-design §5).
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

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

describe('accesibilidad y contraste (T248)', () => {
  it('lee la etiqueta accesible si se da ("3 de 5" en vez de "3")', async () => {
    await render(<Chip label="3" accessibilityLabel="Energía 3 de 5" selected={false} onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Energía 3 de 5' })).toBeTruthy();
  });

  it('el área táctil llega a 44 sin cambiar cómo se ve', async () => {
    await render(<Chip label="Lun" selected={false} onPress={jest.fn()} compact />);
    expect(screen.getByRole('button', { name: 'Lun' }).props.hitSlop).toEqual({ top: 6, bottom: 6 });
  });

  it('seleccionado y sin color, el texto va en el contraste de la tinta (no blanco fijo)', async () => {
    await render(<Chip label="Tinta" selected onPress={jest.fn()} />);
    const color = StyleSheet.flatten(screen.getByText('Tinta').props.style).color;
    expect(color).toBeTruthy();
    expect(color).not.toBe('#FFFFFF');
  });

  it('seleccionado con color de dimensión, el texto va en blanco', async () => {
    await render(<Chip label="Física" color="#4CAF50" selected onPress={jest.fn()} />);
    expect(StyleSheet.flatten(screen.getByText('Física').props.style).color).toBe('#FFFFFF');
  });
});
