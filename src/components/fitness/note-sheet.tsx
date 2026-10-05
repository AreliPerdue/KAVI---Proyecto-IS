import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, Sheet, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { tagLabel } from '@/lib/gym/display-names';
import { useLanguage, useT } from '@/i18n';

export type NoteSheetProps = {
  visible: boolean;
  title: string;
  /** Qué es esta nota, en una línea: de qué sesión, ejercicio o serie. */
  hint?: string;
  placeholder?: string;
  initialText: string | null;
  /** Etiquetas que se pueden marcar junto con la nota (solo series). */
  tagOptions?: readonly { value: string; label: string }[];
  initialTags?: readonly string[];
  /** Corta para series ("técnica rota en la 3ª"); libre en lo demás. */
  maxLength?: number;
  onClose: () => void;
  onSave: (text: string | null, tags: string[]) => void;
};

/**
 * Una sola hoja para todas las notas del gym (RF-F49 – RF-F52): la del ejercicio en la
 * sesión, la de la serie con sus etiquetas y la nota fija. Se guarda con "Guardar";
 * cerrar sin guardar descarta lo escrito, como cualquier hoja de edición.
 */
export function NoteSheet({ visible, title, onClose, ...rest }: NoteSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {visible ? <Contenido key={`${title}:${rest.initialText ?? ''}`} onClose={onClose} {...rest} /> : null}
    </Sheet>
  );
}

function Contenido({ hint, placeholder, initialText, tagOptions, initialTags, maxLength, onClose, onSave }: Omit<NoteSheetProps, 'visible' | 'title'>) {
  const lang = useLanguage();
  const h = useT().fitness.sheets;
  const [texto, setTexto] = useState(initialText ?? '');
  const [tags, setTags] = useState<string[]>([...(initialTags ?? [])]);

  return (
    <>
      {hint ? (
        <AppText variant="caption" color="textSecondary">
          {hint}
        </AppText>
      ) : null}
      <TextField label="Nota" value={texto} onChangeText={setTexto} placeholder={placeholder} multiline maxLength={maxLength} autoCapitalize="sentences" />
      {tagOptions?.length ? (
        <View style={styles.grupo}>
          <AppText variant="label" color="textSecondary">
            {h.tags}
          </AppText>
          <View style={styles.chips}>
            {tagOptions.map((t) => {
              const puesta = tags.includes(t.value);
              return <Chip key={t.value} compact label={tagLabel(t.value, lang)} selected={puesta} onPress={() => setTags((xs) => (puesta ? xs.filter((x) => x !== t.value) : [...xs, t.value]))} />;
            })}
          </View>
        </View>
      ) : null}
      <Button
        title={h.save}
        onPress={() => {
          onSave(texto.trim() || null, tags);
          onClose();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
});
