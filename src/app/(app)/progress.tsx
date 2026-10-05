import { addDays, addWeeks, format } from 'date-fns';
import { ChevronLeft, ChevronRight, Info, Lock, Trophy } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GlossarySheet } from '@/components/fitness/glossary-sheet';
import { gapLabel } from '@/components/fitness/streak-card';
import { ModalHeader } from '@/components/modal-header';
import { AppText, ErrorState, IconButton, LoadingState, Screen } from '@/components/ui';
import { streakReasonLabel } from '@/constants/gymrat';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useGymProgress } from '@/hooks/use-gym-progress';
import { useTheme } from '@/hooks/use-theme';
import { formatDayAndMonth, formatDayMonthShort } from '@/lib/dates';
import type { Achievement } from '@/lib/gym/achievements';
import { muscleGroupName } from '@/lib/gym/display-names';
import { MUSCLE_GROUPS, setsByGroup, WEEKLY_ZONES } from '@/lib/gym/muscles';
import { weekKey, weekStart } from '@/lib/gym/streak';
import { useGymStore } from '@/store/gym-store';
import { formatNumber, useLanguage, useT } from '@/i18n';

const MAX_WIDTH = 640;
const SEMANAS = 12;
const DIAS = 7;

/**
 * Progreso (spec 07 v2, §8): Racha de Hierro, calendario de entrenos con las semanas
 * justificadas, volumen semanal por músculo y logros. Todo sale del historial.
 */
export default function ProgressScreen() {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const p = tx.fitness.progress;
  const s = tx.fitness.streak;
  const progreso = useGymProgress();
  const trato = useGymStore((s) => s.trato);
  const { streak, achievements, now } = progreso;
  const [semanaVolumen, setSemanaVolumen] = useState(0);
  const [termino, setTermino] = useState<string | null>(null);

  const dias = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of progreso.sessions) {
      const k = format(new Date(w.performed_at), 'yyyy-MM-dd');
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [progreso.sessions]);
  const justificadas = useMemo(() => new Map((progreso.events.data ?? []).map((e) => [e.week_start, e])), [progreso.events.data]);

  const inicioVolumen = addWeeks(weekStart(now), semanaVolumen);
  const volumen = useMemo(() => {
    const desde = inicioVolumen.getTime();
    const hasta = addWeeks(inicioVolumen, 1).getTime();
    const ejercicios = progreso.sessions.filter((w) => {
      const t = new Date(w.performed_at).getTime();
      return t >= desde && t < hasta;
    }).flatMap((w) => w.exercises);
    return setsByGroup(ejercicios, progreso.catalog);
    // `inicioVolumen` se deriva de `semanaVolumen` y `now`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progreso.sessions, progreso.catalog, semanaVolumen, now]);

  if (progreso.isPending) {
    return (
      <Screen modal maxWidth={MAX_WIDTH}>
        <ModalHeader back title={p.title} />
        <LoadingState />
      </Screen>
    );
  }
  if (progreso.isError || !streak || !achievements) {
    return (
      <Screen modal maxWidth={MAX_WIDTH}>
        <ModalHeader back title={p.title} />
        <ErrorState message={progreso.error?.message ?? p.loadFailed} onRetry={() => void progreso.log.refetch()} />
      </Screen>
    );
  }

  const semanas = Array.from({ length: SEMANAS }, (_, i) => addWeeks(weekStart(now), -i));
  const escala = Math.max(WEEKLY_ZONES.high + 5, ...volumen.values());
  const pct = (n: number) => `${Math.min(100, (n / escala) * 100)}%` as const;

  return (
    <Screen modal scroll maxWidth={MAX_WIDTH}>
      <ModalHeader back title={p.title} />

      <View style={[styles.tarjeta, { backgroundColor: theme.surfaceAlt }]}>
        <View style={styles.tituloFila}>
          <AppText variant="label" color="textSecondary" style={styles.flex}>
            {p.ironStreak}
          </AppText>
          <IconButton label={p.whatIsStreak} onPress={() => setTermino('iron_streak')}>
            <Info size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
          </IconButton>
        </View>
        <AppText variant="display" tabular>
          {s.weeks(streak.weeks)}
        </AppText>
        <AppText color="textSecondary">
          {streak.paused
            ? p.pausedLine(gapLabel(streak.paused.weeks, lang))
            : streak.trainedThisWeek
              ? s.countsThisWeek
              : s.trainThisWeek}
          {streak.best > streak.weeks ? p.best(streak.best) : ''}
        </AppText>
      </View>

      <View style={styles.seccion}>
        <AppText variant="heading" accessibilityRole="header">
          {p.calendar}
        </AppText>
        <View style={styles.filaCal}>
          <View style={styles.etiquetaSemana} />
          {tx.dates.weekdayInitials.map((d, i) => (
            <AppText key={i} variant="micro" color="textTertiary" style={styles.celdaTexto}>
              {d}
            </AppText>
          ))}
        </View>
        {semanas.map((lunes) => {
          const clave = weekKey(lunes);
          const evento = justificadas.get(clave);
          const entrenos = Array.from({ length: DIAS }, (_, i) => dias.get(format(addDays(lunes, i), 'yyyy-MM-dd')) ?? 0);
          const total = entrenos.reduce((a, b) => a + b, 0);
          return (
            <View key={clave} style={styles.semana}>
              <View
                style={styles.filaCal}
                accessible
                accessibilityLabel={p.weekA11y(formatDayAndMonth(lunes, lang), total, evento ? evento.decision : null)}>
                <AppText variant="caption" color="textSecondary" tabular style={styles.etiquetaSemana}>
                  {formatDayMonthShort(lunes, lang)}
                </AppText>
                {entrenos.map((n, i) => (
                  <View key={i} style={[styles.celda, { backgroundColor: n > 0 ? theme.ink : theme.surfaceAlt }]} />
                ))}
              </View>
              {evento ? (
                <AppText variant="caption" color="textTertiary" style={styles.notaSemana}>
                  {evento.decision === 'reset' ? p.resetDone : p.justified}
                  {evento.reasons.length ? ` · ${evento.reasons.map((r) => streakReasonLabel(r, trato, lang)).join(', ')}` : ''}
                  {evento.note ? ` · ${evento.note}` : ''}
                </AppText>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.seccion}>
        <View style={styles.tituloFila}>
          <AppText variant="heading" accessibilityRole="header" style={styles.flex}>
            {p.setsPerMuscle}
          </AppText>
          <IconButton label={p.whatIsMuscleSets} onPress={() => setTermino('muscle_sets')}>
            <Info size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
          </IconButton>
          <IconButton label={p.prevWeek} onPress={() => setSemanaVolumen((s) => s - 1)}>
            <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
          <IconButton label={p.nextWeek} disabled={semanaVolumen >= 0} onPress={() => setSemanaVolumen((s) => Math.min(0, s + 1))}>
            <ChevronRight size={IconSize.action} strokeWidth={IconStroke} color={semanaVolumen >= 0 ? theme.textTertiary : theme.text} />
          </IconButton>
        </View>
        <AppText variant="caption" color="textSecondary">
          {semanaVolumen === 0 ? p.thisWeek : p.weekOf(formatDayAndMonth(inicioVolumen, lang))}
          {p.setsExplain(WEEKLY_ZONES.low, WEEKLY_ZONES.high)}
        </AppText>
        {MUSCLE_GROUPS.map((g) => {
          const n = volumen.get(g.key) ?? 0;
          const zona = n === 0 ? '' : n < WEEKLY_ZONES.low ? p.below : n > WEEKLY_ZONES.high ? p.above : p.inRange;
          const nombre = muscleGroupName(g.key, lang);
          return (
            <View key={g.key} style={styles.barraFila} accessible accessibilityLabel={p.muscleA11y(nombre, n, zona)}>
              <AppText variant="caption" style={styles.barraEtiqueta} numberOfLines={1}>
                {nombre}
              </AppText>
              <View style={[styles.pista, { backgroundColor: theme.surfaceAlt }]}>
                <View style={[styles.zona, { left: pct(WEEKLY_ZONES.low), width: pct(WEEKLY_ZONES.high - WEEKLY_ZONES.low), borderColor: theme.textTertiary, backgroundColor: theme.border }]} />
                {n > 0 ? <View style={[styles.barra, { width: pct(n), backgroundColor: theme.ink }]} /> : null}
              </View>
              <AppText variant="caption" color={n > 0 ? 'text' : 'textTertiary'} tabular style={styles.barraValor}>
                {Number.isInteger(n) ? n : n.toFixed(1)}
              </AppText>
            </View>
          );
        })}
      </View>

      <View style={[styles.seccion, styles.final]}>
        <AppText variant="heading" accessibilityRole="header">
          {p.achievements}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {p.unlockedCount(achievements.filter((a) => a.unlocked).length, achievements.length)}
        </AppText>
        {achievements.map((a) => (
          <Logro key={a.id} logro={a} />
        ))}
      </View>
      <GlossarySheet termId={termino} onClose={() => setTermino(null)} />
    </Screen>
  );
}

function Logro({ logro }: { logro: Achievement }) {
  const theme = useTheme();
  const lang = useLanguage();
  const p = useT().fitness.progress;
  const progreso = `${formatNumber(logro.progress, lang)} / ${formatNumber(logro.goal, lang)} ${logro.unit}`;
  return (
    <View
      style={[styles.logro, { borderColor: logro.unlocked ? theme.ink : theme.border }]}
      accessible
      accessibilityLabel={p.achievementA11y(logro.title, logro.unlocked ? null : progreso, logro.description)}>
      <View style={[styles.logroIcono, { backgroundColor: logro.unlocked ? theme.ink : theme.surfaceAlt }]}>
        {logro.unlocked ? (
          <Trophy size={IconSize.inline} strokeWidth={IconStroke} color={theme.onInk} />
        ) : (
          <Lock size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
        )}
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong" color={logro.unlocked ? 'text' : 'textSecondary'}>
          {logro.title}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {logro.description}
        </AppText>
        {logro.unlocked ? null : (
          <>
            <View style={[styles.avance, { backgroundColor: theme.surfaceAlt }]}>
              <View style={[styles.avanceLleno, { width: `${(logro.progress / logro.goal) * 100}%`, backgroundColor: theme.textSecondary }]} />
            </View>
            <AppText variant="micro" color="textTertiary" tabular>
              {progreso}
            </AppText>
          </>
        )}
      </View>
    </View>
  );
}

const CELDA = 28;

const styles = StyleSheet.create({
  tarjeta: { padding: Spacing.lg, borderRadius: Radius.lg, borderCurve: 'continuous', gap: Spacing.xs },
  seccion: { gap: Spacing.sm },
  final: { paddingBottom: Spacing['3xl'] },
  tituloFila: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
  semana: { gap: 2 },
  filaCal: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  etiquetaSemana: { width: 56 },
  celdaTexto: { width: CELDA, textAlign: 'center' },
  celda: { width: CELDA, height: CELDA, borderRadius: Radius.sm, borderCurve: 'continuous' },
  notaSemana: { paddingLeft: 62 },
  barraFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 28 },
  barraEtiqueta: { width: 96 },
  pista: { flex: 1, height: 16, borderRadius: Radius.sm, borderCurve: 'continuous', overflow: 'hidden' },
  zona: { position: 'absolute', top: 0, bottom: 0, borderLeftWidth: 1, borderRightWidth: 1 },
  barra: { position: 'absolute', left: 0, top: 4, bottom: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  barraValor: { width: 32, textAlign: 'right' },
  logro: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
  logroIcono: { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  avance: { height: 6, borderRadius: Radius.full, overflow: 'hidden', marginTop: Spacing.xs },
  avanceLleno: { height: 6, borderRadius: Radius.full },
});
