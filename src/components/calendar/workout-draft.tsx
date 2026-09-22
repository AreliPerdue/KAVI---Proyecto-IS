import { Dumbbell, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, IconButton, TextField } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useExerciseNames } from '@/hooks/use-workouts';
import { useTheme } from '@/hooks/use-theme';
import type { WorkoutExerciseInput } from '@/types/domain';

/**
 * Ejercicio en borrador: todavía no existe en el backend porque la actividad tampoco.
 * `key` solo sirve para renderizar la lista de forma estable.
 */
export type ExerciseDraft = WorkoutExerciseInput & { key: string };

/** Contador de borradores: la `key` solo tiene que ser única dentro de la sesión. */
let siguienteBorrador = 0;

export function emptyExercise(): ExerciseDraft {
  siguienteBorrador += 1;
  return {
    key: `draft-${siguienteBorrador}`,
    name: '',
    sets: null,
    reps: null,
    weight: null,
    duration_minutes: null,
    notes: null,
  };
}

const toInt = (text: string): number | null => {
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function DraftCard({
  draft,
  index,
  suggestions,
  onChange,
  onRemove,
}: {
  draft: ExerciseDraft;
  index: number;
  suggestions: readonly string[];
  onChange: (patch: Partial<ExerciseDraft>) => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const [nameFocused, setNameFocused] = useState(false);

  const matches =
    nameFocused && draft.name.trim().length > 0
      ? suggestions
          .filter((s) => s.toLowerCase().includes(draft.name.trim().toLowerCase()) && s !== draft.name)
          .slice(0, 3)
      : [];

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <AppText variant="caption" color="textTertiary">
          Ejercicio {index + 1}
        </AppText>
        <IconButton label={`Quitar ejercicio ${index + 1}`} onPress={onRemove}>
          <Trash2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        </IconButton>
      </View>

      <TextField
        label="Nombre"
        value={draft.name}
        onChangeText={(name) => onChange({ name })}
        onFocus={() => setNameFocused(true)}
        onBlur={() => setNameFocused(false)}
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
              onPress={() => onChange({ name: s })}
              style={({ pressed }) => [
                styles.suggestion,
                { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : theme.surface },
              ]}>
              <AppText variant="label">{s}</AppText>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.row}>
        <View style={styles.cell}>
          <TextField
            label="Series"
            value={draft.sets?.toString() ?? ''}
            onChangeText={(text) => onChange({ sets: toInt(text) })}
            keyboardType="number-pad"
            placeholder="3"
          />
        </View>
        <View style={styles.cell}>
          <TextField
            label="Reps"
            value={draft.reps ?? ''}
            onChangeText={(text) => onChange({ reps: text || null })}
            placeholder="12/10/8"
          />
        </View>
        <View style={styles.cell}>
          <TextField
            label="Peso"
            value={draft.weight ?? ''}
            onChangeText={(text) => onChange({ weight: text || null })}
            placeholder="40 kg"
          />
        </View>
      </View>
    </View>
  );
}

export type WorkoutDraftProps = {
  exercises: ExerciseDraft[];
  onChange: (exercises: ExerciseDraft[]) => void;
  /** Cuando la actividad ya tiene entrenamiento guardado, aquí se ofrece abrirlo. */
  existingCount?: number;
  onOpenExisting?: () => void;
};

/**
 * Ejercicios del entrenamiento dentro del formulario de actividad (RF-F9).
 * Evita salir al módulo de Fitness para registrar la rutina: los ejercicios se guardan
 * junto con la actividad. Si la actividad ya tiene un entrenamiento, se abre el existente
 * en vez de duplicarlo.
 */
export function WorkoutDraft({ exercises, onChange, existingCount, onOpenExisting }: WorkoutDraftProps) {
  const theme = useTheme();
  const names = useExerciseNames();
  const suggestions = names.data ?? [];

  const update = (key: string, patch: Partial<ExerciseDraft>) =>
    onChange(exercises.map((e) => (e.key === key ? { ...e, ...patch } : e)));

  if (existingCount !== undefined && onOpenExisting) {
    return (
      <View style={[styles.container, { borderColor: theme.border }]}>
        <View style={styles.header}>
          <Dumbbell size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
          <AppText variant="label" color="textSecondary">
            Entrenamiento
          </AppText>
        </View>
        <AppText variant="caption" color="textTertiary">
          {existingCount === 0
            ? 'Esta actividad ya tiene un entrenamiento sin ejercicios.'
            : `Esta actividad ya tiene un entrenamiento con ${existingCount} ${existingCount === 1 ? 'ejercicio' : 'ejercicios'}.`}
        </AppText>
        <Button title="Abrir entrenamiento" variant="secondary" onPress={onOpenExisting} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      <View style={styles.header}>
        <Dumbbell size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        <AppText variant="label" color="textSecondary">
          Entrenamiento
        </AppText>
      </View>
      <AppText variant="caption" color="textTertiary">
        Anota aquí tu rutina y se guarda con la actividad. Puedes dejarlo vacío y completarlo después.
      </AppText>

      {exercises.map((draft, index) => (
        <DraftCard
          key={draft.key}
          draft={draft}
          index={index}
          suggestions={suggestions}
          onChange={(patch) => update(draft.key, patch)}
          onRemove={() => onChange(exercises.filter((e) => e.key !== draft.key))}
        />
      ))}

      <Button
        title={exercises.length === 0 ? 'Añadir ejercicio' : 'Añadir otro ejercicio'}
        variant="secondary"
        icon={<Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
        onPress={() => onChange([...exercises, emptyExercise()])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  card: { padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: Spacing.sm },
  cell: { flex: 1 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  suggestion: { paddingHorizontal: Spacing.md, minHeight: 36, justifyContent: 'center', borderWidth: 1, borderRadius: Radius.full },
});
