import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { Activity as ActivityIcon, ChevronRight, Footprints, Link2, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Banner, Button, LoadingState } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { anyPermission, useDailyTotals, useExternalSessions, useHealthAvailability, useHealthConnection, useHealthPermissions } from '@/hooks/use-health';
import { useTheme } from '@/hooks/use-theme';
import { useWorkouts } from '@/hooks/use-workouts';
import { formatShortDate, formatTime, fromIso } from '@/lib/dates';
import { kaviSpan, matchSessions } from '@/lib/health/match';
import { HEALTH_METRICS, HEALTH_SOURCE_LABEL, type DailyTotals, type HealthSourceId } from '@/services/health';

const DIAS = 7;
/** Los entrenamientos de otras apps se miran dos semanas atrás: son menos y se consultan menos. */
const DIAS_SESIONES = 14;

const km = (m: number) => (m / 1000).toLocaleString('es-MX', { maximumFractionDigits: 1 });
const entero = (n: number) => Math.round(n).toLocaleString('es-MX');

/**
 * Fitness → Actividad (spec 11): lo que el teléfono o el reloj ya miden, en solo lectura y con
 * su fuente a la vista (RF-H5). Sin plataforma, sin permisos o en web, explica por qué está
 * vacío y cómo conectarlo; el Gym Tracker nunca depende de esto (RF-H4).
 */
export function ActivityView() {
  const theme = useTheme();
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
        <AppText variant="bodyStrong">{estado?.status === 'web' ? 'Tu actividad vive en tu teléfono' : 'Actividad no disponible'}</AppText>
        <AppText color="textSecondary">{estado?.message ?? 'No se pudo saber si este dispositivo tiene datos de actividad.'}</AppText>
        <AppText variant="caption" color="textTertiary">
          Tus entrenamientos de KAVI siguen completos en Ejercicio.
        </AppText>
      </View>
    );
  }

  if (!conectado) {
    return (
      <View style={[styles.tarjeta, { backgroundColor: theme.surfaceAlt }]}>
        <ActivityIcon size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        <AppText variant="heading">Conecta tu actividad</AppText>
        <AppText color="textSecondary">
          KAVI puede mostrar lo que tu teléfono o reloj ya miden ({HEALTH_SOURCE_LABEL[estado.source]}), junto a tus entrenamientos. Tú eliges qué
          compartir:
        </AppText>
        {HEALTH_METRICS.map((m) => (
          <View key={m.id} style={styles.metrica}>
            <AppText variant="bodyStrong">{m.label}</AppText>
            <AppText variant="caption" color="textSecondary">
              {m.why}
            </AppText>
          </View>
        ))}
        <View style={styles.privacidad}>
          <ShieldCheck size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
          <AppText variant="caption" color="textSecondary" style={styles.flex}>
            Solo se leen en este dispositivo. KAVI no los sube a internet ni los comparte, y puedes desconectarlos cuando quieras desde Perfil.
          </AppText>
        </View>
        {connect.error ? <Banner tone="error" message={connect.error.message} /> : null}
        <Button title="Conectar" loading={connect.isPending} onPress={() => connect.mutate(HEALTH_METRICS.map((m) => m.id))} />
      </View>
    );
  }

  return <Conectado source={estado.source} permisos={permisos.data!} />;
}

function Conectado({ source, permisos }: { source: HealthSourceId; permisos: NonNullable<ReturnType<typeof useHealthPermissions>['data']> }) {
  const theme = useTheme();
  const router = useRouter();
  const totales = useDailyTotals(DIAS, true);
  const externas = useExternalSessions(DIAS_SESIONES, permisos.exercise_sessions);
  const workouts = useWorkouts();
  const fuente = HEALTH_SOURCE_LABEL[source];

  const hoy = totales.data?.[totales.data.length - 1];
  const relacion = useMemo(
    () => matchSessions((workouts.data ?? []).map(kaviSpan), externas.data ?? []),
    [workouts.data, externas.data],
  );
  const kaviDe = useMemo(() => {
    const m = new Map<string, { id: string; nombre: string }>();
    for (const [kaviId, ext] of relacion.byKavi) {
      const w = workouts.data?.find((x) => x.id === kaviId);
      if (w) m.set(ext.id, { id: w.id, nombre: w.title || w.activity_title || 'Entrenamiento' });
    }
    return m;
  }, [relacion, workouts.data]);

  if (totales.isPending) return <LoadingState />;

  return (
    <View style={styles.pila}>
      <View style={styles.encabezado}>
        <AppText variant="heading" accessibilityRole="header">
          Hoy
        </AppText>
        <AppText variant="caption" color="textTertiary">
          Fuente: {fuente}
        </AppText>
      </View>
      <View style={styles.cifras}>
        <Cifra valor={permisos.steps && hoy?.steps != null ? entero(hoy.steps) : '—'} etiqueta="Pasos" nota={permisos.steps ? null : 'Sin permiso'} />
        <Cifra valor={permisos.distance && hoy?.distanceM != null ? `${km(hoy.distanceM)} km` : '—'} etiqueta="Distancia" nota={permisos.distance ? null : 'Sin permiso'} />
        <Cifra
          valor={permisos.active_calories && hoy?.activeKcal != null ? entero(hoy.activeKcal) : '—'}
          etiqueta="Calorías activas (kcal)"
          nota={permisos.active_calories ? null : 'Sin permiso'}
        />
      </View>

      {permisos.steps && totales.data ? <PasosSemana dias={totales.data} /> : null}

      <View style={styles.pila}>
        <AppText variant="heading" accessibilityRole="header">
          Entrenamientos de otras apps
        </AppText>
        {!permisos.exercise_sessions ? (
          <AppText color="textSecondary">Sin permiso para leerlos. Puedes darlo desde Perfil → Datos de salud.</AppText>
        ) : (externas.data ?? []).length === 0 ? (
          <AppText color="textSecondary">Ninguno en los últimos {DIAS_SESIONES} días.</AppText>
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
                      {formatShortDate(fromIso(s.startAt))} · {formatTime(fromIso(s.startAt))} · {minutos} min
                      {s.activeKcal != null ? ` · ${entero(s.activeKcal)} kcal activas` : ''}
                    </AppText>
                    <AppText variant="caption" color="textTertiary">
                      Fuente: {s.app ? `${s.app} vía ${fuente}` : fuente}
                    </AppText>
                    {suya ? (
                      <View style={styles.relacion}>
                        <Link2 size={14} strokeWidth={IconStroke} color={theme.textSecondary} />
                        <AppText variant="caption" color="textSecondary" style={styles.flex}>
                          Es tu sesión «{suya.nombre}» de KAVI: se cuenta una sola vez.
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
                  accessibilityLabel={`${s.title}, es tu sesión ${suya.nombre} de KAVI. Abrirla`}
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
  const max = Math.max(1, ...dias.map((d) => d.steps ?? 0));
  return (
    <View style={styles.pila}>
      <View style={styles.encabezado}>
        <Footprints size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        <AppText variant="label" color="textSecondary">
          Pasos, últimos {DIAS} días
        </AppText>
      </View>
      {dias.map((d) => (
        <View key={d.date} style={styles.barraFila} accessible accessibilityLabel={`${format(parseISO(d.date), "EEEE d 'de' MMMM", { locale: es })}: ${d.steps ?? 0} pasos`}>
          <AppText variant="caption" color="textSecondary" style={styles.barraDia}>
            {format(parseISO(d.date), 'EEE d', { locale: es })}
          </AppText>
          <View style={[styles.pista, { backgroundColor: theme.surfaceAlt }]}>
            <View style={[styles.barra, { width: `${((d.steps ?? 0) / max) * 100}%`, backgroundColor: theme.ink }]} />
          </View>
          <AppText variant="caption" tabular style={styles.barraValor}>
            {d.steps != null ? entero(d.steps) : '—'}
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
