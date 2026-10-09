import { type ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  const [arrastrando, setArrastrando] = useState<string | null>(null);

  const medir = useCallback((i: number) => (e: LayoutChangeEvent) => {
    alturas.current[i] = e.nativeEvent.layout.height;
  }, []);

  /*
   * Lo que cambia en cada render —los elementos, qué hacer al soltar— se lee de una
   * referencia, y a las filas les llegan funciones **estables** que las identifican por su
   * clave y no por su posición (T271). Así el gesto nativo de cada fila se crea una sola vez:
   * antes, agregar un elemento lo reconfiguraba en todas, y con treinta renglones se trababa.
   */
  const actual = useRef({ items, keyOf, onReorder, onHold });
  useLayoutEffect(() => {
    actual.current = { items, keyOf, onReorder, onHold };
  });
  const indiceDe = useCallback((clave: string) => actual.current.items.findIndex((it) => actual.current.keyOf(it) === clave), []);

  const alEmpezar = useCallback((clave: string) => setArrastrando(clave), []);
  /**
   * A cuántos lugares equivale un desplazamiento vertical.
   *
   * Se avanza fila por fila sumando alturas reales hasta cubrir la distancia recorrida, y
   * se salta a la siguiente cuando se pasa de su mitad: es el punto en que el hueco ya se
   * ve del otro lado y soltar ahí es lo que la persona espera.
   */
  const alSoltar = useCallback(
    (clave: string, dy: number) => {
      setArrastrando(null);
      const i = indiceDe(clave);
      if (i < 0) return;
      const destino = destinoEnFilas(alturas.current, i, dy, actual.current.items.length);
      if (destino !== i) actual.current.onReorder(i, destino);
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
    <View>
      {items.map((item, i) => {
        const contenido = renderItem(item);
        const clave = keyOf(item);
        // Una fila fija se mide igual que las demás —su alto cuenta para calcular el
        // destino— pero no lleva gesto encima.
        if (draggable && !draggable(item)) {
          return (
            <View key={clave} onLayout={medir(i)}>
              {contenido}
            </View>
          );
        }
        return (
          <Fila
            key={clave}
            clave={clave}
            activo={arrastrando === clave}
            onMedir={medir(i)}
            conHold={!!onHold}
            alEmpezar={alEmpezar}
            alSoltar={alSoltar}
            alSostener={alSostener}>
            {contenido}
          </Fila>
        );
      })}
    </View>
  );
}

function Fila({
  clave,
  activo,
  children,
  onMedir,
  conHold,
  alEmpezar,
  alSoltar,
  alSostener,
}: {
  clave: string;
  activo: boolean;
  children: ReactNode;
  onMedir: (e: LayoutChangeEvent) => void;
  conHold: boolean;
  alEmpezar: (clave: string) => void;
  alSoltar: (clave: string, dy: number) => void;
  alSostener: (clave: string) => void;
}) {
  const y = useSharedValue(0);
  const levantada = useSharedValue(0);

  // Solo cambia si cambia la clave o si la lista empieza a ofrecer la pulsación larga.
  const gesto = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(RETARDO_MS)
        // Sin esto, el gesto compite con el scroll de la pantalla y arrastrar se vuelve una
        // pelea: activarlo solo tras la pulsación larga deja el scroll intacto.
        .onStart(() => {
          levantada.set(withTiming(1, { duration: Motion.fast }));
          // Un toque en la mano dice "ya la tienes": desde aquí, mover reordena y soltar
          // quieta abre los detalles.
          runOnJS(tap)();
          runOnJS(alEmpezar)(clave);
        })
        .onUpdate((e) => {
          y.set(e.translationY);
        })
        .onEnd((e) => {
          // Solo cuenta como arrastre si de verdad se movió. Quieta, sin pulsación larga,
          // sigue siendo un toque; con ella, el toque que llega pegado se ignora.
          const movida = Math.abs(e.translationY) > 4;
          if (movida || conHold) runOnJS(marcarArrastre)();
          runOnJS(alSoltar)(clave, e.translationY);
          if (!movida && conHold) runOnJS(alSostener)(clave);
          y.set(withTiming(0, { duration: Motion.fast }));
          levantada.set(withTiming(0, { duration: Motion.fast }));
        }),
    [clave, conHold, alEmpezar, alSoltar, alSostener, y, levantada],
  );

  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateY: y.get() }, { scale: 1 + levantada.get() * 0.02 }],
    opacity: 1 - levantada.get() * 0.15,
    // La fila que se arrastra va encima de las demás mientras se mueve.
    zIndex: levantada.get() > 0 ? 2 : 0,
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
