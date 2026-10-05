import { useRouter } from 'expo-router';
import { ChevronRight, Plus, RotateCcw } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { AppText, Button, EmptyState, ErrorState, LoadingState, Screen, ThemeIcon } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMutations, useThemes } from '@/hooks/use-themes';
import { useConfirm, useSnackbar } from '@/providers';
import type { Theme } from '@/types/domain';
import { useLanguage, useT } from '@/i18n';
import { dimensionName, themeName } from '@/lib/theme-name';

const MAX_WIDTH = 640;

/** Mis temas: crear y editar los propios, y personalizar los del sistema (RF-T2, RF-T3). */
export default function ThemesScreen() {
  const tx = useT();
  const lang = useLanguage();
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const themes = useThemes();
  const { resetSystem } = useThemeMutations();
  const own = (themes.data ?? []).filter((t) => !t.is_system);
  const system = (themes.data ?? []).filter((t) => t.is_system);

  const Row = ({ item }: { item: Theme }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${themeName(item, lang)}, ${dimensionName(item.dimension, lang)}`}
      onPress={() => router.push({ pathname: '/(app)/theme/new', params: { id: item.id } })}
      style={({ pressed }) => [styles.row, { borderColor: theme.border }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
      <View style={[styles.swatch, { backgroundColor: item.color }]}>
        <ThemeIcon name={item.icon} color="#FFFFFF" size={IconSize.inline} />
      </View>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong">{themeName(item, lang)}</AppText>
        <AppText variant="caption" color="textSecondary">
          {dimensionName(item.dimension, lang)}
        </AppText>
      </View>
      <ChevronRight size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
    </Pressable>
  );

  /**
   * Solo deshace las personalizaciones de los temas del sistema. Se dice explícitamente
   * que los propios no se tocan, porque es justo lo que da miedo al pulsar «restablecer».
   */
  const onReset = async () => {
    const ok = await confirm({
      title: tx.themes.manage.resetTitle,
      message: tx.themes.manage.resetMessage,
      confirmLabel: tx.themes.manage.resetConfirm,
      destructive: true,
    });
    if (!ok) return;
    resetSystem.mutate(undefined, { onSuccess: () => showSnackbar({ message: tx.themes.manage.resetDone }) });
  };

  return (
    <Screen modal scroll maxWidth={MAX_WIDTH}>
      <ModalHeader title={tx.themes.manage.title} />
      <Button
        title={tx.themes.manage.newTheme}
        icon={<Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.onInk} />}
        onPress={() => router.push('/(app)/theme/new')}
      />
      {themes.isPending ? <LoadingState label={tx.themes.manage.loading} /> : null}
      {themes.isError ? <ErrorState message={themes.error.message} onRetry={() => themes.refetch()} /> : null}
      {themes.isSuccess && own.length === 0 ? (
        <EmptyState title={tx.themes.manage.emptyTitle} description={tx.themes.manage.emptyDescription} />
      ) : null}
      {own.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="label" color="textSecondary">
            {tx.themes.manage.own}
          </AppText>
          {own.map((t) => (
            <Row key={t.id} item={t} />
          ))}
        </View>
      ) : null}
      {system.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="label" color="textSecondary">
            {tx.themes.manage.system}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            {tx.themes.manage.systemHint}
          </AppText>
          {system.map((t) => (
            <Row key={t.id} item={t} />
          ))}
          <Button
            title={tx.themes.manage.resetSystem}
            variant="secondary"
            icon={<RotateCcw size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
            onPress={onReset}
            loading={resetSystem.isPending}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 60,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  swatch: { width: 36, height: 36, borderRadius: Radius.sm, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
});
