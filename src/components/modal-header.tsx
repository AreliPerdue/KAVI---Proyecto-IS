import { X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, IconButton } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Encabezado de pantallas modales: cerrar + título + acción opcional. */
export function ModalHeader({ title, right, onClose }: { title: string; right?: ReactNode; onClose?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const close = onClose ?? (() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/calendar')));
  return (
    <View style={styles.row}>
      <IconButton label="Cerrar" onPress={close}>
        <X size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
      </IconButton>
      <AppText variant="heading" accessibilityRole="header" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { flex: 1, textAlign: 'center' },
  right: { minWidth: 44, alignItems: 'flex-end' },
});
