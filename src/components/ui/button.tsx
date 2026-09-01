import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from './app-text';

import { MinTouchTarget, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const VARIANT_COLORS: Record<ButtonVariant, { bg: ThemeColor | null; fg: ThemeColor }> = {
  primary: { bg: 'ink', fg: 'onInk' },
  secondary: { bg: 'surfaceAlt', fg: 'text' },
  ghost: { bg: null, fg: 'text' },
  danger: { bg: null, fg: 'danger' },
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  icon,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const { bg, fg } = VARIANT_COLORS[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        bg ? { backgroundColor: theme[bg] } : null,
        variant === 'danger' ? { borderWidth: 1, borderColor: theme.border } : null,
        pressed ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={theme[fg]} />
      ) : (
        <>
          {icon}
          <AppText variant="bodyStrong" color={fg}>
            {title}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MinTouchTarget,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
