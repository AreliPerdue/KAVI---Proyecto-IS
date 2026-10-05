import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Lista } from '@/components/account/delete-account-sheet';
import { AppText, Banner, Button, LoadingState, Screen, Wordmark } from '@/components/ui';
import { PRIVACY_CONTACT } from '@/constants/privacy';
import { Radius, Spacing } from '@/constants/theme';
import { useDecideGuardianRequest, useGuardianRequest } from '@/hooks/use-consent';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/dates';
import { useAuth } from '@/providers';

const QUE_ES = [
  'KAVI es una app para organizar el calendario, las listas y los entrenamientos.',
  'Guarda lo que la persona agenda y, si usa el registro de gimnasio, datos como su peso corporal o notas de dolor, que la ley considera sensibles.',
  'No usa los datos para publicidad, no los vende y no tiene herramientas de rastreo.',
  'Solo ve sus datos quien los registró y las personas con quienes decida compartir su calendario o sus listas.',
  'La cuenta y todos sus datos se pueden eliminar en cualquier momento desde la app.',
];

/**
 * Página del adulto (spec 03, RF-A13): llega por el enlace del correo, sin iniciar sesión, y
 * aprueba o no que alguien de 16 o 17 años use KAVI. El enlace sirve una sola vez y vence en 7 días.
 */
export default function ConsentimientoScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const limpio = typeof token === 'string' && token.length > 0 ? token : null;
  const info = useGuardianRequest(limpio);
  const decidir = useDecideGuardianRequest(limpio);

  const cuerpo = () => {
    if (!limpio) return <Banner tone="error" message="Este enlace no es válido. Ábrelo tal cual desde el correo." />;
    if (info.isPending) return <LoadingState />;
    if (info.isError) return <Banner tone="error" message={info.error.message} />;
    if (!info.data) return <Banner tone="error" message="Este enlace no es válido. Ábrelo tal cual desde el correo." />;
    const { minorName, status, expiresAt } = info.data;

    if (status === 'approved') {
      return <Banner tone="success" message={`Aprobaste que ${minorName} use KAVI. Ya puede entrar. Gracias.`} />;
    }
    if (status === 'rejected') {
      return <Banner tone="info" message={`No aprobaste que ${minorName} use KAVI. Su cuenta sigue cerrada.`} />;
    }
    if (status === 'replaced') {
      return <Banner tone="info" message={`${minorName} pidió un enlace nuevo; este ya no sirve. Usa el del correo más reciente.`} />;
    }
    if (status === 'expired') {
      return <Banner tone="info" message={`Este enlace venció. ${minorName} puede pedirte uno nuevo desde KAVI.`} />;
    }

    return (
      <>
        <AppText>
          <AppText variant="bodyStrong">{minorName}</AppText> se registró en KAVI y nos dijo que tiene 16 o 17 años y que tú eres su madre, padre o
          tutor. La ley mexicana pide tu consentimiento para que KAVI trate sus datos personales.
        </AppText>
        <View style={[styles.tarjeta, { backgroundColor: theme.surfaceAlt }]}>
          <Lista titulo="Lo que necesitas saber" puntos={QUE_ES} />
          <Button title="Leer el aviso de privacidad completo" variant="secondary" onPress={() => router.push('/privacidad')} />
        </View>
        <AppText variant="label" color="textSecondary">
          Este enlace vence el {formatDate(new Date(expiresAt))}. Si no conoces a {minorName}, elige «No apruebo».
        </AppText>
        {decidir.error ? <Banner tone="error" message={decidir.error.message} /> : null}
        <Button
          title={`Apruebo que ${minorName} use KAVI`}
          loading={decidir.isPending && decidir.variables === true}
          disabled={decidir.isPending}
          onPress={() => decidir.mutate(true)}
        />
        <Button
          title="No apruebo"
          variant="secondary"
          loading={decidir.isPending && decidir.variables === false}
          disabled={decidir.isPending}
          onPress={() => decidir.mutate(false)}
        />
      </>
    );
  };

  return (
    <Screen scroll maxWidth={560}>
      <View style={styles.pila}>
        <Wordmark size={28} />
        <AppText variant="title" accessibilityRole="header">
          Permiso para usar KAVI
        </AppText>
      </View>
      {cuerpo()}
      <AppText variant="label" color="textSecondary">
        ¿Dudas? Escríbenos a {PRIVACY_CONTACT}. Puedes retirar tu consentimiento en cualquier momento escribiendo a ese correo.
      </AppText>
      {user ? <Button title="Volver a KAVI" variant="ghost" onPress={() => router.replace('/')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pila: { gap: Spacing.sm },
  tarjeta: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderCurve: 'continuous' },
});
