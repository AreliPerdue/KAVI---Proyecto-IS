import { Platform, Vibration } from 'react-native';

/**
 * Háptico sin dependencias (spec 07 v2, RF-F37).
 *
 * Solo Android: ahí `Vibration` da un toque corto y nítido. En iOS la misma llamada es un
 * zumbido de medio segundo que molesta más de lo que informa, y en web no existe. Para un
 * háptico real en iOS haría falta `expo-haptics`, que se decidió no agregar (decisión D5).
 */
export function tap(): void {
  if (Platform.OS === 'android') Vibration.vibrate(12);
}

/** Algo que celebrar: un PR. */
export function success(): void {
  if (Platform.OS === 'android') Vibration.vibrate([0, 30, 60, 30]);
}
