import { AArrowDown, AArrowUp } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, Chip, IconButton } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { LETRAS_DE_LECTURA, otroTamano, TAMANO_MAX, TAMANO_MIN } from '@/lib/library/reader-text';
import { usePreferencesStore } from '@/store/preferences-store';

/**
 * Tamaño y letra del texto (spec 13c, RF-BH2 – RF-BH3; T288), en la hoja "Lectura". Solo para EPUB: un PDF
 * es una página fija y se acerca con el zoom (lo dice el aviso). Uno para todos los libros, en el
 * dispositivo; el libro se ve cambiar detrás de la hoja.
 */
export function ReaderTextPicker({ esPdf }: { esPdf: boolean }) {
  const theme = useTheme();
  const r = useT().library.reader;
  const texto = usePreferencesStore((s) => s.readerText);
  const setTexto = usePreferencesStore((s) => s.setReaderText);

  if (esPdf) {
    return (
      <AppText variant="caption" color="textSecondary">
        {r.zoomPdfHint}
      </AppText>
    );
  }

  const icono = (activo: boolean) => ({ size: IconSize.action, strokeWidth: IconStroke, color: activo ? theme.text : theme.textTertiary });
  const menos = texto.tamano > TAMANO_MIN;
  const mas = texto.tamano < TAMANO_MAX;
  return (
    <View style={styles.seccion}>
      <AppText variant="label">{r.textSize}</AppText>
      <View style={styles.tamano}>
        <IconButton label={r.textSmaller} onPress={() => setTexto({ ...texto, tamano: otroTamano(texto.tamano, -1) })} disabled={!menos}>
          <AArrowDown {...icono(menos)} />
        </IconButton>
        <AppText variant="bodyStrong" tabular style={styles.valor} accessibilityLabel={`${r.textSize}: ${r.textSizeValue(texto.tamano)}`}>
          {r.textSizeValue(texto.tamano)}
        </AppText>
        <IconButton label={r.textBigger} onPress={() => setTexto({ ...texto, tamano: otroTamano(texto.tamano, 1) })} disabled={!mas}>
          <AArrowUp {...icono(mas)} />
        </IconButton>
      </View>
      <AppText variant="label">{r.textFont}</AppText>
      <View style={styles.letras} accessibilityRole="radiogroup" accessibilityLabel={r.textFont}>
        {LETRAS_DE_LECTURA.map((l) => (
          <Chip key={l} label={r.fonts[l]} selected={texto.letra === l} onPress={() => setTexto({ ...texto, letra: l })} compact />
        ))}
      </View>
      <AppText variant="caption" color="textSecondary">
        {r.textHint}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: Spacing.sm },
  tamano: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  valor: { minWidth: 56, textAlign: 'center' },
  letras: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
