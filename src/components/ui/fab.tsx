import { Plus } from 'lucide-react-native';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSize, IconStroke, MinTouchTarget, Motion, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SIZE = 56;

/**
 * Encogido mide exactamente el mínimo táctil, no menos.
 *
 * Es el punto del intercambio: encoge lo suficiente para dejar ver lo que tapaba —en la
 * agenda, el horario de las filas de abajo— sin bajar del objetivo de 44/48 px que fija
 * `kavi-design` §2. Un botón más chico se vería mejor y se tocaría peor.
 */
const SHRUNK_SCALE = MinTouchTarget / SIZE;

/** Botón flotante "+" siempre visible (RF-C5), sobre safe area y tab bar. */
export function Fab({
  onPress,
  label = 'Nueva actividad',
  shrunk = false,
}: {
  onPress: () => void;
  label?: string;
  /** Encoge mientras se baja por una lista, para destapar lo que hay debajo. */
  shrunk?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === 'web' ? Spacing.xl : insets.bottom + Spacing.lg;

  const escala = useSharedValue(1);
  // Con movimiento reducido el botón cambia de tamaño sin transición: el estado sigue
  // siendo visible, que es lo que importa, y nadie recibe una animación que no quiere.
  const sinMovimiento = useReducedMotion();

  useEffect(() => {
    const destino = shrunk ? SHRUNK_SCALE : 1;
    escala.value = sinMovimiento ? destino : withTiming(destino, { duration: Motion.base });
  }, [shrunk, sinMovimiento, escala]);

  const animado = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));

  return (
    <Animated.View style={[styles.capa, { bottom }, animado]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.ink, boxShadow: Shadow.floating },
          pressed ? styles.pressed : null,
        ]}>
        <Plus size={IconSize.action} strokeWidth={IconStroke} color={theme.onInk} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  capa: { position: 'absolute', right: Spacing.xl },
  fab: {
    width: SIZE,
    height: SIZE,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
});
