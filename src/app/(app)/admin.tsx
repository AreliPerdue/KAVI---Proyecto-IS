import { useCallback } from 'react';
import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { AppText, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useAdminAccounts, useAdminStats, useIsAdmin } from '@/hooks/use-admin';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate, fromIso } from '@/lib/dates';
import type { AdminAccount, AdminStats } from '@/types/domain';
import { useLanguage, useT } from '@/i18n';

const MAX_WIDTH = 720;

const CARDS: readonly (keyof AdminStats)[] = [
  'total_accounts',
  'accounts_7d',
  'accounts_30d',
  'active_users_30d',
  'total_activities',
  'activities_30d',
  'accepted_connections',
  'shared_calendars',
  'custom_themes',
  'total_workouts',
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
  const tx = useT();
  const lang = useLanguage();
  return (
    <View style={[styles.row, { borderColor: theme.border }]}>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {item.display_name ?? tx.profile.noName}
          {item.role === 'adminkavi' ? ' · admin' : ''}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {item.email}
        </AppText>
      </View>
      <View style={styles.rowMeta}>
        <AppText variant="caption" color="textSecondary" tabular>
          {tx.profile.adminPanel.activitiesShort(item.activity_count)}
        </AppText>
        <AppText variant="caption" color="textTertiary" tabular>
          {formatShortDate(fromIso(item.created_at), lang)}
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
  const tx = useT();
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
        <ModalHeader title={tx.profile.adminPanel.title} />
        <EmptyState title={tx.profile.adminPanel.unavailableTitle} description={tx.profile.adminPanel.unavailableDescription} />
      </Screen>
    );
  }

  const header = (
    <View style={styles.header}>
      {stats.isPending ? <LoadingState label={tx.profile.adminPanel.loadingStats} /> : null}
      {stats.isError ? <ErrorState message={stats.error.message} onRetry={() => stats.refetch()} /> : null}
      {stats.data ? (
        <View style={styles.grid}>
          {CARDS.map((c) => (
            <StatCard key={c} label={tx.profile.adminPanel.cards[c] ?? c} value={stats.data[c]} />
          ))}
        </View>
      ) : null}
      <View style={styles.section}>
        <AppText variant="heading">{tx.profile.adminPanel.accounts}</AppText>
        <AppText variant="caption" color="textSecondary">
          {tx.profile.adminPanel.accountsHint}
        </AppText>
      </View>
      {accounts.isPending ? <LoadingState label={tx.profile.adminPanel.loadingAccounts} /> : null}
      {accounts.isError ? (
        <ErrorState message={accounts.error.message} onRetry={() => accounts.refetch()} />
      ) : null}
    </View>
  );

  return (
    <Screen modal maxWidth={MAX_WIDTH}>
      <ModalHeader title={tx.profile.adminPanel.title} />
      <FlatList
        data={accounts.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          accounts.isSuccess ? (
            <EmptyState title={tx.profile.adminPanel.noAccountsTitle} description={tx.profile.adminPanel.noAccountsDescription} />
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
