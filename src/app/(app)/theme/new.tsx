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
import { useLanguage, useT } from '@/i18n';
import { dimensionName, themeName } from '@/lib/theme-name';

const MAX_WIDTH = 640;

/** Crear/editar tema propio: nombre + dimensión + color (12) + icono (~40) (RF-T2). */
export default function ThemeFormScreen() {
  const tx = useT();
  const lang = useLanguage();
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const themes = useThemes();
  const { create, update, remove } = useThemeMutations();
  const editing = themes.data?.find((t) => t.id === id) ?? null;
  // La fila de un tema del sistema es global y se comparte: se personaliza, no se borra.
  const delSistema = !!editing?.is_system;

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
        // Un tema del sistema se edita desde su nombre en el idioma activo (spec 12).
        name: themeName(editing),
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
      update.mutate({ id: editing.id, patch: values }, { onSuccess: () => { showSnackbar({ message: tx.themes.editor.updated }); close(); } });
    } else {
      create.mutate(values, { onSuccess: () => { showSnackbar({ message: tx.themes.editor.created }); close(); } });
    }
  });

  const onDelete = async () => {
    if (!editing) return;
    const ok = await confirm({
      title: tx.themes.editor.delete,
      message: tx.themes.editor.deleteMessage,
      confirmLabel: tx.themes.editor.deleteConfirm,
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(editing.id, { onSuccess: () => { showSnackbar({ message: tx.themes.editor.deleted }); close(); } });
  };

  if (id && themes.isPending) {
    return (
      <Screen modal maxWidth={MAX_WIDTH}>
        <ModalHeader title={tx.themes.editor.edit} />
        <LoadingState />
      </Screen>
    );
  }
  if (id && themes.isSuccess && !editing) {
    return (
      <Screen modal maxWidth={MAX_WIDTH}>
        <ModalHeader title={tx.themes.editor.edit} />
        <ErrorState message={tx.themes.editor.notFound} />
      </Screen>
    );
  }

  return (
    <Screen modal scroll maxWidth={MAX_WIDTH}>
      <ModalHeader title={delSistema ? tx.themes.editor.customize : editing ? tx.themes.editor.edit : tx.themes.manage.newTheme} />
      {mutation.error ? <Banner tone="error" message={mutation.error.message} /> : null}

      <View style={[styles.preview, { backgroundColor: `${color}22`, borderColor: color }]}>
        <View style={[styles.previewSwatch, { backgroundColor: color }]}>
          <ThemeIcon name={icon} color="#FFFFFF" size={IconSize.action} />
        </View>
        <AppText variant="bodyStrong">{name.trim() || tx.themes.editor.namePlaceholderPreview}</AppText>
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <TextField label={tx.themes.editor.name} value={value} onChangeText={onChange} onBlur={onBlur} error={error?.message} placeholder={tx.themes.editor.namePlaceholder} maxLength={40} />
        )}
      />

      <Controller
        control={control}
        name="dimension"
        render={({ field: { onChange, value } }) => (
          <View style={styles.section}>
            <AppText variant="label" color="textSecondary">
              {tx.themes.editor.dimension}
            </AppText>
            <View style={styles.chips}>
              {DIMENSIONS.map((d) => (
                <Chip key={d.key} label={dimensionName(d.key, lang)} color={d.color} selected={value === d.key} onPress={() => onChange(d.key)} />
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
              {tx.themes.editor.colorSection}
            </AppText>
            <View style={styles.chips}>
              {THEME_PALETTE.map((c) => (
                <Pressable
                  key={c}
                  accessibilityRole="button"
                  accessibilityLabel={tx.themes.editor.color(c)}
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
              {tx.themes.editor.iconSection}
            </AppText>
            <View style={styles.chips}>
              {THEME_ICON_NAMES.map((n) => {
                const selected = value === n;
                return (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityLabel={tx.themes.editor.icon(n)}
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

      <Button title={editing ? tx.themes.editor.saveChanges : tx.themes.editor.create} onPress={onSubmit} loading={mutation.isPending} />
      {/* Un tema del sistema se personaliza, no se borra: su fila la comparten todas las cuentas. */}
      {editing && !delSistema ? <Button title={tx.themes.editor.delete} variant="danger" onPress={onDelete} loading={remove.isPending} /> : null}
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
