import { useRouter } from 'expo-router';
import { Bell, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText, IconButton } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUpcomingReminders } from '@/hooks/use-reminders';
import { formatTime, fromIso } from '@/lib/dates';

/** Fallback web (NFR-10): reminders cuya hora ya pasó y cuya actividad aún no empieza. */
export function DueRemindersBanner() {
  const theme = useTheme();
  const router = useRouter();
  const upcoming = useUpcomingReminders();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const due = useMemo(() => {
    const now = Date.now();
    return (upcoming.data ?? []).filter((r) => fromIso(r.fireAt).getTime() <= now && !dismissed.has(r.reminderId));
  }, [upcoming.data, dismissed]);

  if (Platform.OS !== 'web' || due.length === 0) return null;

  return (
    <View style={styles.stack} accessibilityLiveRegion="polite">
      {due.slice(0, 3).map((r) => (
        <View key={r.reminderId} style={[styles.banner, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Bell size={IconSize.inline} strokeWidth={IconStroke} color={theme.today} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${r.title}`}
            onPress={() => router.push({ pathname: '/(app)/activity/[id]', params: { id: r.activityId } })}
            style={styles.text}>
            <AppText variant="label">{r.title}</AppText>
            <AppText variant="caption" color="textSecondary">
              Empieza a las {formatTime(fromIso(r.activityStartAt))}
            </AppText>
          </Pressable>
          <IconButton label="Descartar recordatorio" onPress={() => setDismissed((prev) => new Set(prev).add(r.reminderId))}>
            <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
          </IconButton>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.xs },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  text: { flex: 1, gap: 2 },
});
