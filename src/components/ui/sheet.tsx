import { X } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './app-text';
import { IconButton } from './icon-button';

import { IconSize, IconStroke, MinTouchTarget, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Compensa la caja del botón de icono para que el glifo caiga en el borde del panel. */
const OPTICAL_INSET = (MinTouchTarget - IconSize.action) / 2;

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Altura máxima relativa a la ventana (0–1). */
  maxHeightRatio?: number;
};

/**
 * Alto del teclado en pantalla. Dentro de un `Modal` el ajuste automático de la ventana
 * no llega, así que sin esto el teclado tapaba por completo las hojas con formulario.
 */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/** Hoja inferior (móvil) / diálogo centrado (web ancho) con scrim y cierre accesible. */
export function Sheet({ visible, onClose, title, children, maxHeightRatio = 0.85 }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const centered = Platform.OS === 'web' && width >= 768;
  const keyboard = useKeyboardHeight();
  const available = height - keyboard;

  return (
    <Modal visible={visible} transparent animationType={centered ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[styles.root, centered ? styles.rootCentered : null]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} />
        <View
          style={[
            styles.panel,
            centered ? styles.panelCentered : styles.panelBottom,
            {
              backgroundColor: theme.surface,
              maxHeight: available * maxHeightRatio,
              // Con el teclado abierto la hoja sube por encima de él y el inset ya no aplica.
              marginBottom: centered ? 0 : keyboard,
              paddingBottom: centered || keyboard > 0 ? Spacing.lg : insets.bottom + Spacing.lg,
              boxShadow: Shadow.floating,
            },
          ]}>
          {!centered ? <View style={[styles.grabber, { backgroundColor: theme.border }]} /> : null}
          {title ? (
            <View style={styles.header}>
              <AppText variant="heading" accessibilityRole="header" style={styles.title}>
                {title}
              </AppText>
              <IconButton label="Cerrar" onPress={onClose}>
                <X size={IconSize.action} strokeWidth={IconStroke} color={theme.textSecondary} />
              </IconButton>
            </View>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  rootCentered: { justifyContent: 'center', alignItems: 'center' },
  panel: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  panelBottom: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, borderCurve: 'continuous', paddingTop: Spacing.sm },
  panelCentered: { width: 480, maxWidth: '92%', borderRadius: Radius.xl, borderCurve: 'continuous', paddingTop: Spacing.lg },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: Spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: -OPTICAL_INSET },
  title: { flex: 1 },
  content: { gap: Spacing.md, paddingBottom: Spacing.sm },
});
