import { useRouter } from 'expo-router';
import { ChevronRight, Lock, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { AppText, Button, EmptyState, ErrorState, LoadingState, Screen, ThemeIcon } from '@/components/ui';
import { DIMENSION_BY_KEY } from '@/constants/dimensions';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemes } from '@/hooks/use-themes';
import type { Theme } from '@/types/domain';

const MAX_WIDTH = 640;

/** Mis temas: crear/editar temas propios; los del sistema son de solo lectura (RF-T2, RF-T3). */
export default function ThemesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const themes = useThemes();
  const own = (themes.data ?? []).filter((t) => !t.is_system);
  const system = (themes.data ?? []).filter((t) => t.is_system);

  const Row = ({ item, editable }: { item: Theme; editable: boolean }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${DIMENSION_BY_KEY[item.dimension].label}${editable ? '' : ', tema del sistema'}`}
      disabled={!editable}
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
      {editable ? (
        <ChevronRight size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
      ) : (
        <Lock size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
      )}
    </Pressable>
  );

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
            <Row key={t.id} item={t} editable />
          ))}
        </View>
      ) : null}
      {system.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="label" color="textSecondary">
            Del sistema (no editables)
          </AppText>
          {system.map((t) => (
            <Row key={t.id} item={t} editable={false} />
          ))}
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
