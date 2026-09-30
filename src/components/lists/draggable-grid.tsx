import { type ReactNode, useCallback, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { marcarArrastre } from './drag-guard';

import { Motion, Spacing } from '@/constants/theme';

const RETARDO_MS = 200;

export type DraggableGridProps<T> = {
  items: readonly T[];
  columns: number;
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onReorder: (from: number, to: number) => void;
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
 * Como en las listas, arranca con pulsación mantenida para que tocar siga abriendo.
 */
export function DraggableGrid<T>({ items, columns, keyOf, renderItem, onReorder }: DraggableGridProps<T>) {
  const [ancho, setAncho] = useState(0);
  const alturas = useRef<number[]>([]);

  const filas: T[][] = [];
  for (let i = 0; i < items.length; i += columns) filas.push(items.slice(i, i + columns));

  const anchoCelda = ancho > 0 ? (ancho - Spacing.sm * (columns - 1)) / columns : 0;

  const destinoDe = useCallback(
    (desde: number, dx: number, dy: number): number => {
      if (anchoCelda === 0) return desde;
      const filaActual = Math.floor(desde / columns);
      const colActual = desde % columns;

      const salto = Math.round(dx / (anchoCelda + Spacing.sm));
      const col = Math.min(columns - 1, Math.max(0, colActual + salto));

      let fila = filaActual;
      let restante = dy;
      while (restante > 0 && fila < filas.length - 1) {
        const alto = (alturas.current[fila + 1] ?? 0) + Spacing.sm;
        if (restante < alto / 2) break;
        restante -= alto;
        fila += 1;
      }
      while (restante < 0 && fila > 0) {
        const alto = (alturas.current[fila - 1] ?? 0) + Spacing.sm;
        if (-restante < alto / 2) break;
        restante += alto;
        fila -= 1;
      }

      // La última fila puede estar incompleta: soltar en su hueco vacío es soltar al final.
      return Math.min(items.length - 1, fila * columns + col);
    },
    [anchoCelda, columns, filas.length, items.length],
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
          {fila.map((item, c) => {
            const index = f * columns + c;
            return (
              <Celda
                key={keyOf(item)}
                onSoltar={(dx, dy) => {
                  const destino = destinoDe(index, dx, dy);
                  if (destino !== index) onReorder(index, destino);
                }}>
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

function Celda({ children, onSoltar }: { children: ReactNode; onSoltar: (dx: number, dy: number) => void }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const levantada = useSharedValue(0);

  const gesto = Gesture.Pan()
    .activateAfterLongPress(RETARDO_MS)
    .onStart(() => {
      levantada.value = withTiming(1, { duration: Motion.fast });
    })
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > 4 || Math.abs(e.translationY) > 4) runOnJS(marcarArrastre)();
      runOnJS(onSoltar)(e.translationX, e.translationY);
      x.value = withTiming(0, { duration: Motion.fast });
      y.value = withTiming(0, { duration: Motion.fast });
      levantada.value = withTiming(0, { duration: Motion.fast });
    });

  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: 1 + levantada.value * 0.03 }],
    opacity: 1 - levantada.value * 0.15,
    zIndex: levantada.value > 0 ? 2 : 0,
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
