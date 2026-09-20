import { useCallback } from 'react';
import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { AppText, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useAdminAccounts, useAdminStats, useIsAdmin } from '@/hooks/use-admin';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate, fromIso } from '@/lib/dates';
import type { AdminAccount, AdminStats } from '@/types/domain';

const MAX_WIDTH = 720;

const CARDS: { key: keyof AdminStats; label: string }[] = [
  { key: 'total_accounts', label: 'Cuentas registradas' },
  { key: 'accounts_7d', label: 'Altas (7 días)' },
  { key: 'accounts_30d', label: 'Altas (30 días)' },
  { key: 'active_users_30d', label: 'Activas (30 días)' },
  { key: 'total_activities', label: 'Actividades' },
  { key: 'activities_30d', label: 'Actividades (30 días)' },
  { key: 'accepted_connections', label: 'Contactos' },
  { key: 'shared_calendars', label: 'Calendarios compartidos' },
  { key: 'custom_themes', label: 'Temas propios' },
  { key: 'total_workouts', label: 'Entrenamientos' },
];

function StatCard({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <AppText variant="title" tabular>
        {value.toLocaleString('es-MX')}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

function AccountRow({ item }: { item: AdminAccount }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderColor: theme.border }]}>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {item.display_name ?? 'Sin nombre'}
          {item.role === 'adminkavi' ? ' · admin' : ''}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {item.email}
        </AppText>
      </View>
      <View style={styles.rowMeta}>
        <AppText variant="caption" color="textSecondary" tabular>
          {item.activity_count} act.
        </AppText>
        <AppText variant="caption" color="textTertiary" tabular>
          {formatShortDate(fromIso(item.created_at))}
        </AppText>
      </View>
    </View>
  );
}

/**
 * Panel de administración (spec 09): solo agregados, nunca contenido de nadie.
 * El listado va en la FlatList y las tarjetas en su cabecera — una sola lista
 * desplazable, en vez de una lista anidada dentro de un ScrollView.
 */
export default function AdminScreen() {
  const isAdmin = useIsAdmin();
  const stats = useAdminStats();
  const accounts = useAdminAccounts();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AdminAccount>) => <AccountRow item={item} />,
    [],
  );

  if (!isAdmin) {
    return (
      <Screen modal maxWidth={MAX_WIDTH}>
        <ModalHeader title="Administración" />
        <EmptyState title="Esta sección no está disponible" description="Tu cuenta no administra KAVI." />
      </Screen>
    );
  }

  const header = (
    <View style={styles.header}>
      {stats.isPending ? <LoadingState label="Cargando estadísticas…" /> : null}
      {stats.isError ? <ErrorState message={stats.error.message} onRetry={() => stats.refetch()} /> : null}
      {stats.data ? (
        <View style={styles.grid}>
          {CARDS.map((c) => (
            <StatCard key={c.key} label={c.label} value={stats.data[c.key]} />
          ))}
        </View>
      ) : null}
      <View style={styles.section}>
        <AppText variant="heading">Cuentas</AppText>
        <AppText variant="caption" color="textSecondary">
          Quién está registrado. No incluye el contenido de sus calendarios.
        </AppText>
      </View>
      {accounts.isPending ? <LoadingState label="Cargando cuentas…" /> : null}
      {accounts.isError ? (
        <ErrorState message={accounts.error.message} onRetry={() => accounts.refetch()} />
      ) : null}
    </View>
  );

  return (
    <Screen modal maxWidth={MAX_WIDTH}>
      <ModalHeader title="Administración" />
      <FlatList
        data={accounts.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          accounts.isSuccess ? (
            <EmptyState title="Todavía no hay cuentas" description="Cuando alguien se registre, aparecerá aquí." />
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  card: {
    flexGrow: 1,
    flexBasis: 150,
    gap: Spacing.xs,
    padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  section: { gap: Spacing.xs, marginTop: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  rowText: { flex: 1, gap: 2 },
  rowMeta: { alignItems: 'flex-end', gap: 2 },
});
