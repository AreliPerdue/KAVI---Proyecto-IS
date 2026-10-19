import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, Sheet } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { LibraryClip } from '@/types/domain';

export const NOTA_MAXIMA = 2000;

/**
 * Lo que se hace con un fragmento (spec 13c, RF-BH21; T317): escribirle una nota, abrir el libro en su lugar,
 * copiar su texto y borrarlo.
 */
export function ClipSheet({
  fragmento,
  onClose,
  onNota,
  guardandoNota,
  onAbrir,
  onCopiar,
  onBorrar,
}: {
  fragmento: LibraryClip | null;
  onClose: () => void;
  onNota: (nota: string) => void;
  guardandoNota: boolean;
  /** Null si su libro ya no está. */
  onAbrir: (() => void) | null;
  onCopiar: () => void;
  onBorrar: () => void;
}) {
  return (
    <Sheet visible={!!fragmento} onClose={onClose} title={fragmento?.book_title ?? ''}>
      {fragmento ? (
        <Contenido key={fragmento.id} fragmento={fragmento} onNota={onNota} guardandoNota={guardandoNota} onAbrir={onAbrir} onCopiar={onCopiar} onBorrar={onBorrar} />
      ) : null}
    </Sheet>
  );
}

function Contenido({
  fragmento,
  onNota,
  guardandoNota,
  onAbrir,
  onCopiar,
  onBorrar,
}: {
  fragmento: LibraryClip;
  onNota: (nota: string) => void;
  guardandoNota: boolean;
  onAbrir: (() => void) | null;
  onCopiar: () => void;
  onBorrar: () => void;
}) {
  const theme = useTheme();
  const c = useT().library.clips;
  const [nota, setNota] = useState(fragmento.note ?? '');
  const cambio = nota.trim() !== (fragmento.note ?? '');

  return (
    <View style={styles.cuerpo}>
      <AppText variant="label" color="textSecondary">
        {c.note}
      </AppText>
      <TextInput
        value={nota}
        onChangeText={setNota}
        placeholder={c.notePlaceholder}
        placeholderTextColor={theme.textTertiary}
        maxLength={NOTA_MAXIMA}
        multiline
        accessibilityLabel={c.note}
        style={[styles.entrada, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
      />
      <Button title={c.saveNote} onPress={() => onNota(nota)} disabled={!cambio} loading={guardandoNota} />
      {onAbrir ? (
        <Button title={c.goToBook} variant="secondary" onPress={onAbrir} />
      ) : (
        <AppText variant="label" color="textSecondary">
          {c.bookGone}
        </AppText>
      )}
      {fragmento.text ? <Button title={c.copy} variant="secondary" onPress={onCopiar} /> : null}
      <Button title={c.remove} variant="danger" onPress={onBorrar} />
    </View>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.md },
  entrada: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
