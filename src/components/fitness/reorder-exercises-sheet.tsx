import { GripVertical } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, ReorderableColumn, Sheet } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { WorkoutExerciseDetail } from '@/types/domain';

export type ReorderExercisesSheetProps = {
  visible: boolean;
  exercises: readonly WorkoutExerciseDetail[];
  /** "A1", "B2"… de los agrupados, para reconocerlos en la lista. */
  groupLabel: (exerciseId: string) => string | null;
  onClose: () => void;
  onSave: (orderedIds: string[]) => void;
};

/**
 * Reordenar ejercicios arrastrando (RF-F33). En la sesión cada ejercicio ocupa media
 * pantalla y arrastrar uno del final al inicio pediría desplazarse mientras se arrastra; aquí
 * cada uno es una fila corta y caben todos. El orden se aplica con "Guardar orden".
 */
export function ReorderExercisesSheet({ visible, onClose, ...rest }: ReorderExercisesSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Reordenar ejercicios">
      {visible ? <Lista onClose={onClose} {...rest} /> : null}
    </Sheet>
  );
}

function Lista({ exercises, groupLabel, onClose, onSave }: Omit<ReorderExercisesSheetProps, 'visible'>) {
  const theme = useTheme();
  const [orden, setOrden] = useState(() => exercises.map((e) => e.id));
  const porId = new Map(exercises.map((e) => [e.id, e]));
  const items = orden.map((id) => porId.get(id)).filter((e): e is WorkoutExerciseDetail => !!e);

  return (
    <>
      <AppText variant="caption" color="textSecondary">
        Mantén presionado un ejercicio y arrástralo a su lugar.
      </AppText>
      <ReorderableColumn
        items={items}
        keyOf={(e) => e.id}
        gap={Spacing.xs}
        longPressMs={150}
        onMove={(from, to) =>
          setOrden((xs) => {
            const copia = [...xs];
            const [movido] = copia.splice(from, 1);
            copia.splice(to, 0, movido);
            return copia;
          })
        }
        renderItem={(e, i, drag) =>
          drag.handle(
            <View
              accessible
              accessibilityLabel={`${i + 1}. ${e.name}`}
              style={[styles.fila, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
              <GripVertical size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
              {groupLabel(e.id) ? (
                <View style={[styles.grupo, { backgroundColor: theme.ink }]}>
                  <AppText variant="label" color="onInk">
                    {groupLabel(e.id)}
                  </AppText>
                </View>
              ) : null}
              <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                {e.name || 'Ejercicio sin nombre'}
              </AppText>
              <AppText variant="caption" color="textTertiary" tabular>
                {e.workout_sets.length} {e.workout_sets.length === 1 ? 'serie' : 'series'}
              </AppText>
            </View>,
          )
        }
      />
      <Button
        title="Guardar orden"
        onPress={() => {
          onSave(orden);
          onClose();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 52, paddingHorizontal: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
  grupo: { minWidth: 32, height: 24, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm, borderCurve: 'continuous' },
  flex: { flex: 1 },
});
