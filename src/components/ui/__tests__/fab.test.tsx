/**
 * El botón + (RF-C5; T193c): encoge al bajar sin dejar de ser fácil de tocar.
 */
import { render, screen } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import { Fab, FAB_SIZE, SHRUNK_SCALE } from '@/components/ui/fab';
import { MinTouchTarget } from '@/constants/theme';

describe('Fab', () => {
  it('encogido mide exactamente el mínimo táctil, nunca menos', () => {
    expect(FAB_SIZE * SHRUNK_SCALE).toBeGreaterThanOrEqual(MinTouchTarget);
    expect(MinTouchTarget).toBeGreaterThanOrEqual(44);
  });

  it('sin etiqueta propia se anuncia como "Nueva actividad"', async () => {
    await render(<Fab onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Nueva actividad' })).toBeTruthy();
  });
});

describe('Fab con movimiento reducido (kavi-design §2)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('con movimiento reducido cambia de tamaño sin transición', async () => {
    jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
    const transicion = jest.spyOn(Reanimated, 'withTiming');
    const { rerender } = await render(<Fab onPress={jest.fn()} />);
    await rerender(<Fab onPress={jest.fn()} shrunk />);
    expect(transicion).not.toHaveBeenCalled();
  });

  it('sin él, encoger va con transición', async () => {
    jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(false);
    const transicion = jest.spyOn(Reanimated, 'withTiming');
    const { rerender } = await render(<Fab onPress={jest.fn()} />);
    await rerender(<Fab onPress={jest.fn()} shrunk />);
    expect(transicion).toHaveBeenCalledWith(SHRUNK_SCALE, expect.anything());
  });
});
