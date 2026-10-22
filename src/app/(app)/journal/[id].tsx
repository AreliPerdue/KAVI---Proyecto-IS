import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type CaraDeJournal, JournalCover } from '@/components/library/journal-cover';
import { AppText, Button, ErrorState, IconButton, LoadingState, Segmented } from '@/components/ui';
import { IconSize, IconStroke, MaxContentWidth, Spacing } from '@/constants/theme';
import { useLibraryItem } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { lomoDeJournal, paginasValidas, portadaValida } from '@/lib/library/journal';

/**
 * Un Journal (spec 13i; T345): el cuaderno como objeto, que se gira para ver su portada, su lomo y su contraportada,
 * con lo que es (encuadernación, material, páginas) y "Editar Journal", que vuelve a los pasos sin perder nada. Sus
 * páginas llegan en C5 (T347) y su decoración en J2 (T346).
 */
export default function JournalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const tx = useT();
  const j = tx.library.journal;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pieza = useLibraryItem(id);
  const [cara, setCara] = useState<CaraDeJournal>('front');
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/(app)/library'));

  const barra = (
    <View style={styles.barra}>
      <IconButton label={tx.common.back} onPress={volver}>
        <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
      </IconButton>
    </View>
  );

  if (!pieza.data) {
    return (
      <View style={[styles.pantalla, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        {barra}
        {pieza.isError ? <ErrorState message={j.notFound} onRetry={() => void pieza.refetch()} /> : <LoadingState />}
      </View>
    );
  }

  const portada = portadaValida(pieza.data.journal);
  const paginas = paginasValidas(pieza.data.page_count);
  // Al primer render la ventana puede medir 0: nunca menos de 120.
  const anchoVista = Math.max(120, Math.min(300, (Math.min(width, MaxContentWidth) - Spacing.lg * 2) * 0.7));
  const ancho = portada.orientation === 'portrait' ? anchoVista : anchoVista * 1.3;
  const alto = ancho * (portada.orientation === 'portrait' ? Math.SQRT2 : 1 / Math.SQRT2);
  const descripcion = `${j.bindings[portada.binding]} · ${j.materials[portada.material]} · ${j.pagesValue(paginas)}`;

  return (
    <View style={[styles.pantalla, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {barra}
      <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View>
          <AppText variant="title" accessibilityRole="header">
            {pieza.data.title}
          </AppText>
          <AppText variant="label" color="textSecondary">
            {descripcion}
          </AppText>
        </View>
        <View style={[styles.vista, { height: alto + Spacing.xl }]}>
          {cara === 'spine' ? (
            <JournalCover portada={portada} cara="spine" ancho={lomoDeJournal(paginas)} alto={alto} etiqueta={j.faces.spine} />
          ) : (
            <JournalCover portada={portada} cara={cara} ancho={ancho} etiqueta={j.a11y(pieza.data.title, j.bindings[portada.binding], j.materials[portada.material])} />
          )}
        </View>
        <Segmented
          label={j.view}
          options={(['front', 'spine', 'back'] as const).map((v) => ({ value: v, label: j.faces[v] }))}
          value={cara}
          onChange={setCara}
          fullWidth
        />
        <Button
          title={j.edit}
          variant="secondary"
          icon={<Pencil size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
          onPress={() => router.push({ pathname: '/(app)/journal/edit', params: { id } })}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  barra: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  contenido: { paddingHorizontal: Spacing.lg, gap: Spacing.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  vista: { alignItems: 'center', justifyContent: 'center' },
});
