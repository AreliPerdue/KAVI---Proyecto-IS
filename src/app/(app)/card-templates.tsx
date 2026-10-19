import { useRouter } from 'expo-router';
import { ChevronLeft, Copy, Plus, Trash2 } from 'lucide-react-native';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { CardView } from '@/components/library/card-view';
import { AppText, Button, ErrorState, IconButton, LoadingState, Screen } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useCards, useCardTemplates, useRemoveCardTemplate, useSaveCardTemplate } from '@/hooks/use-cards';
import { useStickerElegible } from '@/hooks/use-sticker-elegible';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { camposDe, fichasPorPlantilla, plantillasVigentes } from '@/lib/library/cards';
import { useConfirm, useSnackbar } from '@/providers';
import type { LibraryCardTemplate } from '@/types/domain';

/**
 * Fichas (spec 13d, RF-BF1 – RF-BF3; T293): los diseños de ficha de la persona, con las tres incluidas desde el
 * principio. Tocar uno lo edita; también se duplica o se borra (con sus fichas llenas, avisando antes).
 */
export default function CardTemplatesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tx = useT();
  const c = tx.library.cards;
  const plantillas = useCardTemplates();
  const fichas = useCards();
  const guardar = useSaveCardTemplate();
  const borrar = useRemoveCardTemplate();
  const confirmar = useConfirm();
  const avisar = useSnackbar();
  const sticker = useStickerElegible();
  const { width } = useWindowDimensions();
  const dosColumnas = width >= 720;

  const vigentes = plantillasVigentes(plantillas.data ?? []);
  const usadas = fichasPorPlantilla(fichas.data ?? []);

  const editar = (id: string) => router.push({ pathname: '/(app)/card-template/[id]', params: { id } });
  const duplicar = (p: LibraryCardTemplate) =>
    guardar.mutate({ diseno: { name: c.copyName(p.name).slice(0, 80), fields: p.fields, look: p.look } }, { onError: (e) => avisar({ message: e.message }) });
  const quitar = async (p: LibraryCardTemplate) => {
    const n = usadas.get(p.id) ?? 0;
    const ok = await confirmar({ title: c.removeTitle, message: c.removeMessage(n), confirmLabel: c.removeConfirm, destructive: true });
    if (!ok) return;
    borrar.mutate(p.id, { onSuccess: () => avisar({ message: c.removed }), onError: (e) => avisar({ message: e.message }) });
  };

  return (
    <Screen scroll>
      <View style={styles.titulo}>
        <IconButton label={tx.common.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/library'))}>
          <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
        <AppText variant="title" accessibilityRole="header" style={styles.flex}>
          {c.title}
        </AppText>
      </View>
      <AppText variant="body" color="textSecondary">
        {c.intro}
      </AppText>
      <Button title={c.newTemplate} icon={<Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.onInk} />} onPress={() => editar('nueva')} />

      {plantillas.isPending || (plantillas.isSuccess && !vigentes.length) ? <LoadingState /> : null}
      {plantillas.isError ? <ErrorState message={plantillas.error.message} onRetry={() => plantillas.refetch()} /> : null}

      <View style={styles.rejilla}>
        {vigentes.map((p) => {
          const n = usadas.get(p.id) ?? 0;
          return (
            <View key={p.id} style={[styles.celda, dosColumnas ? styles.media : null]}>
              <Pressable accessibilityRole="button" accessibilityLabel={c.edit(p.name)} onPress={() => editar(p.id)} style={({ pressed }) => (pressed ? styles.presionada : null)}>
                <CardView plantilla={p} compacta sticker={sticker} />
              </Pressable>
              <View style={styles.pie}>
                <AppText variant="caption" color="textSecondary" style={styles.flex} numberOfLines={1}>
                  {`${c.fieldsCount(camposDe(p.fields).length)} · ${c.usedBy(n)}`}
                </AppText>
                <IconButton label={c.duplicate(p.name)} onPress={() => duplicar(p)}>
                  <Copy size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
                </IconButton>
                <IconButton label={c.remove(p.name)} onPress={() => void quitar(p)}>
                  <Trash2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />
                </IconButton>
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginLeft: -Spacing.sm },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg },
  celda: { width: '100%', gap: Spacing.xs },
  media: { width: '48%' },
  pie: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  presionada: { opacity: 0.85 },
});
