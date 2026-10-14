import { type ReactNode, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Repisa } from './bookshelf';

import { marcarArrastre } from '@/components/lists/drag-guard';
import { Motion } from '@/constants/theme';
import { tap } from '@/lib/haptics';
import { destinoEnRepisas, type LomoMedido, type RepisaMedida } from '@/lib/library/spines';

/** Como en las portadas y las listas: deliberado sin hacerse esperar (T270). */
const RETARDO_MS = 350;

type Props<T> = {
  /** Las repisas con sus piezas, en orden; juntas forman la lista que `onReorder` mueve. */
  repisas: readonly (readonly T[])[];
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Como en la rejilla: `to` es el lugar en la lista sin la pieza movida. */
  onReorder: (from: number, to: number) => void;
};

/**
 * El librero acomodable (spec 13a, RF-BL7b; T331): mantener presionado un lomo lo levanta y se lleva a otro
 * lugar, en su repisa o en otra. Tocarlo sigue sacándolo del librero (quien lo pinta pone el `onPress`, con
 * la guarda de `arrastreReciente`). Las medidas de cada lomo y repisa salen de su `onLayout`.
 */
export function DraggableShelf<T>({ repisas, keyOf, renderItem, onReorder }: Props<T>) {
  const lista = useMemo(() => repisas.flat(), [repisas]);
  const lomos = useRef(new Map<string, LomoMedido>());
  const filas = useRef<RepisaMedida[]>([]);

  const actual = useRef({ lista, keyOf, onReorder });
  useLayoutEffect(() => {
    actual.current = { lista, keyOf, onReorder };
  });

  const alSoltar = useCallback((clave: string, dx: number, dy: number) => {
    const { lista: todos, keyOf: claveDe, onReorder: reordenar } = actual.current;
    const desde = todos.findIndex((x) => claveDe(x) === clave);
    const propio = lomos.current.get(clave);
    const fila = propio ? filas.current[propio.fila] : undefined;
    if (desde < 0 || !propio || !fila) return;
    const punto = { x: propio.x + propio.w / 2 + dx, y: fila.y + fila.h / 2 + dy };
    const medidos = todos.map((x) => lomos.current.get(claveDe(x)));
    const destino = destinoEnRepisas({ desde, punto, lomos: medidos, repisas: filas.current });
    if (destino !== desde) reordenar(desde, destino);
  }, []);

  return (
    <View>
      {repisas.map((repisa, f) => (
        <View
          key={`repisa-${f}`}
          onLayout={(e: LayoutChangeEvent) => {
            filas.current[f] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height };
          }}>
          <Repisa numero={f + 1}>
            {repisa.map((item) => {
              const clave = keyOf(item);
              return (
                <Lomo
                  key={clave}
                  clave={clave}
                  alSoltar={alSoltar}
                  onLayout={(e) => lomos.current.set(clave, { fila: f, x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width })}>
                  {renderItem(item)}
                </Lomo>
              );
            })}
          </Repisa>
        </View>
      ))}
    </View>
  );
}

function Lomo({
  clave,
  children,
  alSoltar,
  onLayout,
}: {
  clave: string;
  children: ReactNode;
  alSoltar: (clave: string, dx: number, dy: number) => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const levantado = useSharedValue(0);

  const gesto = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(RETARDO_MS)
        .onStart(() => {
          levantado.set(withTiming(1, { duration: Motion.fast }));
          runOnJS(tap)();
        })
        .onUpdate((e) => {
          x.set(e.translationX);
          y.set(e.translationY);
        })
        .onEnd((e) => {
          const movido = Math.abs(e.translationX) > 4 || Math.abs(e.translationY) > 4;
          runOnJS(marcarArrastre)();
          if (movido) runOnJS(alSoltar)(clave, e.translationX, e.translationY);
          x.set(withTiming(0, { duration: Motion.fast }));
          y.set(withTiming(0, { duration: Motion.fast }));
          levantado.set(withTiming(0, { duration: Motion.fast }));
        }),
    [clave, alSoltar, x, y, levantado],
  );

  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() - levantado.get() * 8 }, { scale: 1 + levantado.get() * 0.04 }],
    opacity: 1 - levantado.get() * 0.15,
    zIndex: levantado.get() > 0 ? 2 : 0,
  }));

  return (
    <GestureDetector gesture={gesto}>
      <Animated.View onLayout={onLayout} style={[styles.lomo, estilo]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  lomo: { alignSelf: 'flex-end' },
});
