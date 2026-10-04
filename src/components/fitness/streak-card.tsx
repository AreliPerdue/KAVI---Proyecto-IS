import { addDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { ChevronRight, Flame, PauseCircle } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Banner, Button, Chip, TextField } from '@/components/ui';
import { gymratLineFor, STREAK_REASONS, streakReasonLabel } from '@/constants/gymrat';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useGymProgress, useStreakDecision } from '@/hooks/use-gym-progress';
import { useTheme } from '@/hooks/use-theme';
import { isLegDay } from '@/lib/gym/muscles';
import { weekKey } from '@/lib/gym/streak';
import { useGymStore } from '@/store/gym-store';

/** "La semana del 5 de octubre" o "Del 5 al 25 de octubre". */
export function gapLabel(weeks: readonly string[]): string {
  const dia = (d: Date) => format(d, "d 'de' MMMM", { locale: es });
  const inicio = parseISO(weeks[0]);
  if (weeks.length === 1) return `La semana del ${dia(inicio)}`;
  const fin = addDays(parseISO(weeks[weeks.length - 1]), 6);
  return `Del ${dia(inicio)} al ${dia(fin)}`;
}

/**
 * Racha de Hierro en Fitness (RF-F58). Si está en pausa, pregunta qué pasó y la persona
 * decide; si no, una fila con las semanas que lleva que abre Progreso.
 */
export function StreakCard() {
  const theme = useTheme();
  const router = useRouter();
  const progreso = useGymProgress();
  const serio = useGymStore((s) => s.seriousMode);
  const trato = useGymStore((s) => s.trato);
  const streak = progreso.streak;

  /** "¿Y la pierna?": entrena, pero lleva más de 7 días sin pierna (RF-F55). */
  const sinPierna = useMemo(() => {
    const log = progreso.sessions;
    if (serio || log.length === 0) return null;
    const hace = (dias: number) => progreso.now.getTime() - dias * 86_400_000;
    const ultima = log[log.length - 1];
    if (new Date(ultima.performed_at).getTime() < hace(7)) return null;
    const pierna = [...log].reverse().find((w) => isLegDay(w.exercises, progreso.catalog));
    if (pierna && new Date(pierna.performed_at).getTime() >= hace(7)) return null;
    return gymratLineFor('no_legs', trato, serio, weekKey(progreso.now));
  }, [progreso.sessions, progreso.catalog, progreso.now, serio, trato]);

  if (!streak) return null;
  if (streak.paused) return <Pausa key={streak.paused.weeks.join()} weeks={streak.paused.weeks} semanas={streak.weeks} />;
  if (progreso.sessions.length === 0) return null;

  return (
    <View style={styles.pila}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Racha de Hierro: ${streak.weeks} ${streak.weeks === 1 ? 'semana' : 'semanas'}. Ver progreso`}
        onPress={() => router.push('/(app)/progress')}
        style={({ pressed }) => [styles.fila, { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : theme.surface }]}>
        <View style={[styles.icono, { backgroundColor: theme.surfaceAlt }]}>
          <Flame size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" tabular>
            Racha de Hierro · {streak.weeks} {streak.weeks === 1 ? 'semana' : 'semanas'}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {streak.trainedThisWeek ? 'Esta semana ya cuenta.' : 'Entrena esta semana para sumar otra.'} Ver progreso y logros
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
  const trato = useGymStore((s) => s.trato);
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
            {gapLabel(weeks)} no registraste entreno. ¿Qué pasó?
          </AppText>
          <AppText variant="caption" color="textSecondary">
            Tu racha de {semanas} {semanas === 1 ? 'semana' : 'semanas'} está en pausa, no en cero. Tú decides.
          </AppText>
        </View>
      </View>
      <View style={styles.chips}>
        {STREAK_REASONS.map((r) => {
          const puesto = motivos.includes(r);
          return <Chip key={r} compact label={streakReasonLabel(r, trato)} selected={puesto} onPress={() => setMotivos((xs) => (puesto ? xs.filter((x) => x !== r) : [...xs, r]))} />;
        })}
      </View>
      <TextField label="Nota (opcional)" value={nota} onChangeText={setNota} placeholder="Cierre de mes, gripa…" maxLength={500} multiline />
      {decidir.error ? <Banner tone="error" message={decidir.error.message} /> : null}
      <View style={styles.botones}>
        <View style={styles.flex}>
          <Button title="Reiniciar racha" variant="secondary" disabled={decidir.isPending} onPress={() => enviar('reset')} />
        </View>
        <View style={styles.flex}>
          <Button title="Mi racha sigue" loading={decidir.isPending} onPress={() => enviar('kept')} />
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
