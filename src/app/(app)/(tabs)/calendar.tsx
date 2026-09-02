import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-worklets';

import { applyFilters, CalendarHeader, DayView, DueRemindersBanner, FilterSheet, MonthView, WeekView } from '@/components/calendar';
import { blocksToActivities, isOverlayActivity, OVERLAY_COLORS } from '@/components/calendar/overlay';
import { PeopleTabs } from '@/components/calendar/people-tabs';
import { EmptyState, ErrorState, Fab, Screen, Skeleton } from '@/components/ui';
import { IconStroke, Spacing } from '@/constants/theme';
import { useActivitiesRange, usePrefetchAdjacentRanges } from '@/hooks/use-activities-range';
import { useAvailability } from '@/hooks/use-availability';
import { useContacts } from '@/hooks/use-connections';
import { useTheme } from '@/hooks/use-theme';
import { fromDayKey, rangeForView, shiftAnchor, toDayKey } from '@/lib/dates';
import { useAuth, useSnackbar } from '@/providers';
import { extendRecurrenceHorizon } from '@/services/activities';
import { useCalendarStore } from '@/store/calendar-store';
import type { Activity } from '@/types/domain';

/** Calendario: la estrella (P1). Vistas mes/semana/día, personas superpuestas, FAB (spec 04). */
export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const view = useCalendarStore((s) => s.view);
  const anchorKey = useCalendarStore((s) => s.anchorKey);
  const setView = useCalendarStore((s) => s.setView);
  const setAnchorKey = useCalendarStore((s) => s.setAnchorKey);
  const goToday = useCalendarStore((s) => s.goToday);
  const hydrate = useCalendarStore((s) => s.hydrate);
  const filters = useCalendarStore((s) => s.filters);
  const setFilters = useCalendarStore((s) => s.setFilters);
  const clearFilters = useCalendarStore((s) => s.clearFilters);
  const overlayUserId = useCalendarStore((s) => s.overlayUserId);
  const setOverlayUserId = useCalendarStore((s) => s.setOverlayUserId);
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

  const anchor = useMemo(() => fromDayKey(anchorKey), [anchorKey]);
  const range = useMemo(() => rangeForView(view, anchor), [view, anchor]);
  const activities = useActivitiesRange(range);
  usePrefetchAdjacentRanges(view, anchor);
  const refetchActivities = activities.refetch;

  // Extiende el horizonte de las series al abrir el calendario (plan §4).
  useEffect(() => {
    if (userId) void extendRecurrenceHorizon(userId).then(() => refetchActivities());
  }, [userId, refetchActivities]);

  // Calendario superpuesto de un contacto (solo lectura; sin títulos si comparte "busy").
  const contacts = useContacts();
  const sharing = (contacts.data ?? []).filter((c) => c.kind === 'accepted' && c.theirCalendarVisibility);
  const overlayContact = sharing.find((c) => c.profile.id === overlayUserId) ?? null;
  const overlayIndex = overlayContact ? sharing.indexOf(overlayContact) : -1;
  const overlay = useAvailability(overlayContact ? [overlayContact.profile.id] : [], range);
  const overlayActivities = useMemo(() => {
    if (!overlayContact || !overlay.data) return [];
    const name = overlayContact.profile.display_name ?? overlayContact.profile.username;
    return blocksToActivities(overlay.data, name, OVERLAY_COLORS[overlayIndex % OVERLAY_COLORS.length] ?? '#F2A93B');
  }, [overlayContact, overlay.data, overlayIndex]);

  const openActivity = (activity: Activity) => {
    if (isOverlayActivity(activity)) {
      showSnackbar({ message: `${activity.title} · calendario de ${activity.owner_name ?? 'tu contacto'} (solo lectura).` });
      return;
    }
    router.push({ pathname: '/(app)/activity/[id]', params: { id: activity.id } });
  };
  const createAt = (day: Date, minutes?: number) =>
    router.push({
      pathname: '/(app)/activity/new',
      params: minutes === undefined ? { date: toDayKey(day) } : { date: toDayKey(day), start: String(minutes) },
    });
  const selectDay = (day: Date) => {
    setAnchorKey(toDayKey(day));
    setView('day');
  };
  const shift = (direction: 1 | -1) => setAnchorKey(toDayKey(shiftAnchor(view, anchor, direction)));

  // Swipe horizontal para cambiar de mes/semana/día (RF-C4).
  const swipe = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onEnd((e) => {
      if (Math.abs(e.translationX) < 60) return;
      runOnJS(shift)(e.translationX < 0 ? 1 : -1);
    });

  const data = [...applyFilters(activities.data ?? [], filters), ...overlayActivities];
  const isShared = (a: Activity) => a.owner_id !== userId;
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
    body = <WeekView anchor={anchor} activities={data} onPressSlot={createAt} onPressActivity={openActivity} isSharedActivity={isShared} />;
  } else if (showEmpty) {
    body = (
      <EmptyState
        icon={<CalendarDays size={32} strokeWidth={IconStroke} color={theme.textTertiary} />}
        title="No tienes actividades este día"
        description="Toca + para agendar la primera."
      />
    );
  } else {
    body = <DayView day={anchor} activities={data} onPressSlot={createAt} onPressActivity={openActivity} isSharedActivity={isShared} />;
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <CalendarHeader
          view={view}
          anchor={anchor}
          onChangeView={setView}
          onChangeAnchor={(date) => setAnchorKey(toDayKey(date))}
          onPrev={() => shift(-1)}
          onNext={() => shift(1)}
          onToday={goToday}
          onOpenFilters={() => setFiltersOpen(true)}
          activeFilterCount={activeFilterCount}
        />
        <PeopleTabs overlayUserId={overlayUserId} onChange={setOverlayUserId} />
        <DueRemindersBanner />
      </View>
      <FilterSheet visible={filtersOpen} filters={filters} onClose={() => setFiltersOpen(false)} onChange={setFilters} onClear={clearFilters} />
      <GestureDetector gesture={swipe}>
        <View style={styles.body}>{body}</View>
      </GestureDetector>
      <Fab onPress={() => createAt(anchor)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 0, gap: Spacing.sm },
  header: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  body: { flex: 1, paddingHorizontal: Spacing.sm },
  skeleton: { gap: Spacing.sm, paddingTop: Spacing.sm, paddingHorizontal: Spacing.sm },
});
