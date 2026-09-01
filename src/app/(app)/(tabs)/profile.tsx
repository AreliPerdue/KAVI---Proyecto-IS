import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut } from 'lucide-react-native';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, Banner, Button, Screen, TextField } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useSignOut } from '@/hooks/use-auth-actions';
import { useMyProfile, useUpdateMyProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { profileSchema, type ProfileValues } from '@/lib/schemas/auth';
import { useAuth } from '@/providers';

const PROFILE_MAX_WIDTH = 560;

export default function ProfileScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const profile = useMyProfile();
  const update = useUpdateMyProfile();
  const signOut = useSignOut();

  const { control, handleSubmit, reset, formState } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: '', displayName: '' },
  });

  useEffect(() => {
    if (profile.data) {
      reset({ username: profile.data.username, displayName: profile.data.display_name ?? '' });
    }
  }, [profile.data, reset]);

  const onSubmit = handleSubmit((values) =>
    update.mutate({ username: values.username, display_name: values.displayName || null }),
  );

  return (
    <Screen scroll maxWidth={PROFILE_MAX_WIDTH}>
      <AppText variant="title" accessibilityRole="header">
        Perfil
      </AppText>

      {profile.isPending ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.textSecondary} />
          <AppText color="textSecondary">Cargando tu perfil…</AppText>
        </View>
      ) : null}

      {profile.isError ? (
        <View style={styles.form}>
          <Banner tone="error" message={profile.error.message} />
          <Button title="Reintentar" variant="secondary" onPress={() => profile.refetch()} />
        </View>
      ) : null}

      {profile.data ? (
        <View style={styles.form}>
          <AppText color="textSecondary">{session?.user.email}</AppText>

          {update.error ? <Banner tone="error" message={update.error.message} /> : null}
          {update.isSuccess && !formState.isDirty ? (
            <Banner tone="success" message="Cambios guardados." />
          ) : null}

          <Controller
            control={control}
            name="displayName"
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
              <TextField
                label="Nombre visible"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={error?.message}
                hint="Así te verán tus contactos en el calendario compartido."
                autoComplete="name"
                textContentType="name"
                maxLength={60}
              />
            )}
          />
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
              <TextField
                label="Username"
                value={value}
                onChangeText={(text) => onChange(text.toLowerCase())}
                onBlur={onBlur}
                error={error?.message}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                maxLength={30}
              />
            )}
          />

          <Button
            title="Guardar cambios"
            onPress={onSubmit}
            loading={update.isPending}
            disabled={!formState.isDirty}
          />
        </View>
      ) : null}

      <View style={styles.footer}>
        {signOut.error ? <Banner tone="error" message={signOut.error.message} /> : null}
        <Button
          title="Cerrar sesión"
          variant="danger"
          loading={signOut.isPending}
          onPress={() => signOut.mutate()}
          icon={<LogOut size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  form: { gap: Spacing.lg },
  footer: { marginTop: 'auto', gap: Spacing.md, paddingTop: Spacing.xl },
});
