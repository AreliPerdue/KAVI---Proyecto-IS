import { ChevronLeft, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, IconButton } from '@/components/ui';
import { IconSize, IconStroke, MinTouchTarget, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * El botón de icono mide 44/48 con el glifo centrado, así que su caja sobresale del
 * glifo por este margen. Tirando de la fila hacia fuera, el glifo cae sobre el borde
 * de contenido de la pantalla y el título deja de verse desplazado hacia dentro.
 */
const OPTICAL_INSET = (MinTouchTarget - IconSize.action) / 2;

/**
 * Encabezado de pantallas modales: cerrar + título + acción opcional.
 *
 * Con `back` cambia la X por una flecha y dice "Atrás": en una pantalla **apilada** —no
 * modal— cerrar con X sugiere descartar algo, y sin ningún control propio la única salida
 * en web es el botón del navegador, que en la app instalada ni siquiera existe.
 */
export function ModalHeader({
  title,
  right,
  onClose,
  back = false,
}: {
  title: string;
  right?: ReactNode;
  onClose?: () => void;
  back?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const close = onClose ?? (() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/calendar')));
  return (
    <View style={styles.row}>
      <IconButton label={back ? 'Atrás' : 'Cerrar'} onPress={close}>
        {back ? (
          <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        ) : (
          <X size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        )}
      </IconButton>
      <AppText variant="heading" accessibilityRole="header" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: -OPTICAL_INSET },
  title: { flex: 1, textAlign: 'center' },
  right: { minWidth: MinTouchTarget, alignItems: 'flex-end' },
});
