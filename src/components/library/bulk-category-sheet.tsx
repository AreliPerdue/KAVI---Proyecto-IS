import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, Sheet, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useT } from '@/i18n';

export type BulkCategorySheetProps = {
  /** Cuántas piezas están elegidas; 0 cierra la hoja. */
  count: number;
  visible: boolean;
  onClose: () => void;
  /** La categoría elegida, o `null` para dejarlas sin categoría. */
  onApply: (categoria: string | null) => void;
};

/**
 * La misma categoría para varias piezas (RF-BL15): una de las sugerencias o una escrita, o ninguna.
 * Aplicar cierra la hoja y la selección.
 */
export function BulkCategorySheet({ count, visible, onClose, onApply }: BulkCategorySheetProps) {
  const tx = useT();
  const m = tx.library.item;
  const s = tx.library.selection;
  const [escrita, setEscrita] = useState('');
  const aplicar = (c: string | null) => {
    setEscrita('');
    onApply(c);
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={s.categoryTitle(count)}>
      <View style={styles.contenido}>
        <View style={styles.chips}>
          {m.categorySuggestions.map((c) => (
            <Chip key={c} label={c} selected={false} onPress={() => aplicar(c)} />
          ))}
        </View>
        <TextField
          label={m.fieldCategory}
          hint={m.categoryHint}
          value={escrita}
          onChangeText={setEscrita}
          onSubmitEditing={() => escrita.trim() && aplicar(escrita.trim())}
          returnKeyType="done"
        />
        <Button title={m.save} onPress={() => aplicar(escrita.trim() || null)} disabled={!escrita.trim()} />
        <Button title={s.noCategory} variant="secondary" onPress={() => aplicar(null)} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: Spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
