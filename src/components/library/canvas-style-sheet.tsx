import { StyleSheet, View } from 'react-native';

import { ActionRow, AppText, Segmented, Sheet, SwitchRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { BORDES, type ElementoDeLienzo } from '@/lib/library/canvas';

type Grosor = 'none' | 'thin' | 'thick';
type Opacidad = '100' | '75' | '50' | '25';

/**
 * El estilo de lo elegido en el lienzo creativo (spec 13h, RF-CC9, RF-CC12; T342): su color (texto y formas),
 * opacidad, borde con su color y sombra. Lo que se cambia aquí se aplica a todo lo que va junto (su grupo o lo
 * elegido a la vez) y se puede deshacer.
 */
export function CanvasStyleSheet({
  elemento,
  onClose,
  onCambiar,
  onColor,
  onColorDeBorde,
}: {
  elemento: ElementoDeLienzo | null;
  onClose: () => void;
  onCambiar: (estilo: Partial<ElementoDeLienzo['style']>) => void;
  onColor: () => void;
  onColorDeBorde: () => void;
}) {
  const theme = useTheme();
  const s = useT().library.canvas.style;
  const estilo = elemento?.style ?? {};
  const conColor = elemento?.type === 'shape' || elemento?.type === 'textbox' || elemento?.type === 'asset' || elemento?.type === 'quote' || elemento?.type === 'rating' || elemento?.type === 'polaroid';
  const grosor: Grosor = !estilo.border ? 'none' : estilo.border.width >= (BORDES.thin + BORDES.thick) / 2 ? 'thick' : 'thin';
  const opacidad = String(Math.round(((estilo.opacity ?? 1) * 100) / 25) * 25) as Opacidad;
  const colorDeBorde = estilo.border?.color ?? theme.ink;

  const muestra = (hex: string | undefined) => <View style={[styles.muestra, { backgroundColor: hex ?? theme.surfaceAlt, borderColor: theme.border }]} />;

  return (
    <Sheet visible={elemento !== null} onClose={onClose} title={s.title}>
      <View style={styles.cuerpo}>
        {conColor ? <ActionRow icon={muestra(estilo.color)} label={s.color} onPress={onColor} /> : null}
        <View style={styles.grupo}>
          <AppText variant="label" color="textSecondary">
            {s.opacity}
          </AppText>
          <Segmented
            label={s.opacity}
            options={(['100', '75', '50', '25'] as const).map((v) => ({ value: v, label: `${v} %` }))}
            value={['100', '75', '50', '25'].includes(opacidad) ? opacidad : '100'}
            onChange={(v) => onCambiar({ opacity: v === '100' ? undefined : Number(v) / 100 })}
            fullWidth
          />
        </View>
        <View style={styles.grupo}>
          <AppText variant="label" color="textSecondary">
            {s.border}
          </AppText>
          <Segmented
            label={s.border}
            options={[
              { value: 'none', label: s.borderNone },
              { value: 'thin', label: s.borderThin },
              { value: 'thick', label: s.borderThick },
            ]}
            value={grosor}
            onChange={(v: Grosor) => onCambiar({ border: v === 'none' ? undefined : { width: BORDES[v], color: colorDeBorde } })}
            fullWidth
          />
          {estilo.border ? <ActionRow icon={muestra(estilo.border.color)} label={s.borderColor} onPress={onColorDeBorde} /> : null}
        </View>
        <SwitchRow label={s.shadow} value={!!estilo.shadow} onValueChange={(v) => onCambiar({ shadow: v ? true : undefined })} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.lg, paddingBottom: Spacing.md },
  grupo: { gap: Spacing.sm },
  muestra: { width: 24, height: 24, borderRadius: 12, borderWidth: 1 },
});
