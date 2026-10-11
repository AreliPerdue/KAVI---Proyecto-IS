/**
 * La hoja y el teclado: sube solo lo que el sistema no subió ya. Antes sumaba siempre el alto
 * del teclado y, donde Android ya encogía la ventana (Expo Go, algunos teléfonos), la hoja subía
 * dos veces y quedaba un hueco entre ella y el teclado (reporte del 11 oct 2026).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard, StyleSheet, Text, type ViewStyle } from 'react-native';

import { Sheet } from '@/components/ui/sheet';

type Oyente = (e: { endCoordinates: { height: number } }) => void;
const oyentes: Record<string, Oyente> = {};

beforeEach(() => {
  jest.spyOn(Keyboard, 'addListener').mockImplementation((evento, fn) => {
    oyentes[evento] = fn as unknown as Oyente;
    return { remove: jest.fn() } as never;
  });
});
afterEach(() => jest.restoreAllMocks());

/** La raíz es el padre del scrim (el botón "Cerrar" que ocupa todo); el panel, su hermano. */
const piezas = () => {
  const scrim = screen.getAllByRole('button', { name: 'Cerrar' })[0]!;
  const raiz = scrim.parent as unknown as { props: Record<string, unknown>; children: { props: { style: unknown } }[] };
  const panel = raiz.children[1]!;
  return { raiz, margen: () => StyleSheet.flatten(panel.props.style as ViewStyle)?.marginBottom ?? 0 };
};
const medir = async (alto: number) => {
  const { raiz } = piezas();
  await fireEvent(raiz as never, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: alto } } });
};
const abrirTeclado = async (alto: number) =>
  act(async () => (oyentes.keyboardWillShow ?? oyentes.keyboardDidShow)?.({ endCoordinates: { height: alto } }));

const montar = () =>
  render(
    <Sheet visible onClose={jest.fn()} title="Elegir ejercicio">
      <Text>contenido</Text>
    </Sheet>,
  );

it('si el sistema no encoge la ventana, la hoja sube el alto del teclado', async () => {
  await montar();
  await medir(800);
  await abrirTeclado(300);
  expect(piezas().margen()).toBe(300);
});

it('si el sistema ya encogió la ventana, la hoja no sube de más (sin hueco)', async () => {
  await montar();
  await medir(800);
  await abrirTeclado(300);
  await medir(500);
  expect(piezas().margen()).toBe(0);
});

it('si la encogió solo en parte, sube lo que falta', async () => {
  await montar();
  await medir(800);
  await abrirTeclado(300);
  await medir(700);
  expect(piezas().margen()).toBe(200);
});

it('sin teclado no sube nada', async () => {
  await montar();
  await medir(800);
  expect(piezas().margen()).toBe(0);
});

describe('pantalla completa (selector de ejercicios)', () => {
  const montarCompleta = () =>
    render(
      <Sheet visible onClose={jest.fn()} title="Elegir ejercicio" fullScreen scrollable={false}>
        <Text>contenido</Text>
      </Sheet>,
    );
  const altoPanel = () => {
    const scrim = screen.getAllByRole('button', { name: 'Cerrar' })[0]!;
    const raiz = scrim.parent as unknown as { children: { props: { style: unknown } }[] };
    return StyleSheet.flatten(raiz.children[1]!.props.style as ViewStyle);
  };

  it('ocupa todo el alto de la pantalla, sin bordes redondeados', async () => {
    await montarCompleta();
    await medir(800);
    expect(altoPanel().height).toBe(800);
    expect(altoPanel().borderTopLeftRadius).toBeUndefined();
  });

  it('con el teclado abierto se acorta lo que el teclado tapa, sin hueco', async () => {
    await montarCompleta();
    await medir(800);
    await abrirTeclado(300);
    expect(altoPanel()).toEqual(expect.objectContaining({ height: 500, marginBottom: 300 }));
    // Donde el sistema ya encogió la ventana, ni margen ni hueco.
    await medir(500);
    expect(altoPanel()).toEqual(expect.objectContaining({ height: 500, marginBottom: 0 }));
  });
});
