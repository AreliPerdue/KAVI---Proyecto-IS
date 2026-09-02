import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { AppText, Banner, Button, Chip, ErrorState, LoadingState, Screen, TextField, ThemeIcon } from '@/components/ui';
import { DIMENSIONS } from '@/constants/dimensions';
import { THEME_ICON_NAMES, THEME_PALETTE } from '@/constants/icons';
import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMutations, useThemes } from '@/hooks/use-themes';
import { themeFormSchema, type ThemeFormValues } from '@/lib/schemas/theme';
import { useConfirm, useSnackbar } from '@/providers';

const MAX_WIDTH = 640;

/** Crear/editar tema propio: nombre + dimensión + color (12) + icono (~40) (RF-T2). */
export default function ThemeFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const themes = useThemes();
  const { create, update, remove } = useThemeMutations();
  const editing = themes.data?.find((t) => t.id === id) ?? null;

  const { control, handleSubmit, reset } = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: { name: '', dimension: 'fisica', color: THEME_PALETTE[0], icon: 'tag' },
  });
  const color = useWatch({ control, name: 'color' });
  const icon = useWatch({ control, name: 'icon' });
  const name = useWatch({ control, name: 'name' });

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        dimension: editing.dimension,
        color: (THEME_PALETTE as readonly string[]).includes(editing.color) ? (editing.color as ThemeFormValues['color']) : THEME_PALETTE[0],
        icon: editing.icon,
      });
    }
  }, [editing, reset]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(app)/themes'));
  const mutation = editing ? update : create;

  const onSubmit = handleSubmit((values) => {
    if (editing) {
      update.mutate({ id: editing.id, patch: values }, { onSuccess: () => { showSnackbar({ message: 'Tema actualizado.' }); close(); } });
    } else {
      create.mutate(values, { onSuccess: () => { showSnackbar({ message: 'Tema creado.' }); close(); } });
    }
  });

  const onDelete = async () => {
    if (!editing) return;
    const ok = await confirm({
      title: 'Eliminar tema',
      message: 'Las actividades que lo usan conservarán su color e icono y quedarán sin tema.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(editing.id, { onSuccess: () => { showSnackbar({ message: 'Tema eliminado.' }); close(); } });
  };

  if (id && themes.isPending) {
    return (
      <Screen maxWidth={MAX_WIDTH}>
        <ModalHeader title="Editar tema" />
        <LoadingState />
      </Screen>
    );
  }
  if (id && themes.isSuccess && !editing) {
    return (
      <Screen maxWidth={MAX_WIDTH}>
        <ModalHeader title="Editar tema" />
        <ErrorState message="Ese tema ya no existe." />
      </Screen>
    );
  }

  return (
    <Screen scroll maxWidth={MAX_WIDTH}>
      <ModalHeader title={editing ? 'Editar tema' : 'Nuevo tema'} />
      {mutation.error ? <Banner tone="error" message={mutation.error.message} /> : null}

      <View style={[styles.preview, { backgroundColor: `${color}22`, borderColor: color }]}>
        <View style={[styles.previewSwatch, { backgroundColor: color }]}>
          <ThemeIcon name={icon} color="#FFFFFF" size={IconSize.action} />
        </View>
        <AppText variant="bodyStrong">{name.trim() || 'Nombre del tema'}</AppText>
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <TextField label="Nombre" value={value} onChangeText={onChange} onBlur={onBlur} error={error?.message} placeholder="Ej. Piano, Voluntariado…" maxLength={40} />
        )}
      />

      <Controller
        control={control}
        name="dimension"
        render={({ field: { onChange, value } }) => (
          <View style={styles.section}>
            <AppText variant="label" color="textSecondary">
              Dimensión
            </AppText>
            <View style={styles.chips}>
              {DIMENSIONS.map((d) => (
                <Chip key={d.key} label={d.label} color={d.color} selected={value === d.key} onPress={() => onChange(d.key)} />
              ))}
            </View>
          </View>
        )}
      />

      <Controller
        control={control}
        name="color"
        render={({ field: { onChange, value } }) => (
          <View style={styles.section}>
            <AppText variant="label" color="textSecondary">
              Color
            </AppText>
            <View style={styles.chips}>
              {THEME_PALETTE.map((c) => (
                <Pressable
                  key={c}
                  accessibilityRole="button"
                  accessibilityLabel={`Color ${c}`}
                  accessibilityState={{ selected: value === c }}
                  onPress={() => onChange(c)}
                  style={({ pressed }) => [styles.colorDot, { backgroundColor: c }, pressed ? styles.pressed : null]}>
                  {value === c ? <Check size={IconSize.inline} strokeWidth={3} color="#FFFFFF" /> : null}
                </Pressable>
              ))}
            </View>
          </View>
        )}
      />

      <Controller
        control={control}
        name="icon"
        render={({ field: { onChange, value } }) => (
          <View style={styles.section}>
            <AppText variant="label" color="textSecondary">
              Icono
            </AppText>
            <View style={styles.chips}>
              {THEME_ICON_NAMES.map((n) => {
                const selected = value === n;
                return (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityLabel={`Icono ${n}`}
                    accessibilityState={{ selected }}
                    onPress={() => onChange(n)}
                    style={({ pressed }) => [
                      styles.iconTile,
                      { borderColor: selected ? color : theme.border, backgroundColor: selected ? `${color}22` : theme.surface },
                      pressed ? styles.pressed : null,
                    ]}>
                    <ThemeIcon name={n} color={selected ? color : theme.textSecondary} size={IconSize.action} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />

      <Button title={editing ? 'Guardar cambios' : 'Crear tema'} onPress={onSubmit} loading={mutation.isPending} />
      {editing ? <Button title="Eliminar tema" variant="danger" onPress={onDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
  previewSwatch: { width: 40, height: 40, borderRadius: Radius.sm, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  section: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  colorDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconTile: { width: 48, height: 48, borderWidth: 1, borderRadius: Radius.sm, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});
