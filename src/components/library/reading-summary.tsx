import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Language, useLanguage, useT } from '@/i18n';
import { formatShortDate, formatTime } from '@/lib/dates';
import { horasYMinutos, resumir } from '@/lib/library/reading-time';
import type { LibraryItem, LibraryReadingSession } from '@/types/domain';

/** "1 h 5 min", "45 min" o "menos de 1 min". */
export function useDuracion() {
  const t = useT().library.time;
  return (segundos: number) => {
    if (segundos > 0 && segundos < 30) return t.lessThanMinute;
    const { h, min } = horasYMinutos(segundos);
    return t.duration(h, min);
  };
}

const MAX_SESIONES = 30;
const ALTO_BARRA = 48;

/**
 * El resumen del tiempo de lectura (spec 13b, RF-BR13; T318): totales, una franja por día de la semana, a
 * qué horas se suele leer y las sesiones (las 30 más nuevas). Sin gráficas complicadas. Para un libro (en
 * su detalle) o para toda la biblioteca, donde además se dice de qué libro es cada sesión.
 */
export function ReadingSummary({
  sesiones,
  piezas,
  vacio,
}: {
  sesiones: readonly LibraryReadingSession[];
  /** Con las piezas, cada sesión dice su libro (resumen de la biblioteca). */
  piezas?: ReadonlyMap<string, Pick<LibraryItem, 'title'>>;
  vacio: string;
}) {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const t = tx.library.time;
  const duracion = useDuracion();

  if (!sesiones.length) {
    return (
      <AppText variant="body" color="textSecondary">
        {vacio}
      </AppText>
    );
  }
  const r = resumir(sesiones);
  const maximo = Math.max(...r.porDia, 1);
  const datos: [string, string][] = [
    [t.total, duracion(r.segundos)],
    [t.sessions, String(r.sesiones)],
    [t.average, duracion(r.promedio)],
    [t.days, String(r.dias)],
    ...(r.franjaFavorita ? ([[t.usually, t.slots[r.franjaFavorita]]] as [string, string][]) : []),
  ];

  return (
    <View style={styles.cuerpo}>
      <View style={styles.datos}>
        {datos.map(([k, v]) => (
          <View key={k} style={[styles.dato, { backgroundColor: theme.surfaceAlt }]} accessible accessibilityLabel={`${k}: ${v}`}>
            <AppText variant="caption" color="textSecondary">
              {k}
            </AppText>
            <AppText variant="bodyStrong" tabular>
              {v}
            </AppText>
          </View>
        ))}
      </View>

      <AppText variant="label" color="textSecondary">
        {t.byDay}
      </AppText>
      <View style={styles.semana}>
        {r.porDia.map((s, i) => (
          <View key={t.weekdays[i]} style={styles.dia} accessible accessibilityLabel={t.dayA11y(t.weekdaysLong[i], duracion(s))}>
            <View style={[styles.riel, { backgroundColor: theme.surfaceAlt }]}>
              <View style={[styles.barra, { height: s > 0 ? Math.max(4, (s / maximo) * ALTO_BARRA) : 0, backgroundColor: theme.ink }]} />
            </View>
            <AppText variant="caption" color="textSecondary">
              {t.weekdays[i]}
            </AppText>
          </View>
        ))}
      </View>

      <AppText variant="label" color="textSecondary">
        {t.list}
      </AppText>
      {sesiones.slice(0, MAX_SESIONES).map((s) => (
        <FilaDeSesion key={s.id} sesion={s} titulo={piezas?.get(s.item_id)?.title} duracion={duracion(s.seconds)} lang={lang} />
      ))}
    </View>
  );
}

function FilaDeSesion({ sesion, titulo, duracion, lang }: { sesion: LibraryReadingSession; titulo?: string; duracion: string; lang: Language }) {
  const theme = useTheme();
  const t = useT().library.time;
  const inicio = new Date(sesion.started_at);
  const cuando = t.session(formatShortDate(inicio, lang), formatTime(inicio, lang), formatTime(new Date(sesion.ended_at), lang));
  const desde = sesion.start_locator?.page;
  const hasta = sesion.end_locator?.page;
  const tramo =
    desde != null && hasta != null
      ? t.pages(desde, hasta)
      : sesion.start_progress != null && sesion.end_progress != null
        ? t.percents(Math.round(sesion.start_progress * 100), Math.round(sesion.end_progress * 100))
        : null;
  return (
    <View style={[styles.sesion, { borderColor: theme.border }]} accessible accessibilityLabel={[titulo, cuando, duracion, tramo].filter(Boolean).join('. ')}>
      <View style={styles.sesionTexto}>
        {titulo ? (
          <AppText variant="bodyStrong" numberOfLines={1}>
            {titulo}
          </AppText>
        ) : null}
        <AppText variant="label" color="textSecondary" tabular>
          {cuando}
        </AppText>
        {tramo ? (
          <AppText variant="caption" color="textTertiary" tabular>
            {tramo}
          </AppText>
        ) : null}
      </View>
      <AppText variant="bodyStrong" tabular>
        {duracion}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.md },
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dato: { minWidth: 120, flexGrow: 1, padding: Spacing.md, gap: 2, borderRadius: Radius.md, borderCurve: 'continuous' },
  semana: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.xs },
  dia: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  riel: { width: 14, height: ALTO_BARRA, borderRadius: Radius.sm, borderCurve: 'continuous', justifyContent: 'flex-end', overflow: 'hidden' },
  barra: { width: '100%', borderRadius: Radius.sm, borderCurve: 'continuous' },
  sesion: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  sesionTexto: { flex: 1, gap: 2 },
});
