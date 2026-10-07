import { type ReactNode, useCallback, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { marcarArrastre } from './drag-guard';

import { Motion } from '@/constants/theme';
import { destinoEnFilas } from '@/lib/drag';
import { tap } from '@/lib/haptics';

/**
 * Cuánto hay que mantener presionado antes de que la fila se despegue. Con `onHold` es
 * también lo que dura una pulsación larga: 350 ms se siente deliberado sin hacerse esperar,
 * y deja lejos un toque normal, que ahora edita el texto (T268).
 */
const RETARDO_MS = 350;

export type DraggableRowsProps<T> = {
  items: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /**
   * Qué filas se pueden tomar. Las que no —encabezados de sección, campos de captura—
   * siguen ocupando su lugar y cuentan para medir, pero no se arrastran.
   */
  draggable?: (item: T) => boolean;
  /** Se llama al soltar, con la posición de origen y la de destino. */
  onReorder: (from: number, to: number) => void;
  /**
   * Mantener presionado y soltar **sin mover** (T268, RF-L13c). Si se da, una pulsación larga
   * quieta es una acción propia —abrir los detalles— y no un toque; mover sigue reordenando.
   */
  onHold?: (item: T) => void;
};

/**
 * Filas reordenables arrastrando (RF-L7).
 *
 * Hecho a mano sobre `gesture-handler` y `reanimated` en vez de con una librería de
 * arrastre: las que hay están pensadas para nativo y se comportan mal en web, y aquí la web
 * no es un extra —es donde se prueba—. Las dos que ya usa la app funcionan en las tres
 * plataformas.
 *
 * Las alturas se **miden** en vez de asumirse iguales: una fila con nota y fecha mide más
 * que una con solo título, y calcular el destino con una altura fija dejaría el elemento
 * uno o dos lugares lejos de donde se soltó.
 *
 * El arrastre empieza con una pulsación mantenida para que tocar siga abriendo la edición,
 * que es lo que uno hace el 99 % de las veces.
 */
export function DraggableRows<T>({ items, keyOf, renderItem, draggable, onReorder, onHold }: DraggableRowsProps<T>) {
  const alturas = useRef<number[]>([]);
  const [arrastrando, setArrastrando] = useState<number | null>(null);

  const medir = useCallback((i: number) => (e: LayoutChangeEvent) => {
    alturas.current[i] = e.nativeEvent.layout.height;
  }, []);

  /**
   * A cuántos lugares equivale un desplazamiento vertical.
   *
   * Se avanza fila por fila sumando alturas reales hasta cubrir la distancia recorrida, y
   * se salta a la siguiente cuando se pasa de su mitad: es el punto en que el hueco ya se
   * ve del otro lado y soltar ahí es lo que la persona espera.
   */
  const destinoDe = useCallback((desde: number, dy: number): number => destinoEnFilas(alturas.current, desde, dy, items.length), [items.length]);

  return (
    <View>
      {items.map((item, i) => {
        const contenido = renderItem(item);
        // Una fila fija se mide igual que las demás —su alto cuenta para calcular el
        // destino— pero no lleva gesto encima.
        if (draggable && !draggable(item)) {
          return (
            <View key={keyOf(item)} onLayout={medir(i)}>
              {contenido}
            </View>
          );
        }
        return (
          <Fila
            key={keyOf(item)}
            index={i}
            activo={arrastrando === i}
            onMedir={medir(i)}
            onEmpezar={() => setArrastrando(i)}
            onHold={onHold ? () => onHold(item) : undefined}
            onSoltar={(dy) => {
              setArrastrando(null);
              const destino = destinoDe(i, dy);
              if (destino !== i) onReorder(i, destino);
            }}>
            {contenido}
          </Fila>
        );
      })}
    </View>
  );
}

function Fila({
  index,
  activo,
  children,
  onMedir,
  onEmpezar,
  onSoltar,
  onHold,
}: {
  index: number;
  activo: boolean;
  children: ReactNode;
  onMedir: (e: LayoutChangeEvent) => void;
  onEmpezar: () => void;
  onSoltar: (dy: number) => void;
  onHold?: () => void;
}) {
  const y = useSharedValue(0);
  const levantada = useSharedValue(0);

  const gesto = Gesture.Pan()
    .activateAfterLongPress(RETARDO_MS)
    // Sin esto, el gesto compite con el scroll de la pantalla y arrastrar se vuelve una
    // pelea: activarlo solo tras la pulsación larga deja el scroll intacto.
    .onStart(() => {
      levantada.value = withTiming(1, { duration: Motion.fast });
      // Un toque en la mano dice "ya la tienes": desde aquí, mover reordena y soltar quieta
      // abre los detalles.
      runOnJS(tap)();
      runOnJS(onEmpezar)();
    })
    .onUpdate((e) => {
      y.value = e.translationY;
    })
    .onEnd((e) => {
      // Solo cuenta como arrastre si de verdad se movió. Quieta, sin `onHold`, sigue siendo
      // un toque; con `onHold` es la pulsación larga, y el toque que llega pegado se ignora.
      const movida = Math.abs(e.translationY) > 4;
      if (movida || onHold) runOnJS(marcarArrastre)();
      runOnJS(onSoltar)(e.translationY);
      if (!movida && onHold) runOnJS(onHold)();
      y.value = withTiming(0, { duration: Motion.fast });
      levantada.value = withTiming(0, { duration: Motion.fast });
    });

  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: 1 + levantada.value * 0.02 }],
    opacity: 1 - levantada.value * 0.15,
    // La fila que se arrastra va encima de las demás mientras se mueve.
    zIndex: levantada.value > 0 ? 2 : 0,
  }));

  return (
    <GestureDetector gesture={gesto}>
      <Animated.View onLayout={onMedir} style={[estilo, activo ? styles.activa : null]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  activa: { elevation: 4 },
});
