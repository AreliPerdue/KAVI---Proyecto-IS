import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SeriesField } from './series-field';

import { Button, Sheet, SwitchRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useT } from '@/i18n';

export type BulkSeriesSheetProps = {
  count: number;
  visible: boolean;
  onClose: () => void;
  /** La saga elegida y si se numeran en el orden en que se eligieron. */
  onApply: (nombre: string, numerar: boolean) => void;
};

/**
 * Poner varios libros en una saga a la vez (RF-BL24, con la selección de RF-BL15). Por omisión se
 * numeran en el orden en que se eligieron: elegir el #1, el #2 y el #3 en orden ya los deja listos.
 */
export function BulkSeriesSheet({ count, visible, onClose, onApply }: BulkSeriesSheetProps) {
  const tx = useT();
  const s = tx.library.series;
  const [nombre, setNombre] = useState('');
  const [numerar, setNumerar] = useState(true);
  return (
    <Sheet visible={visible} onClose={onClose} title={s.putTitle(count)}>
      <View style={styles.contenido}>
        <SeriesField nombre={nombre} onNombre={setNombre} />
        <SwitchRow label={s.numberInOrder} hint={s.numberInOrderHint} value={numerar} onValueChange={setNumerar} />
        <Button
          title={s.put}
          disabled={!nombre.trim()}
          onPress={() => {
            onApply(nombre.trim(), numerar);
            setNombre('');
          }}
        />
        <Button title={tx.common.cancel} variant="ghost" onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: Spacing.lg },
});
