import { Plus } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSize, IconStroke, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Botón flotante "+" siempre visible (RF-C5), sobre safe area y tab bar. */
export function Fab({ onPress, label = 'Nueva actividad' }: { onPress: () => void; label?: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === 'web' ? Spacing.xl : insets.bottom + Spacing.lg;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: theme.ink, bottom, boxShadow: Shadow.floating },
        pressed ? styles.pressed : null,
      ]}>
      <Plus size={IconSize.action} strokeWidth={IconStroke} color={theme.onInk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
});
