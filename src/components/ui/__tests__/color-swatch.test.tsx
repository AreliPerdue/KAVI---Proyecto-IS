/**
 * Muestras de color y contornos (T202): el color va tal cual, con contorno solo si casi no se
 * distingue del fondo, y la palomita en el tono que se lea encima.
 */
import { render, screen } from '@testing-library/react-native';

import { lowContrastOutline } from '@/components/calendar/activity-style';
import { ColorSwatch } from '@/components/ui/color-swatch';
import { Colors } from '@/constants/theme';
import { needsOutline } from '@/lib/color';

const OSCURO = Colors.dark;

const palomita = () => screen.getByTestId('icono-Check').props.color as string;

describe('ColorSwatch', () => {
  it.each([
    ['rosa', '#F6A9CD'],
    ['amarillo', '#F1D35D'],
    ['lima', '#A2DD5C'],
    ['blanco', '#EAE8E0'],
  ])('palomita oscura sobre %s', async (_n, hex) => {
    await render(<ColorSwatch hex={hex} label="x" selected onPress={jest.fn()} />);
    expect(palomita()).toBe('#131313');
  });

  it('palomita blanca sobre un color oscuro', async () => {
    await render(<ColorSwatch hex="#7067E9" label="Índigo" selected onPress={jest.fn()} />);
    expect(palomita()).toBe('#FFFFFF');
  });

  it('sin seleccionar no lleva palomita, y se anuncia con su nombre', async () => {
    await render(<ColorSwatch hex="#7067E9" label="Índigo" selected={false} onPress={jest.fn()} />);
    expect(screen.queryByTestId('icono-Check')).toBeNull();
    expect(screen.getByRole('button', { name: 'Índigo' }).props.accessibilityState.selected).toBe(false);
  });
});

describe('contornos', () => {
  it('solo lo que no llega a 3:1 contra el fondo lleva contorno', () => {
    expect(needsOutline('#131313', '#1A1A1A')).toBe(true);
    expect(needsOutline('#F1D35D', '#1A1A1A')).toBe(false);
    expect(needsOutline('no-es-hex', '#1A1A1A')).toBe(false);
  });

  it('un bloque o chip de color casi igual al fondo lleva contorno; uno visible, no', () => {
    expect(lowContrastOutline(OSCURO.background, OSCURO)).toEqual({ borderWidth: 1, borderColor: OSCURO.textTertiary });
    expect(lowContrastOutline('#F1D35D', OSCURO)).toBeNull();
  });
});
