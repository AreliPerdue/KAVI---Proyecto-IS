import { zodResolver } from '@hookform/resolvers/zod';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Bell,
  BellOff,
  CalendarSearch,
  ChartNoAxesColumn,
  Info,
  Languages,
  KeyRound,
  LogOut,
  Clock,
  Cake,
  Dumbbell,
  Palette,
  Pencil,
  Repeat2,
  SunMoon,
  Gauge,
  Crown,
  HeartPulse,
  Smile,
  Volume2,
  Timer,
  Weight,
  Users,
  ShieldCheck,
  UserX,
} from 'lucide-react-native';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { DeleteAccountSheet } from '@/components/account/delete-account-sheet';
import { useGymStore } from '@/store/gym-store';
import { usePreferencesStore } from '@/store/preferences-store';

import {
  AppText,
  Avatar,
  Banner,
  Button,
  DateInputSheet,
  ErrorState,
  LoadingState,
  Screen,
  Segmented,
  SettingsGroup,
  SettingsRow,
  Sheet,
  TextField,
  Toggle,
} from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useActivitiesRange } from '@/hooks/use-activities-range';
import { useChangePassword, useSignIn, useSignOut } from '@/hooks/use-auth-actions';
import { useContacts } from '@/hooks/use-connections';
import { useMyProfile, useUpdateMyProfile } from '@/hooks/use-profile';
import { useIsAdmin } from '@/hooks/use-admin';
import { useResolvedScheme, useTheme } from '@/hooks/use-theme';
import { useThemes } from '@/hooks/use-themes';
import { anyPermission, useHealthAvailability, useHealthConnection, useHealthPermissions } from '@/hooks/use-health';
import { useWorkouts } from '@/hooks/use-workouts';
import { HEALTH_METRICS } from '@/services/health';
import { TRATOS } from '@/constants/gymrat';
import { NOBIS, nobiIdDesde, nobiUrl } from '@/constants/nobi';
import { formatDayAndMonth, fromDayKey, rangeForView, toDayKey } from '@/lib/dates';
import { env } from '@/lib/env';
import { notificationPermissionGranted } from '@/lib/notifications';
import { changePasswordSchema, type ChangePasswordValues, profileSchema, type ProfileValues } from '@/lib/schemas/auth';
import { useAuth, useConfirm, useSnackbar } from '@/providers';
import { StackedModuleBack } from '@/components/navigation/stacked-module';
import { useModuleNav } from '@/hooks/use-modules';
import { useLanguage, useT } from '@/i18n';

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
  // Los Nobis traen el fondo pintado: la versión que se pinta depende del esquema.
  const scheme = useResolvedScheme();
  const timeFormat = usePreferencesStore((s) => s.timeFormat);
  const setTimeFormat = usePreferencesStore((s) => s.setTimeFormat);
  const appearance = usePreferencesStore((s) => s.appearance);
  const setAppearance = usePreferencesStore((s) => s.setAppearance);
  const language = usePreferencesStore((s) => s.language);
  const setLanguage = usePreferencesStore((s) => s.setLanguage);
  const tx = useT();
  const lang = useLanguage();
  const showWorkouts = usePreferencesStore((s) => s.showWorkouts);
  const setShowWorkouts = usePreferencesStore((s) => s.setShowWorkouts);
  const showBirthdays = usePreferencesStore((s) => s.showBirthdays);
  const setShowBirthdays = usePreferencesStore((s) => s.setShowBirthdays);
  const [pickingBirthday, setPickingBirthday] = useState(false);
  const router = useRouter();
  const { abrir: abrirModulo } = useModuleNav();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const { user } = useAuth();
  const [eliminando, setEliminando] = useState(false);
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
          showSnackbar({ message: tx.profile.updated });
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
          showSnackbar({ message: tx.profile.passwordUpdated });
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
      title: tx.profile.signOut,
      message: tx.profile.signOutMessage,
      confirmLabel: tx.profile.signOut,
      destructive: true,
    });
    if (ok) signOut.mutate();
  };

  const notificationsRow = () => {
    if (notifications === null) {
      return (
        <SettingsRow
          icon={<BellOff size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />}
          label={tx.profile.reminders}
          hint={tx.profile.remindersWebHint}
          disabled
        />
      );
    }
    if (notifications === undefined) {
      return (
        <SettingsRow
          icon={<Bell size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label={tx.profile.reminders}
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
        label={tx.profile.reminders}
        hint={notifications ? undefined : tx.profile.remindersOffHint}
        value={notifications ? tx.profile.on : tx.profile.off}
      />
    );
  };

  return (
    <Screen scroll maxWidth={PROFILE_MAX_WIDTH} contentStyle={styles.content}>
      <StackedModuleBack />
      <AppText variant="title" accessibilityRole="header">
        {tx.profile.title}
      </AppText>

      {profile.isPending ? <LoadingState label={tx.profile.loading} /> : null}
      {profile.isError ? <ErrorState message={profile.error.message} onRetry={() => profile.refetch()} /> : null}

      {profile.data ? (
        <>
          {/* La identidad y todo lo editable de la cuenta viven en esta tarjeta. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx.profile.editProfileOf(profile.data.display_name ?? user?.email ?? '')}
            onPress={() => setEditing(true)}
            style={({ pressed }) => [
              styles.hero,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed ? { backgroundColor: theme.surfaceAlt } : null,
            ]}>
            <Avatar profile={profile.data} size={64} />
            <View style={styles.heroText}>
              <AppText variant="heading" numberOfLines={1}>
                {profile.data.display_name ?? tx.profile.noName}
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
            <StatTile value={monthCount} label={tx.profile.stats.month} />
            <StatTile value={acceptedContacts} label={tx.profile.stats.friends} />
            <StatTile value={ownThemes} label={tx.profile.stats.themes} />
            <StatTile value={workoutCount} label={tx.profile.stats.workouts} />
          </View>
        </>
      ) : null}

      <SettingsGroup title={tx.profile.calendarSection}>
        <SettingsRow
          icon={<Palette size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label={tx.profile.myThemes}
          hint={tx.profile.myThemesHint}
          value={String(ownThemes)}
          onPress={() => router.push('/(app)/themes')}
        />
        <SettingsRow
          icon={<Users size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label={tx.profile.friendsShared}
          value={String(acceptedContacts)}
          onPress={() => abrirModulo('shared')}
        />
        <SettingsRow
          icon={<CalendarSearch size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label={tx.profile.availability}
          hint={tx.profile.availabilityHint}
          onPress={() => router.push('/(app)/shared/availability')}
        />
      </SettingsGroup>

      <SettingsGroup title={tx.profile.nobiSection} footer={tx.profile.nobiFooter}>
        <View style={styles.nobis}>
          {NOBIS.map((nobi) => {
            const elegido = nobiIdDesde(profile.data?.avatar_url) === nobi.id;
            return (
              <Pressable
                key={nobi.id}
                accessibilityRole="button"
                accessibilityLabel={tx.profile.nobiA11y(tx.colors[nobi.id] ?? nobi.label)}
                accessibilityState={{ selected: elegido }}
                disabled={update.isPending}
                onPress={() => {
                  // Volver a tocar el elegido lo quita y devuelve las iniciales.
                  update.mutate(
                    { avatar_url: elegido ? null : nobiUrl(nobi.id) },
                    { onSuccess: () => showSnackbar({ message: elegido ? tx.profile.nobiRemoved : tx.profile.nobiChosen((tx.colors[nobi.id] ?? nobi.label).toLowerCase()) }) },
                  );
                }}
                style={({ pressed }) => [
                  styles.nobi,
                  { borderColor: elegido ? theme.ink : 'transparent', backgroundColor: theme.surfaceAlt },
                  pressed ? { opacity: 0.75 } : null,
                ]}>
                <Image source={nobi.sources[scheme]} style={styles.nobiImagen} contentFit="cover" />
              </Pressable>
            );
          })}
        </View>
      </SettingsGroup>

      <SettingsGroup title={tx.profile.calendarShows}>
        <SettingsRow
          icon={<Dumbbell size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label={tx.profile.workouts}
          hint={tx.profile.workoutsHint}
          right={<Toggle label={tx.profile.workoutsToggle} value={showWorkouts} onValueChange={setShowWorkouts} />}
        />
        <SettingsRow
          icon={<Cake size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label={tx.profile.birthdays}
          hint={tx.profile.birthdaysHint}
          right={<Toggle label={tx.profile.birthdaysToggle} value={showBirthdays} onValueChange={setShowBirthdays} />}
        />
        <SettingsRow
          icon={<Cake size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label={tx.profile.myBirthday}
          hint={profile.data?.birthday ? tx.profile.birthdaySetHint : tx.profile.birthdayUnsetHint}
          value={profile.data?.birthday ? formatDayAndMonth(fromDayKey(profile.data.birthday), lang) : tx.profile.choose}
          onPress={() => setPickingBirthday(true)}
        />
      </SettingsGroup>

      {/* Se escribe en vez de navegar el calendario: una fecha de nacimiento está a
          cientos de meses de hoy, y cada mes es un toque. */}
      <DateInputSheet
        visible={pickingBirthday}
        value={profile.data?.birthday ? fromDayKey(profile.data.birthday) : null}
        title={tx.profile.yourBirthday}
        maxDate={new Date()}
        onClose={() => setPickingBirthday(false)}
        onSelect={(fecha) => {
          setPickingBirthday(false);
          update.mutate(
            { birthday: toDayKey(fecha) },
            { onSuccess: () => showSnackbar({ message: tx.profile.birthdaySaved }) },
          );
        }}
      />

      <SettingsGroup title={tx.profile.presentation} footer={tx.profile.presentationFooter}>
        {/* Debajo y no a la derecha: tres opciones no caben junto a la etiqueta en 375 px. */}
        <SettingsRow
          icon={<SunMoon size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label={tx.profile.appearance}
          hint={tx.profile.appearanceHint}
          below={
            <Segmented
              fullWidth
              options={[
                { value: 'system', label: tx.profile.appearanceOptions.system },
                { value: 'light', label: tx.profile.appearanceOptions.light },
                { value: 'dark', label: tx.profile.appearanceOptions.dark },
              ]}
              value={appearance}
              onChange={setAppearance}
            />
          }
        />
        <SettingsRow
          icon={<Languages size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label={tx.profile.language}
          hint={tx.profile.languageHint}
          below={
            <Segmented
              fullWidth
              options={[
                { value: 'system', label: tx.profile.languageSystem },
                { value: 'es', label: tx.profile.languageSpanish },
                { value: 'en', label: tx.profile.languageEnglish },
              ]}
              value={language}
              onChange={setLanguage}
            />
          }
        />
        <SettingsRow
          icon={<Clock size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label={tx.profile.timeFormat}
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

      <FitnessSettings />

      <SettingsGroup title={tx.profile.notices}>{notificationsRow()}</SettingsGroup>

      {/* Solo existe para cuentas `adminkavi` (RF-AD3). Ocultarlo no es el control de
          acceso: las funciones del panel comprueban el rol en la base (RF-AD6). */}
      {isAdmin ? (
        <SettingsGroup title={tx.profile.admin} footer={tx.profile.adminFooter}>
          <SettingsRow
            icon={<ChartNoAxesColumn size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
            label={tx.profile.adminStats}
            hint={tx.profile.adminStatsHint}
            onPress={() => router.push('/(app)/admin')}
          />
        </SettingsGroup>
      ) : null}

      {env.isDemoMode ? (
        <SettingsGroup title={tx.profile.demoSection} footer={tx.profile.demoFooter}>
          {DEMO_SWITCH.filter((d) => d.email !== user?.email).map((d) => (
            <SettingsRow
              key={d.email}
              icon={<Repeat2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
              label={tx.profile.signInAs(d.label)}
              onPress={() => signIn.mutate({ email: d.email, password: 'demo1234' })}
              disabled={signIn.isPending}
            />
          ))}
        </SettingsGroup>
      ) : null}

      <SettingsGroup title={tx.profile.about}>
        <SettingsRow
          icon={<Info size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label={tx.profile.version}
          value={env.isDemoMode ? `${version} · demo` : version}
        />
        <SettingsRow
          icon={<ShieldCheck size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label={tx.profile.privacy}
          onPress={() => router.push('/privacidad')}
        />
      </SettingsGroup>

      {signOut.error ? <Banner tone="error" message={signOut.error.message} /> : null}
      <SettingsGroup>
        <SettingsRow
          icon={<LogOut size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />}
          label={tx.profile.signOut}
          destructive
          disabled={signOut.isPending}
          onPress={confirmSignOut}
        />
      </SettingsGroup>

      {/* RF-A12: aparte y al final, para que no se toque por error junto a "Cerrar sesión". */}
      <SettingsGroup footer={tx.profile.deleteFooter}>
        <SettingsRow
          icon={<UserX size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />}
          label={tx.profile.deleteAccount}
          destructive
          onPress={() => setEliminando(true)}
        />
      </SettingsGroup>
      <DeleteAccountSheet visible={eliminando} email={user?.email ?? ''} onClose={() => setEliminando(false)} />

      <Sheet visible={editing} onClose={() => setEditing(false)} title={tx.profile.editProfile}>
        {update.error ? <Banner tone="error" message={update.error.message} /> : null}
        <Controller
          control={control}
          name="displayName"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <TextField
              label={tx.profile.name}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              hint={tx.profile.nameHint}
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
              label={tx.profile.username}
              value={value}
              onChangeText={(text) => onChange(text.replace(/^@+/, '').toLowerCase())}
              onBlur={onBlur}
              error={error?.message}
              hint={tx.profile.usernameHint}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
            />
          )}
        />
        <TextField
          label={tx.profile.email}
          value={user?.email ?? ''}
          editable={false}
          hint={tx.profile.emailHint}
        />
        <Button title={tx.profile.saveChanges} onPress={onSubmit} loading={update.isPending} disabled={!formState.isDirty} />
        <Button
          title={tx.profile.changePassword}
          variant="secondary"
          onPress={openPasswordSheet}
          icon={<KeyRound size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
        />
      </Sheet>

      <Sheet visible={changingPassword} onClose={() => setChangingPassword(false)} title={tx.profile.changePassword}>
        {changePassword.error ? <Banner tone="error" message={changePassword.error.message} /> : null}
        <Controller
          control={passwordForm.control}
          name="currentPassword"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <TextField
              label={tx.profile.currentPassword}
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
              label={tx.profile.newPassword}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              hint={tx.profile.newPasswordHint}
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
              label={tx.profile.confirmNewPassword}
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
        <Button title={tx.profile.updatePassword} onPress={submitPassword} loading={changePassword.isPending} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nobis: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  nobi: { width: 60, height: 60, borderRadius: Radius.full, borderWidth: 2, overflow: 'hidden' },
  nobiImagen: { width: '100%', height: '100%' },
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

/**
 * Ajustes del gym tracker (spec 07 v2, §10). Son del dispositivo, como la apariencia: cada
 * quien entrena en kg o en lb según el gimnasio donde esté, no según su cuenta.
 */
function FitnessSettings() {
  const theme = useTheme();
  const tx = useT();
  const weightUnit = useGymStore((s) => s.weightUnit);
  const effortScale = useGymStore((s) => s.effortScale);
  const e1rmFormula = useGymStore((s) => s.e1rmFormula);
  const restDefaultSec = useGymStore((s) => s.restDefaultSec);
  const dropPercent = useGymStore((s) => s.dropPercent);
  const seriousMode = useGymStore((s) => s.seriousMode);
  const trato = useGymStore((s) => s.trato);
  const timerSound = useGymStore((s) => s.timerSound);
  const setPref = useGymStore((s) => s.setPref);
  const icono = (Icono: typeof Weight) => <Icono size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />;

  return (
    <SettingsGroup title={tx.fitness.settings.title}>
      <SettingsRow
        icon={icono(Weight)}
        label={tx.fitness.settings.weightUnit}
        hint={tx.fitness.settings.weightUnitHint}
        below={
          <Segmented
            fullWidth
            options={[{ value: 'kg', label: tx.fitness.settings.kilos }, { value: 'lb', label: tx.fitness.settings.pounds }]}
            value={weightUnit}
            onChange={(v) => setPref('weightUnit', v)}
          />
        }
      />
      <SettingsRow
        icon={icono(Gauge)}
        label={tx.fitness.settings.effort}
        hint={tx.fitness.settings.effortHint}
        below={
          <Segmented
            fullWidth
            options={[{ value: 'rir', label: tx.fitness.settings.rir }, { value: 'rpe', label: tx.fitness.settings.rpe }]}
            value={effortScale}
            onChange={(v) => setPref('effortScale', v)}
          />
        }
      />
      <SettingsRow
        icon={icono(Dumbbell)}
        label={tx.fitness.settings.e1rm}
        hint={tx.fitness.settings.e1rmHint}
        below={
          <Segmented
            fullWidth
            options={[{ value: 'epley', label: tx.fitness.settings.epley }, { value: 'brzycki', label: tx.fitness.settings.brzycki }]}
            value={e1rmFormula}
            onChange={(v) => setPref('e1rmFormula', v)}
          />
        }
      />
      <SettingsRow
        icon={icono(Timer)}
        label={tx.fitness.settings.rest}
        hint={tx.fitness.settings.restHint}
        below={
          <Segmented
            fullWidth
            options={[{ value: '60', label: '1 min' }, { value: '90', label: '1:30' }, { value: '120', label: '2 min' }, { value: '180', label: '3 min' }]}
            value={String(restDefaultSec) as '60' | '90' | '120' | '180'}
            onChange={(v) => setPref('restDefaultSec', Number(v))}
          />
        }
      />
      <SettingsRow
        icon={icono(Dumbbell)}
        label={tx.fitness.settings.drop}
        hint={tx.fitness.settings.dropHint}
        below={
          <Segmented
            fullWidth
            options={[{ value: '10', label: '10 %' }, { value: '20', label: '20 %' }, { value: '25', label: '25 %' }]}
            value={String(dropPercent) as '10' | '20' | '25'}
            onChange={(v) => setPref('dropPercent', Number(v))}
          />
        }
      />
      <SettingsRow
        icon={icono(Volume2)}
        label={tx.fitness.settings.timerSound}
        hint={tx.fitness.settings.timerSoundHint}
        right={<Toggle label={tx.fitness.settings.timerSound} value={timerSound} onValueChange={(v) => setPref('timerSound', v)} />}
      />
      <SettingsRow
        icon={icono(Smile)}
        label={tx.fitness.settings.serious}
        hint={tx.fitness.settings.seriousHint}
        right={<Toggle label={tx.fitness.settings.serious} value={seriousMode} onValueChange={(v) => setPref('seriousMode', v)} />}
      />
      <DatosDeSalud icono={icono(HeartPulse)} />
      {seriousMode ? null : (
        <SettingsRow
          icon={icono(Crown)}
          label={tx.fitness.settings.voice}
          hint={tx.fitness.settings.voiceHint}
          below={<Segmented fullWidth options={TRATOS.map((o) => ({ value: o.value, label: tx.fitness.settings.voiceOptions[o.value] }))} value={trato} onChange={(v) => setPref('trato', v)} />}
        />
      )}
    </SettingsGroup>
  );
}

/**
 * Datos de salud (spec 11, RF-H8): qué está conectado y desconectar. Desconectar olvida lo
 * leído; los permisos de la plataforma se quitan desde sus propios ajustes.
 */
function DatosDeSalud({ icono }: { icono: ReactNode }) {
  const tx = useT();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const disponible = useHealthAvailability();
  const estado = disponible.data;
  const permisos = useHealthPermissions(estado?.status === 'available');
  const { connect, disconnect } = useHealthConnection();

  if (!estado) return null;
  if (estado.status !== 'available') {
    return <SettingsRow icon={icono} label={tx.fitness.health.title} hint={tx.fitness.health.unavailable[estado.reason]} />;
  }
  const conectado = anyPermission(permisos.data);
  const que = HEALTH_METRICS.filter((m) => permisos.data?.[m.id]).map((m) => tx.fitness.health.metrics[m.id].toLowerCase());
  return (
    <SettingsRow
      icon={icono}
      label={tx.fitness.health.title}
      hint={
        conectado
          ? tx.fitness.health.connectedTo(tx.fitness.health.sources[estado.source], que.join(', '))
          : tx.fitness.health.notConnected
      }
      below={
        conectado ? (
          <Button
            title={tx.fitness.health.disconnect}
            variant="secondary"
            loading={disconnect.isPending}
            onPress={async () => {
              const ok = await confirm({
                title: tx.fitness.health.disconnectTitle,
                message: tx.fitness.health.disconnectMessage,
                confirmLabel: tx.fitness.health.disconnect,
              });
              if (ok) disconnect.mutate(undefined, { onSuccess: () => showSnackbar({ message: tx.fitness.health.disconnected }) });
            }}
          />
        ) : (
          <Button title={tx.fitness.health.connect} variant="secondary" loading={connect.isPending} onPress={() => connect.mutate(HEALTH_METRICS.map((m) => m.id))} />
        )
      }
    />
  );
}
