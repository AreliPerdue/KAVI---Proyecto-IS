import { Eye, EyeOff } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { AppText } from './app-text';

import { Fonts, IconSize, IconStroke, MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  /** Campo de contraseña con botón mostrar/ocultar. */
  secure?: boolean;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, secure = false, style, onFocus, onBlur, editable = true, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);

  const borderColor = error ? theme.danger : focused ? theme.ink : theme.border;
  const message = error ?? hint;

  return (
    <View style={styles.container}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.surface, borderColor },
          focused ? styles.inputRowFocused : null,
          !editable ? styles.inputRowDisabled : null,
        ]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={theme.textTertiary}
          secureTextEntry={hidden}
          editable={editable}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: theme.text, fontFamily: Fonts?.sans }, style]}
          {...rest}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
            hitSlop={8}
            onPress={() => setHidden((v) => !v)}
            style={({ pressed }) => [styles.eye, pressed ? styles.pressed : null]}>
            {hidden ? (
              <Eye size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
            ) : (
              <EyeOff size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
            )}
          </Pressable>
        ) : null}
      </View>
      {message ? (
        <AppText
          variant="caption"
          color={error ? 'danger' : 'textTertiary'}
          accessibilityLiveRegion={error ? 'polite' : 'none'}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MinTouchTarget,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingLeft: Spacing.md,
  },
  inputRowFocused: { borderWidth: 2, paddingLeft: Spacing.md - 1 },
  inputRowDisabled: { opacity: 0.6 },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
  },
  eye: {
    width: MinTouchTarget,
    minHeight: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
