/** El canto del libro (spec 13c, RF-BH15; T290, T360): tocar salta; con mouse, la palabra y la página al pasar encima. */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { BookmarkRail } from '@/components/library/bookmark-rail';
import { es } from '@/i18n/es';

const A = es.library.annotations;
const pestanas = [
  { id: 's1', lugar: 0.2, color: '#F1D35D', palabra: 'Capítulo 3', donde: 'p. 40' },
  { id: 's2', lugar: 0.7, color: '#E24947', palabra: '', donde: 'p. 120' },
];

it('tocar una pestaña lleva a su separador', async () => {
  const onIr = jest.fn();
  await render(<BookmarkRail pestanas={pestanas} arriba={0} abajo={0} onIr={onIr} />);
  await fireEvent.press(screen.getByRole('button', { name: A.bookmarkGoTo('Capítulo 3', 'p. 40') }));
  expect(onIr).toHaveBeenCalledWith('s1');
});

// La etiqueta es solo para la vista: el lector de pantalla ya lee la palabra en el botón.
const oculto = { includeHiddenElements: true };

it('al pasar el mouse muestra la palabra y la página; al salir se va', async () => {
  await render(<BookmarkRail pestanas={pestanas} arriba={0} abajo={0} onIr={jest.fn()} />);
  const pestana = screen.getByRole('button', { name: A.bookmarkGoTo('Capítulo 3', 'p. 40') });
  expect(screen.queryByText(A.bookmarkHover('Capítulo 3', 'p. 40'), oculto)).toBeNull();
  await fireEvent(pestana, 'hoverIn');
  expect(screen.getByText('Capítulo 3 · p. 40', oculto)).toBeTruthy();
  await fireEvent(pestana, 'hoverOut');
  expect(screen.queryByText('Capítulo 3 · p. 40', oculto)).toBeNull();
  // Sin palabra, dice que es un separador.
  await fireEvent(screen.getByRole('button', { name: A.bookmarkGoTo('', 'p. 120') }), 'hoverIn');
  expect(screen.getByText('Separador · p. 120', oculto)).toBeTruthy();
});
