import { useRouter } from 'expo-router';
import { BookOpen, CalendarDays, ChartNoAxesColumn, Flame, Play, Plus, Trophy } from 'lucide-react-native';
import { type ReactNode, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { StreakPause, useNoLegsLine } from '@/components/fitness/streak-card';
import { AppText } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useGymProgress } from '@/hooks/use-gym-progress';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, useLanguage, useT } from '@/i18n';
import { muscleGroupName } from '@/lib/gym/display-names';
import { formatWeight } from '@/lib/gym/units';
import { weekSummary } from '@/lib/gym/week';
import { useGymStore } from '@/store/gym-store';

export type FitnessBentoProps = {
  /** 2 columnas en celular (y junto al historial en pantallas muy anchas); 4 en pantallas anchas. */
  columns: 2 | 4;
  /** La sesión abierta, si hay: la tarjeta grande la retoma en vez de empezar otra. */
  inProgress: { name: string; since: string } | null;
  starting: boolean;
  onStart: () => void;
  onContinue: () => void;
};

/**
 * El mosaico de arriba de Fitness (spec 07, RF-F66): empezar, racha, esta semana, músculos,
 * logros y glosario. Todo sale del historial; no hay nada guardado aparte.
 *
 * Las tarjetas se acomodan en filas con `flex`, no en una cuadrícula fija: así cada fila decide
 * qué tarjeta va más ancha y el texto largo (o la letra grande del sistema) crece hacia abajo sin
 * cortarse.
 */
export function FitnessBento({ columns, inProgress, starting, onStart, onContinue }: FitnessBentoProps) {
  const theme = useTheme();
  const router = useRouter();
  const lang = useLanguage();
  const tx = useT();
  const b = tx.fitness.bento;
  const progreso = useGymProgress();
  const unit = useGymStore((s) => s.weightUnit);
  const sinPierna = useNoLegsLine();

  const semana = useMemo(() => weekSummary(progreso.sessions, progreso.catalog, progreso.now), [progreso.sessions, progreso.catalog, progreso.now]);
  const streak = progreso.streak;
  const logros = progreso.achievements;
  const abrirProgreso = () => router.push('/(app)/progress');
  const series = (n: number) => b.setsShort(Number.isInteger(n) ? String(n) : formatNumber(n, lang, { maximumFractionDigits: 1 }));

  const empezar = (
    <Pressable
      key="empezar"
      accessibilityRole="button"
      accessibilityLabel={inProgress ? tx.fitness.tab.continueA11y(inProgress.name) : tx.fitness.tab.freeWorkout}
      disabled={starting}
      onPress={inProgress ? onContinue : onStart}
      style={({ pressed }) => [styles.tarjeta, styles.grande, { backgroundColor: theme.ink, borderColor: theme.ink }, pressed ? styles.pressed : null]}>
      <View style={[styles.circulo, { backgroundColor: theme.onInk }]}>
        {starting ? (
          <ActivityIndicator color={theme.ink} />
        ) : inProgress ? (
          <Play size={IconSize.action} strokeWidth={IconStroke} color={theme.ink} fill={theme.ink} />
        ) : (
          <Plus size={IconSize.action} strokeWidth={IconStroke} color={theme.ink} />
        )}
      </View>
      <View style={styles.pie}>
        <AppText variant="heading" color="onInk">
          {inProgress ? tx.fitness.tab.inProgress : tx.fitness.tab.freeWorkout}
        </AppText>
        <AppText variant="caption" color="onInk">
          {inProgress ? tx.fitness.tab.since(inProgress.name, inProgress.since) : b.startNow}
        </AppText>
      </View>
    </Pressable>
  );

  const racha = (
    <Tarjeta key="racha" icon={<Flame size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} label={b.streak} hint={b.opensProgress} onPress={abrirProgreso}>
      <AppText variant="heading" tabular>
        {streak ? tx.fitness.streak.weeks(streak.weeks) : '—'}
      </AppText>
      {streak ? (
        <AppText variant="caption" color="textSecondary">
          {streak.trainedThisWeek ? tx.fitness.streak.countsThisWeek : tx.fitness.streak.trainThisWeek}
        </AppText>
      ) : null}
    </Tarjeta>
  );

  const estaSemana = (
    <Tarjeta key="semana" icon={<CalendarDays size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} label={b.thisWeek} hint={b.opensProgress} onPress={abrirProgreso}>
      <AppText variant="heading" tabular>
        {progreso.isPending ? '—' : b.sessions(semana.sessions)}
      </AppText>
      {semana.volumeKg > 0 ? (
        <AppText variant="caption" color="textSecondary" tabular>
          {b.volume(formatWeight(semana.volumeKg, unit))}
        </AppText>
      ) : null}
    </Tarjeta>
  );

  const musculos = (
    <Tarjeta key="musculos" icon={<ChartNoAxesColumn size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} label={b.muscles} hint={b.opensProgress} onPress={abrirProgreso}>
      {semana.topGroups.length === 0 ? (
        <AppText variant="caption" color="textSecondary">
          {b.musclesEmpty}
        </AppText>
      ) : (
        semana.topGroups.map((g) => (
          <AppText key={g.key} variant="label" tabular numberOfLines={1}>
            {b.muscleLine(muscleGroupName(g.key, lang), series(g.sets))}
          </AppText>
        ))
      )}
    </Tarjeta>
  );

  const desbloqueados = logros ? logros.filter((a) => a.unlocked).length : 0;
  const tarjetaLogros = (
    <Tarjeta key="logros" icon={<Trophy size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} label={b.achievements} hint={b.opensProgress} onPress={abrirProgreso}>
      <AppText variant="heading" tabular>
        {logros ? b.achievementsCount(desbloqueados, logros.length) : '—'}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {b.unlocked}
      </AppText>
    </Tarjeta>
  );

  const glosario = (
    <Tarjeta
      key="glosario"
      icon={<BookOpen size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
      label={b.glossary}
      hint={b.opensGlossary}
      onPress={() => router.push('/(app)/glossary')}>
      <AppText variant="caption" color="textSecondary">
        {b.glossaryHint}
      </AppText>
    </Tarjeta>
  );

  /*
   * Filas del mosaico. En 2 columnas, la tarjeta grande va a la izquierda arriba y la de músculos a
   * la derecha en medio: el ojo baja en zigzag. En 4 columnas caben en dos filas.
   */
  const filas: { tarjeta: ReactNode; peso: number }[][] =
    columns === 4
      ? [
          [
            { tarjeta: empezar, peso: 2 },
            { tarjeta: racha, peso: 1 },
            { tarjeta: estaSemana, peso: 1 },
          ],
          [
            { tarjeta: musculos, peso: 2 },
            { tarjeta: tarjetaLogros, peso: 1 },
            { tarjeta: glosario, peso: 1 },
          ],
        ]
      : [
          [
            { tarjeta: empezar, peso: 1.35 },
            { tarjeta: racha, peso: 1 },
          ],
          [
            { tarjeta: estaSemana, peso: 1 },
            { tarjeta: musculos, peso: 1.35 },
          ],
          [
            { tarjeta: tarjetaLogros, peso: 1 },
            { tarjeta: glosario, peso: 1 },
          ],
        ];

  return (
    <View style={styles.pila}>
      {/* RF-F58: una racha en pausa pide una decisión, así que va antes del mosaico y a todo lo ancho. */}
      <StreakPause />
      {filas.map((fila, i) => (
        <View key={i} style={styles.fila}>
          {fila.map(({ tarjeta, peso }, j) => (
            <View key={j} style={{ flex: peso }}>
              {tarjeta}
            </View>
          ))}
        </View>
      ))}
      {sinPierna ? (
        <AppText variant="caption" color="textSecondary">
          {sinPierna}
        </AppText>
      ) : null}
    </View>
  );
}

function Tarjeta({ icon, label, hint, onPress, children }: { icon: ReactNode; label: string; hint: string; onPress: () => void; children: ReactNode }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => [styles.tarjeta, { backgroundColor: pressed ? theme.surfaceAlt : theme.surface, borderColor: theme.border }]}>
      <View style={styles.encabezado}>
        <View style={[styles.icono, { backgroundColor: theme.surfaceAlt }]}>{icon}</View>
        <AppText variant="label" color="textSecondary" style={styles.flexTexto} numberOfLines={2}>
          {label}
        </AppText>
      </View>
      <View style={styles.contenido}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pila: { gap: Spacing.sm },
  fila: { flexDirection: 'row', gap: Spacing.sm },
  tarjeta: {
    flexGrow: 1,
    minHeight: 112,
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  grande: { minHeight: 132, justifyContent: 'space-between' },
  circulo: { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  pie: { gap: 2 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  icono: { width: 32, height: 32, borderRadius: Radius.sm, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  contenido: { gap: 2 },
  flexTexto: { flexShrink: 1 },
  pressed: { opacity: 0.85 },
});
