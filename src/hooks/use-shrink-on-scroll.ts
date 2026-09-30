import { useCallback, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** Desplazamiento mínimo para reaccionar, para no responder al temblor del dedo. */
const UMBRAL = 6;
/** Por encima del inicio no tiene sentido encoger: no estorba nada todavía. */
const ZONA_SUPERIOR = 24;

/**
 * Encoge el FAB mientras se baja y lo devuelve al subir o al volver al inicio.
 *
 * Existe porque en la agenda el botón tapa el horario de las filas que quedan debajo, y
 * ahí la hora es información, no adorno. Se elige "bajar / subir" en vez de "hay scroll"
 * porque en una lista larga uno está casi siempre desplazado: con la segunda regla el
 * botón viviría encogido y el gesto dejaría de significar algo.
 */
export function useShrinkOnScroll() {
  const [shrunk, setShrunk] = useState(false);
  const ultimo = useRef(0);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const delta = y - ultimo.current;
    if (Math.abs(delta) < UMBRAL) return;
    ultimo.current = y;
    setShrunk(y > ZONA_SUPERIOR && delta > 0);
  }, []);

  return { shrunk, onScroll };
}
