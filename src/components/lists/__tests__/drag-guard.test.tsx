/**
 * Arrastrar sin robarle el toque a nadie (T212, T226): la guarda solo se activa si de verdad
 * hubo movimiento. Un toque normal o un toque largo sin mover siguen abriendo lo tocado.
 *
 * El mock global de gestos no hace nada; aquí se sustituye por uno que guarda los callbacks
 * de cada `Pan` para poder terminar el gesto a mano, con o sin desplazamiento.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { arrastreReciente } from '@/components/lists/drag-guard';
import { DraggableGrid } from '@/components/lists/draggable-grid';
import { DraggableRows } from '@/components/lists/draggable-rows';

type Fin = (e: { translationX: number; translationY: number }) => void;
const mockFines: Fin[] = [];

jest.mock('react-native-gesture-handler', () => {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- fábrica elevada */
  const React = require('react');
  const pan = () => {
    const g: Record<string, (...a: unknown[]) => unknown> = {};
    const encadena = (nombre: string) => (fn: unknown) => {
      if (nombre === 'onEnd') mockFines.push(fn as Fin);
      return g;
    };
    for (const n of ['activateAfterLongPress', 'onStart', 'onUpdate', 'onEnd']) g[n] = encadena(n);
    return g;
  };
  return {
    __esModule: true,
    Gesture: { Pan: pan },
    GestureDetector: ({ children }: { children: unknown }) => React.createElement(React.Fragment, null, children),
  };
});

/** Como en el teléfono: cada fila y la rejilla miden algo (44 px de alto, 320 de ancho). */
type Nodo = { props: Record<string, unknown>; children: (Nodo | string)[] };
const conLayout = (n: Nodo | string): Nodo[] =>
  typeof n === 'string' ? [] : [...(typeof n.props.onLayout === 'function' ? [n] : []), ...n.children.flatMap(conLayout)];
const medir = async () => {
  for (const n of conLayout(screen.root as unknown as Nodo)) {
    await act(async () => (n.props.onLayout as (e: unknown) => void)({ nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 44 } } }));
  }
};

/** Lo que hacen las pantallas: ignorar el toque que llega pegado a un arrastre. */
const Fila = ({ nombre, onOpen }: { nombre: string; onOpen: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={nombre} onPress={() => { if (!arrastreReciente()) onOpen(); }}>
    <Text>{nombre}</Text>
  </Pressable>
);

/** Cada prueba un minuto después: la guarda recuerda la hora del último arrastre. */
let reloj = new Date(2026, 9, 7, 12).getTime();
beforeEach(() => {
  mockFines.length = 0;
  jest.useFakeTimers();
  reloj += 60_000;
  jest.setSystemTime(reloj);
});
afterEach(() => jest.useRealTimers());

describe.each([
  ['filas (detalle de una lista)', (onOpen: jest.Mock, onReorder: jest.Mock) => (
    <DraggableRows items={['a', 'b']} keyOf={(x) => x} onReorder={onReorder} renderItem={(x) => <Fila nombre={x} onOpen={onOpen} />} />
  )],
  ['rejilla (inicio de Listas)', (onOpen: jest.Mock, onReorder: jest.Mock) => (
    <DraggableGrid items={['a', 'b']} columns={2} keyOf={(x) => x} onReorder={onReorder} renderItem={(x) => <Fila nombre={x} onOpen={onOpen} />} />
  )],
])('%s', (_n, montar) => {
  it('tocar sin mantener abre, no arrastra', async () => {
    const onOpen = jest.fn();
    const onReorder = jest.fn();
    await render(montar(onOpen, onReorder));
    await fireEvent.press(screen.getByRole('button', { name: 'a' }));
    expect(onOpen).toHaveBeenCalled();
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('un toque largo sin mover sigue siendo un toque', async () => {
    const onOpen = jest.fn();
    const onReorder = jest.fn();
    await render(montar(onOpen, onReorder));
    await medir();
    mockFines[0]?.({ translationX: 0, translationY: 2 });
    expect(arrastreReciente()).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'a' }));
    expect(onOpen).toHaveBeenCalled();
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('soltar tras moverse no abre (la guarda dura un instante)', async () => {
    const onOpen = jest.fn();
    await render(montar(onOpen, jest.fn()));
    mockFines[0]?.({ translationX: 0, translationY: 30 });
    expect(arrastreReciente()).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'a' }));
    expect(onOpen).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);
    await fireEvent.press(screen.getByRole('button', { name: 'a' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

/**
 * Con `onHold` (detalle de una lista, T268): mantener presionado y soltar sin mover abre los
 * detalles, y el toque que llega pegado no edita el texto. Mover sigue reordenando.
 */
describe('filas con onHold', () => {
  const montarConHold = (onOpen: jest.Mock, onHold: jest.Mock, onReorder: jest.Mock) =>
    render(<DraggableRows items={['a', 'b']} keyOf={(x) => x} onReorder={onReorder} onHold={onHold} renderItem={(x) => <Fila nombre={x} onOpen={onOpen} />} />);

  it('soltar quieta llama onHold con su elemento y se traga el toque', async () => {
    const onOpen = jest.fn();
    const onHold = jest.fn();
    const onReorder = jest.fn();
    await montarConHold(onOpen, onHold, onReorder);
    await medir();
    mockFines[1]?.({ translationX: 0, translationY: 1 });
    expect(onHold).toHaveBeenCalledWith('b');
    expect(onReorder).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'b' }));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('arrastrar reordena y no llama onHold', async () => {
    const onHold = jest.fn();
    const onReorder = jest.fn();
    await montarConHold(jest.fn(), onHold, onReorder);
    await medir();
    mockFines[0]?.({ translationX: 0, translationY: 60 });
    expect(onReorder).toHaveBeenCalledWith(0, 1);
    expect(onHold).not.toHaveBeenCalled();
  });

  it('un toque normal (sin mantener) sigue llegando', async () => {
    const onOpen = jest.fn();
    await montarConHold(onOpen, jest.fn(), jest.fn());
    await fireEvent.press(screen.getByRole('button', { name: 'a' }));
    expect(onOpen).toHaveBeenCalled();
  });
});
