import { useRouter } from 'expo-router';
import { ChevronRight, Plus, RotateCcw } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { AppText, Button, EmptyState, ErrorState, LoadingState, Screen, ThemeIcon } from '@/components/ui';
import { DIMENSION_BY_KEY } from '@/constants/dimensions';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMutations, useThemes } from '@/hooks/use-themes';
import { useConfirm, useSnackbar } from '@/providers';
import type { Theme } from '@/types/domain';

const MAX_WIDTH = 640;

/** Mis temas: crear y editar los propios, y personalizar los del sistema (RF-T2, RF-T3). */
export default function ThemesScreen() {
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
      accessibilityLabel={`${item.name}, ${DIMENSION_BY_KEY[item.dimension].label}`}
      onPress={() => router.push({ pathname: '/(app)/theme/new', params: { id: item.id } })}
      style={({ pressed }) => [styles.row, { borderColor: theme.border }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
      <View style={[styles.swatch, { backgroundColor: item.color }]}>
        <ThemeIcon name={item.icon} color="#FFFFFF" size={IconSize.inline} />
      </View>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong">{item.name}</AppText>
        <AppText variant="caption" color="textSecondary">
          {DIMENSION_BY_KEY[item.dimension].label}
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
      title: 'Restablecer los temas del sistema',
      message: 'Volverán a su nombre, color e icono originales. Tus temas propios no se tocan, y las actividades que ya creaste conservan su estilo.',
      confirmLabel: 'Restablecer',
      destructive: true,
    });
    if (!ok) return;
    resetSystem.mutate(undefined, { onSuccess: () => showSnackbar({ message: 'Temas del sistema restablecidos.' }) });
  };

  return (
    <Screen modal scroll maxWidth={MAX_WIDTH}>
      <ModalHeader title="Mis temas" />
      <Button
        title="Nuevo tema"
        icon={<Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.onInk} />}
        onPress={() => router.push('/(app)/theme/new')}
      />
      {themes.isPending ? <LoadingState label="Cargando temas…" /> : null}
      {themes.isError ? <ErrorState message={themes.error.message} onRetry={() => themes.refetch()} /> : null}
      {themes.isSuccess && own.length === 0 ? (
        <EmptyState title="Aún no tienes temas propios" description="Crea uno con nombre, dimensión, color e icono para clasificar a tu manera." />
      ) : null}
      {own.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="label" color="textSecondary">
            Propios
          </AppText>
          {own.map((t) => (
            <Row key={t.id} item={t} />
          ))}
        </View>
      ) : null}
      {system.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="label" color="textSecondary">
            Del sistema
          </AppText>
          <AppText variant="caption" color="textTertiary">
            Puedes cambiarles el nombre, el color y el icono. Los cambios son solo tuyos: nadie más los ve.
          </AppText>
          {system.map((t) => (
            <Row key={t.id} item={t} />
          ))}
          <Button
            title="Restablecer temas del sistema"
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
