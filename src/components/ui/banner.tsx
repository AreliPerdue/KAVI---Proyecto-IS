import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

import { IconSize, IconStroke, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BannerTone = 'error' | 'success' | 'info';

const TONE: Record<BannerTone, { color: ThemeColor; Icon: typeof Info }> = {
  error: { color: 'danger', Icon: CircleAlert },
  success: { color: 'success', Icon: CircleCheck },
  info: { color: 'textSecondary', Icon: Info },
};

/** Mensaje de estado en línea (error de formulario, confirmación, aviso). */
export function Banner({ tone = 'info', message }: { tone?: BannerTone; message: string }) {
  const theme = useTheme();
  const { color, Icon } = TONE[tone];
  return (
    <View
      accessibilityRole="alert"
      style={[styles.container, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
      <Icon size={IconSize.inline} strokeWidth={IconStroke} color={theme[color]} />
      <AppText variant="label" color={tone === 'info' ? 'textSecondary' : color} style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  text: { flex: 1 },
});
