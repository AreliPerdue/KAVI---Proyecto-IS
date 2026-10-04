import { Share2, Trophy } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Sheet } from '@/components/ui';
import { gymratLineFor, tonnageEquivalence } from '@/constants/gymrat';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useGymProgress } from '@/hooks/use-gym-progress';
import { useTheme } from '@/hooks/use-theme';
import { unlockedBy } from '@/lib/gym/achievements';
import { isLegDay, musclesWorked } from '@/lib/gym/muscles';
import type { SessionSummary } from '@/lib/gym/session';
import { formatWeight } from '@/lib/gym/units';
import { shareText } from '@/lib/share';
import { useSnackbar } from '@/providers';
import type { WorkoutDetail } from '@/services/workouts';
import { useGymStore } from '@/store/gym-store';
import type { Exercise, WeightUnit } from '@/types/domain';

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
 * equivalencia de tonelaje y lo que se desbloqueó. Se comparte como texto; la imagen pide
 * una librería nativa y queda para G8.
 */
export function SessionSummarySheet({ visible, onClose, ...rest }: SessionSummarySheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Sesión terminada">
      {visible ? <Contenido onClose={onClose} {...rest} /> : null}
    </Sheet>
  );
}

function Contenido({ workout, summary, catalog, unit, onClose }: Omit<SessionSummarySheetProps, 'visible'>) {
  const theme = useTheme();
  const showSnackbar = useSnackbar();
  const serio = useGymStore((s) => s.seriousMode);
  const trato = useGymStore((s) => s.trato);
  const progreso = useGymProgress();

  const musculos = useMemo(() => musclesWorked(workout.exercises, catalog), [workout.exercises, catalog]);
  const frase = gymratLineFor(isLegDay(workout.exercises, catalog) ? 'leg_day' : 'session_done', trato, serio, workout.id);
  const equivalencia = serio ? null : tonnageEquivalence(summary.volumeKg, workout.id);
  /** Solo cuando el historial ya trae esta sesión: antes, todo parecería "nuevo". */
  const logros = useMemo(() => {
    const log = progreso.log.data;
    if (!log || !progreso.streak || !log.some((w) => w.id === workout.id)) return [];
    return unlockedBy(workout.id, log, progreso.catalog, progreso.streak.best, trato);
  }, [progreso.log.data, progreso.streak, progreso.catalog, workout.id, trato]);

  const compartir = async () => {
    const lineas = [
      `${workout.title || workout.activity_title || 'Entrenamiento'} · KAVI`,
      [summary.durationMin ? `${summary.durationMin} min` : null, `${formatWeight(summary.volumeKg, unit)} de volumen`, `${summary.setsDone} series`, summary.prCount ? `${summary.prCount} PRs` : null]
        .filter(Boolean)
        .join(' · '),
      musculos.length ? `Trabajé: ${musculos.join(', ')}` : null,
      equivalencia ? `Moví el equivalente a ${equivalencia}.` : null,
      logros.length ? `Logro desbloqueado: ${logros.map((l) => l.title).join(', ')}` : null,
    ].filter(Boolean);
    const r = await shareText(lineas.join('\n'));
    if (r === 'copied') showSnackbar({ message: 'Resumen copiado.' });
  };

  return (
    <>
      {frase ? <AppText variant="bodyStrong">{frase}</AppText> : null}
      <View style={styles.cifras}>
        <Cifra valor={summary.durationMin ? `${summary.durationMin} min` : '—'} etiqueta="Duración" />
        <Cifra valor={formatWeight(summary.volumeKg, unit)} etiqueta="Volumen" />
        <Cifra valor={String(summary.setsDone)} etiqueta="Series" />
        <Cifra valor={String(summary.prCount)} etiqueta="PRs" />
      </View>
      {equivalencia ? (
        <AppText color="textSecondary">
          {formatWeight(summary.volumeKg, unit)} = {equivalencia}.
        </AppText>
      ) : null}
      {musculos.length > 0 ? (
        <View style={styles.grupo}>
          <AppText variant="label" color="textSecondary">
            Músculos trabajados
          </AppText>
          <AppText>{musculos.join(' · ')}</AppText>
        </View>
      ) : null}
      {logros.map((l) => (
        <View key={l.id} style={[styles.logro, { backgroundColor: theme.ink }]} accessibilityLabel={`Logro desbloqueado: ${l.title}. ${l.description}`}>
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
      {summary.setsPending > 0 ? (
        <AppText variant="caption" color="textTertiary">
          {summary.setsPending} {summary.setsPending === 1 ? 'serie quedó' : 'series quedaron'} sin marcar y no cuentan.
        </AppText>
      ) : null}
      <Button title="Compartir" variant="secondary" icon={<Share2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} onPress={() => void compartir()} />
      <Button title="Listo" onPress={onClose} />
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
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cifra: { flexBasis: '47%', flexGrow: 1, padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous', gap: 2 },
  grupo: { gap: Spacing.xs },
  logro: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous' },
  flex: { flex: 1, gap: 2 },
});
