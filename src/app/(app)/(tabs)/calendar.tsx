import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-worklets';

import { applyFilters, CalendarHeader, DayView, DueRemindersBanner, FilterSheet, MonthView, WeekView } from '@/components/calendar';
import { blocksToActivities, isOverlayActivity } from '@/components/calendar/overlay';
import { PeopleTabs } from '@/components/calendar/people-tabs';
import { AppText, ErrorState, Fab, Screen, Skeleton } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useActivitiesRange, usePrefetchAdjacentRanges } from '@/hooks/use-activities-range';
import { useAvailability } from '@/hooks/use-availability';
import { useContacts, usePeopleColors } from '@/hooks/use-connections';
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
  const openDay = useCalendarStore((s) => s.openDay);
  const goToday = useCalendarStore((s) => s.goToday);
  const hydrate = useCalendarStore((s) => s.hydrate);
  const filters = useCalendarStore((s) => s.filters);
  const setFilters = useCalendarStore((s) => s.setFilters);
  const clearFilters = useCalendarStore((s) => s.clearFilters);
  const overlayUserIds = useCalendarStore((s) => s.overlayUserIds);
  const toggleOverlayUser = useCalendarStore((s) => s.toggleOverlayUser);
  const clearOverlayUsers = useCalendarStore((s) => s.clearOverlayUsers);
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

  // Calendarios superpuestos (solo lectura; sin títulos si comparten "busy").
  const contacts = useContacts();
  const peopleColors = usePeopleColors();
  const sharing = useMemo(
    () => (contacts.data ?? []).filter((c) => c.kind === 'accepted' && c.theirCalendarVisibility),
    [contacts.data],
  );
  // Si alguien deja de compartir, su selección se ignora sin tener que limpiarla.
  const activeOverlayIds = useMemo(
    () => overlayUserIds.filter((id) => sharing.some((c) => c.profile.id === id)),
    [overlayUserIds, sharing],
  );
  const overlay = useAvailability(activeOverlayIds, range);
  const nameOf = useCallback(
    (id: string) => {
      const contact = sharing.find((c) => c.profile.id === id);
      return contact?.profile.display_name ?? 'tu contacto';
    },
    [sharing],
  );
  const colorOf = useCallback(
    (id: string) => peopleColors.get(id) ?? theme.neutralActivity,
    [peopleColors, theme.neutralActivity],
  );
  const overlayActivities = useMemo(
    () => (overlay.data ? blocksToActivities(overlay.data, nameOf, colorOf) : []),
    [overlay.data, nameOf, colorOf],
  );

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
  // Abrir un día no cambia la vista preferida: el calendario sigue abriendo en mensual.
  const selectDay = (day: Date) => openDay(toDayKey(day));
  const shift = (direction: 1 | -1) => setAnchorKey(toDayKey(shiftAnchor(view, anchor, direction)));

  // Swipe horizontal para cambiar de mes/semana/día (RF-C4).
  const swipe = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onEnd((e) => {
      if (Math.abs(e.translationX) < 60) return;
      runOnJS(shift)(e.translationX < 0 ? 1 : -1);
    });

  /**
   * Con calendarios superpuestos el color deja de ser el del tema y pasa a ser el de la
   * persona: es lo único que permite ver de un vistazo de quién es cada bloque (RF-S15).
   * Con "Tú" a solas vuelve el color coding de dimensiones y temas.
   */
  const byPerson = activeOverlayIds.length > 0;
  const data = useMemo(() => {
    const all = [...applyFilters(activities.data ?? [], filters), ...overlayActivities];
    return byPerson ? all.map((a) => ({ ...a, color: colorOf(a.owner_id) })) : all;
  }, [activities.data, filters, overlayActivities, byPerson, colorOf]);
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
  } else {
    /**
     * La rejilla de 24 h es la referencia del día, así que se despliega siempre —también
     * sin nada agendado, donde además es la forma de crear tocando una hora (RF-C3, RF-C6)—.
     * El aviso de vacío va encima sin taparla (NFR-11). La vista semanal ya se comportaba así.
     */
    body = (
      <View style={styles.dayBody}>
        {showEmpty ? (
          <AppText variant="caption" color="textSecondary" style={styles.dayEmptyHint}>
            Sin actividades este día. Toca una hora para agendar.
          </AppText>
        ) : null}
        <DayView day={anchor} activities={data} onPressSlot={createAt} onPressActivity={openActivity} isSharedActivity={isShared} />
      </View>
    );
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
        <PeopleTabs overlayUserIds={activeOverlayIds} colorOf={colorOf} onToggle={toggleOverlayUser} onOnlyMe={clearOverlayUsers} />
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
  dayBody: { flex: 1 },
  dayEmptyHint: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.xs },
});
