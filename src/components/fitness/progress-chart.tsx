import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

export type ChartPoint = { label: string; value: number };

const ALTO = 140;
const MARGEN_IZQ = 44;
const MARGEN_ARRIBA = 12;
const MARGEN_ABAJO = 8;

/** Ticks redondos: 0, 50, 100… según el rango, para que el eje se lea de un vistazo. */
function ticksDe(min: number, max: number): number[] {
  const rango = max - min || Math.max(1, Math.abs(max));
  const paso = 10 ** Math.floor(Math.log10(rango / 2));
  const bonito = [1, 2, 2.5, 5, 10].map((m) => m * paso).find((p) => rango / p <= 4) ?? paso * 10;
  const desde = Math.floor(min / bonito) * bonito;
  const hasta = Math.ceil(max / bonito) * bonito;
  const ticks: number[] = [];
  for (let v = desde; v <= hasta + bonito / 2; v += bonito) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

/**
 * Gráfica de progreso de una sola serie (RF-F26): e1RM o volumen por sesión.
 *
 * Una serie, una gráfica: e1RM y volumen van en dos, nunca en una con dos ejes. Sin
 * leyenda, porque el título ya dice qué se pinta. Línea de 2 px y puntos de 8 px en tinta
 * (la app es monocroma; el color es de los datos de calendario, no de esto), rejilla de
 * hairline y solo se rotulan el último punto y el que se toque. La lista de sesiones bajo
 * la gráfica hace de vista de tabla, así ningún valor depende de la gráfica.
 */
export function ProgressChart({ title, points, format }: { title: string; points: ChartPoint[]; format: (v: number) => string }) {
  const theme = useTheme();
  const c = useT().fitness.chart;
  const [ancho, setAncho] = useState(0);
  const [elegido, setElegido] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <View style={styles.caja}>
        <AppText variant="label" color="textSecondary">
          {title}
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {c.needsTwo}
        </AppText>
      </View>
    );
  }

  const valores = points.map((p) => p.value);
  const ticks = ticksDe(Math.min(...valores), Math.max(...valores));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const plotAncho = Math.max(1, ancho - MARGEN_IZQ - 8);
  const plotAlto = ALTO - MARGEN_ARRIBA - MARGEN_ABAJO;
  const x = (i: number) => MARGEN_IZQ + (points.length === 1 ? plotAncho / 2 : (i / (points.length - 1)) * plotAncho);
  const y = (v: number) => MARGEN_ARRIBA + plotAlto - ((v - yMin) / (yMax - yMin || 1)) * plotAlto;
  const camino = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const activo = elegido ?? points.length - 1;

  return (
    <View style={styles.caja}>
      <View style={styles.titulo}>
        <AppText variant="label" color="textSecondary">
          {title}
        </AppText>
        <AppText variant="caption" color="textSecondary" tabular>
          {points[activo].label} · {format(points[activo].value)}
        </AppText>
      </View>
      <View onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)} accessibilityLabel={c.rangeA11y(title, format(points[0].value), format(points[points.length - 1].value))}>
        {ancho > 0 ? (
          <Svg width={ancho} height={ALTO}>
            {ticks.map((t) => (
              <Line key={t} x1={MARGEN_IZQ} x2={ancho - 8} y1={y(t)} y2={y(t)} stroke={theme.border} strokeWidth={1} />
            ))}
            <Path d={camino} stroke={theme.text} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" fill="none" />
            {points.map((p, i) => (
              <Circle key={i} cx={x(i)} cy={y(p.value)} r={i === activo ? 6 : 4} fill={theme.text} stroke={theme.surface} strokeWidth={2} />
            ))}
          </Svg>
        ) : (
          <View style={{ height: ALTO }} />
        )}
        {/* Etiquetas del eje en texto de la app, no dentro del SVG, para que hereden la tipografía. */}
        {ancho > 0
          ? ticks.map((t) => (
              <AppText key={t} variant="micro" color="textTertiary" tabular style={[styles.tick, { top: y(t) - 7 }]}>
                {format(t)}
              </AppText>
            ))
          : null}
        {/* Zonas de toque más grandes que los puntos: una columna por sesión. */}
        {ancho > 0 ? (
          <View style={[StyleSheet.absoluteFill, styles.toques, { left: MARGEN_IZQ - 12 }]}>
            {points.map((p, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${p.label}: ${format(p.value)}`}
                onPress={() => setElegido(i)}
                style={styles.toque}
              />
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.ejeX}>
        <AppText variant="micro" color="textTertiary">
          {points[0].label}
        </AppText>
        <AppText variant="micro" color="textTertiary">
          {points[points.length - 1].label}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { gap: Spacing.xs },
  titulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  tick: { position: 'absolute', left: 0, width: MARGEN_IZQ - 6, textAlign: 'right' },
  toques: { flexDirection: 'row' },
  toque: { flex: 1 },
  ejeX: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: MARGEN_IZQ },
});
