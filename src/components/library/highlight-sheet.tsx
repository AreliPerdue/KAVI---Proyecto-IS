import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, ColorSwatch, Segmented, Sheet, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { COLORES_DE_ANOTACION, colorDe, COLOR_DE_POSTIT, type EstiloDeSubrayado, estiloDe, NOTA_MAXIMA, notaDe, textoDe } from '@/lib/library/annotations';
import type { LibraryAnnotation } from '@/types/domain';

export type CambioDeSubrayado = { color: string; style: EstiloDeSubrayado; note: string };

/**
 * Un subrayado tocado (spec 13c, RF-BH7): cambiarle el color o el estilo, escribirle una nota o quitarlo.
 * Se guarda con "Guardar"; cerrar la hoja lo deja como estaba.
 */
export function HighlightSheet({
  anotacion,
  onClose,
  onGuardar,
  onQuitar,
}: {
  anotacion: LibraryAnnotation | null;
  onClose: () => void;
  onGuardar: (cambio: CambioDeSubrayado) => void;
  onQuitar: () => void;
}) {
  const a = useT().library.annotations;
  return (
    <Sheet visible={!!anotacion} onClose={onClose} title={a.highlightTitle}>
      {anotacion ? <Editor key={anotacion.id} anotacion={anotacion} onGuardar={onGuardar} onQuitar={onQuitar} /> : null}
    </Sheet>
  );
}

function Editor({ anotacion, onGuardar, onQuitar }: { anotacion: LibraryAnnotation; onGuardar: (c: CambioDeSubrayado) => void; onQuitar: () => void }) {
  const theme = useTheme();
  const tx = useT();
  const a = tx.library.annotations;
  const [color, setColor] = useState(colorDe(anotacion) ?? COLOR_DE_POSTIT);
  const [estilo, setEstilo] = useState<EstiloDeSubrayado>(estiloDe(anotacion));
  const [nota, setNota] = useState(notaDe(anotacion));
  const texto = textoDe(anotacion);

  return (
    <View style={styles.editor}>
      {texto ? (
        <View style={[styles.cita, { borderColor: color, backgroundColor: theme.surfaceAlt }]}>
          <AppText variant="body" numberOfLines={4}>
            {texto}
          </AppText>
        </View>
      ) : null}
      <AppText variant="label" color="textSecondary">
        {a.style}
      </AppText>
      <Segmented<EstiloDeSubrayado>
        fullWidth
        label={a.style}
        options={[
          { value: 'highlight', label: a.styles.highlight },
          { value: 'underline', label: a.styles.underline },
          { value: 'strike', label: a.styles.strike },
        ]}
        value={estilo}
        onChange={setEstilo}
      />
      <AppText variant="label" color="textSecondary">
        {a.color}
      </AppText>
      <View style={styles.paleta}>
        {COLORES_DE_ANOTACION.map((c) => (
          <ColorSwatch key={c.id} hex={c.hex} label={tx.colors[c.id] ?? c.label} selected={color.toUpperCase() === c.hex.toUpperCase()} onPress={() => setColor(c.hex)} size={32} />
        ))}
      </View>
      <TextField label={a.note} value={nota} onChangeText={setNota} placeholder={a.notePlaceholder} multiline maxLength={NOTA_MAXIMA} style={styles.campo} />
      <Button title={a.save} onPress={() => onGuardar({ color: color.toUpperCase(), style: estilo, note: nota.trim() })} />
      <Button title={a.removeHighlight} variant="danger" onPress={onQuitar} />
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: Spacing.md },
  cita: { borderLeftWidth: 4, borderRadius: Radius.sm, borderCurve: 'continuous', padding: Spacing.md },
  paleta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  campo: { minHeight: 80, textAlignVertical: 'top' },
});
