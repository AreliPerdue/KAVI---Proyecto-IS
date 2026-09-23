import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, Clock } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { RecurrenceField } from './recurrence-field';
import { RemindersField } from './reminders-field';
import { SharingField } from './sharing-field';
import { ThemeField } from './theme-field';
import { type ExerciseDraft, WorkoutDraft } from './workout-draft';

import { Banner, Button, DatePickerSheet, FieldButton, SwitchRow, TextField, TimePickerSheet } from '@/components/ui';
import { GYM_THEME_ID } from '@/constants/themes';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatMinutes, fromDayKey, toDayKey } from '@/lib/dates';
import { activityFormSchema, type ActivityFormValues } from '@/lib/schemas/activity';

export type ActivityFormProps = {
  defaultValues: ActivityFormValues;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  /** Los ejercicios viajan aparte del formulario: se guardan tras crear la actividad. */
  onSubmit: (values: ActivityFormValues, exercises: ExerciseDraft[]) => void;
  /** Al editar solo una ocurrencia, la repetición no se toca. */
  recurrenceLocked?: boolean;
  /** Nº de ejercicios del entrenamiento ya guardado, si la actividad tiene uno. */
  existingWorkoutCount?: number;
  onOpenExistingWorkout?: () => void;
  /** Posición vertical de la sección de recordatorios, para poder desplazarse a ella. */
  onRemindersLayout?: (y: number) => void;
  /** Ofrecer privacidad e invitaciones. Solo al crear: después se hace desde el detalle. */
  showSharing?: boolean;
};

/** Formulario de actividad (RF-C5): título, fecha, horas, todo el día, descripción. */
export function ActivityForm({
  defaultValues,
  submitLabel,
  submitting,
  error,
  onSubmit,
  recurrenceLocked = false,
  existingWorkoutCount,
  onOpenExistingWorkout,
  onRemindersLayout,
  showSharing = false,
}: ActivityFormProps) {
  const theme = useTheme();
  const { control, handleSubmit, setValue } = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues,
  });
  const [picker, setPicker] = useState<'date' | 'start' | 'end' | null>(null);
  const [exercises, setExercises] = useState<ExerciseDraft[]>([]);
  const dayKey = useWatch({ control, name: 'dayKey' });
  const startMinutes = useWatch({ control, name: 'startMinutes' });
  const endMinutes = useWatch({ control, name: 'endMinutes' });
  const allDay = useWatch({ control, name: 'allDay' });

  const submit = handleSubmit((values) => onSubmit(values, exercises));

  return (
    <View style={styles.form}>
      {error ? <Banner tone="error" message={error} /> : null}

      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, onBlur, value }, fieldState: { error: fieldError } }) => (
          <TextField
            label="Título"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={fieldError?.message}
            placeholder="¿Qué vas a hacer?"
            autoFocus={!defaultValues.title}
            maxLength={120}
            returnKeyType="done"
          />
        )}
      />

      <Controller
        control={control}
        name="themeId"
        render={({ field: { onChange, value } }) => (
          <ThemeField
            value={value}
            onChange={(selected) => {
              onChange(selected?.id ?? null);
              // Tema Gimnasio activa is_gym (regla 04); se puede alternar manualmente después.
              if (selected?.id === GYM_THEME_ID) setValue('isGym', true, { shouldDirty: true });
            }}
          />
        )}
      />

      <FieldButton
        label="Fecha"
        value={formatDate(fromDayKey(dayKey))}
        onPress={() => setPicker('date')}
        leading={<CalendarDays size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
      />

      <Controller
        control={control}
        name="allDay"
        render={({ field: { onChange, value } }) => <SwitchRow label="Todo el día" value={value} onValueChange={onChange} />}
      />

      {!allDay ? (
        <View style={styles.timeRow}>
          <FieldButton
            label="Inicio"
            value={formatMinutes(startMinutes)}
            onPress={() => setPicker('start')}
            leading={<Clock size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          />
          <Controller
            control={control}
            name="endMinutes"
            render={({ fieldState: { error: fieldError } }) => (
              <FieldButton label="Fin" value={formatMinutes(endMinutes)} onPress={() => setPicker('end')} error={fieldError?.message} />
            )}
          />
        </View>
      ) : null}

      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value }, fieldState: { error: fieldError } }) => (
          <TextField
            label="Descripción"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={fieldError?.message}
            placeholder="Notas, lugar, enlaces…"
            multiline
            numberOfLines={3}
            style={styles.multiline}
          />
        )}
      />

      <Controller
        control={control}
        name="recurrence"
        render={({ field: { onChange, value } }) => (
          <RecurrenceField value={value} onChange={onChange} baseDayKey={dayKey} disabled={recurrenceLocked} />
        )}
      />

      {/* Solo al crear: una vez creada, se comparte desde su detalle. */}
      {showSharing ? (
        <Controller
          control={control}
          name="shareWith"
          render={({ field: { onChange: onShareWith, value: shareWith }, fieldState }) => (
            <Controller
              control={control}
              name="isPrivate"
              render={({ field: { onChange: onPrivate, value: isPrivate } }) => (
                <Controller
                  control={control}
                  name="shareContactIds"
                  render={({ field: { onChange: onIds, value: ids }, fieldState: idsState }) => (
                    <SharingField
                      isPrivate={isPrivate}
                      onPrivateChange={onPrivate}
                      shareWith={shareWith}
                      onShareWithChange={onShareWith}
                      contactIds={ids}
                      onContactIdsChange={onIds}
                      error={fieldState.error?.message ?? idsState.error?.message}
                    />
                  )}
                />
              )}
            />
          )}
        />
      ) : null}

      {/* `onLayout` publica dónde queda esta sección, para que quien abra el
          formulario pidiendo los recordatorios pueda desplazarse hasta aquí. */}
      <View onLayout={(e) => onRemindersLayout?.(e.nativeEvent.layout.y)}>
        <Controller
          control={control}
          name="reminderOffsets"
          render={({ field: { onChange, value } }) => <RemindersField value={value} onChange={onChange} />}
        />
      </View>

      <Controller
        control={control}
        name="isGym"
        render={({ field: { onChange, value } }) => (
          <>
            <SwitchRow
              label="Actividad de gimnasio"
              hint="Anota tu rutina aquí mismo, sin salir del calendario."
              value={value}
              onValueChange={onChange}
            />
            {value ? (
              <WorkoutDraft
                exercises={exercises}
                onChange={setExercises}
                existingCount={existingWorkoutCount}
                onOpenExisting={onOpenExistingWorkout}
              />
            ) : null}
          </>
        )}
      />

      <Button title={submitLabel} onPress={submit} loading={submitting} />

      <DatePickerSheet
        visible={picker === 'date'}
        value={fromDayKey(dayKey)}
        onClose={() => setPicker(null)}
        onSelect={(date) => {
          setValue('dayKey', toDayKey(date), { shouldDirty: true });
          setPicker(null);
        }}
      />
      <TimePickerSheet
        visible={picker === 'start'}
        value={startMinutes}
        title="Hora de inicio"
        onClose={() => setPicker(null)}
        onSelect={(minutes) => {
          const duration = Math.max(15, endMinutes - startMinutes);
          setValue('startMinutes', minutes, { shouldDirty: true });
          setValue('endMinutes', Math.min(1440, minutes + duration), { shouldDirty: true, shouldValidate: true });
          setPicker(null);
        }}
      />
      <TimePickerSheet
        visible={picker === 'end'}
        value={endMinutes}
        title="Hora de fin"
        onClose={() => setPicker(null)}
        onSelect={(minutes) => {
          setValue('endMinutes', minutes, { shouldDirty: true, shouldValidate: true });
          setPicker(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.lg },
  timeRow: { flexDirection: 'row', gap: Spacing.md },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
});
