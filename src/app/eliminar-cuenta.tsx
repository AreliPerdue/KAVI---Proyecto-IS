import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';

import { LOS_DEMAS, Lista, SE_BORRA } from '@/components/account/delete-account-sheet';
import { AppText, Button, Screen, Wordmark } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers';

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

  return (
    <Screen scroll maxWidth={640}>
      <View style={styles.pila}>
        <Wordmark size={28} />
        <AppText variant="title" accessibilityRole="header">
          Eliminar tu cuenta de KAVI
        </AppText>
        <AppText color="textSecondary">Puedes eliminar tu cuenta y todos tus datos cuando quieras. Se borra todo de inmediato y no se puede deshacer.</AppText>
      </View>

      <View style={[styles.tarjeta, { backgroundColor: theme.surfaceAlt }]}>
        <AppText variant="heading">Desde KAVI</AppText>
        <AppText>1. Abre KAVI, en la app o en la web, e inicia sesión.</AppText>
        <AppText>2. Ve a Perfil y, hasta abajo, toca «Eliminar cuenta».</AppText>
        <AppText>3. Escribe tu contraseña y confirma.</AppText>
        <Button
          title={user ? 'Ir a mi perfil' : 'Iniciar sesión'}
          onPress={() => router.replace(user ? '/(app)/(tabs)/profile' : '/(auth)/login')}
        />
      </View>

      <Lista titulo="Qué se borra" puntos={SE_BORRA} />
      <Lista titulo="Qué pasa con las personas con quienes compartías" puntos={LOS_DEMAS} />

      <View style={[styles.tarjeta, { backgroundColor: theme.surfaceAlt }]}>
        <AppText variant="heading">¿No puedes entrar?</AppText>
        <AppText color="textSecondary">
          Escríbenos desde el correo de tu cuenta a {CORREO} con tu nombre de usuario y la frase «Eliminar mi cuenta». La eliminamos y te
          confirmamos por correo.
        </AppText>
        <Button
          title="Escribir un correo"
          variant="secondary"
          icon={<Mail size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
          onPress={() => void Linking.openURL(`mailto:${CORREO}?subject=${encodeURIComponent('Eliminar mi cuenta de KAVI')}`)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pila: { gap: Spacing.sm },
  tarjeta: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, borderCurve: 'continuous' },
});
