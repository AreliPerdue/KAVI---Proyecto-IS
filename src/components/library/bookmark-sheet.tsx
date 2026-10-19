import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, ColorSwatch, IconButton, Segmented, Sheet } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { BORDES_DE_SEPARADOR, type BordeDeSeparador, COLORES_DE_ANOTACION, colorDe, separadorDe, PALABRA_MAXIMA } from '@/lib/library/annotations';
import type { LibraryAnnotation } from '@/types/domain';

export type CambioDeSeparador = { edge: BordeDeSeparador; pos: number; color: string; label: string };

/**
 * Un separador (spec 13c, RF-BH15; T290): en qué borde de la página sale la pestaña, a qué altura, su color y
 * una palabra corta. Se abre al ponerlo y al tocar su pestaña.
 */
export function BookmarkSheet({
  anotacion,
  onClose,
  onGuardar,
  onQuitar,
}: {
  anotacion: LibraryAnnotation | null;
  onClose: () => void;
  onGuardar: (cambio: CambioDeSeparador) => void;
  onQuitar: () => void;
}) {
  const a = useT().library.annotations;
  return (
    <Sheet visible={!!anotacion} onClose={onClose} title={a.kindOne.bookmark}>
      {anotacion ? <Editor key={anotacion.id} anotacion={anotacion} onGuardar={onGuardar} onQuitar={onQuitar} /> : null}
    </Sheet>
  );
}

function Editor({ anotacion, onGuardar, onQuitar }: { anotacion: LibraryAnnotation; onGuardar: (c: CambioDeSeparador) => void; onQuitar: () => void }) {
  const theme = useTheme();
  const tx = useT();
  const a = tx.library.annotations;
  const inicial = separadorDe(anotacion);
  const [borde, setBorde] = useState<BordeDeSeparador>(inicial.edge);
  const [pos, setPos] = useState(inicial.pos);
  const [color, setColor] = useState(colorDe(anotacion) ?? COLORES_DE_ANOTACION[0].hex);
  const [palabra, setPalabra] = useState(inicial.label);
  const paso = (d: 1 | -1) => setPos((p) => Math.round(Math.min(1, Math.max(0, p + d * 0.1)) * 10) / 10);
  const icono = (activo: boolean) => ({ size: IconSize.action, strokeWidth: IconStroke, color: activo ? theme.text : theme.textTertiary });
  const lateral = borde === 'left' || borde === 'right';

  return (
    <View style={styles.editor}>
      <AppText variant="label" color="textSecondary">
        {a.bookmarkWord}
      </AppText>
      <TextInput
        value={palabra}
        onChangeText={(t) => setPalabra(t.slice(0, PALABRA_MAXIMA))}
        placeholder={a.bookmarkWordPlaceholder}
        placeholderTextColor={theme.textTertiary}
        maxLength={PALABRA_MAXIMA}
        accessibilityLabel={a.bookmarkWord}
        style={[styles.entrada, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
      />
      <AppText variant="label" color="textSecondary">
        {a.bookmarkEdge}
      </AppText>
      <Segmented<BordeDeSeparador>
        fullWidth
        label={a.bookmarkEdge}
        options={BORDES_DE_SEPARADOR.map((b) => ({ value: b, label: a.edges[b] }))}
        value={borde}
        onChange={setBorde}
      />
      <AppText variant="label" color="textSecondary">
        {lateral ? a.bookmarkHeight : a.bookmarkAlong}
      </AppText>
      <View style={styles.altura}>
        <IconButton label={lateral ? a.bookmarkUp : a.bookmarkLeft} onPress={() => paso(-1)} disabled={pos <= 0}>
          <ArrowUp {...icono(pos > 0)} style={lateral ? undefined : styles.girada} />
        </IconButton>
        <AppText variant="bodyStrong" tabular style={styles.valor}>
          {`${Math.round(pos * 100)} %`}
        </AppText>
        <IconButton label={lateral ? a.bookmarkDown : a.bookmarkRight} onPress={() => paso(1)} disabled={pos >= 1}>
          <ArrowDown {...icono(pos < 1)} style={lateral ? undefined : styles.girada} />
        </IconButton>
      </View>
      <AppText variant="label" color="textSecondary">
        {a.color}
      </AppText>
      <View style={styles.paleta}>
        {COLORES_DE_ANOTACION.map((c) => (
          <ColorSwatch key={c.id} hex={c.hex} label={tx.colors[c.id] ?? c.label} selected={color.toUpperCase() === c.hex.toUpperCase()} onPress={() => setColor(c.hex)} size={32} />
        ))}
      </View>
      <Button title={a.save} onPress={() => onGuardar({ edge: borde, pos, color: color.toUpperCase(), label: palabra.trim() })} />
      <Button title={a.removeBookmark} variant="danger" onPress={onQuitar} />
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: Spacing.md },
  entrada: { ...Typography.body, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 44 },
  altura: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  valor: { minWidth: 56, textAlign: 'center' },
  girada: { transform: [{ rotate: '-90deg' }] },
  paleta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
});
