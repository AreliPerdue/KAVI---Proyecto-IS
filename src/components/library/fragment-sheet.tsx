import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, ErrorState, LoadingState, Sheet } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useClipImages, useClips } from '@/hooks/use-clips';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { LibraryClip } from '@/types/domain';

/**
 * Pegar un fragmento en un recorte o una página (spec 13h, RF-CC24; T349): Mis fragmentos, primero los del libro del
 * recorte. Uno de texto se pega como cita; uno de imagen, como imagen (`url` es su dirección para copiarla).
 */
export function FragmentSheet({
  visible,
  itemId,
  onClose,
  onElegir,
}: {
  visible: boolean;
  /** El libro del recorte, para poner sus fragmentos primero (en un Journal no hay). */
  itemId: string | null;
  onClose: () => void;
  onElegir: (clip: LibraryClip, url: string | null) => void;
}) {
  const tx = useT();
  const c = tx.library.canvas;
  const clips = useClips();
  const imagenes = useClipImages(visible ? clips.data : undefined);
  const todos = clips.data ?? [];
  const deEste = itemId ? todos.filter((f) => f.item_id === itemId) : [];
  const otros = todos.filter((f) => !itemId || f.item_id !== itemId);

  const grupo = (titulo: string, lista: LibraryClip[], deOtros: boolean) =>
    lista.length ? (
      <View style={styles.grupo}>
        <AppText variant="label" color="textSecondary">
          {titulo}
        </AppText>
        {lista.map((f) => (
          <Fila key={f.id} fragmento={f} url={imagenes.get(f.id) ?? null} otroLibro={deOtros} onPress={() => onElegir(f, imagenes.get(f.id) ?? null)} />
        ))}
      </View>
    ) : null;

  return (
    <Sheet visible={visible} onClose={onClose} title={c.fragmentTitle}>
      {clips.isPending ? (
        <LoadingState />
      ) : clips.isError ? (
        <ErrorState message={tx.library.notebook.error} onRetry={() => void clips.refetch()} />
      ) : !todos.length ? (
        <AppText variant="body" color="textSecondary" style={styles.vacio}>
          {c.fragmentsEmpty}
        </AppText>
      ) : (
        <View style={styles.cuerpo}>
          {grupo(c.fragmentsThisBook, deEste, false)}
          {grupo(itemId ? c.fragmentsOther : tx.library.clips.title, otros, true)}
        </View>
      )}
    </Sheet>
  );
}

function Fila({ fragmento, url, otroLibro, onPress }: { fragmento: LibraryClip; url: string | null; otroLibro: boolean; onPress: () => void }) {
  const theme = useTheme();
  const tx = useT();
  const c = tx.library.canvas;
  const esImagen = fragmento.kind === 'image';
  const texto = esImagen ? c.fragmentImage : (fragmento.text ?? '');
  const pagina = fragmento.locator.page ? c.fragmentPage(fragmento.locator.page) : null;
  const detalle = [otroLibro || !fragmento.item_id ? fragmento.book_title : null, pagina].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[texto, detalle].filter(Boolean).join('. ')}
      onPress={onPress}
      disabled={esImagen && !url}
      style={({ pressed }) => [styles.fila, { borderColor: theme.border }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
      {esImagen ? (
        <View style={[styles.miniatura, { backgroundColor: theme.surfaceAlt }]}>
          {url ? <Image source={{ uri: url }} style={styles.lleno} contentFit="contain" accessible={false} /> : <LoadingState />}
        </View>
      ) : null}
      <View style={styles.textos}>
        <AppText variant="body" numberOfLines={3}>
          {texto}
        </AppText>
        {detalle ? (
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {detalle}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.lg, paddingBottom: Spacing.md },
  grupo: { gap: Spacing.sm },
  vacio: { paddingVertical: Spacing.lg },
  fila: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', minHeight: 52, padding: Spacing.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, borderCurve: 'continuous' },
  miniatura: { width: 64, height: 64, borderRadius: Radius.sm, borderCurve: 'continuous', overflow: 'hidden' },
  lleno: { width: '100%', height: '100%' },
  textos: { flex: 1, gap: Spacing.xs },
});
