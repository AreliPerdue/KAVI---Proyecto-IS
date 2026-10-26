/** Estilo de una pieza del lienzo: la letra de un texto (T375). */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { CanvasStyleSheet } from '@/components/library/canvas-style-sheet';
import { es } from '@/i18n/es';
import type { ElementoDeLienzo } from '@/lib/library/canvas';

const S = es.library.canvas.style;
const pieza = (type: ElementoDeLienzo['type'], style: ElementoDeLienzo['style'] = {}): ElementoDeLienzo =>
  ({ id: 'a', type, page: 1, x: 0.1, y: 0.1, w: 0.4, ar: 0.3, rot: 0, z: 1, locked: false, group: null, style, content: { text: 'Hola' } }) as ElementoDeLienzo;

it('un texto elige su letra: manuscrita, y Normal la quita', async () => {
  const onCambiar = jest.fn();
  const { rerender } = await render(<CanvasStyleSheet elemento={pieza('textbox')} onClose={jest.fn()} onCambiar={onCambiar} onColor={jest.fn()} onColorDeBorde={jest.fn()} />);
  await fireEvent.press(screen.getByRole('tab', { name: S.fonts.hand }));
  expect(onCambiar).toHaveBeenLastCalledWith({ font: 'hand' });
  await rerender(<CanvasStyleSheet elemento={pieza('textbox', { font: 'hand' })} onClose={jest.fn()} onCambiar={onCambiar} onColor={jest.fn()} onColorDeBorde={jest.fn()} />);
  await fireEvent.press(screen.getByRole('tab', { name: S.fonts.sans }));
  expect(onCambiar).toHaveBeenLastCalledWith({ font: undefined });
});

it('lo que no es texto no tiene letra', async () => {
  await render(<CanvasStyleSheet elemento={pieza('shape')} onClose={jest.fn()} onCambiar={jest.fn()} onColor={jest.fn()} onColorDeBorde={jest.fn()} />);
  expect(screen.queryByRole('tab', { name: S.fonts.hand })).toBeNull();
});
