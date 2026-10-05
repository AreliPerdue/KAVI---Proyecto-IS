import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, type TextInput, View } from "react-native";

import { AuthHeader } from "@/components/auth-header";
import { AppText, Banner, Button, Screen, TextField } from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useSignIn } from "@/hooks/use-auth-actions";
import { env } from "@/lib/env";
import { loginSchema, type LoginValues } from "@/lib/schemas/auth";
import { useT } from "@/i18n";

const AUTH_MAX_WIDTH = 440;

export default function LoginScreen() {
  const signIn = useSignIn();
  const passwordRef = useRef<TextInput>(null);
  const tx = useT();
  const { control, handleSubmit } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => signIn.mutate(values));

  return (
    <Screen scroll centered maxWidth={AUTH_MAX_WIDTH}>
      <AuthHeader
        slogan
        title={tx.auth.loginTitle}
      />

      <View style={styles.form}>
        {env.isDemoMode ? (
          <Banner
            tone="info"
            message={tx.auth.demoLoginHint}
          />
        ) : null}
        {signIn.error ? (
          <Banner tone="error" message={signIn.error.message} />
        ) : null}

        <Controller
          control={control}
          name="email"
          render={({
            field: { onChange, onBlur, value },
            fieldState: { error },
          }) => (
            <TextField
              label={tx.auth.email}
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
          render={({
            field: { onChange, onBlur, value },
            fieldState: { error },
          }) => (
            <TextField
              ref={passwordRef}
              label={tx.auth.password}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              secure
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          )}
        />

        <Button title={tx.auth.signIn} onPress={onSubmit} loading={signIn.isPending} />

        <Link href="/(auth)/forgot-password" asChild>
          <Button title={tx.auth.forgotPassword} variant="ghost" />
        </Link>
      </View>

      <View style={styles.footer}>
        <AppText color="textSecondary">{tx.auth.noAccount}</AppText>
        <Link href="/(auth)/register" asChild>
          <Button title={tx.auth.createAccount} variant="secondary" />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.lg },
  footer: { gap: Spacing.sm, marginTop: Spacing.xl },
});
