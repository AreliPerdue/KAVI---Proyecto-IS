import { CircleAlert } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from './app-text';
import { Button } from './button';

import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator color={theme.textSecondary} />
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.center}>
      {icon}
      <AppText variant="heading" style={styles.centerText}>
        {title}
      </AppText>
      {description ? (
        <AppText color="textSecondary" style={styles.centerText}>
          {description}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.center} accessibilityRole="alert">
      <CircleAlert size={IconSize.action} strokeWidth={IconStroke} color={theme.danger} />
      <AppText style={styles.centerText}>{message}</AppText>
      {onRetry ? <Button title="Reintentar" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

/** Bloque gris con la forma del contenido que se está cargando. */
export function Skeleton({ style }: { style?: ViewStyle }) {
  const theme = useTheme();
  return <View style={[styles.skeleton, { backgroundColor: theme.surfaceAlt }, style]} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  centerText: { textAlign: 'center' },
  skeleton: { borderRadius: Radius.sm, borderCurve: 'continuous', height: 16 },
});
