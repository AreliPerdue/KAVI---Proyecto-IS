import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ScreenProps = {
  children: ReactNode;
  /** Ancho máximo del contenido en pantallas anchas (web/tablet). */
  maxWidth?: number;
  /** Desplazable con teclado (formularios). */
  scroll?: boolean;
  /** Centra verticalmente el contenido (pantallas de auth). */
  centered?: boolean;
  contentStyle?: ViewStyle;
};

/** Contenedor de pantalla: fondo, safe area, ancho máximo y teclado. */
export function Screen({
  children,
  maxWidth = MaxContentWidth,
  scroll = false,
  centered = false,
  contentStyle,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const content = (
    <View
      style={[
        styles.content,
        { maxWidth, paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg },
        centered ? styles.centered : null,
        contentStyle,
      ]}>
      {children}
    </View>
  );

  if (!scroll) {
    return <View style={[styles.root, { backgroundColor: theme.background }]}>{content}</View>;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, centered ? styles.centered : null]}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic">
        {content}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  scroll: { flexGrow: 1, alignItems: 'center' },
  content: {
    flex: 1,
    width: '100%',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  centered: { justifyContent: 'center' },
});
