import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { applyFilters, CalendarHeader, DayView, FilterSheet, MonthView, WeekView } from '@/components/calendar';
import { EmptyState, ErrorState, Fab, Screen, Skeleton } from '@/components/ui';
import { IconStroke, Spacing } from '@/constants/theme';
import { useActivitiesRange, usePrefetchAdjacentRanges } from '@/hooks/use-activities-range';
import { useTheme } from '@/hooks/use-theme';
import { fromDayKey, rangeForView, shiftAnchor, toDayKey } from '@/lib/dates';
import { useAuth } from '@/providers';
import { extendRecurrenceHorizon } from '@/services/activities';
import { useCalendarStore } from '@/store/calendar-store';
import type { Activity } from '@/types/domain';

/** Calendario: la estrella (P1). Vistas mes/semana/día, navegación, FAB (spec 04). */
export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const view = useCalendarStore((s) => s.view);
  const anchorKey = useCalendarStore((s) => s.anchorKey);
  const setView = useCalendarStore((s) => s.setView);
  const setAnchorKey = useCalendarStore((s) => s.setAnchorKey);
  const goToday = useCalendarStore((s) => s.goToday);
  const hydrate = useCalendarStore((s) => s.hydrate);
  const filters = useCalendarStore((s) => s.filters);
  const setFilters = useCalendarStore((s) => s.setFilters);
  const clearFilters = useCalendarStore((s) => s.clearFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { userId } = useAuth();

  const params = useLocalSearchParams<{ view?: string; date?: string }>();

  useEffect(() => {
    void hydrate().then(() => {
      if (params.view === 'month' || params.view === 'week' || params.view === 'day') setView(params.view);
      if (params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) setAnchorKey(params.date);
    });
    // Solo al montar: los params de deep link no deben pisar la navegación posterior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Extiende el horizonte de las series al abrir el calendario (plan §4).
  useEffect(() => {
    if (userId) void extendRecurrenceHorizon(userId).then(() => activities.refetch());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const anchor = useMemo(() => fromDayKey(anchorKey), [anchorKey]);
  const range = useMemo(() => rangeForView(view, anchor), [view, anchor]);
  const activities = useActivitiesRange(range);
  usePrefetchAdjacentRanges(view, anchor);

  const openActivity = useCallback(
    (activity: Activity) => router.push({ pathname: '/(app)/activity/[id]', params: { id: activity.id } }),
    [router],
  );
  const createAt = useCallback(
    (day: Date, minutes?: number) =>
      router.push({
        pathname: '/(app)/activity/new',
        params: minutes === undefined ? { date: toDayKey(day) } : { date: toDayKey(day), start: String(minutes) },
      }),
    [router],
  );
  const selectDay = useCallback(
    (day: Date) => {
      setAnchorKey(toDayKey(day));
      setView('day');
    },
    [setAnchorKey, setView],
  );

  const data = useMemo(() => applyFilters(activities.data ?? [], filters), [activities.data, filters]);
  const activeFilterCount = filters.dimensions.length + filters.themeIds.length;
  const showEmpty = activities.isSuccess && data.length === 0;

  let body: React.ReactNode;
  if (activities.isPending) {
    body = (
      <View style={styles.skeleton}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} style={{ height: 48, opacity: 1 - i * 0.12 }} />
        ))}
      </View>
    );
  } else if (activities.isError) {
    body = <ErrorState message={activities.error.message} onRetry={() => activities.refetch()} />;
  } else if (view === 'month') {
    body = <MonthView anchor={anchor} activities={data} onSelectDay={selectDay} />;
  } else if (view === 'week') {
    body = <WeekView anchor={anchor} activities={data} onPressSlot={createAt} onPressActivity={openActivity} />;
  } else if (showEmpty) {
    body = (
      <EmptyState
        icon={<CalendarDays size={32} strokeWidth={IconStroke} color={theme.textTertiary} />}
        title="No tienes actividades este día"
        description="Toca + para agendar la primera."
      />
    );
  } else {
    body = <DayView day={anchor} activities={data} onPressSlot={createAt} onPressActivity={openActivity} />;
  }

  return (
    <Screen contentStyle={styles.content}>
      <CalendarHeader
        view={view}
        anchor={anchor}
        onChangeView={setView}
        onPrev={() => setAnchorKey(toDayKey(shiftAnchor(view, anchor, -1)))}
        onNext={() => setAnchorKey(toDayKey(shiftAnchor(view, anchor, 1)))}
        onToday={goToday}
        onOpenFilters={() => setFiltersOpen(true)}
        activeFilterCount={activeFilterCount}
      />
      <FilterSheet visible={filtersOpen} filters={filters} onClose={() => setFiltersOpen(false)} onChange={setFilters} onClear={clearFilters} />
      <View style={styles.body}>{body}</View>
      <Fab onPress={() => createAt(anchor)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  body: { flex: 1 },
  skeleton: { gap: Spacing.sm, paddingTop: Spacing.sm },
});

