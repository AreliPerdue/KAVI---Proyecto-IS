import { ExternalLink } from 'lucide-react-native';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

import { AppText, Button, Sheet } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useDefinition } from '@/hooks/use-dictionary';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { isOfflineError } from '@/lib/auth-errors';
import { enlaceRae, pareceEspanol } from '@/services/dictionary';

/**
 * El significado de una palabra sin salir del libro (spec 13c, RF-BH8; decisión B4). En inglés, la
 * definición; en español (o si no aparece), el enlace a la RAE.
 */
export function DefineSheet({ palabra, onClose }: { palabra: string | null; onClose: () => void }) {
  const a = useT().library.annotations;
  return (
    <Sheet visible={!!palabra} onClose={onClose} title={palabra ? a.defineTitle(palabra) : ''}>
      {palabra ? <Contenido key={palabra} palabra={palabra} /> : null}
    </Sheet>
  );
}

function Contenido({ palabra }: { palabra: string }) {
  const theme = useTheme();
  const a = useT().library.annotations;
  const espanol = pareceEspanol(palabra);
  const definicion = useDefinition(palabra);

  return (
    <View style={styles.cuerpo}>
      {espanol ? (
        <AppText variant="body" color="textSecondary">
          {a.defineSpanish}
        </AppText>
      ) : definicion.isLoading ? (
        <View style={styles.cargando} accessibilityLiveRegion="polite">
          <ActivityIndicator color={theme.textSecondary} />
          <AppText variant="label" color="textSecondary">
            {a.defineLoading}
          </AppText>
        </View>
      ) : definicion.isError ? (
        <AppText variant="body" color="textSecondary" accessibilityRole="alert">
          {isOfflineError(definicion.error) ? a.defineOffline : a.defineError}
        </AppText>
      ) : definicion.data ? (
        <View style={styles.cuerpo}>
          {definicion.data.fonetica ? (
            <AppText variant="label" color="textSecondary">
              {definicion.data.fonetica}
            </AppText>
          ) : null}
          {definicion.data.acepciones.map((x, i) => (
            <View key={i} style={styles.acepcion}>
              {x.categoria ? (
                <AppText variant="caption" color="textTertiary">
                  {x.categoria}
                </AppText>
              ) : null}
              <AppText variant="body">{x.definicion}</AppText>
              {x.ejemplo ? (
                <AppText variant="label" color="textSecondary" style={styles.ejemplo}>
                  {x.ejemplo}
                </AppText>
              ) : null}
            </View>
          ))}
          <AppText variant="caption" color="textTertiary">
            {a.defineSource}
          </AppText>
        </View>
      ) : (
        <AppText variant="body" color="textSecondary">
          {a.defineNotFound}
        </AppText>
      )}
      <Button
        title={a.defineRae}
        variant="secondary"
        icon={<ExternalLink size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
        onPress={() => void Linking.openURL(enlaceRae(palabra))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.md },
  cargando: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  acepcion: { gap: 2 },
  ejemplo: { fontStyle: 'italic' },
});
