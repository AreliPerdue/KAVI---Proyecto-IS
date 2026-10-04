import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, Sheet, TextField } from '@/components/ui';
import { GROUP_TYPES } from '@/constants/intensifiers';
import { Spacing } from '@/constants/theme';
import type { ExerciseGroupType, WorkoutExercise } from '@/types/domain';

export type GroupSheetProps = {
  visible: boolean;
  /** El ejercicio desde el que se abrió: va como A1. */
  from: WorkoutExercise | null;
  /** Los demás ejercicios sueltos de la sesión. */
  candidates: WorkoutExercise[];
  onClose: () => void;
  onCreate: (input: { type: ExerciseGroupType; exerciseIds: string[]; rounds: number | null; rest_after_round_sec: number | null }) => void;
};

/**
 * Agrupar ejercicios (RF-F45). Se eligen los compañeros en el orden en que se hacen
 * (A1, A2, A3…) y el tipo de agrupación. El descanso corre al terminar la ronda, no entre
 * ejercicios: es lo que hace distinta a una superserie.
 */
export function GroupSheet({ visible, from, candidates, onClose, onCreate }: GroupSheetProps) {
  if (!from) return null;
  return (
    <Sheet visible={visible} onClose={onClose} title="Agrupar como…">
      <Contenido key={from.id} from={from} candidates={candidates} onClose={onClose} onCreate={onCreate} />
    </Sheet>
  );
}

function Contenido({ from, candidates, onClose, onCreate }: Omit<GroupSheetProps, 'visible' | 'from'> & { from: WorkoutExercise }) {
  const [tipo, setTipo] = useState<ExerciseGroupType>('superset');
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [rondas, setRondas] = useState('3');
  const [descanso, setDescanso] = useState('90');
  const info = GROUP_TYPES.find((g) => g.value === tipo);
  const orden = [from.id, ...elegidos];
  const nombre = (id: string) => (id === from.id ? from.name : candidates.find((c) => c.id === id)?.name ?? '');

  return (
    <>
      <View style={styles.chips}>
        {GROUP_TYPES.map((g) => (
          <Chip key={g.value} compact label={g.label} selected={tipo === g.value} onPress={() => setTipo(g.value)} />
        ))}
      </View>
      {info ? (
        <AppText variant="caption" color="textSecondary">
          {info.description}
        </AppText>
      ) : null}

      <AppText variant="label" color="textSecondary">
        Con quién, en orden
      </AppText>
      <View style={styles.chips}>
        {candidates.map((c) => {
          const i = elegidos.indexOf(c.id);
          return (
            <Chip
              key={c.id}
              compact
              label={i >= 0 ? `A${i + 2} · ${c.name}` : c.name}
              selected={i >= 0}
              onPress={() => setElegidos((xs) => (i >= 0 ? xs.filter((x) => x !== c.id) : [...xs, c.id]))}
            />
          );
        })}
      </View>
      {candidates.length === 0 ? (
        <AppText color="textSecondary">Agrega otro ejercicio a la sesión para agruparlo con este.</AppText>
      ) : null}

      {elegidos.length > 0 ? (
        <AppText variant="caption" color="textTertiary">
          {orden.map((id, i) => `A${i + 1} ${nombre(id)}`).join(' → ')}
        </AppText>
      ) : null}

      <View style={styles.dos}>
        {info?.rounds ? (
          <View style={styles.flex}>
            <TextField label="Rondas" value={rondas} onChangeText={setRondas} keyboardType="number-pad" />
          </View>
        ) : null}
        <View style={styles.flex}>
          <TextField label="Descanso al terminar la ronda (s)" value={descanso} onChangeText={setDescanso} keyboardType="number-pad" />
        </View>
      </View>

      <Button
        title="Agrupar"
        disabled={elegidos.length === 0}
        onPress={() => {
          onCreate({
            type: tipo,
            exerciseIds: orden,
            rounds: info?.rounds ? Number(rondas) || null : null,
            rest_after_round_sec: Number(descanso) >= 0 ? Number(descanso) : null,
          });
          onClose();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  dos: { flexDirection: 'row', gap: Spacing.sm },
  flex: { flex: 1 },
});
