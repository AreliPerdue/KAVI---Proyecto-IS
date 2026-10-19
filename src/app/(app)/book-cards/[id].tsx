import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CardChooserSheet } from '@/components/library/card-chooser-sheet';
import { CardView } from '@/components/library/card-view';
import { AppText, Button, EmptyState, ErrorState, IconButton, LoadingState, Screen } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useCards, useCardTemplates } from '@/hooks/use-cards';
import { useLibraryItem } from '@/hooks/use-library';
import { useStickerElegible } from '@/hooks/use-sticker-elegible';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { LUGARES, plantillasParaAgregar } from '@/lib/library/cards';

/**
 * Las fichas de un libro (spec 13d, RF-BF4, RF-BF7; T294): una por diseño, cada una con dónde va pegada.
 * Tocar una la abre para llenarla; "Agregar ficha" elige un diseño que aún no tenga.
 */
export default function BookCardsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tx = useT();
  const c = tx.library.cards;
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useLibraryItem(id);
  const plantillas = useCardTemplates();
  const fichas = useCards();
  const sticker = useStickerElegible();
  const [eligiendo, setEligiendo] = useState(false);

  const titulo = item.data?.title ?? '';
  const delLibro = (fichas.data ?? [])
    .filter((f) => f.item_id === id)
    .sort((a, b) => LUGARES.indexOf(a.placement) - LUGARES.indexOf(b.placement));
  const disponibles = plantillasParaAgregar(plantillas.data ?? [], delLibro);
  const abrir = (plantilla: string) => router.push({ pathname: '/(app)/card/[itemId]', params: { itemId: id, plantilla } });

  return (
    <Screen scroll>
      <View style={styles.titulo}>
        <IconButton label={tx.common.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/library'))}>
          <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
        <AppText variant="title" accessibilityRole="header" style={styles.flex} numberOfLines={2}>
          {c.book.title(titulo)}
        </AppText>
      </View>
      {item.isPending || fichas.isPending || plantillas.isPending ? <LoadingState /> : null}
      {fichas.isError ? <ErrorState message={fichas.error.message} onRetry={() => fichas.refetch()} /> : null}
      {fichas.isSuccess && !delLibro.length ? <EmptyState title={c.book.empty} /> : null}
      {delLibro.map((f) => {
        const p = plantillas.data?.find((x) => x.id === f.template_id);
        if (!p) return null;
        return (
          <View key={f.id} style={styles.ficha}>
            <AppText variant="label" color="textSecondary">
              {c.fill.placedOn[f.placement]}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.book.openCard(p.name, c.fill.placedOn[f.placement])}
              onPress={() => abrir(p.id)}
              style={({ pressed }) => (pressed ? styles.presionada : null)}>
              <CardView plantilla={p} valores={f.values} sticker={sticker} />
            </Pressable>
          </View>
        );
      })}
      {disponibles.length ? (
        <Button title={c.book.add} icon={<Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.onInk} />} onPress={() => setEligiendo(true)} />
      ) : null}
      <Button title={c.book.designs} variant="ghost" onPress={() => router.push('/(app)/card-templates')} />
      <CardChooserSheet
        visible={eligiendo}
        plantillas={disponibles}
        onClose={() => setEligiendo(false)}
        onElegir={(p) => {
          setEligiendo(false);
          abrir(p.id);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginLeft: -Spacing.sm },
  ficha: { gap: Spacing.sm, width: '100%', maxWidth: 520, alignSelf: 'center' },
  presionada: { opacity: 0.85 },
});
