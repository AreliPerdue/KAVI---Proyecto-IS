import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
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
  /**
   * La pantalla se presenta como modal/formSheet. En iOS la tarjeta ya arranca por
   * debajo de la barra de estado, pero `useSafeAreaInsets` sigue devolviendo el inset
   * de la ventana raíz: aplicarlo abriría una franja vacía sobre el título.
   */
  modal?: boolean;
  contentStyle?: ViewStyle;
};

/**
 * Contenedor de pantalla: fondo, safe area, ancho máximo y teclado.
 * El contenido se estira al ancho disponible y se centra solo cuando supera `maxWidth`
 * (nunca desborda en horizontal, NFR-9).
 */
export function Screen({ children, maxWidth = MaxContentWidth, scroll = false, centered = false, modal = false, contentStyle }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const paddingTop = (modal && Platform.OS === 'ios' ? 0 : insets.top) + Spacing.lg;

  const content = (
    <View
      style={[
        styles.content,
        /*
         * Sin scroll el contenido llena la pantalla; con scroll NO puede llevar
         * `flex: 1`, porque dentro de un ScrollView eso le quita altura propia: el
         * contenedor deja de poder medirlo y quien necesite ese alto —una hoja con
         * detents, por ejemplo— recibe un valor equivocado. `flexGrow` conserva el
         * alto natural y solo estira cuando sobra espacio, así el centrado sigue igual.
         */
        scroll ? styles.contentScroll : styles.contentFill,
        { maxWidth, paddingTop, paddingBottom: insets.bottom + Spacing.lg },
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
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, centered ? styles.centered : null]}
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}>
        {content}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  contentFill: { flex: 1 },
  contentScroll: { flexGrow: 1 },
  centered: { justifyContent: 'center' },
});
