import { addDays, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { ChevronRight, Flame, PauseCircle } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Banner, Button, Chip, TextField } from '@/components/ui';
import { gymratLineFor, STREAK_REASONS, streakReasonLabel } from '@/constants/gymrat';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useGymProgress, useStreakDecision } from '@/hooks/use-gym-progress';
import { useTheme } from '@/hooks/use-theme';
import { formatDayAndMonth } from '@/lib/dates';
import { isLegDay } from '@/lib/gym/muscles';
import { weekKey } from '@/lib/gym/streak';
import { useGymStore } from '@/store/gym-store';
import { getLanguage, t, type Language, useLanguage, useT } from '@/i18n';

/** "La semana del 5 de octubre" o "Del 5 de octubre al 25 de octubre" ("The week of October 5"…). */
export function gapLabel(weeks: readonly string[], lang: Language = getLanguage()): string {
  const s = t(lang).fitness.streak;
  const inicio = parseISO(weeks[0]);
  if (weeks.length === 1) return s.gapOne(formatDayAndMonth(inicio, lang));
  const fin = addDays(parseISO(weeks[weeks.length - 1]), 6);
  return s.gapRange(formatDayAndMonth(inicio, lang), formatDayAndMonth(fin, lang));
}

/**
 * Racha de Hierro en Fitness (RF-F58). Si está en pausa, pregunta qué pasó y la persona
 * decide; si no, una fila con las semanas que lleva que abre Progreso.
 */
/** "¿Y la pierna?": entrena, pero lleva más de 7 días sin pierna (RF-F55). `null` en Modo serio o si no aplica. */
export function useNoLegsLine(): string | null {
  const lang = useLanguage();
  const progreso = useGymProgress();
  const serio = useGymStore((x) => x.seriousMode);
  const trato = useGymStore((x) => x.trato);
  return useMemo(() => {
    const log = progreso.sessions;
    if (serio || log.length === 0) return null;
    const hace = (dias: number) => progreso.now.getTime() - dias * 86_400_000;
    const ultima = log[log.length - 1];
    if (new Date(ultima.performed_at).getTime() < hace(7)) return null;
    const pierna = [...log].reverse().find((w) => isLegDay(w.exercises, progreso.catalog));
    if (pierna && new Date(pierna.performed_at).getTime() >= hace(7)) return null;
    return gymratLineFor('no_legs', trato, serio, weekKey(progreso.now), lang);
  }, [progreso.sessions, progreso.catalog, progreso.now, serio, trato, lang]);
}

/** La racha en pausa: pregunta qué pasó y la persona decide (RF-F58). El bento la pone arriba, a todo lo ancho. */
export function StreakPause() {
  const streak = useGymProgress().streak;
  if (!streak?.paused) return null;
  return <Pausa key={streak.paused.weeks.join()} weeks={streak.paused.weeks} semanas={streak.weeks} />;
}

export function StreakCard() {
  const theme = useTheme();
  const s = useT().fitness.streak;
  const router = useRouter();
  const progreso = useGymProgress();
  const streak = progreso.streak;
  const sinPierna = useNoLegsLine();

  if (!streak) return null;
  if (streak.paused) return <Pausa key={streak.paused.weeks.join()} weeks={streak.paused.weeks} semanas={streak.weeks} />;
  if (progreso.sessions.length === 0) return null;

  return (
    <View style={styles.pila}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={s.a11y(s.weeks(streak.weeks))}
        onPress={() => router.push('/(app)/progress')}
        style={({ pressed }) => [styles.fila, { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : theme.surface }]}>
        <View style={[styles.icono, { backgroundColor: theme.surfaceAlt }]}>
          <Flame size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" tabular>
            {s.title(s.weeks(streak.weeks))}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {streak.trainedThisWeek ? s.countsThisWeek : s.trainThisWeek} {s.seeProgress}
          </AppText>
        </View>
        <ChevronRight size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
      </Pressable>
      {sinPierna ? (
        <AppText variant="caption" color="textSecondary">
          {sinPierna}
        </AppText>
      ) : null}
    </View>
  );
}

function Pausa({ weeks, semanas }: { weeks: string[]; semanas: number }) {
  const theme = useTheme();
  const lang = useLanguage();
  const s = useT().fitness.streak;
  const trato = useGymStore((x) => x.trato);
  const decidir = useStreakDecision();
  const [nota, setNota] = useState('');
  const [motivos, setMotivos] = useState<string[]>([]);
  const enviar = (decision: 'kept' | 'reset') => decidir.mutate({ weeks, decision, note: nota.trim() || null, reasons: motivos });

  return (
    <View style={[styles.pausa, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={styles.encabezado}>
        <PauseCircle size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong">
            {s.whatHappened(gapLabel(weeks, lang))}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {s.paused(s.weeks(semanas))}
          </AppText>
        </View>
      </View>
      <View style={styles.chips}>
        {STREAK_REASONS.map((r) => {
          const puesto = motivos.includes(r);
          return <Chip key={r} compact label={streakReasonLabel(r, trato, lang)} selected={puesto} onPress={() => setMotivos((xs) => (puesto ? xs.filter((x) => x !== r) : [...xs, r]))} />;
        })}
      </View>
      <TextField label={s.note} value={nota} onChangeText={setNota} placeholder={s.notePlaceholder} maxLength={500} multiline />
      {decidir.error ? <Banner tone="error" message={decidir.error.message} /> : null}
      <View style={styles.botones}>
        <View style={styles.flex}>
          <Button title={s.reset} variant="secondary" disabled={decidir.isPending} onPress={() => enviar('reset')} />
        </View>
        <View style={styles.flex}>
          <Button title={s.keep} loading={decidir.isPending} onPress={() => enviar('kept')} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pila: { gap: Spacing.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 64, padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
  icono: { width: 40, height: 40, borderRadius: Radius.sm, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
  pausa: { gap: Spacing.md, padding: Spacing.lg, borderWidth: 1, borderRadius: Radius.lg, borderCurve: 'continuous' },
  encabezado: { flexDirection: 'row', gap: Spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  botones: { flexDirection: 'row', gap: Spacing.sm },
});
