import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Lista } from '@/components/account/delete-account-sheet';
import { AppText, Banner, Button, LoadingState, Screen, Wordmark } from '@/components/ui';
import { PRIVACY_CONTACT } from '@/constants/privacy';
import { Radius, Spacing } from '@/constants/theme';
import { useDecideGuardianRequest, useGuardianRequest } from '@/hooks/use-consent';
import { useTheme } from '@/hooks/use-theme';
import { type Language, t, useLanguage } from '@/i18n';
import { formatDate } from '@/lib/dates';
import { useAuth } from '@/providers';

/**
 * Página del adulto (spec 03, RF-A13): llega por el enlace del correo, sin iniciar sesión, y
 * aprueba o no que alguien de 16 o 17 años use KAVI. El enlace sirve una sola vez y vence en 7 días.
 *
 * El correo llega en el idioma de la app del menor y trae este enlace con `?lang=`; el botón de
 * arriba cambia al otro idioma (spec 12, RF-I6). Sin `lang`, sigue al navegador.
 */
export default function ConsentimientoScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { token, lang: pedido } = useLocalSearchParams<{ token?: string; lang?: string }>();
  const delSistema = useLanguage();
  const lang: Language = pedido === 'es' || pedido === 'en' ? pedido : delSistema;
  const g = t(lang).account.guardianPage;
  const limpio = typeof token === 'string' && token.length > 0 ? token : null;
  const info = useGuardianRequest(limpio);
  const decidir = useDecideGuardianRequest(limpio);

  const cuerpo = () => {
    if (!limpio) return <Banner tone="error" message={g.invalidLink} />;
    if (info.isPending) return <LoadingState />;
    if (info.isError) return <Banner tone="error" message={info.error.message} />;
    if (!info.data) return <Banner tone="error" message={g.invalidLink} />;
    const { minorName, status, expiresAt } = info.data;

    if (status === 'approved') {
      return <Banner tone="success" message={g.approved(minorName)} />;
    }
    if (status === 'rejected') {
      return <Banner tone="info" message={g.rejected(minorName)} />;
    }
    if (status === 'replaced') {
      return <Banner tone="info" message={g.replaced(minorName)} />;
    }
    if (status === 'expired') {
      return <Banner tone="info" message={g.expired(minorName)} />;
    }

    return (
      <>
        <AppText>
          <AppText variant="bodyStrong">{minorName}</AppText>
          {g.introAfterName}
        </AppText>
        <View style={[styles.tarjeta, { backgroundColor: theme.surfaceAlt }]}>
          <Lista titulo={g.whatToKnow} puntos={g.points} />
          <Button title={g.readNotice} variant="secondary" onPress={() => router.push({ pathname: '/privacidad', params: { lang } })} />
        </View>
        <AppText variant="label" color="textSecondary">
          {g.expires(formatDate(new Date(expiresAt), lang), minorName)}
        </AppText>
        {decidir.error ? <Banner tone="error" message={decidir.error.message} /> : null}
        <Button
          title={g.approve(minorName)}
          loading={decidir.isPending && decidir.variables === true}
          disabled={decidir.isPending}
          onPress={() => decidir.mutate(true)}
        />
        <Button
          title={g.reject}
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
          {g.title}
        </AppText>
        <Button title={g.otherLanguage} variant="ghost" onPress={() => router.setParams({ lang: lang === 'en' ? 'es' : 'en' })} />
      </View>
      {cuerpo()}
      <AppText variant="label" color="textSecondary">
        {g.questions(PRIVACY_CONTACT)}
      </AppText>
      {user ? <Button title={g.backToKavi} variant="ghost" onPress={() => router.replace('/')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pila: { gap: Spacing.sm },
  tarjeta: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderCurve: 'continuous' },
});
