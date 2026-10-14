/** El lomo (RF-BL2, RF-BL20; T282): la imagen del lomo si la hay; si no, su color con el título. Es decorativo (oculto al lector de pantalla), por eso se busca con los ocultos. */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { BookSpine } from '@/components/library/book-spine';
import { LOMO_ALTO_IGUAL } from '@/lib/library/spines';
import { usePreferencesStore } from '@/store/preferences-store';
import { useSpineRatiosStore } from '@/store/spine-ratios-store';

jest.mock('@/hooks/use-library', () => ({
  useLibraryFileUrl: (ruta: string | null) => ({ data: ruta ? `https://r2.test/${ruta}` : undefined }),
}));

beforeEach(() => {
  usePreferencesStore.setState({ librarySpineHeights: 'varied' });
  useSpineRatiosStore.setState({ porRuta: {} });
});

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

it('con imagen, el lomo toma el ancho que pide la imagen a su alto, para que no se recorte', async () => {
  usePreferencesStore.setState({ librarySpineHeights: 'equal' });
  await render(<BookSpine item={libro({ spine_path: 'u1/l1/spine.jpg' })} />);
  const imagen = screen.getByTestId('lomo-imagen', { includeHiddenElements: true });
  await fireEvent(imagen, 'load', { nativeEvent: { source: { width: 100, height: 400 } } });
  // Todos iguales: 196 de alto; la imagen pide un cuarto de eso de ancho.
  expect(StyleSheet.flatten(screen.getByTestId('lomo', { includeHiddenElements: true }).props.style)).toMatchObject({ width: 49, height: LOMO_ALTO_IGUAL });
  expect(screen.getByTestId('lomo-imagen', { includeHiddenElements: true }).props.contentFit).toBe('cover');
  // La proporción queda para el librero, que reparte las repisas con ese ancho.
  expect(useSpineRatiosStore.getState().porRuta['u1/l1/spine.jpg']).toBe(0.25);
  // Una imagen larguísima se topa en el mínimo y se ve entera dentro.
  await fireEvent(screen.getByTestId('lomo-imagen', { includeHiddenElements: true }), 'load', { nativeEvent: { source: { width: 100, height: 2000 } } });
  expect(screen.getByTestId('lomo-imagen', { includeHiddenElements: true }).props.contentFit).toBe('contain');
});

it('los tomos de una saga miden lo mismo aunque el alto sea variado (RF-BL2b)', async () => {
  usePreferencesStore.setState({ librarySpineHeights: 'varied' });
  await render(
    <>
      {['t1', 't2', 't3'].map((id) => (
        <BookSpine key={id} item={libro({ id, series_id: 'acotar' })} />
      ))}
    </>,
  );
  const altos = screen.getAllByTestId('lomo', { includeHiddenElements: true }).map((l) => StyleSheet.flatten(l.props.style).height);
  expect(altos).toHaveLength(3);
  expect(new Set(altos).size).toBe(1);
});

it('el título largo puede ir en dos renglones', async () => {
  await render(<BookSpine item={libro({ title: 'A Court of Wings and Ruin' })} />);
  expect(screen.getByText('A Court of Wings and Ruin', { includeHiddenElements: true }).props.numberOfLines).toBe(2);
});
