import { zodResolver } from '@hookform/resolvers/zod';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  Bell,
  BellOff,
  CalendarSearch,
  ChartNoAxesColumn,
  Info,
  KeyRound,
  LogOut,
  Clock,
  Palette,
  Pencil,
  Repeat2,
  Users,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { usePreferencesStore } from '@/store/preferences-store';

import {
  AppText,
  Avatar,
  Banner,
  Button,
  ErrorState,
  LoadingState,
  Screen,
  Segmented,
  SettingsGroup,
  SettingsRow,
  Sheet,
  TextField,
} from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useActivitiesRange } from '@/hooks/use-activities-range';
import { useChangePassword, useSignIn, useSignOut } from '@/hooks/use-auth-actions';
import { useContacts } from '@/hooks/use-connections';
import { useMyProfile, useUpdateMyProfile } from '@/hooks/use-profile';
import { useIsAdmin } from '@/hooks/use-admin';
import { useTheme } from '@/hooks/use-theme';
import { useThemes } from '@/hooks/use-themes';
import { useWorkouts } from '@/hooks/use-workouts';
import { rangeForView } from '@/lib/dates';
import { env } from '@/lib/env';
import { notificationPermissionGranted } from '@/lib/notifications';
import { changePasswordSchema, type ChangePasswordValues, profileSchema, type ProfileValues } from '@/lib/schemas/auth';
import { useAuth, useConfirm, useSnackbar } from '@/providers';

const PROFILE_MAX_WIDTH = 560;

const DEMO_SWITCH = [
  { email: 'demo@kavi.app', label: 'Demo' },
  { email: 'ana@kavi.app', label: 'Ana Torres' },
  { email: 'luis@kavi.app', label: 'Luis Mena' },
  { email: 'maria@kavi.app', label: 'María García' },
];

/** Permiso de notificaciones: `undefined` mientras se consulta, `null` si no aplica. */
function useNotificationPermission(): boolean | null | undefined {
  const [granted, setGranted] = useState<boolean | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void notificationPermissionGranted().then((value) => {
      if (alive) setGranted(value);
    });
    return () => {
      alive = false;
    };
  }, []);
  return granted;
}

function StatTile({ value, label }: { value: number; label: string }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${label}`}
      style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <AppText variant="title" tabular>
        {value}
      </AppText>
      <AppText variant="caption" color="textSecondary" numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}

/** Perfil y ajustes: identidad, resumen y accesos agrupados (RF-A6). */
export default function ProfileScreen() {
  const theme = useTheme();
  const timeFormat = usePreferencesStore((s) => s.timeFormat);
  const setTimeFormat = usePreferencesStore((s) => s.setTimeFormat);
  const router = useRouter();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const { user } = useAuth();
  const profile = useMyProfile();
  const isAdmin = useIsAdmin();
  const update = useUpdateMyProfile();
  const signOut = useSignOut();
  const signIn = useSignIn();
  const themes = useThemes();
  const contacts = useContacts();
  const workouts = useWorkouts();
  const notifications = useNotificationPermission();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const changePassword = useChangePassword();

  const monthRange = useMemo(() => rangeForView('month', new Date()), []);
  const monthActivities = useActivitiesRange(monthRange);

  const ownThemes = (themes.data ?? []).filter((t) => !t.is_system).length;
  const acceptedContacts = (contacts.data ?? []).filter((c) => c.kind === 'accepted').length;
  const monthCount = monthActivities.data?.length ?? 0;
  const workoutCount = workouts.data?.length ?? 0;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const { control, handleSubmit, reset, formState } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: '', username: '' },
  });

  useEffect(() => {
    if (profile.data) reset({ displayName: profile.data.display_name ?? '', username: profile.data.username });
  }, [profile.data, reset]);

  const onSubmit = handleSubmit((values) =>
    update.mutate(
      { display_name: values.displayName, username: values.username },
      {
        onSuccess: () => {
          setEditing(false);
          showSnackbar({ message: 'Perfil actualizado.' });
        },
      },
    ),
  );

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  const submitPassword = passwordForm.handleSubmit((values) =>
    changePassword.mutate(
      { email: user?.email ?? '', currentPassword: values.currentPassword, newPassword: values.password },
      {
        onSuccess: () => {
          setChangingPassword(false);
          passwordForm.reset();
          showSnackbar({ message: 'Contraseña actualizada.' });
        },
      },
    ),
  );

  const openPasswordSheet = () => {
    changePassword.reset();
    passwordForm.reset();
    setEditing(false);
    setChangingPassword(true);
  };

  const confirmSignOut = async () => {
    const ok = await confirm({
      title: 'Cerrar sesión',
      message: 'Tendrás que volver a entrar con tu correo y contraseña.',
      confirmLabel: 'Cerrar sesión',
      destructive: true,
    });
    if (ok) signOut.mutate();
  };

  const notificationsRow = () => {
    if (notifications === null) {
      return (
        <SettingsRow
          icon={<BellOff size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />}
          label="Recordatorios"
          hint="Los avisos del sistema están deshabilitados: verás el recordatorio dentro de la app."
          disabled
        />
      );
    }
    if (notifications === undefined) {
      return (
        <SettingsRow
          icon={<Bell size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label="Recordatorios"
          value="…"
          disabled
        />
      );
    }
    return (
      <SettingsRow
        icon={
          notifications ? (
            <Bell size={IconSize.inline} strokeWidth={IconStroke} color={theme.success} />
          ) : (
            <BellOff size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
          )
        }
        label="Recordatorios"
        hint={notifications ? undefined : 'Actívalos en Ajustes para recibir tus avisos.'}
        value={notifications ? 'Activados' : 'Desactivados'}
      />
    );
  };

  return (
    <Screen scroll maxWidth={PROFILE_MAX_WIDTH} contentStyle={styles.content}>
      <AppText variant="title" accessibilityRole="header">
        Perfil
      </AppText>

      {profile.isPending ? <LoadingState label="Cargando tu perfil…" /> : null}
      {profile.isError ? <ErrorState message={profile.error.message} onRetry={() => profile.refetch()} /> : null}

      {profile.data ? (
        <>
          {/* La identidad y todo lo editable de la cuenta viven en esta tarjeta. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Editar perfil de ${profile.data.display_name ?? user?.email}`}
            onPress={() => setEditing(true)}
            style={({ pressed }) => [
              styles.hero,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed ? { backgroundColor: theme.surfaceAlt } : null,
            ]}>
            <Avatar profile={profile.data} size={64} />
            <View style={styles.heroText}>
              <AppText variant="heading" numberOfLines={1}>
                {profile.data.display_name ?? 'Sin nombre'}
              </AppText>
              <AppText color="textSecondary" numberOfLines={1}>
                @{profile.data.username}
              </AppText>
              <AppText variant="caption" color="textTertiary" numberOfLines={1}>
                {user?.email}
              </AppText>
            </View>
            <View style={[styles.editBadge, { borderColor: theme.border }]}>
              <Pencil size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
            </View>
          </Pressable>

          <View style={styles.stats}>
            <StatTile value={monthCount} label="Actividades este mes" />
            <StatTile value={acceptedContacts} label="Amigos" />
            <StatTile value={ownThemes} label="Temas propios" />
            <StatTile value={workoutCount} label="Entrenamientos" />
          </View>
        </>
      ) : null}

      <SettingsGroup title="Calendario">
        <SettingsRow
          icon={<Palette size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label="Mis temas"
          hint="Colores e iconos de tus actividades."
          value={String(ownThemes)}
          onPress={() => router.push('/(app)/themes')}
        />
        <SettingsRow
          icon={<Users size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label="Amigos y compartido"
          value={String(acceptedContacts)}
          onPress={() => router.push('/(app)/(tabs)/shared')}
        />
        <SettingsRow
          icon={<CalendarSearch size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label="Disponibilidad"
          hint="Horarios en común con tus amigos."
          onPress={() => router.push('/(app)/shared/availability')}
        />
      </SettingsGroup>

      <SettingsGroup title="Presentación" footer="Se aplica al calendario, a los recordatorios y al historial de entrenamientos.">
        <SettingsRow
          icon={<Clock size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label="Formato de hora"
          right={
            <Segmented
              options={[
                { value: '24h', label: '24 h' },
                { value: '12h', label: '12 h' },
              ]}
              value={timeFormat}
              onChange={setTimeFormat}
            />
          }
        />
      </SettingsGroup>

      <SettingsGroup title="Avisos">{notificationsRow()}</SettingsGroup>

      {/* Solo existe para cuentas `adminkavi` (RF-AD3). Ocultarlo no es el control de
          acceso: las funciones del panel comprueban el rol en la base (RF-AD6). */}
      {isAdmin ? (
        <SettingsGroup title="Administración" footer="Números agregados del producto. No incluye el contenido de ninguna cuenta.">
          <SettingsRow
            icon={<ChartNoAxesColumn size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
            label="Estadísticas de KAVI"
            hint="Cuentas registradas y uso."
            onPress={() => router.push('/(app)/admin')}
          />
        </SettingsGroup>
      ) : null}

      {env.isDemoMode ? (
        <SettingsGroup title="Modo demo" footer="Cambia de cuenta para probar el calendario compartido. Los datos se reinician al recargar.">
          {DEMO_SWITCH.filter((d) => d.email !== user?.email).map((d) => (
            <SettingsRow
              key={d.email}
              icon={<Repeat2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
              label={`Entrar como ${d.label}`}
              onPress={() => signIn.mutate({ email: d.email, password: 'demo1234' })}
              disabled={signIn.isPending}
            />
          ))}
        </SettingsGroup>
      ) : null}

      <SettingsGroup title="Acerca de">
        <SettingsRow
          icon={<Info size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label="Versión"
          value={env.isDemoMode ? `${version} · demo` : version}
        />
      </SettingsGroup>

      {signOut.error ? <Banner tone="error" message={signOut.error.message} /> : null}
      <SettingsGroup>
        <SettingsRow
          icon={<LogOut size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />}
          label="Cerrar sesión"
          destructive
          disabled={signOut.isPending}
          onPress={confirmSignOut}
        />
      </SettingsGroup>

      <Sheet visible={editing} onClose={() => setEditing(false)} title="Editar perfil">
        {update.error ? <Banner tone="error" message={update.error.message} /> : null}
        <Controller
          control={control}
          name="displayName"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <TextField
              label="Nombre"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              hint="Así te ven tus amigos en el calendario compartido."
              autoComplete="name"
              textContentType="name"
              maxLength={60}
            />
          )}
        />
        {/* El correo identifica la cuenta: se muestra, pero no se edita (RF-A1). */}
        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <TextField
              label="Usuario"
              value={value}
              onChangeText={(text) => onChange(text.replace(/^@+/, '').toLowerCase())}
              onBlur={onBlur}
              error={error?.message}
              hint="Con esto te encuentran tus amigos. Puedes cambiarlo cuando quieras."
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
            />
          )}
        />
        <TextField
          label="Correo"
          value={user?.email ?? ''}
          editable={false}
          hint="Es tu identificador en KAVI y no se puede cambiar."
        />
        <Button title="Guardar cambios" onPress={onSubmit} loading={update.isPending} disabled={!formState.isDirty} />
        <Button
          title="Cambiar contraseña"
          variant="secondary"
          onPress={openPasswordSheet}
          icon={<KeyRound size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
        />
      </Sheet>

      <Sheet visible={changingPassword} onClose={() => setChangingPassword(false)} title="Cambiar contraseña">
        {changePassword.error ? <Banner tone="error" message={changePassword.error.message} /> : null}
        <Controller
          control={passwordForm.control}
          name="currentPassword"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <TextField
              label="Contraseña actual"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              secure
              autoComplete="current-password"
              textContentType="password"
            />
          )}
        />
        <Controller
          control={passwordForm.control}
          name="password"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <TextField
              label="Contraseña nueva"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              hint="Mínimo 8 caracteres."
              secure
              autoComplete="new-password"
              textContentType="newPassword"
            />
          )}
        />
        <Controller
          control={passwordForm.control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <TextField
              label="Confirmar contraseña nueva"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              secure
              autoComplete="new-password"
              textContentType="newPassword"
            />
          )}
        />
        <Button title="Actualizar contraseña" onPress={submitPassword} loading={changePassword.isPending} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.xl },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  heroText: { flex: 1, gap: 2 },
  editBadge: { width: 32, height: 32, borderRadius: Radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stat: {
    // Dos por fila: con cuatro tarjetas en una sola fila los números quedaban ilegibles.
    flexBasis: '47%',
    flexGrow: 1,
    gap: 2,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
});
