import { type ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { marcarArrastre } from './drag-guard';

import { Motion, Spacing } from '@/constants/theme';
import { destinoEnRejilla } from '@/lib/drag';
import { tap } from '@/lib/haptics';

/** Igual que en las filas: deliberado sin hacerse esperar (T270). */
const RETARDO_MS = 350;

export type DraggableGridProps<T> = {
  items: readonly T[];
  columns: number;
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onReorder: (from: number, to: number) => void;
  /**
   * Mantener presionado y soltar **sin mover** (RF-L28, T270): en el inicio de Listas
   * selecciona la tarjeta. Mover sigue reordenando, y el toque que llega pegado se ignora.
   */
  onHold?: (item: T) => void;
};

/**
 * Rejilla reordenable arrastrando (RF-L3).
 *
 * Es un problema distinto del de una lista: aquí el destino no es una posición en una
 * columna sino **una celda**, así que el desplazamiento horizontal también cuenta. El
 * horizontal se resuelve con el ancho de columna, que es uniforme; el vertical con las
 * alturas reales de cada fila, que no lo son —una tarjeta con nombre de dos renglones
 * estira su fila entera—.
 *
 * Como en las listas, arranca con pulsación mantenida para que tocar siga abriendo. Y como
 * en las filas (T271), el gesto de cada celda se crea una sola vez: lo que cambia en cada
 * render se lee de una referencia y a las celdas les llegan funciones estables por clave.
 */
export function DraggableGrid<T>({ items, columns, keyOf, renderItem, onReorder, onHold }: DraggableGridProps<T>) {
  const [ancho, setAncho] = useState(0);
  const alturas = useRef<number[]>([]);

  const filas: T[][] = [];
  for (let i = 0; i < items.length; i += columns) filas.push(items.slice(i, i + columns));

  const anchoCelda = ancho > 0 ? (ancho - Spacing.sm * (columns - 1)) / columns : 0;

  const actual = useRef({ items, keyOf, onReorder, onHold, columns, anchoCelda });
  useLayoutEffect(() => {
    actual.current = { items, keyOf, onReorder, onHold, columns, anchoCelda };
  });
  const indiceDe = useCallback((clave: string) => actual.current.items.findIndex((it) => actual.current.keyOf(it) === clave), []);

  const alSoltar = useCallback(
    (clave: string, dx: number, dy: number) => {
      const desde = indiceDe(clave);
      if (desde < 0) return;
      const { items: todos, columns: columnas, anchoCelda: celda, onReorder: reordenar } = actual.current;
      const destino = destinoEnRejilla({ desde, dx, dy, columnas, total: todos.length, anchoCelda: celda, separacion: Spacing.sm, alturasFila: alturas.current });
      if (destino !== desde) reordenar(desde, destino);
    },
    [indiceDe],
  );
  const alSostener = useCallback(
    (clave: string) => {
      const item = actual.current.items[indiceDe(clave)];
      if (item !== undefined) actual.current.onHold?.(item);
    },
    [indiceDe],
  );

  return (
    <View onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
      {filas.map((fila, f) => (
        <View
          key={keyOf(fila[0] as T)}
          onLayout={(e: LayoutChangeEvent) => {
            alturas.current[f] = e.nativeEvent.layout.height;
          }}
          style={[styles.fila, f > 0 ? styles.filaSeparada : null]}>
          {fila.map((item) => {
            const clave = keyOf(item);
            return (
              <Celda key={clave} clave={clave} conHold={!!onHold} alSoltar={alSoltar} alSostener={alSostener}>
                {renderItem(item)}
              </Celda>
            );
          })}
          {/* Rellena el hueco de una fila incompleta para que la tarjeta no se estire. */}
          {fila.length < columns ? <View style={styles.hueco} /> : null}
        </View>
      ))}
    </View>
  );
}

function Celda({
  clave,
  conHold,
  children,
  alSoltar,
  alSostener,
}: {
  clave: string;
  conHold: boolean;
  children: ReactNode;
  alSoltar: (clave: string, dx: number, dy: number) => void;
  alSostener: (clave: string) => void;
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const levantada = useSharedValue(0);

  const gesto = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(RETARDO_MS)
        .onStart(() => {
          levantada.set(withTiming(1, { duration: Motion.fast }));
          runOnJS(tap)();
        })
        .onUpdate((e) => {
          x.set(e.translationX);
          y.set(e.translationY);
        })
        .onEnd((e) => {
          const movida = Math.abs(e.translationX) > 4 || Math.abs(e.translationY) > 4;
          if (movida || conHold) runOnJS(marcarArrastre)();
          if (movida) runOnJS(alSoltar)(clave, e.translationX, e.translationY);
          else if (conHold) runOnJS(alSostener)(clave);
          x.set(withTiming(0, { duration: Motion.fast }));
          y.set(withTiming(0, { duration: Motion.fast }));
          levantada.set(withTiming(0, { duration: Motion.fast }));
        }),
    [clave, conHold, alSoltar, alSostener, x, y, levantada],
  );

  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: 1 + levantada.get() * 0.03 }],
    opacity: 1 - levantada.get() * 0.15,
    zIndex: levantada.get() > 0 ? 2 : 0,
  }));

  return (
    <GestureDetector gesture={gesto}>
      <Animated.View style={[styles.celda, estilo]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: Spacing.sm },
  filaSeparada: { marginTop: Spacing.sm },
  celda: { flex: 1 },
  hueco: { flex: 1 },
});
