import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSeries } from '@/hooks/use-library';
import { useT } from '@/i18n';

export type SeriesFieldProps = {
  nombre: string;
  onNombre: (nombre: string) => void;
  /** El número como texto ("2", "1.5"); sin `onNumero` no se pide (poner varios a la vez). */
  numero?: string;
  onNumero?: (numero: string) => void;
};

/**
 * Saga y número de un libro (RF-BL24). El nombre se escribe o se elige de las sagas que ya existen:
 * mientras se escribe, las que coinciden aparecen como sugerencias. Escribir una que ya existe con
 * otras mayúsculas reusa esa, no crea otra.
 */
export function SeriesField({ nombre, onNombre, numero, onNumero }: SeriesFieldProps) {
  const s = useT().library.series;
  const sagas = useSeries();
  const buscado = nombre.trim().toLowerCase();
  const sugerencias = (sagas.data ?? []).filter((x) => x.name.trim().toLowerCase() !== buscado && (!buscado || x.name.toLowerCase().includes(buscado))).slice(0, 8);
  return (
    <View style={styles.contenido}>
      <View style={styles.fila}>
        <View style={styles.nombre}>
          <TextField label={s.field} hint={s.fieldHint} value={nombre} onChangeText={onNombre} autoCapitalize="words" />
        </View>
        {onNumero ? (
          <View style={styles.numero}>
            <TextField label={s.number} value={numero ?? ''} onChangeText={onNumero} keyboardType="decimal-pad" accessibilityHint={s.numberHint} />
          </View>
        ) : null}
      </View>
      {sugerencias.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          {sugerencias.map((x) => (
            <Chip key={x.id} label={x.name} compact selected={false} onPress={() => onNombre(x.name)} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: Spacing.sm },
  fila: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  nombre: { flex: 1 },
  numero: { width: 96 },
  chips: { gap: Spacing.sm },
});
