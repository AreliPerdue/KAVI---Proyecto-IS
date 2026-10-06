import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Banner, Button, Screen, Wordmark } from '@/components/ui';
import type { PrivacyBlock } from '@/constants/privacy';
import { Spacing } from '@/constants/theme';
import { type Language, t, useLanguage } from '@/i18n';

/** Un párrafo con `**negritas**`. */
function Parrafo({ texto }: { texto: string }) {
  const partes = texto.split('**');
  return (
    <AppText>
      {partes.map((parte, i) =>
        i % 2 === 1 ? (
          <AppText key={i} variant="bodyStrong">
            {parte}
          </AppText>
        ) : (
          <Fragment key={i}>{parte}</Fragment>
        ),
      )}
    </AppText>
  );
}

function Bloque({ bloque }: { bloque: PrivacyBlock }) {
  if (typeof bloque === 'string') return <Parrafo texto={bloque} />;
  return (
    <View style={styles.lista}>
      {bloque.list.map((punto) => (
        <View key={punto} style={styles.punto}>
          <AppText accessible={false}>·</AppText>
          <View style={styles.flex}>
            <Parrafo texto={punto} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Aviso de privacidad (T260). Pública, con o sin sesión: es el enlace que piden las tiendas, el que
 * revisa el adulto que aprueba a un menor (RF-A13) y el que se acepta en "Antes de empezar".
 *
 * Sigue el idioma de la app, o el de `?lang=` (el enlace del correo al adulto lo trae). En inglés
 * es una traducción de referencia y lo dice arriba; el botón cambia a la otra versión sin tocar el
 * idioma de la app (spec 12).
 */
export default function PrivacidadScreen() {
  const router = useRouter();
  const delSistema = useLanguage();
  const { lang: pedido } = useLocalSearchParams<{ lang?: string }>();
  const lang: Language = pedido === 'es' || pedido === 'en' ? pedido : delSistema;
  const p = t(lang).privacy;
  return (
    <Screen scroll maxWidth={720}>
      <View style={styles.pila}>
        <Wordmark size={28} />
        <AppText variant="title" accessibilityRole="header">
          {p.title}
        </AppText>
        <AppText variant="label" color="textSecondary">
          {p.updated(p.updatedOn)}
        </AppText>
        {p.referenceNote ? <Banner tone="info" message={p.referenceNote} /> : null}
        <Button title={p.otherLanguage} variant="ghost" onPress={() => router.setParams({ lang: lang === 'en' ? 'es' : 'en' })} />
        <Parrafo texto={p.intro} />
      </View>
      {p.sections.map((seccion) => (
        <View key={seccion.title} style={styles.pila}>
          <AppText variant="heading" accessibilityRole="header">
            {seccion.title}
          </AppText>
          {seccion.blocks.map((bloque, i) => (
            <Bloque key={i} bloque={bloque} />
          ))}
        </View>
      ))}
      <Button title={p.back} variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pila: { gap: Spacing.sm },
  lista: { gap: Spacing.xs },
  punto: { flexDirection: 'row', gap: Spacing.sm },
  flex: { flex: 1 },
});
