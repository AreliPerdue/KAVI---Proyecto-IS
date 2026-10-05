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
import { HEALTH_METRICS, HEALTH_SOURCE_LABEL } from '@/services/health';
import { TRATOS } from '@/constants/gymrat';
import { NOBIS, nobiIdDesde, nobiUrl } from '@/constants/nobi';
import { formatDayAndMonth, fromDayKey, rangeForView, toDayKey } from '@/lib/dates';
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
  // Los Nobis traen el fondo pintado: la versión que se pinta depende del esquema.
  const scheme = useResolvedScheme();
  const timeFormat = usePreferencesStore((s) => s.timeFormat);
  const setTimeFormat = usePreferencesStore((s) => s.setTimeFormat);
  const appearance = usePreferencesStore((s) => s.appearance);
  const setAppearance = usePreferencesStore((s) => s.setAppearance);
  const showWorkouts = usePreferencesStore((s) => s.showWorkouts);
  const setShowWorkouts = usePreferencesStore((s) => s.setShowWorkouts);
  const showBirthdays = usePreferencesStore((s) => s.showBirthdays);
  const setShowBirthdays = usePreferencesStore((s) => s.setShowBirthdays);
  const [pickingBirthday, setPickingBirthday] = useState(false);
  const router = useRouter();
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
          hint="En navegador no hay avisos del sistema: verás el recordatorio dentro de la app. En el móvil sí llegan."
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

      <SettingsGroup title="Tu Nobi" footer="Nobi es la mascota de KAVI. El color que elijas lo verán también tus contactos.">
        <View style={styles.nobis}>
          {NOBIS.map((nobi) => {
            const elegido = nobiIdDesde(profile.data?.avatar_url) === nobi.id;
            return (
              <Pressable
                key={nobi.id}
                accessibilityRole="button"
                accessibilityLabel={`Nobi ${nobi.label}`}
                accessibilityState={{ selected: elegido }}
                disabled={update.isPending}
                onPress={() => {
                  // Volver a tocar el elegido lo quita y devuelve las iniciales.
                  update.mutate(
                    { avatar_url: elegido ? null : nobiUrl(nobi.id) },
                    { onSuccess: () => showSnackbar({ message: elegido ? 'Nobi quitado.' : `Nobi ${nobi.label.toLowerCase()}.` }) },
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

      <SettingsGroup title="Qué se ve en el calendario">
        <SettingsRow
          icon={<Dumbbell size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label="Entrenamientos"
          hint="Los que registras sin agendar aparecen en su hora."
          right={<Toggle label="Entrenamientos en el calendario" value={showWorkouts} onValueChange={setShowWorkouts} />}
        />
        <SettingsRow
          icon={<Cake size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label="Cumpleaños"
          hint="El tuyo y el de tus contactos."
          right={<Toggle label="Cumpleaños en el calendario" value={showBirthdays} onValueChange={setShowBirthdays} />}
        />
        <SettingsRow
          icon={<Cake size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label="Mi cumpleaños"
          hint={profile.data?.birthday ? 'Tus contactos lo verán en su calendario.' : 'Sin definir. Tus contactos lo verán en su calendario.'}
          value={profile.data?.birthday ? formatDayAndMonth(fromDayKey(profile.data.birthday)) : 'Elegir'}
          onPress={() => setPickingBirthday(true)}
        />
      </SettingsGroup>

      {/* Se escribe en vez de navegar el calendario: una fecha de nacimiento está a
          cientos de meses de hoy, y cada mes es un toque. */}
      <DateInputSheet
        visible={pickingBirthday}
        value={profile.data?.birthday ? fromDayKey(profile.data.birthday) : null}
        title="Tu cumpleaños"
        maxDate={new Date()}
        onClose={() => setPickingBirthday(false)}
        onSelect={(fecha) => {
          setPickingBirthday(false);
          update.mutate(
            { birthday: toDayKey(fecha) },
            { onSuccess: () => showSnackbar({ message: 'Cumpleaños guardado.' }) },
          );
        }}
      />

      <SettingsGroup title="Presentación" footer="Se aplica al calendario, a los recordatorios y al historial de entrenamientos.">
        {/* Debajo y no a la derecha: tres opciones no caben junto a la etiqueta en 375 px. */}
        <SettingsRow
          icon={<SunMoon size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label="Apariencia"
          hint="«Sistema» sigue el ajuste de tu teléfono o navegador."
          below={
            <Segmented
              fullWidth
              options={[
                { value: 'system', label: 'Sistema' },
                { value: 'light', label: 'Claro' },
                { value: 'dark', label: 'Oscuro' },
              ]}
              value={appearance}
              onChange={setAppearance}
            />
          }
        />
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

      <FitnessSettings />

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
        <SettingsRow
          icon={<ShieldCheck size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
          label="Aviso de privacidad"
          onPress={() => router.push('/privacidad')}
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

      {/* RF-A12: aparte y al final, para que no se toque por error junto a "Cerrar sesión". */}
      <SettingsGroup footer="Borra tu cuenta y todos tus datos de inmediato. No se puede deshacer.">
        <SettingsRow
          icon={<UserX size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />}
          label="Eliminar cuenta"
          destructive
          onPress={() => setEliminando(true)}
        />
      </SettingsGroup>
      <DeleteAccountSheet visible={eliminando} email={user?.email ?? ''} onClose={() => setEliminando(false)} />

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
    <SettingsGroup title="Gimnasio">
      <SettingsRow
        icon={icono(Weight)}
        label="Unidad de peso"
        hint="Cambiarla no altera lo que ya registraste: solo cambia cómo lo ves."
        below={
          <Segmented
            fullWidth
            options={[{ value: 'kg', label: 'Kilos (kg)' }, { value: 'lb', label: 'Libras (lb)' }]}
            value={weightUnit}
            onChange={(v) => setPref('weightUnit', v)}
          />
        }
      />
      <SettingsRow
        icon={icono(Gauge)}
        label="Cómo anotas el esfuerzo de cada serie"
        hint="Reps en reserva (RIR): cuántas repeticiones más te salían antes de no poder; 0 es al fallo. Escala del 1 al 10 (RPE): qué tan pesada se sintió; 10 es tu máximo. Anotarlo es opcional."
        below={
          <Segmented
            fullWidth
            options={[{ value: 'rir', label: 'Reps en reserva' }, { value: 'rpe', label: 'Escala del 1 al 10' }]}
            value={effortScale}
            onChange={(v) => setPref('effortScale', v)}
          />
        }
      />
      <SettingsRow
        icon={icono(Dumbbell)}
        label="Cálculo de tu peso máximo"
        hint="Con el peso y las repeticiones de tus series, KAVI estima cuánto podrías levantar en una sola repetición (tu 1RM) para mostrarte cómo vas. Epley y Brzycki son dos fórmulas conocidas que dan casi lo mismo; si no sabes cuál, deja Epley."
        below={
          <Segmented
            fullWidth
            options={[{ value: 'epley', label: 'Epley (estándar)' }, { value: 'brzycki', label: 'Brzycki' }]}
            value={e1rmFormula}
            onChange={(v) => setPref('e1rmFormula', v)}
          />
        }
      />
      <SettingsRow
        icon={icono(Timer)}
        label="Descanso entre series"
        hint="Al marcar una serie como hecha arranca un temporizador con este tiempo. Mientras corre puedes sumarle o quitarle 15 segundos."
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
        label="Peso que quitas en un drop set"
        hint="En un drop set terminas la serie y sigues sin descanso con menos peso. Cada drop que agregas empieza con este porcentaje menos: de 50 kg con 20 % pasas a 40 kg."
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
        label="Sonido de los temporizadores"
        hint="Pita en los últimos 3 segundos del descanso y en cada cambio de un temporizador de intervalos (EMOM, Tabata). Suena encima de tu música, sin pausarla."
        right={<Toggle label="Sonido de los temporizadores" value={timerSound} onValueChange={(v) => setPref('timerSound', v)} />}
      />
      <SettingsRow
        icon={icono(Smile)}
        label="Modo serio"
        hint="Quita las bromas, frases y celebraciones. Tus récords personales (PR) y logros se siguen mostrando."
        right={<Toggle label="Modo serio" value={seriousMode} onValueChange={(v) => setPref('seriousMode', v)} />}
      />
      <DatosDeSalud icono={icono(HeartPulse)} />
      {seriousMode ? null : (
        <SettingsRow
          icon={icono(Crown)}
          label="Cómo te habla KAVI"
          hint="En las frases y celebraciones: «¡PR, mi rey!» o «¡PR, mi reina!». Neutral no usa ninguno."
          below={<Segmented fullWidth options={TRATOS} value={trato} onChange={(v) => setPref('trato', v)} />}
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
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const disponible = useHealthAvailability();
  const estado = disponible.data;
  const permisos = useHealthPermissions(estado?.status === 'available');
  const { connect, disconnect } = useHealthConnection();

  if (!estado) return null;
  if (estado.status !== 'available') {
    return <SettingsRow icon={icono} label="Datos de salud" hint={estado.message} />;
  }
  const conectado = anyPermission(permisos.data);
  const que = HEALTH_METRICS.filter((m) => permisos.data?.[m.id]).map((m) => m.label.toLowerCase());
  return (
    <SettingsRow
      icon={icono}
      label="Datos de salud"
      hint={
        conectado
          ? `Conectado a ${HEALTH_SOURCE_LABEL[estado.source]}: ${que.join(', ')}. Solo se leen en este dispositivo; KAVI no los sube a internet.`
          : 'Pasos, distancia, calorías activas y entrenamientos de otras apps, para verlos en Fitness → Actividad. Solo se leen en este dispositivo.'
      }
      below={
        conectado ? (
          <Button
            title="Desconectar"
            variant="secondary"
            loading={disconnect.isPending}
            onPress={async () => {
              const ok = await confirm({
                title: 'Desconectar datos de salud',
                message: 'KAVI deja de leerlos y olvida lo que tenía en este dispositivo. Tus entrenamientos de KAVI no cambian.',
                confirmLabel: 'Desconectar',
              });
              if (ok) disconnect.mutate(undefined, { onSuccess: () => showSnackbar({ message: 'Datos de salud desconectados.' }) });
            }}
          />
        ) : (
          <Button title="Conectar" variant="secondary" loading={connect.isPending} onPress={() => connect.mutate(HEALTH_METRICS.map((m) => m.id))} />
        )
      }
    />
  );
}
