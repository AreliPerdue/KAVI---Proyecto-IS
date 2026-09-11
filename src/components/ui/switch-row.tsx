import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useDerivedValue, useReducedMotion, withTiming } from 'react-native-reanimated';

import { AppText } from './app-text';

import { MinTouchTarget, Motion, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const THUMB_SIZE = 26;
const THUMB_PADDING = (TRACK_HEIGHT - THUMB_SIZE) / 2;
const TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_PADDING * 2;
const HIT_SLOP = (MinTouchTarget - TRACK_HEIGHT) / 2;

/**
 * Interruptor propio en lugar del `Switch` de React Native: en iOS el control nativo
 * ignora `thumbColor` y el color del riel apagado, así que con la paleta monocroma el
 * pulgar blanco del sistema desaparecía sobre el riel encendido (casi blanco) y el
 * estado dejaba de leerse. Aquí ambos estados salen de los tokens y contrastan siempre.
 */
export function Toggle({
  value,
  onValueChange,
  label,
  disabled = false,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const progress = useDerivedValue(
    () => (reducedMotion ? (value ? 1 : 0) : withTiming(value ? 1 : 0, { duration: Motion.base })),
    [value, reducedMotion],
  );

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [theme.surfaceAlt, theme.ink]),
    borderColor: interpolateColor(progress.value, [0, 1], [theme.border, theme.ink]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
    backgroundColor: interpolateColor(progress.value, [0, 1], [theme.textTertiary, theme.onInk]),
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [pressed ? styles.pressed : null, disabled ? styles.disabled : null]}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

/** Fila etiqueta + interruptor. */
export function SwitchRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText>{label}</AppText>
        {hint ? (
          <AppText variant="caption" color="textTertiary">
            {hint}
          </AppText>
        ) : null}
      </View>
      <Toggle label={label} value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, minHeight: 44 },
  text: { flex: 1, gap: 2 },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: Radius.full,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: THUMB_PADDING,
    justifyContent: 'center',
  },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: Radius.full, borderCurve: 'continuous' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});
