import { Eye, EyeOff } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, type TextInputProps, type TextStyle, View } from 'react-native';

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
      <AppText variant="label" color="textSecondary" numberOfLines={1}>
        {label}
      </AppText>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.surface, borderColor },
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
          style={[styles.input, webInputReset, { color: theme.text, fontFamily: Fonts?.sans }, style]}
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

// En web el anillo de foco lo dibuja el contenedor (borde ink), no el outline del navegador.
// justificación: react-native-web acepta outlineStyle 'none' aunque el tipo de RN no lo declare.
const webInputReset = Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle) : null;

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
    /*
     * Android recorta acentos y descendentes (a, e, g, p, y) cuando el
     * TextInput lleva `lineHeight`, y ese recorte es justo lo que hace que el
     * texto parezca salirse de la caja. En iOS y web si se respeta el 16/24 de
     * la escala (kavi-design §2); el alto de la fila lo fija `minHeight`.
     */
    ...Platform.select({ android: {}, default: { lineHeight: 24 } }),
    /* Centrado vertical en Android; los multilinea lo sobreescriben con 'top'. */
    textAlignVertical: 'center',
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
