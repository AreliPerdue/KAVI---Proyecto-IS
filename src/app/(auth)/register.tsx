import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, type TextInput, View } from 'react-native';

import { AuthHeader } from '@/components/auth-header';
import { AppText, Banner, Button, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSignUp } from '@/hooks/use-auth-actions';
import { registerSchema, type RegisterValues } from '@/lib/schemas/auth';

const AUTH_MAX_WIDTH = 440;

export default function RegisterScreen() {
  const signUp = useSignUp();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const { control, handleSubmit } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => signUp.mutate(values));
  const needsEmailConfirmation = signUp.isSuccess && !signUp.data.session;

  return (
    <Screen scroll centered maxWidth={AUTH_MAX_WIDTH}>
      <AuthHeader title="Crea tu cuenta" subtitle="Solo necesitas un username, tu correo y una contraseña." />

      <View style={styles.form}>
        {signUp.error ? <Banner tone="error" message={signUp.error.message} /> : null}
        {needsEmailConfirmation ? (
          <Banner tone="success" message="Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión." />
        ) : null}

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
              hint="Así te encontrarán tus contactos. Letras, números y guion bajo."
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              maxLength={30}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <TextField
              ref={emailRef}
              label="Correo"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <TextField
              ref={passwordRef}
              label="Contraseña"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              hint="Mínimo 8 caracteres."
              secure
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          )}
        />

        <Button title="Crear cuenta" onPress={onSubmit} loading={signUp.isPending} />
      </View>

      <View style={styles.footer}>
        <AppText color="textSecondary">¿Ya tienes cuenta?</AppText>
        <Link href="/(auth)/login" asChild>
          <Button title="Iniciar sesión" variant="secondary" />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.lg },
  footer: { gap: Spacing.sm, marginTop: Spacing.xl },
});
