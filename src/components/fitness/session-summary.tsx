import { Share2, Trophy } from 'lucide-react-native';
import { format } from 'date-fns';
import { useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { AppText, Button, Sheet } from '@/components/ui';
import { gymratLineFor, tonnageEquivalence } from '@/constants/gymrat';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useGymProgress } from '@/hooks/use-gym-progress';
import { useTheme } from '@/hooks/use-theme';
import { formatDayAndMonth } from '@/lib/dates';
import { unlockedBy } from '@/lib/gym/achievements';
import { muscleGroupName } from '@/lib/gym/display-names';
import { isLegDay, musclesWorked } from '@/lib/gym/muscles';
import type { SessionSummary } from '@/lib/gym/session';
import { formatWeight } from '@/lib/gym/units';
import { shareImage, shareText } from '@/lib/share';
import { useSnackbar } from '@/providers';
import type { WorkoutDetail } from '@/services/workouts';
import { useGymStore } from '@/store/gym-store';
import type { Exercise, WeightUnit } from '@/types/domain';
import { useLanguage, useT } from '@/i18n';

export type SessionSummarySheetProps = {
  visible: boolean;
  workout: WorkoutDetail;
  summary: SessionSummary;
  catalog: ReadonlyMap<string, Exercise>;
  unit: WeightUnit;
  onClose: () => void;
};

/**
 * Resumen al terminar (RF-F59): duración, volumen, series, PRs, músculos trabajados, la
 * equivalencia de tonelaje y lo que se desbloqueó. "Compartir" manda la tarjeta como imagen;
 * si la captura falla, se comparte como texto.
 */
export function SessionSummarySheet({ visible, onClose, ...rest }: SessionSummarySheetProps) {
  const tx = useT();
  return (
    <Sheet visible={visible} onClose={onClose} title={tx.fitness.summary.title}>
      {visible ? <Contenido onClose={onClose} {...rest} /> : null}
    </Sheet>
  );
}

function Contenido({ workout, summary, catalog, unit, onClose }: Omit<SessionSummarySheetProps, 'visible'>) {
  const theme = useTheme();
  const lang = useLanguage();
  const r = useT().fitness.summary;
  const showSnackbar = useSnackbar();
  const serio = useGymStore((s) => s.seriousMode);
  const trato = useGymStore((s) => s.trato);
  const progreso = useGymProgress();
  const tarjeta = useRef<View>(null);
  const [compartiendo, setCompartiendo] = useState(false);

  const musculos = useMemo(() => musclesWorked(workout.exercises, catalog).map((g) => muscleGroupName(g, lang)), [workout.exercises, catalog, lang]);
  const frase = gymratLineFor(isLegDay(workout.exercises, catalog) ? 'leg_day' : 'session_done', trato, serio, workout.id, lang);
  const equivalencia = serio ? null : tonnageEquivalence(summary.volumeKg, workout.id, lang);
  /** Solo cuando el historial ya trae esta sesión: antes, todo parecería "nuevo". */
  const logros = useMemo(() => {
    const log = progreso.sessions;
    if (!progreso.streak || !log.some((w) => w.id === workout.id)) return [];
    return unlockedBy(workout.id, log, progreso.catalog, progreso.streak.best, trato, lang);
  }, [progreso.sessions, progreso.streak, progreso.catalog, workout.id, trato, lang]);

  const compartirTexto = async () => {
    const lineas = [
      `${workout.title || workout.activity_title || r.workoutFallback} · KAVI`,
      [summary.durationMin ? `${summary.durationMin} min` : null, r.volumeOf(formatWeight(summary.volumeKg, unit)), r.sets(summary.setsDone), summary.prCount ? r.prs(summary.prCount) : null]
        .filter(Boolean)
        .join(' · '),
      musculos.length ? r.worked(musculos.join(', ')) : null,
      equivalencia ? r.movedEquivalent(equivalencia) : null,
      logros.length ? r.unlocked(logros.map((l) => l.title).join(', ')) : null,
    ].filter(Boolean);
    const resultado = await shareText(lineas.join('\n'));
    if (resultado === 'copied') showSnackbar({ message: r.copied });
  };

  const compartir = async () => {
    setCompartiendo(true);
    try {
      const uri = await captureRef(tarjeta, { format: 'png', quality: 1, result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile' });
      const resultado = await shareImage(uri, `kavi-${format(new Date(workout.performed_at), 'yyyy-MM-dd')}.png`);
      if (resultado === 'downloaded') showSnackbar({ message: r.downloaded });
    } catch {
      await compartirTexto();
    } finally {
      setCompartiendo(false);
    }
  };

  return (
    <>
      {/* Lo que sale en la imagen: lleva su propio fondo para verse igual fuera de la app. */}
      <View ref={tarjeta} collapsable={false} style={[styles.tarjeta, { backgroundColor: theme.surface }]}>
        <AppText variant="caption" color="textSecondary">
          {workout.title || workout.activity_title || r.workoutFallback} · {formatDayAndMonth(new Date(workout.performed_at), lang)} · KAVI
        </AppText>
        {frase ? <AppText variant="bodyStrong">{frase}</AppText> : null}
        <View style={styles.cifras}>
          <Cifra valor={summary.durationMin ? `${summary.durationMin} min` : '—'} etiqueta={r.duration} />
          <Cifra valor={formatWeight(summary.volumeKg, unit)} etiqueta={r.volume} />
          <Cifra valor={String(summary.setsDone)} etiqueta={r.setsLabel} />
          <Cifra valor={String(summary.prCount)} etiqueta={r.prsLabel} />
        </View>
        {equivalencia ? (
          <AppText color="textSecondary">
            {formatWeight(summary.volumeKg, unit)} = {equivalencia}.
          </AppText>
        ) : null}
        {musculos.length > 0 ? (
          <View style={styles.grupo}>
            <AppText variant="label" color="textSecondary">
              {r.musclesWorked}
            </AppText>
            <AppText>{musculos.join(' · ')}</AppText>
          </View>
        ) : null}
        {logros.map((l) => (
          <View key={l.id} style={[styles.logro, { backgroundColor: theme.ink }]} accessibilityLabel={r.unlockedA11y(l.title, l.description)}>
            <Trophy size={IconSize.action} strokeWidth={IconStroke} color={theme.onInk} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong" color="onInk">
                {l.title}
              </AppText>
              <AppText variant="caption" color="onInk">
                {l.description}
              </AppText>
            </View>
          </View>
        ))}
      </View>
      {summary.setsPending > 0 ? (
        <AppText variant="caption" color="textTertiary">
          {r.pending(summary.setsPending)}
        </AppText>
      ) : null}
      <Button title={r.share} variant="secondary" loading={compartiendo} icon={<Share2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} onPress={() => void compartir()} />
      <Button title={r.done} onPress={onClose} />
    </>
  );
}

function Cifra({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.cifra, { backgroundColor: theme.surfaceAlt }]}>
      <AppText variant="heading" tabular>
        {valor}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {etiqueta}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: { gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, borderCurve: 'continuous' },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cifra: { flexBasis: '47%', flexGrow: 1, padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous', gap: 2 },
  grupo: { gap: Spacing.xs },
  logro: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous' },
  flex: { flex: 1, gap: 2 },
});
