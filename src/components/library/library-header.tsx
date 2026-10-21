import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useContext } from 'react';
import { StyleSheet, View } from 'react-native';

import { ModuleInBarContext } from '@/components/navigation/stacked-module';
import { AppText, IconButton, Wordmark } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useMyProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { primerNombre } from '@/lib/library/shelf';

/**
 * El encabezado de la librería (spec 13a, RF-BL22, idea de KAVI Reader): el wordmark "KAVI Library"
 * con las fuentes de la marca y un saludo con el nombre de quien lee. En la barra del teléfono no lleva
 * "Atrás": ahí es una pestaña (T302).
 */
export function LibraryHeader() {
  const theme = useTheme();
  const router = useRouter();
  const enBarra = useContext(ModuleInBarContext);
  const tx = useT();
  const l = tx.library;
  const perfil = useMyProfile();
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/calendar'));
  return (
    <View style={styles.contenido}>
      {enBarra ? null : (
        <IconButton label={tx.common.back} onPress={volver}>
          <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
      )}
      <View style={styles.marca}>
        {/* Para el lector de pantalla es el título de la pantalla, aunque se vea como la marca. */}
        <View accessible accessibilityRole="header" accessibilityLabel={l.brandA11y}>
          <Wordmark size={30} module={l.brand} />
        </View>
        <AppText variant="label" color="textSecondary" numberOfLines={1}>
          {l.greeting(primerNombre(perfil.data?.display_name))}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginLeft: -Spacing.sm },
  marca: { flex: 1, gap: 2 },
});
