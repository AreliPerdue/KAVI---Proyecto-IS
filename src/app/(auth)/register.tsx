import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AuthHeader } from '@/components/auth-header';
import { AppText, Banner, Button, IconButton, Screen, TextField } from '@/components/ui';
import { DEMO_OTP } from '@/constants/demo';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useEmailSignUp, useSignOut } from '@/hooks/use-auth-actions';
import { useTheme } from '@/hooks/use-theme';
import { env } from '@/lib/env';
import { OTP_LENGTH, signUpSchema, type SignUpValues } from '@/lib/schemas/auth';
import { availableUsername } from '@/lib/username';
import { isUsernameAvailable } from '@/services/auth';
import { useAuth } from '@/providers';

const AUTH_MAX_WIDTH = 440;

/** Un paso = una pregunta. Los campos que valida cada uno antes de avanzar. */
const STEPS = [
  { fields: ['displayName'], title: '¿Cómo te llamas?', subtitle: 'Así te verán tus contactos en el calendario compartido.' },
  { fields: ['email'], title: 'Tu correo', subtitle: 'Será tu identificador en KAVI. Te enviaremos un código para confirmarlo.' },
  { fields: ['username'], title: 'Elige tu usuario', subtitle: 'Con esto te encuentran tus amigos. Puedes cambiarlo cuando quieras.' },
  { fields: ['code'], title: 'Confirma tu correo', subtitle: null },
  { fields: ['password', 'confirmPassword'], title: 'Crea tu contraseña', subtitle: 'Mínimo 8 caracteres.' },
] as const satisfies readonly { fields: readonly (keyof SignUpValues)[]; title: string; subtitle: string | null }[];

function Progress({ step }: { step: number }) {
  const theme = useTheme();
  return (
    <View style={styles.progress} accessible accessibilityLabel={`Paso ${step + 1} de ${STEPS.length}`}>
      {STEPS.map((_, index) => (
        <View
          key={index}
          style={[styles.progressBar, { backgroundColor: index <= step ? theme.ink : theme.surfaceAlt }]}
        />
      ))}
    </View>
  );
}

/** Alta por pasos: nombre → correo → usuario → código → contraseña (RF-A8). */
export default function RegisterScreen() {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const { start, verify, finish } = useEmailSignUp();
  const { setSignUpPending } = useAuth();
  const signOut = useSignOut();
  /** Verificado el correo hay sesión abierta pero la cuenta aún no tiene contraseña. */
  const sessionWithoutPassword = useRef(false);

  /**
   * Si se abandona el alta tras verificar el correo, se cierra la sesión a medias:
   * la cuenta queda creada y sin contraseña, y se recupera con "Olvidé mi contraseña".
   */
  useEffect(
    () => () => {
      setSignUpPending(false);
      if (sessionWithoutPassword.current) signOut.mutate();
    },
    // Solo al desmontar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { control, trigger, getValues, setValue, setFocus } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: '', email: '', username: '', code: '', password: '', confirmPassword: '' },
    mode: 'onSubmit',
  });

  const current = STEPS[step] as (typeof STEPS)[number];
  const pending = start.isPending || verify.isPending || finish.isPending;
  const error = start.error ?? verify.error ?? finish.error;

  const back = () => {
    start.reset();
    verify.reset();
    finish.reset();
    // Volver desde la contraseña deshace la verificación: la cuenta se queda sin sesión.
    if (step === 4 && sessionWithoutPassword.current) {
      sessionWithoutPassword.current = false;
      setSignUpPending(false);
      signOut.mutate();
      return setStep(2);
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const next = async () => {
    const valid = await trigger(current.fields as unknown as (keyof SignUpValues)[]);
    if (!valid) return;
    const values = getValues();

    if (step === 0) return setStep(1);

    // Del correo al usuario: se propone el primero libre derivado del correo, y la
    // persona lo acepta o escribe otro. Proponerlo aquí y no antes es lo que permite
    // derivarlo de un correo que todavía no existía.
    if (step === 1) {
      if (!getValues('username')) {
        const suggestion = await availableUsername(values.email, isUsernameAvailable);
        setValue('username', suggestion);
      }
      return setStep(2);
    }

    // El código se envía al salir del usuario: la cuenta nace al verificarlo, con el
    // username ya dentro de sus metadatos.
    if (step === 2) {
      return start.mutate(
        { email: values.email, displayName: values.displayName, username: values.username },
        { onSuccess: () => setStep(3) },
      );
    }

    if (step === 3) {
      // La verificación abre sesión: se marca el alta como pendiente para que el guard
      // no salte a la app antes de tener contraseña.
      setSignUpPending(true);
      return verify.mutate(
        { email: values.email, code: values.code },
        {
          onSuccess: () => {
            sessionWithoutPassword.current = true;
            setStep(4);
          },
          onError: () => setSignUpPending(false),
        },
      );
    }

    return finish.mutate(values.password, {
      onSuccess: () => {
        sessionWithoutPassword.current = false;
        // Con contraseña ya fijada, el guard entra a la app.
        setSignUpPending(false);
      },
    });
  };

  const resend = () =>
    start.mutate({
      email: getValues('email'),
      displayName: getValues('displayName'),
      username: getValues('username'),
    });

  return (
    <Screen scroll centered maxWidth={AUTH_MAX_WIDTH}>
      {step === 0 ? <AuthHeader title="Crea tu cuenta" subtitle="Te lo preguntamos por partes, es rápido." /> : null}

      <View style={styles.form}>
        <Progress step={step} />

        <View style={styles.stepHeader}>
          {step > 0 ? (
            <IconButton label="Paso anterior" onPress={back}>
              <ArrowLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
            </IconButton>
          ) : null}
          <View style={styles.stepTitle}>
            <AppText variant="heading" accessibilityRole="header">
              {current.title}
            </AppText>
            {current.subtitle ? <AppText color="textSecondary">{current.subtitle}</AppText> : null}
            {step === 3 ? (
              <AppText color="textSecondary">
                Escribe el código de {OTP_LENGTH} dígitos que enviamos a {getValues('email')}.
              </AppText>
            ) : null}
          </View>
        </View>

        {error ? <Banner tone="error" message={error.message} /> : null}
        {step === 3 && env.isDemoMode ? (
          <Banner tone="info" message={`Modo demo: no sale ningún correo, el código es ${DEMO_OTP}.`} />
        ) : null}
        {step === 3 && start.isSuccess && !verify.error ? (
          <Banner tone="success" message="Código enviado." />
        ) : null}

        {step === 0 ? (
          <Controller
            control={control}
            name="displayName"
            render={({ field: { onChange, onBlur, value }, fieldState: { error: fieldError } }) => (
              <TextField
                label="Nombre"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldError?.message}
                placeholder="Tu nombre y apellido"
                autoComplete="name"
                textContentType="name"
                autoFocus
                maxLength={60}
                returnKeyType="next"
                onSubmitEditing={next}
              />
            )}
          />
        ) : null}

        {step === 1 ? (
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value }, fieldState: { error: fieldError } }) => (
              <TextField
                label="Correo"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldError?.message}
                hint="No podrás cambiarlo más adelante."
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={next}
              />
            )}
          />
        ) : null}

        {step === 2 ? (
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value }, fieldState: { error: fieldError } }) => (
              <TextField
                label="Usuario"
                value={value}
                onChangeText={(text) => onChange(text.replace(/^@+/, '').toLowerCase())}
                onBlur={onBlur}
                error={fieldError?.message}
                hint="Solo letras minúsculas, números y guion bajo. Sí puedes cambiarlo después."
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                maxLength={30}
                returnKeyType="next"
                onSubmitEditing={next}
              />
            )}
          />
        ) : null}

        {step === 3 ? (
          <Controller
            control={control}
            name="code"
            render={({ field: { onChange, onBlur, value }, fieldState: { error: fieldError } }) => (
              <TextField
                label="Código"
                value={value}
                onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                onBlur={onBlur}
                error={fieldError?.message}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                autoFocus
                maxLength={OTP_LENGTH}
                style={styles.code}
                returnKeyType="next"
                onSubmitEditing={next}
              />
            )}
          />
        ) : null}

        {step === 4 ? (
          <>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value }, fieldState: { error: fieldError } }) => (
                <TextField
                  label="Contraseña"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={fieldError?.message}
                  secure
                  autoComplete="new-password"
                  textContentType="newPassword"
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={() => setFocus('confirmPassword')}
                />
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value, ref }, fieldState: { error: fieldError } }) => (
                <TextField
                  ref={ref}
                  label="Confirmar contraseña"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={fieldError?.message}
                  secure
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="go"
                  onSubmitEditing={next}
                />
              )}
            />
          </>
        ) : null}

        <Button title={step === STEPS.length - 1 ? 'Crear cuenta' : 'Continuar'} onPress={next} loading={pending} />

        {step === 3 ? (
          <Button title="Enviar otro código" variant="secondary" onPress={resend} disabled={pending} />
        ) : null}
      </View>

      {step === 0 ? (
        <View style={styles.footer}>
          <AppText color="textSecondary">¿Ya tienes cuenta?</AppText>
          <Link href="/(auth)/login" asChild>
            <Button title="Iniciar sesión" variant="secondary" />
          </Link>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.lg },
  progress: { flexDirection: 'row', gap: Spacing.xs },
  progressBar: { flex: 1, height: 4, borderRadius: Radius.full },
  stepHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginLeft: -Spacing.md },
  stepTitle: { flex: 1, gap: Spacing.xs, paddingTop: Spacing.sm },
  code: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  footer: { gap: Spacing.sm, marginTop: Spacing.xl },
});
