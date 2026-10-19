import { StyleSheet, View } from 'react-native';

import { AppText, ColorSwatch, Segmented, Sheet, Toggle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { COLORES_DE_ANOTACION } from '@/lib/library/annotations';
import { type Grosor, GROSORES, type PreferenciaDeLapiz } from '@/lib/library/ink';

/**
 * Color y grosor del lápiz (spec 13c, RF-BH11; T291), de la herramienta elegida, y "solo lápiz". Cada cambio
 * se aplica al momento y se recuerda; cada herramienta guarda los suyos (el marcador amarillo, la pluma en
 * tinta). La tinta es la letra del tema del lector: se ve sobre página clara u oscura.
 */
export function PenSheet({
  visible,
  lapiz,
  tinta,
  onClose,
  onCambiar,
}: {
  visible: boolean;
  lapiz: PreferenciaDeLapiz;
  tinta: string;
  onClose: () => void;
  onCambiar: (lapiz: PreferenciaDeLapiz) => void;
}) {
  const theme = useTheme();
  const tx = useT();
  const a = tx.library.annotations;
  const h = lapiz.tool;
  const color = h === 'eraser' ? null : lapiz.colors[h];
  const elegir = (c: string | null) => {
    if (h === 'eraser') return;
    onCambiar({ ...lapiz, colors: { ...lapiz.colors, [h]: c } });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={a.penTools[h]}>
      <View style={styles.cuerpo}>
        {h !== 'eraser' ? (
          <>
            <AppText variant="label" color="textSecondary">
              {a.color}
            </AppText>
            <View style={styles.paleta}>
              <ColorSwatch hex={tinta} label={a.penInk} selected={color === null} onPress={() => elegir(null)} size={32} background={theme.surface} />
              {COLORES_DE_ANOTACION.map((c) => (
                <ColorSwatch
                  key={c.id}
                  hex={c.hex}
                  label={tx.colors[c.id] ?? c.label}
                  selected={color?.toUpperCase() === c.hex.toUpperCase()}
                  onPress={() => elegir(c.hex.toUpperCase())}
                  size={32}
                />
              ))}
            </View>
          </>
        ) : null}
        <AppText variant="label" color="textSecondary">
          {a.penSize}
        </AppText>
        <Segmented<`${Grosor}`>
          fullWidth
          label={a.penSize}
          options={GROSORES.map((g) => ({ value: `${g}` as const, label: a.penSizes[g] }))}
          value={`${lapiz.sizes[h]}`}
          onChange={(v) => onCambiar({ ...lapiz, sizes: { ...lapiz.sizes, [h]: Number(v) as Grosor } })}
        />
        <View style={styles.fila}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{a.penOnly}</AppText>
            <AppText variant="caption" color="textSecondary">
              {a.penOnlyHint}
            </AppText>
          </View>
          <Toggle label={a.penOnly} value={lapiz.penOnly} onValueChange={(v) => onCambiar({ ...lapiz, penOnly: v })} />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.md },
  paleta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  flex: { flex: 1, gap: 2 },
});
