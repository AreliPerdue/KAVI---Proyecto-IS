import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { AppText, Avatar, Chip, EmptyState, ErrorState, IconButton, LoadingState, Screen, Segmented, type SegmentedOption } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useAvailability } from '@/hooks/use-availability';
import { useContacts } from '@/hooks/use-connections';
import { useTheme } from '@/hooks/use-theme';
import { clampToDay, findFreeSlots, formatShortDate, formatTime, formatWeekTitle, fromIso, isToday, minutesSinceMidnight, rangeForView, shiftAnchor, toDayKey, WEEKDAY_SHORT, weekDays } from '@/lib/dates';
import { useAuth } from '@/providers';

const MAX_WIDTH = 1100;
const HOUR_HEIGHT = 28;
const DAY_START = 6;
const DAY_END = 23;
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);
const DURATIONS: readonly SegmentedOption<'30' | '60' | '90' | '120'>[] = [
  { value: '30', label: '30 min' },
  { value: '60', label: '1 h' },
  { value: '90', label: '1.5 h' },
  { value: '120', label: '2 h' },
];

/** Disponibilidad de contactos + Encontrar horario (RF-S8, RF-S9). */
export default function AvailabilityScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { userId } = useAuth();
  const { width } = useWindowDimensions();
  const contacts = useContacts();
  const [anchor, setAnchor] = useState(new Date());
  const [selected, setSelected] = useState<string[]>([]);
  const [duration, setDuration] = useState<'30' | '60' | '90' | '120'>('60');

  const sharing = (contacts.data ?? []).filter((c) => c.kind === 'accepted' && c.theirCalendarVisibility);
  const range = useMemo(() => rangeForView('week', anchor), [anchor]);
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const userIds = useMemo(() => (userId ? [userId, ...selected] : selected), [userId, selected]);
  const availability = useAvailability(userIds, range);

  const slots = useMemo(() => {
    if (!availability.data) return [];
    const busy = availability.data.map((b) => ({ start: fromIso(b.start_at), end: fromIso(b.end_at) }));
    const from = new Date(Math.max(range.from.getTime(), Date.now()));
    return findFreeSlots(busy, from, range.to, Number(duration), DAY_START + 1, DAY_END - 1).slice(0, 12);
  }, [availability.data, range, duration]);

  const colorFor = (id: string) => {
    if (id === userId) return theme.ink;
    const palette = ['#2196F3', '#9C27B0', '#FF9800', '#009688', '#E91E63'];
    const index = selected.indexOf(id);
    return palette[index % palette.length] ?? theme.neutralActivity;
  };
  const nameFor = (id: string) => (id === userId ? 'Tú' : sharing.find((c) => c.profile.id === id)?.profile.display_name ?? 'Contacto');

  const compact = width < 720;

  return (
    <Screen scroll maxWidth={MAX_WIDTH}>
      <ModalHeader title="Disponibilidad" />

      {contacts.isPending ? <LoadingState /> : null}
      {contacts.isSuccess && sharing.length === 0 ? (
        <EmptyState title="Nadie te comparte su calendario todavía" description="Pide a tus contactos que compartan su disponibilidad contigo desde su pestaña Compartido." />
      ) : null}

      {sharing.length > 0 ? (
        <>
          <View style={styles.section}>
            <AppText variant="label" color="textSecondary">
              Contactos
            </AppText>
            <View style={styles.chips}>
              {sharing.map((c) => {
                const isSelected = selected.includes(c.profile.id);
                return (
                  <Chip
                    key={c.profile.id}
                    label={c.profile.display_name ?? c.profile.username}
                    color={isSelected ? colorFor(c.profile.id) : undefined}
                    selected={isSelected}
                    icon={<Avatar profile={c.profile} size={20} />}
                    onPress={() => setSelected((prev) => (isSelected ? prev.filter((x) => x !== c.profile.id) : [...prev, c.profile.id]))}
                  />
                );
              })}
            </View>
          </View>

          <View style={styles.weekRow}>
            <IconButton label="Semana anterior" onPress={() => setAnchor(shiftAnchor('week', anchor, -1))}>
              <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
            </IconButton>
            <AppText variant="bodyStrong">{formatWeekTitle(anchor)}</AppText>
            <IconButton label="Semana siguiente" onPress={() => setAnchor(shiftAnchor('week', anchor, 1))}>
              <ChevronRight size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
            </IconButton>
          </View>

          {selected.length === 0 ? (
            <AppText color="textSecondary">Elige al menos un contacto para superponer su disponibilidad con la tuya.</AppText>
          ) : availability.isPending ? (
            <LoadingState label="Calculando disponibilidad…" />
          ) : availability.isError ? (
            <ErrorState message={availability.error.message} onRetry={() => availability.refetch()} />
          ) : (
            <>
              <View style={styles.legend}>
                {userIds.map((id) => (
                  <View key={id} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colorFor(id) }]} />
                    <AppText variant="caption" color="textSecondary">
                      {nameFor(id)}
                    </AppText>
                  </View>
                ))}
              </View>

              <ScrollView horizontal={compact} showsHorizontalScrollIndicator={false}>
                <View style={[styles.grid, compact ? { width: 7 * 96 + 40 } : null]}>
                  <View style={styles.gutter}>
                    <View style={styles.dayHeader} />
                    {HOURS.map((h) => (
                      <View key={h} style={{ height: HOUR_HEIGHT }}>
                        <AppText variant="caption" color="textTertiary" tabular>
                          {`${h}:00`}
                        </AppText>
                      </View>
                    ))}
                  </View>
                  {days.map((day, dayIndex) => (
                    <View key={toDayKey(day)} style={[styles.dayColumn, { borderLeftColor: theme.border }]}>
                      <View style={styles.dayHeader}>
                        <AppText variant="caption" color={isToday(day) ? 'today' : 'textSecondary'}>
                          {WEEKDAY_SHORT[dayIndex]} {day.getDate()}
                        </AppText>
                      </View>
                      <View style={{ height: HOURS.length * HOUR_HEIGHT }}>
                        {HOURS.map((h) => (
                          <View key={h} style={[styles.hourLine, { top: (h - DAY_START) * HOUR_HEIGHT, borderTopColor: theme.border }]} />
                        ))}
                        {availability.data.map((block, i) => {
                          const span = clampToDay(block.start_at, block.end_at, day);
                          if (!span) return null;
                          const top = Math.max(0, (span.start / 60 - DAY_START) * HOUR_HEIGHT);
                          const bottom = Math.min(HOURS.length * HOUR_HEIGHT, (span.end / 60 - DAY_START) * HOUR_HEIGHT);
                          if (bottom <= top) return null;
                          const lane = userIds.indexOf(block.user_id);
                          const laneWidth = 100 / Math.max(1, userIds.length);
                          return (
                            <View
                              key={`${block.user_id}-${i}`}
                              accessibilityLabel={`${nameFor(block.user_id)} ocupado de ${formatTime(fromIso(block.start_at))} a ${formatTime(fromIso(block.end_at))}`}
                              style={[
                                styles.block,
                                { top, height: bottom - top, left: `${lane * laneWidth}%`, width: `${laneWidth}%`, backgroundColor: `${colorFor(block.user_id)}55` },
                              ]}>
                              {block.title && bottom - top > 18 ? (
                                <AppText variant="caption" numberOfLines={1} style={styles.blockText}>
                                  {block.title}
                                </AppText>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.section}>
                <AppText variant="heading">Encontrar horario</AppText>
                <Segmented options={DURATIONS} value={duration} onChange={setDuration} />
                {slots.length === 0 ? (
                  <AppText color="textSecondary">No hay huecos libres de esa duración en lo que queda de la semana.</AppText>
                ) : (
                  <View style={styles.slots}>
                    {slots.map((slot) => (
                      <Pressable
                        key={slot.start.toISOString()}
                        accessibilityRole="button"
                        accessibilityLabel={`Crear actividad el ${formatShortDate(slot.start)} de ${formatTime(slot.start)} a ${formatTime(slot.end)}`}
                        onPress={() =>
                          router.push({
                            pathname: '/(app)/activity/new',
                            params: {
                              date: toDayKey(slot.start),
                              start: String(minutesSinceMidnight(slot.start)),
                              end: String(minutesSinceMidnight(slot.end)),
                            },
                          })
                        }
                        style={({ pressed }) => [styles.slot, { borderColor: theme.border, backgroundColor: theme.surface }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
                        <AppText variant="label">{formatShortDate(slot.start)}</AppText>
                        <AppText variant="caption" color="textSecondary" tabular>
                          {formatTime(slot.start)} – {formatTime(slot.end)}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                )}
                <AppText variant="caption" color="textTertiary">
                  Toca un hueco para crear la actividad y compartirla después desde su detalle.
                </AppText>
              </View>
            </>
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  weekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  grid: { flexDirection: 'row', width: '100%' },
  gutter: { width: 40 },
  dayHeader: { height: 24, alignItems: 'center', justifyContent: 'center' },
  dayColumn: { flex: 1, minWidth: 96, borderLeftWidth: StyleSheet.hairlineWidth },
  hourLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth },
  block: { position: 'absolute', borderRadius: 4, paddingHorizontal: 2, overflow: 'hidden' },
  blockText: { fontSize: 10, lineHeight: 12 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  slot: { minWidth: 140, padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', gap: 2 },
});
