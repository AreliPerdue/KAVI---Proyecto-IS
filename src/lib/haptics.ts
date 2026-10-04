import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Háptico del gym (spec 07 v2, RF-F37). `expo-haptics` en iOS y Android; en web no hay
 * motor de vibración que valga la pena, así que no hace nada. Nunca falla: si el
 * dispositivo no tiene háptico, la promesa rechazada se ignora.
 */
export function tap(): void {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/** Algo que celebrar: un PR, el fin del descanso. */
export function success(): void {
  if (Platform.OS === 'web') return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
