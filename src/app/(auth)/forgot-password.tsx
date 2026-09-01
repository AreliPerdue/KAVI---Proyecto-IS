import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AuthHeader } from '@/components/auth-header';
import { Banner, Button, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useResetPassword } from '@/hooks/use-auth-actions';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/schemas/auth';

const AUTH_MAX_WIDTH = 440;

export default function ForgotPasswordScreen() {
  const reset = useResetPassword();
  const { control, handleSubmit } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(({ email }) => reset.mutate(email));

  return (
    <Screen scroll centered maxWidth={AUTH_MAX_WIDTH}>
      <AuthHeader
        title="Recupera tu contraseña"
        subtitle="Te enviaremos un enlace a tu correo para crear una nueva."
      />

      <View style={styles.form}>
        {reset.error ? <Banner tone="error" message={reset.error.message} /> : null}
        {reset.isSuccess ? (
          <Banner tone="success" message="Listo. Si el correo existe, recibirás el enlace en unos minutos." />
        ) : null}

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <TextField
              label="Correo"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={onSubmit}
            />
          )}
        />

        <Button title="Enviar enlace" onPress={onSubmit} loading={reset.isPending} />
        <Link href="/(auth)/login" asChild>
          <Button title="Volver a iniciar sesión" variant="ghost" />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.lg },
});
