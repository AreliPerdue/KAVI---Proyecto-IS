import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, ColorSwatch, Sheet, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useT } from '@/i18n';
import { COLORES_DE_ANOTACION, colorDe, COLOR_DE_POSTIT, TEXTO_MAXIMO_DE_POSTIT, textoDe } from '@/lib/library/annotations';
import type { LibraryAnnotation } from '@/types/domain';

/**
 * Escribir en un post-it y elegir su color (spec 13c, RF-BH14; T286). El color es de la paleta de los
 * Nobi. Se guarda con "Guardar"; cerrar la hoja lo deja como estaba.
 */
export function PostitSheet({
  anotacion,
  colorPortada,
  onClose,
  onGuardar,
}: {
  anotacion: LibraryAnnotation | null;
  /** El color de la portada del libro, que se ofrece primero (T329). */
  colorPortada?: string | null;
  onClose: () => void;
  onGuardar: (texto: string, color: string) => void;
}) {
  const a = useT().library.annotations;
  return (
    <Sheet visible={!!anotacion} onClose={onClose} title={a.editTitle}>
      {/* Una hoja nueva por post-it: el borrador arranca de lo que tiene. */}
      {anotacion ? <Editor key={anotacion.id} anotacion={anotacion} colorPortada={colorPortada ?? null} onGuardar={onGuardar} /> : null}
    </Sheet>
  );
}

function Editor({ anotacion, colorPortada, onGuardar }: { anotacion: LibraryAnnotation; colorPortada: string | null; onGuardar: (texto: string, color: string) => void }) {
  const tx = useT();
  const a = tx.library.annotations;
  const [texto, setTexto] = useState(textoDe(anotacion));
  const [color, setColor] = useState(colorDe(anotacion) ?? COLOR_DE_POSTIT);

  return (
    <View style={styles.editor}>
      <TextField
        label={a.editLabel}
        value={texto}
        onChangeText={setTexto}
        placeholder={a.editPlaceholder}
        multiline
        autoFocus={!textoDe(anotacion)}
        maxLength={TEXTO_MAXIMO_DE_POSTIT}
        style={styles.campo}
      />
      <AppText variant="label" color="textSecondary">
        {a.color}
      </AppText>
      <View style={styles.paleta}>
        {colorPortada ? (
          <ColorSwatch
            hex={colorPortada}
            label={a.coverColor(colorPortada.toUpperCase())}
            selected={color.toUpperCase() === colorPortada.toUpperCase()}
            onPress={() => setColor(colorPortada)}
            size={32}
          />
        ) : null}
        {COLORES_DE_ANOTACION.map((c) => (
          <ColorSwatch
            key={c.id}
            hex={c.hex}
            label={tx.colors[c.id] ?? c.label}
            selected={color.toUpperCase() === c.hex.toUpperCase()}
            onPress={() => setColor(c.hex)}
            size={32}
          />
        ))}
      </View>
      <Button title={a.save} onPress={() => onGuardar(texto.trim(), color.toUpperCase())} />
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: Spacing.md },
  campo: { minHeight: 96, textAlignVertical: 'top' },
  paleta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
});
