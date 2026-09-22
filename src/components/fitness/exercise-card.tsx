import { Trash2 } from 'lucide-react-native';
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, IconButton, TextField } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { WorkoutExercise, WorkoutExerciseInput } from '@/types/domain';

export type ExerciseCardProps = {
  exercise: WorkoutExercise;
  index: number;
  readOnly?: boolean;
  suggestions: readonly string[];
  onSave: (patch: Partial<WorkoutExerciseInput>) => void;
  onDelete: () => void;
};

const toInt = (text: string): number | null => {
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Tarjeta de ejercicio con campos abiertos; guarda cada campo al perder el foco (RF-F4, RF-F5). */
export const ExerciseCard = memo(function ExerciseCard({ exercise, index, readOnly = false, suggestions, onSave, onDelete }: ExerciseCardProps) {
  const theme = useTheme();
  const [name, setName] = useState(exercise.name);
  const [sets, setSets] = useState(exercise.sets?.toString() ?? '');
  const [reps, setReps] = useState(exercise.reps ?? '');
  const [weight, setWeight] = useState(exercise.weight ?? '');
  const [duration, setDuration] = useState(exercise.duration_minutes?.toString() ?? '');
  const [notes, setNotes] = useState(exercise.notes ?? '');
  const [nameFocused, setNameFocused] = useState(false);

  useEffect(() => {
    setName(exercise.name);
    setSets(exercise.sets?.toString() ?? '');
    setReps(exercise.reps ?? '');
    setWeight(exercise.weight ?? '');
    setDuration(exercise.duration_minutes?.toString() ?? '');
    setNotes(exercise.notes ?? '');
  }, [exercise]);

  const matches = nameFocused && name.trim().length > 0
    ? suggestions.filter((s) => s.toLowerCase().includes(name.trim().toLowerCase()) && s !== name).slice(0, 4)
    : [];

  if (readOnly) {
    const parts = [
      exercise.sets ? `${exercise.sets} series` : null,
      exercise.reps ? `${exercise.reps} reps` : null,
      exercise.weight,
      exercise.duration_minutes ? `${exercise.duration_minutes} min` : null,
    ].filter(Boolean);
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <AppText variant="bodyStrong">{exercise.name}</AppText>
        {parts.length ? (
          <AppText color="textSecondary" tabular>
            {parts.join(' · ')}
          </AppText>
        ) : null}
        {exercise.notes ? (
          <AppText variant="caption" color="textTertiary">
            {exercise.notes}
          </AppText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <AppText variant="caption" color="textTertiary">
          Ejercicio {index + 1}
        </AppText>
        <IconButton label={`Eliminar ${exercise.name || 'ejercicio'}`} onPress={onDelete}>
          <Trash2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        </IconButton>
      </View>
      <TextField
        label="Nombre"
        value={name}
        onChangeText={setName}
        onFocus={() => setNameFocused(true)}
        onBlur={() => {
          setNameFocused(false);
          if (name.trim() && name.trim() !== exercise.name) onSave({ name: name.trim() });
        }}
        placeholder="Press banca, sentadilla…"
        autoCapitalize="sentences"
        returnKeyType="done"
      />
      {matches.length ? (
        <View style={styles.suggestions}>
          {matches.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityLabel={`Usar ${s}`}
              onPress={() => {
                setName(s);
                onSave({ name: s });
              }}
              style={({ pressed }) => [styles.suggestion, { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : theme.surface }]}>
              <AppText variant="label">{s}</AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.row}>
        <View style={styles.cell}>
          <TextField label="Series" value={sets} onChangeText={setSets} onBlur={() => onSave({ sets: toInt(sets) })} keyboardType="number-pad" placeholder="3" />
        </View>
        <View style={styles.cell}>
          <TextField label="Reps" value={reps} onChangeText={setReps} onBlur={() => onSave({ reps: reps.trim() || null })} placeholder="12/10/8, al fallo" />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.cell}>
          <TextField label="Peso" value={weight} onChangeText={setWeight} onBlur={() => onSave({ weight: weight.trim() || null })} placeholder="40 kg, corporal" />
        </View>
        <View style={styles.cell}>
          <TextField label="Duración" value={duration} onChangeText={setDuration} onBlur={() => onSave({ duration_minutes: toInt(duration) })} keyboardType="number-pad" placeholder="min" />
        </View>
      </View>
      <TextField label="Notas" value={notes} onChangeText={setNotes} onBlur={() => onSave({ notes: notes.trim() || null })} placeholder="Subir 2.5 kg la próxima…" multiline />
    </View>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.md, borderWidth: 1, borderRadius: Radius.lg, borderCurve: 'continuous', gap: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: Spacing.sm },
  cell: { flex: 1 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  suggestion: { paddingHorizontal: Spacing.md, minHeight: 36, justifyContent: 'center', borderWidth: 1, borderRadius: Radius.full },
});
