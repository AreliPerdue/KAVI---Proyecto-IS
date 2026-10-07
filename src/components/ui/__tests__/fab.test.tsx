/**
 * El botón + (RF-C5; T193c): encoge al bajar sin dejar de ser fácil de tocar.
 */
import { render, screen } from '@testing-library/react-native';

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
