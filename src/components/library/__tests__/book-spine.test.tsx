/** El lomo (RF-BL2, RF-BL20; T282): la imagen del lomo si la hay; si no, su color con el título. Es decorativo (oculto al lector de pantalla), por eso se busca con los ocultos. */
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { BookSpine } from '@/components/library/book-spine';

jest.mock('@/hooks/use-library', () => ({
  useLibraryFileUrl: (ruta: string | null) => ({ data: ruta ? `https://r2.test/${ruta}` : undefined }),
}));

const libro = (extra: Record<string, unknown> = {}) =>
  ({ id: 'l1', title: 'Rayuela', cover_path: null, cover_color: '#1E2761', page_count: 340, spine_path: null, spine_color: null, ...extra }) as never;

it('sin imagen: el color de la portada, el grosor por páginas y el título', async () => {
  await render(<BookSpine item={libro()} />);
  expect(screen.getByText('Rayuela', { includeHiddenElements: true })).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId('lomo', { includeHiddenElements: true }).props.style)).toMatchObject({ width: 50, backgroundColor: '#1E2761' });
});

it('con color de lomo propio, ese color', async () => {
  await render(<BookSpine item={libro({ spine_color: '#ABCDEF' })} />);
  expect(StyleSheet.flatten(screen.getByTestId('lomo', { includeHiddenElements: true }).props.style)).toMatchObject({ backgroundColor: '#ABCDEF' });
});

it('con imagen de lomo, la imagen y sin título encima', async () => {
  await render(<BookSpine item={libro({ spine_path: 'u1/l1/spine.jpg' })} />);
  expect(screen.queryByText('Rayuela', { includeHiddenElements: true })).toBeNull();
  expect(screen.getByTestId('lomo-imagen', { includeHiddenElements: true })).toBeTruthy();
});
