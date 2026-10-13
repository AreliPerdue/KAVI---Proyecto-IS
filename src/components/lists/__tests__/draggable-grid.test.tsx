/** La rejilla que se arrastra (Listas, Biblioteca): una fila incompleta conserva el tamaño de las celdas. */
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { DraggableGrid } from '@/components/lists/draggable-grid';

const pintar = (n: number, columnas: number) =>
  render(
    <DraggableGrid
      items={Array.from({ length: n }, (_, i) => `l${i}`)}
      columns={columnas}
      keyOf={(x) => x}
      onReorder={jest.fn()}
      renderItem={(x) => <Text>{x}</Text>}
    />,
  );

it('rellena con una celda vacía por cada lugar que falta en la última fila', async () => {
  await pintar(9, 6);
  expect(screen.getAllByTestId('hueco')).toHaveLength(3);
});

it('con filas llenas no rellena nada', async () => {
  await pintar(4, 2);
  expect(screen.queryAllByTestId('hueco')).toHaveLength(0);
});
