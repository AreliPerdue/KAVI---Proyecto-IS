import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { tint } from '@/components/calendar/activity-style';
import { ModalHeader } from '@/components/modal-header';
import { AppText, Banner, Button, ErrorState, LoadingState, Screen, TextField, ThemeIcon } from '@/components/ui';
import { THEME_ICON_NAMES } from '@/constants/icons';
import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useLists, useListMutations } from '@/hooks/use-lists';
import { useTheme } from '@/hooks/use-theme';
import { LIST_COLORS, listFormSchema, type ListFormValues } from '@/lib/schemas/list';
import { useSnackbar } from '@/providers';

const MAX_WIDTH = 640;

/** Crear y editar una lista: nombre, color e icono (RF-L2). */
export default function ListFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const lists = useLists();
  const { create, update } = useListMutations();
  const editando = lists.data?.find((l) => l.id === id) ?? null;

  const { control, handleSubmit, reset } = useForm<ListFormValues>({
    resolver: zodResolver(listFormSchema),
    defaultValues: { name: '', color: LIST_COLORS[0] as string, icon: 'tag' },
  });
  const color = useWatch({ control, name: 'color' });
  const icon = useWatch({ control, name: 'icon' });
  const name = useWatch({ control, name: 'name' });

  useEffect(() => {
    if (editando) reset({ name: editando.name, color: editando.color, icon: editando.icon });
  }, [editando, reset]);

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/(app)/lists'));
  const mutacion = editando ? update : create;

  const onSubmit = handleSubmit((values) => {
    if (editando) {
      update.mutate(
        { id: editando.id, patch: values },
        { onSuccess: () => { showSnackbar({ message: 'Lista actualizada.' }); cerrar(); } },
      );
    } else {
      create.mutate(values, {
        // Se abre la lista recién creada en vez de volver al inicio: quien crea una
        // lista es porque tiene algo que apuntar en ella ahora mismo.
        onSuccess: (lista) => router.replace({ pathname: '/(app)/list/[id]', params: { id: lista.id } }),
      });
    }
  });

  if (id && lists.isPending) {
    return (
      <Screen modal maxWidth={MAX_WIDTH}>
        <ModalHeader title="Editar lista" />
        <LoadingState />
      </Screen>
    );
  }
  if (id && lists.isSuccess && !editando) {
    return (
      <Screen modal maxWidth={MAX_WIDTH}>
        <ModalHeader title="Editar lista" />
        <ErrorState message="Esa lista ya no existe." />
      </Screen>
    );
  }

  return (
    <Screen modal scroll maxWidth={MAX_WIDTH}>
      <ModalHeader title={editando ? 'Editar lista' : 'Nueva lista'} />
      {mutacion.error ? <Banner tone="error" message={mutacion.error.message} /> : null}

      <View style={[styles.preview, { backgroundColor: tint(color, 0.16), borderColor: color }]}>
        <ThemeIcon name={icon} color={color} size={IconSize.action} />
        <AppText variant="bodyStrong">{name.trim() || 'Nombre de la lista'}</AppText>
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <TextField
            label="Nombre"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={error?.message}
            placeholder="Ej. Súper, Películas, Casa…"
            maxLength={40}
            autoFocus={!editando}
          />
        )}
      />

      <Controller
        control={control}
        name="color"
        render={({ field: { onChange, value } }) => (
          <View style={styles.seccion}>
            <AppText variant="label" color="textSecondary">
              Color
            </AppText>
            <View style={styles.rejilla}>
              {LIST_COLORS.map((c) => (
                <Pressable
                  key={c}
                  accessibilityRole="button"
                  accessibilityLabel={`Color ${c}`}
                  accessibilityState={{ selected: value === c }}
                  onPress={() => onChange(c)}
                  style={({ pressed }) => [styles.punto, { backgroundColor: c }, pressed ? styles.pressed : null]}>
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
          <View style={styles.seccion}>
            <AppText variant="label" color="textSecondary">
              Icono
            </AppText>
            <View style={styles.rejilla}>
              {THEME_ICON_NAMES.map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={`Icono ${n}`}
                  accessibilityState={{ selected: value === n }}
                  onPress={() => onChange(n)}
                  style={({ pressed }) => [
                    styles.iconoCelda,
                    {
                      borderColor: value === n ? color : theme.border,
                      backgroundColor: value === n ? tint(color, 0.16) : 'transparent',
                    },
                    pressed ? styles.pressed : null,
                  ]}>
                  <ThemeIcon name={n} color={value === n ? color : theme.textSecondary} size={IconSize.inline} />
                </Pressable>
              ))}
            </View>
          </View>
        )}
      />

      <Button
        title={editando ? 'Guardar cambios' : 'Crear lista'}
        onPress={onSubmit}
        loading={mutacion.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  seccion: { gap: Spacing.sm },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  punto: { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  iconoCelda: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
});
