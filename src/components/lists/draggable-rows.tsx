import { type ReactNode, useCallback, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Motion } from '@/constants/theme';

/** Cuánto hay que mantener presionado antes de que la fila se despegue. */
const RETARDO_MS = 200;

export type DraggableRowsProps<T> = {
  items: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Se llama al soltar, con la posición de origen y la de destino. */
  onReorder: (from: number, to: number) => void;
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
export function DraggableRows<T>({ items, keyOf, renderItem, onReorder }: DraggableRowsProps<T>) {
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
  const destinoDe = useCallback((desde: number, dy: number): number => {
    let i = desde;
    let restante = dy;
    while (restante > 0 && i < items.length - 1) {
      const alto = alturas.current[i + 1] ?? 0;
      if (restante < alto / 2) break;
      restante -= alto;
      i += 1;
    }
    while (restante < 0 && i > 0) {
      const alto = alturas.current[i - 1] ?? 0;
      if (-restante < alto / 2) break;
      restante += alto;
      i -= 1;
    }
    return i;
  }, [items.length]);

  return (
    <View>
      {items.map((item, i) => (
        <Fila
          key={keyOf(item)}
          index={i}
          activo={arrastrando === i}
          onMedir={medir(i)}
          onEmpezar={() => setArrastrando(i)}
          onSoltar={(dy) => {
            setArrastrando(null);
            const destino = destinoDe(i, dy);
            if (destino !== i) onReorder(i, destino);
          }}>
          {renderItem(item)}
        </Fila>
      ))}
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
}: {
  index: number;
  activo: boolean;
  children: ReactNode;
  onMedir: (e: LayoutChangeEvent) => void;
  onEmpezar: () => void;
  onSoltar: (dy: number) => void;
}) {
  const y = useSharedValue(0);
  const levantada = useSharedValue(0);

  const gesto = Gesture.Pan()
    .activateAfterLongPress(RETARDO_MS)
    // Sin esto, el gesto compite con el scroll de la pantalla y arrastrar se vuelve una
    // pelea: activarlo solo tras la pulsación larga deja el scroll intacto.
    .onStart(() => {
      levantada.value = withTiming(1, { duration: Motion.fast });
      runOnJS(onEmpezar)();
    })
    .onUpdate((e) => {
      y.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(onSoltar)(e.translationY);
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
