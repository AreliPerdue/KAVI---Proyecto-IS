import { parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { Activity as ActivityIcon, ChevronRight, Footprints, Link2, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Banner, Button, LoadingState } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { anyPermission, useDailyTotals, useExternalSessions, useHealthAvailability, useHealthConnection, useHealthPermissions } from '@/hooks/use-health';
import { useTheme } from '@/hooks/use-theme';
import { useWorkouts } from '@/hooks/use-workouts';
import { formatDayTitle, formatShortDate, formatTime, formatWeekdayAndDay, fromIso } from '@/lib/dates';
import { kaviSpan, matchSessions } from '@/lib/health/match';
import { HEALTH_METRICS, type DailyTotals, type HealthSourceId } from '@/services/health';
import { formatNumber, type Language, useLanguage, useT } from '@/i18n';

const DIAS = 7;
/** Los entrenamientos de otras apps se miran dos semanas atrás: son menos y se consultan menos. */
const DIAS_SESIONES = 14;

const km = (m: number, lang: Language) => formatNumber(m / 1000, lang, { maximumFractionDigits: 1 });
const entero = (n: number, lang: Language) => formatNumber(Math.round(n), lang);

/**
 * Fitness → Actividad (spec 11): lo que el teléfono o el reloj ya miden, en solo lectura y con
 * su fuente a la vista (RF-H5). Sin plataforma, sin permisos o en web, explica por qué está
 * vacío y cómo conectarlo; el Gym Tracker nunca depende de esto (RF-H4).
 */
export function ActivityView() {
  const theme = useTheme();
  const tx = useT();
  const a = tx.fitness.activity;
  const disponible = useHealthAvailability();
  const estado = disponible.data;
  const permisos = useHealthPermissions(estado?.status === 'available');
  const conectado = anyPermission(permisos.data);
  const { connect } = useHealthConnection();

  if (disponible.isPending || (estado?.status === 'available' && permisos.isPending)) return <LoadingState />;

  if (!estado || estado.status !== 'available') {
    return (
      <View style={[styles.tarjeta, { backgroundColor: theme.surfaceAlt }]}>
        <Smartphone size={IconSize.action} strokeWidth={IconStroke} color={theme.textSecondary} />
        <AppText variant="bodyStrong">{estado?.status === 'web' ? a.webTitle : a.unavailableTitle}</AppText>
        <AppText color="textSecondary">{estado ? tx.fitness.health.unavailable[estado.reason] : a.unknown}</AppText>
        <AppText variant="caption" color="textTertiary">
          {a.kaviStillComplete}
        </AppText>
      </View>
    );
  }

  if (!conectado) {
    return (
      <View style={[styles.tarjeta, { backgroundColor: theme.surfaceAlt }]}>
        <ActivityIcon size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        <AppText variant="heading">{a.connectTitle}</AppText>
        <AppText color="textSecondary">
          {a.connectIntro(tx.fitness.health.sources[estado.source])}
        </AppText>
        {HEALTH_METRICS.map((m) => (
          <View key={m.id} style={styles.metrica}>
            <AppText variant="bodyStrong">{tx.fitness.health.metrics[m.id]}</AppText>
            <AppText variant="caption" color="textSecondary">
              {tx.fitness.health.why[m.id]}
            </AppText>
          </View>
        ))}
        <View style={styles.privacidad}>
          <ShieldCheck size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
          <AppText variant="caption" color="textSecondary" style={styles.flex}>
            {a.privacy}
          </AppText>
        </View>
        {connect.error ? <Banner tone="error" message={connect.error.message} /> : null}
        <Button title={a.connect} loading={connect.isPending} onPress={() => connect.mutate(HEALTH_METRICS.map((m) => m.id))} />
      </View>
    );
  }

  return <Conectado source={estado.source} permisos={permisos.data!} />;
}

function Conectado({ source, permisos }: { source: HealthSourceId; permisos: NonNullable<ReturnType<typeof useHealthPermissions>['data']> }) {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const a = tx.fitness.activity;
  const router = useRouter();
  const totales = useDailyTotals(DIAS, true);
  const externas = useExternalSessions(DIAS_SESIONES, permisos.exercise_sessions);
  const workouts = useWorkouts();
  const fuente = tx.fitness.health.sources[source];

  const hoy = totales.data?.[totales.data.length - 1];
  const relacion = useMemo(
    () => matchSessions((workouts.data ?? []).map(kaviSpan), externas.data ?? []),
    [workouts.data, externas.data],
  );
  const kaviDe = useMemo(() => {
    const m = new Map<string, { id: string; nombre: string }>();
    for (const [kaviId, ext] of relacion.byKavi) {
      const w = workouts.data?.find((x) => x.id === kaviId);
      if (w) m.set(ext.id, { id: w.id, nombre: w.title || w.activity_title || a.workoutFallback });
    }
    return m;
  }, [relacion, workouts.data, a]);

  if (totales.isPending) return <LoadingState />;

  return (
    <View style={styles.pila}>
      <View style={styles.encabezado}>
        <AppText variant="heading" accessibilityRole="header">
          {a.today}
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {a.source(fuente)}
        </AppText>
      </View>
      <View style={styles.cifras}>
        <Cifra valor={permisos.steps && hoy?.steps != null ? entero(hoy.steps, lang) : '—'} etiqueta={a.steps} nota={permisos.steps ? null : a.noPermission} />
        <Cifra valor={permisos.distance && hoy?.distanceM != null ? `${km(hoy.distanceM, lang)} km` : '—'} etiqueta={a.distance} nota={permisos.distance ? null : a.noPermission} />
        <Cifra
          valor={permisos.active_calories && hoy?.activeKcal != null ? entero(hoy.activeKcal, lang) : '—'}
          etiqueta={a.activeKcalLabel}
          nota={permisos.active_calories ? null : a.noPermission}
        />
      </View>

      {permisos.steps && totales.data ? <PasosSemana dias={totales.data} /> : null}

      <View style={styles.pila}>
        <AppText variant="heading" accessibilityRole="header">
          {a.otherApps}
        </AppText>
        {!permisos.exercise_sessions ? (
          <AppText color="textSecondary">{a.noSessionsPermission}</AppText>
        ) : (externas.data ?? []).length === 0 ? (
          <AppText color="textSecondary">{a.noneInDays(DIAS_SESIONES)}</AppText>
        ) : (
          [...(externas.data ?? [])]
            .sort((a, b) => b.startAt.localeCompare(a.startAt))
            .map((s) => {
              const suya = kaviDe.get(s.id);
              const minutos = Math.round((fromIso(s.endAt).getTime() - fromIso(s.startAt).getTime()) / 60_000);
              const contenido = (
                <>
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong">{s.title}</AppText>
                    <AppText variant="caption" color="textSecondary" tabular>
                      {formatShortDate(fromIso(s.startAt), lang)} · {formatTime(fromIso(s.startAt), lang)} · {minutos} min
                      {s.activeKcal != null ? a.kcalSuffix(entero(s.activeKcal, lang)) : ''}
                    </AppText>
                    <AppText variant="caption" color="textTertiary">
                      {a.source(s.app ? a.via(s.app, fuente) : fuente)}
                    </AppText>
                    {suya ? (
                      <View style={styles.relacion}>
                        <Link2 size={14} strokeWidth={IconStroke} color={theme.textSecondary} />
                        <AppText variant="caption" color="textSecondary" style={styles.flex}>
                          {a.isYours(suya.nombre)}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  {suya ? <ChevronRight size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} /> : null}
                </>
              );
              return suya ? (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  accessibilityLabel={a.isYoursA11y(s.title, suya.nombre)}
                  onPress={() => router.push({ pathname: '/(app)/workout/[id]', params: { id: suya.id, mode: 'view' } })}
                  style={({ pressed }) => [styles.fila, { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : theme.surface }]}>
                  {contenido}
                </Pressable>
              ) : (
                <View key={s.id} style={[styles.fila, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                  {contenido}
                </View>
              );
            })
        )}
      </View>
    </View>
  );
}

function Cifra({ valor, etiqueta, nota }: { valor: string; etiqueta: string; nota: string | null }) {
  const theme = useTheme();
  return (
    <View style={[styles.cifra, { backgroundColor: theme.surfaceAlt }]}>
      <AppText variant="heading" tabular numberOfLines={1}>
        {valor}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {etiqueta}
      </AppText>
      {nota ? (
        <AppText variant="micro" color="textTertiary">
          {nota}
        </AppText>
      ) : null}
    </View>
  );
}

/** Pasos de los últimos 7 días: una sola serie, barras con su número (sin eje doble ni leyenda). */
function PasosSemana({ dias }: { dias: DailyTotals[] }) {
  const theme = useTheme();
  const lang = useLanguage();
  const a = useT().fitness.activity;
  const max = Math.max(1, ...dias.map((d) => d.steps ?? 0));
  return (
    <View style={styles.pila}>
      <View style={styles.encabezado}>
        <Footprints size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        <AppText variant="label" color="textSecondary">
          {a.stepsLastDays(DIAS)}
        </AppText>
      </View>
      {dias.map((d) => (
        <View key={d.date} style={styles.barraFila} accessible accessibilityLabel={a.stepsA11y(formatDayTitle(parseISO(d.date), lang), d.steps ?? 0)}>
          <AppText variant="caption" color="textSecondary" style={styles.barraDia}>
            {formatWeekdayAndDay(parseISO(d.date), lang)}
          </AppText>
          <View style={[styles.pista, { backgroundColor: theme.surfaceAlt }]}>
            <View style={[styles.barra, { width: `${((d.steps ?? 0) / max) * 100}%`, backgroundColor: theme.ink }]} />
          </View>
          <AppText variant="caption" tabular style={styles.barraValor}>
            {d.steps != null ? entero(d.steps, lang) : '—'}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pila: { gap: Spacing.sm },
  tarjeta: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, borderCurve: 'continuous' },
  metrica: { gap: 2 },
  privacidad: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1, gap: 2 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, justifyContent: 'space-between' },
  cifras: { flexDirection: 'row', gap: Spacing.sm },
  cifra: { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous', gap: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
  relacion: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  barraFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 24 },
  barraDia: { width: 56 },
  pista: { flex: 1, height: 12, borderRadius: Radius.sm, borderCurve: 'continuous', overflow: 'hidden' },
  barra: { height: 12, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  barraValor: { width: 56, textAlign: 'right' },
});
