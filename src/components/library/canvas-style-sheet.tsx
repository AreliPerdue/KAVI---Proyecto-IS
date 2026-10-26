import { Minus, Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ActionRow, AppText, IconButton, Segmented, Sheet, SwitchRow } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { BORDES, type ElementoDeLienzo, LETRAS_DE_LIENZO, type LetraDeLienzo, TAMANO_MAXIMO } from '@/lib/library/canvas';

/** Los pasos del tamaño de letra (T363): finos al principio, más grandes para los títulos. */
const TAMANOS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6, TAMANO_MAXIMO];

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
  // El tamaño de letra (T363): el texto y las citas.
  const conLetra = elemento?.type === 'textbox' || elemento?.type === 'quote';
  const tamano = estilo.size ?? 1;
  const paso = (hacia: 1 | -1) => {
    const siguiente = hacia > 0 ? TAMANOS.find((t) => t > tamano + 0.001) : [...TAMANOS].reverse().find((t) => t < tamano - 0.001);
    if (siguiente !== undefined) onCambiar({ size: siguiente === 1 ? undefined : siguiente });
  };

  const muestra = (hex: string | undefined) => <View style={[styles.muestra, { backgroundColor: hex ?? theme.surfaceAlt, borderColor: theme.border }]} />;

  return (
    <Sheet visible={elemento !== null} onClose={onClose} title={s.title}>
      <View style={styles.cuerpo}>
        {conColor ? <ActionRow icon={muestra(estilo.color)} label={s.color} onPress={onColor} /> : null}
        {conLetra ? (
          <View style={styles.fila}>
            <AppText variant="bodyStrong" style={styles.flex}>
              {s.size}
            </AppText>
            <IconButton label={s.smaller} onPress={() => paso(-1)} disabled={tamano <= TAMANOS[0]}>
              <Minus size={IconSize.inline} strokeWidth={IconStroke} color={tamano <= TAMANOS[0] ? theme.textTertiary : theme.text} />
            </IconButton>
            <AppText variant="bodyStrong" style={styles.valor}>{`${Math.round(tamano * 100)} %`}</AppText>
            <IconButton label={s.bigger} onPress={() => paso(1)} disabled={tamano >= TAMANO_MAXIMO}>
              <Plus size={IconSize.inline} strokeWidth={IconStroke} color={tamano >= TAMANO_MAXIMO ? theme.textTertiary : theme.text} />
            </IconButton>
          </View>
        ) : null}
        {elemento?.type === 'textbox' ? (
          // La letra de un texto (T375): la del sistema, serifa o manuscrita.
          <View style={styles.grupo}>
            <AppText variant="label" color="textSecondary">
              {s.font}
            </AppText>
            <Segmented
              label={s.font}
              options={LETRAS_DE_LIENZO.map((v) => ({ value: v, label: s.fonts[v] }))}
              value={estilo.font ?? 'sans'}
              onChange={(v: LetraDeLienzo) => onCambiar({ font: v === 'sans' ? undefined : v })}
              fullWidth
            />
          </View>
        ) : null}
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
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  flex: { flex: 1 },
  valor: { minWidth: 56, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
