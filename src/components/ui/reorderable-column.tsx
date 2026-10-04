import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import { type LayoutChangeEvent, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { tap } from '@/lib/haptics';

type Medida = { y: number; h: number };

/** Lo que recibe cada fila para volverse arrastrable. */
export type DragControls = {
  /** Envuelve la zona que se mantiene presionada para arrastrar (el asa). */
  handle: (child: ReactNode) => ReactNode;
  /** `true` mientras se arrastra o justo después: para no abrir un menú al soltar. */
  justDragged: () => boolean;
};

export type ReorderableColumnProps<T> = {
  items: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number, drag: DragControls) => ReactNode;
  /** Se llama al soltar en otro lugar. `to` es el índice final del elemento. */
  onMove: (from: number, to: number) => void;
  enabled?: boolean;
  /** Cuánto hay que mantener presionado antes de arrastrar, para no pelear con el scroll. */
  longPressMs?: number;
  gap?: number;
  style?: ViewStyle;
  /** Avisa al empezar y al terminar de arrastrar: para apagar el scroll de la pantalla. */
  onDragStateChange?: (dragging: boolean) => void;
};

/**
 * Columna que se reordena arrastrando (spec 07 v2, RF-F33). Mantener presionada el asa
 * levanta la fila; las demás se recorren para hacerle lugar, y al soltar se avisa con
 * `onMove`. Las filas pueden medir distinto: cada una reporta su alto con `onLayout`.
 *
 * Es una mejora, no el único camino: quien no puede arrastrar (lector de pantalla, por
 * ejemplo) tiene "Subir" y "Bajar" en los menús.
 */
export function ReorderableColumn<T>({ items, keyOf, renderItem, onMove, enabled = true, longPressMs = 250, gap = 0, style, onDragStateChange }: ReorderableColumnProps<T>) {
  const medidas = useSharedValue<Medida[]>([]);
  const activo = useSharedValue(-1);
  const destino = useSharedValue(-1);
  const dy = useSharedValue(0);
  const ultimoArrastre = useRef(0);
  /*
   * Los callbacks más recientes, leídos al momento de usarlos. Así las acciones de abajo
   * son estables, el gesto no se rehace en cada render (rehacerlo a medio arrastre lo
   * cancela) y aun así `onMove` nunca trabaja con datos viejos.
   */
  const ultimos = useRef({ onMove, onDragStateChange });
  useEffect(() => {
    ultimos.current = { onMove, onDragStateChange };
  });
  const firma = items.map(keyOf).join('|');

  // Cuando llega el nuevo orden, las filas ya están en su lugar: se quitan los corrimientos.
  useEffect(() => {
    activo.set(-1);
    destino.set(-1);
    dy.set(0);
  }, [firma, activo, destino, dy]);

  const acciones = useMemo<Acciones>(
    () => ({
      alEmpezar: () => {
        ultimoArrastre.current = Date.now();
        tap();
        ultimos.current.onDragStateChange?.(true);
      },
      alCancelar: () => ultimos.current.onDragStateChange?.(false),
      alSoltar: (from: number, to: number) => {
        ultimoArrastre.current = Date.now();
        ultimos.current.onDragStateChange?.(false);
        if (from !== to) {
          ultimos.current.onMove(from, to);
          // Si el nuevo orden no llega (falló al guardar), las filas vuelven solas.
          setTimeout(() => {
            activo.set(-1);
            dy.set(0);
          }, 1500);
        } else {
          activo.set(-1);
          dy.set(0);
        }
      },
      justDragged: () => activo.get() !== -1 || Date.now() - ultimoArrastre.current < 400,
    }),
    [activo, dy],
  );
  const ctx: Contexto = { medidas, activo, destino, dy, gap, enabled, longPressMs, acciones };

  return (
    <View style={[{ gap }, style]}>
      {items.map((item, index) => (
        <Fila key={keyOf(item)} index={index} ctx={ctx}>
          {(drag) => renderItem(item, index, drag)}
        </Fila>
      ))}
    </View>
  );
}

type Contexto = {
  medidas: SharedValue<Medida[]>;
  activo: SharedValue<number>;
  destino: SharedValue<number>;
  dy: SharedValue<number>;
  gap: number;
  enabled: boolean;
  longPressMs: number;
  acciones: Acciones;
};

type Acciones = {
  alEmpezar: () => void;
  alCancelar: () => void;
  alSoltar: (from: number, to: number) => void;
  justDragged: () => boolean;
};

function Fila({ index, ctx, children }: { index: number; ctx: Contexto; children: (drag: DragControls) => ReactNode }) {
  const { medidas, activo, destino, dy, gap, enabled, longPressMs, acciones } = ctx;

  const alMedir = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    const copia = [...medidas.get()];
    copia[index] = { y, h: height };
    medidas.set(copia);
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activateAfterLongPress(longPressMs)
        .onStart(() => {
          activo.set(index);
          destino.set(index);
          dy.set(0);
          runOnJS(acciones.alEmpezar)();
        })
        .onUpdate((e) => {
          dy.set(e.translationY);
          const m = medidas.get();
          const propia = m[index];
          if (!propia) return;
          // El destino es cuántas filas quedan con el centro arriba del centro de la arrastrada.
          const centro = propia.y + propia.h / 2 + e.translationY;
          let t = 0;
          for (let i = 0; i < m.length; i++) {
            const otra = m[i];
            if (i !== index && otra && otra.y + otra.h / 2 < centro) t += 1;
          }
          destino.set(t);
        })
        .onEnd(() => {
          const m = medidas.get();
          const t = destino.get();
          // Se acomoda en su hueco antes de avisar, para que el cambio de orden no salte.
          let corrimiento = 0;
          if (t > index) for (let i = index + 1; i <= t; i++) corrimiento += (m[i]?.h ?? 0) + gap;
          else for (let i = t; i < index; i++) corrimiento -= (m[i]?.h ?? 0) + gap;
          dy.set(
            withTiming(corrimiento, { duration: 120 }, () => {
              runOnJS(acciones.alSoltar)(index, t);
            }),
          );
        })
        .onFinalize((_e, exito) => {
          if (!exito && activo.get() === index) {
            activo.set(-1);
            dy.set(0);
            runOnJS(acciones.alCancelar)();
          }
        }),
    [index, enabled, longPressMs, gap, acciones, medidas, activo, destino, dy],
  );

  const estilo = useAnimatedStyle(() => {
    const a = activo.get();
    if (a === -1) return { transform: [{ translateY: 0 }, { scale: 1 }], zIndex: 0, opacity: 1 };
    if (a === index) return { transform: [{ translateY: dy.get() }, { scale: 1.02 }], zIndex: 10, opacity: 0.95 };
    const alto = (medidas.get()[a]?.h ?? 0) + gap;
    const t = destino.get();
    let corrimiento = 0;
    if (a < index && index <= t) corrimiento = -alto;
    else if (t <= index && index < a) corrimiento = alto;
    return { transform: [{ translateY: withTiming(corrimiento, { duration: 150 }) }, { scale: 1 }], zIndex: 0, opacity: 1 };
  });

  const drag: DragControls = {
    handle: (child) => (
      <GestureDetector gesture={pan}>
        <View collapsable={false} style={styles.asa}>
          {child}
        </View>
      </GestureDetector>
    ),
    justDragged: acciones.justDragged,
  };

  return (
    <Animated.View onLayout={alMedir} style={estilo}>
      {children(drag)}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // En web, mantener presionado selecciona texto; en el asa no tiene sentido.
  asa: Platform.OS === 'web' ? ({ userSelect: 'none' } as ViewStyle) : {},
});
