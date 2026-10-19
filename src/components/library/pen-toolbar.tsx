import { Check, Eraser, Highlighter, Pencil, PenLine, Redo2, Undo2 } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, IconButton } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { type HerramientaDeLapiz, HERRAMIENTAS_DE_LAPIZ, PX_DE_GROSOR, type PreferenciaDeLapiz } from '@/lib/library/ink';

const ICONOS: Record<HerramientaDeLapiz, ComponentType<{ size: number; strokeWidth: number; color: string }>> = {
  pen: PenLine,
  marker: Highlighter,
  pencil: Pencil,
  eraser: Eraser,
};

type Props = {
  lapiz: PreferenciaDeLapiz;
  /** La tinta del tema del lector: el color de la pluma y el lápiz si no se eligió otro. */
  tinta: string;
  onHerramienta: (h: HerramientaDeLapiz) => void;
  onAjustes: () => void;
  puedeDeshacer: boolean;
  puedeRehacer: boolean;
  onDeshacer: () => void;
  onRehacer: () => void;
  onListo: () => void;
};

/**
 * Las herramientas del lápiz (spec 13c, RF-BH11; T291), en el lugar de las de pegar mientras se dibuja: pluma,
 * marcador, lápiz de color y borrador; el color y grosor de la elegida (un punto de ese color y tamaño);
 * deshacer, rehacer y Listo para volver a leer.
 */
export function PenToolbar(p: Props) {
  const theme = useTheme();
  const a = useT().library.annotations;
  const icono = (activo = true) => ({ size: IconSize.action, strokeWidth: IconStroke, color: activo ? theme.text : theme.textTertiary });
  const h = p.lapiz.tool;
  const color = h === 'eraser' ? theme.textSecondary : (p.lapiz.colors[h] ?? p.tinta);
  // El punto de muestra crece con el grosor (sin pasar del botón).
  const punto = Math.min(22, Math.max(6, PX_DE_GROSOR[h][p.lapiz.sizes[h]] * (h === 'marker' ? 0.9 : h === 'eraser' ? 0.6 : 2.4)));
  const aviso = h === 'eraser' ? a.eraserOn : p.lapiz.penOnly ? a.penOnlyOn : a.penOn;

  return (
    <View style={styles.contenedor}>
      <View style={styles.avisoCaja} pointerEvents="none" accessibilityLiveRegion="polite">
        <AppText variant="caption" color="textSecondary" style={[styles.aviso, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {aviso}
        </AppText>
      </View>
      <View style={styles.fila} accessibilityRole="toolbar" accessibilityLabel={a.pen}>
        {HERRAMIENTAS_DE_LAPIZ.map((x) => {
          const Icono = ICONOS[x];
          const activa = x === h;
          return (
            <IconButton
              key={x}
              label={a.penTools[x]}
              onPress={() => p.onHerramienta(x)}
              selected={activa}
              style={activa ? { backgroundColor: theme.ink } : null}>
              <Icono size={IconSize.action} strokeWidth={IconStroke} color={activa ? theme.onInk : theme.text} />
            </IconButton>
          );
        })}
        <IconButton label={a.penSettings} onPress={p.onAjustes}>
          <View style={[styles.punto, { width: punto, height: punto, backgroundColor: color, borderColor: theme.textTertiary }]} />
        </IconButton>
        <View style={[styles.separador, { backgroundColor: theme.border }]} />
        <IconButton label={a.undo} onPress={p.onDeshacer} disabled={!p.puedeDeshacer}>
          <Undo2 {...icono(p.puedeDeshacer)} />
        </IconButton>
        <IconButton label={a.redo} onPress={p.onRehacer} disabled={!p.puedeRehacer}>
          <Redo2 {...icono(p.puedeRehacer)} />
        </IconButton>
        <IconButton label={a.penDone} onPress={p.onListo}>
          <Check {...icono()} />
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', paddingHorizontal: Spacing.sm },
  // Ocho botones de 44 caben en 375 px; en algo más angosto, la fila se parte.
  fila: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', borderRadius: Radius.full, borderCurve: 'continuous' },
  separador: { width: 1, height: 24, marginHorizontal: 2 },
  punto: { borderRadius: Radius.full, borderWidth: 1 },
  avisoCaja: { position: 'absolute', bottom: '100%', left: Spacing.lg, right: Spacing.lg, alignItems: 'center', paddingBottom: Spacing.xs },
  aviso: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
    textAlign: 'center',
  },
});
