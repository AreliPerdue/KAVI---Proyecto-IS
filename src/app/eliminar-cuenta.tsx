import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';

import { Lista } from '@/components/account/delete-account-sheet';
import { AppText, Button, Screen, Wordmark } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useModuleNav } from '@/hooks/use-modules';
import { useAuth } from '@/providers';
import { useT } from '@/i18n';

const CORREO = 'perdue.areli28@gmail.com';

/**
 * Página pública para eliminar la cuenta (spec 03, RF-A12). Se abre sin iniciar sesión: es el
 * enlace web que pide Google Play, para quien ya no tiene la app instalada. Explica el camino
 * dentro de la app y ofrece el correo de contacto del aviso de privacidad.
 */
export default function EliminarCuentaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const tx = useT();
  const { href } = useModuleNav();

  return (
    <Screen scroll maxWidth={640}>
      <View style={styles.pila}>
        <Wordmark size={28} />
        <AppText variant="title" accessibilityRole="header">
          {tx.account.deletion.pageTitle}
        </AppText>
        <AppText color="textSecondary">{tx.account.deletion.pageIntro}</AppText>
      </View>

      <View style={[styles.tarjeta, { backgroundColor: theme.surfaceAlt }]}>
        <AppText variant="heading">{tx.account.deletion.fromKavi}</AppText>
        <AppText>{tx.account.deletion.step1}</AppText>
        <AppText>{tx.account.deletion.step2}</AppText>
        <AppText>{tx.account.deletion.step3}</AppText>
        <Button
          title={user ? tx.account.deletion.goToProfile : tx.account.deletion.signIn}
          onPress={() => router.replace(user ? href('profile') : '/(auth)/login')}
        />
      </View>

      <Lista titulo={tx.account.deletion.whatGoes} puntos={tx.account.deletion.deleted_items} />
      <Lista titulo={tx.account.deletion.othersLong} puntos={tx.account.deletion.others_items} />

      <View style={[styles.tarjeta, { backgroundColor: theme.surfaceAlt }]}>
        <AppText variant="heading">{tx.account.deletion.cantSignIn}</AppText>
        <AppText color="textSecondary">
          {tx.account.deletion.writeUs(CORREO)}
        </AppText>
        <Button
          title={tx.account.deletion.writeEmail}
          variant="secondary"
          icon={<Mail size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
          onPress={() => void Linking.openURL(`mailto:${CORREO}?subject=${encodeURIComponent(tx.account.deletion.emailSubject)}`)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pila: { gap: Spacing.sm },
  tarjeta: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, borderCurve: 'continuous' },
});
