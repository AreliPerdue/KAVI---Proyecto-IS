import { Pressable, StyleSheet, View } from 'react-native';

import { BookCover } from './book-cover';

import { AppText } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Dictionary, useT } from '@/i18n';
import { avanceDe } from '@/lib/library/shelf';
import type { LibraryItem } from '@/types/domain';

/** "p. 120 de 340", "35 % leído", "Terminado" o "Sin abrir" (RF-BL3). */
function textoAvance(item: LibraryItem, l: Dictionary['library']): string {
  const avance = avanceDe(item);
  if (!avance) return l.unread;
  if (avance.tipo === 'terminado') return l.finished;
  return avance.tipo === 'pagina' ? l.progressPage(avance.pagina, avance.total) : l.progressPercent(avance.porcentaje);
}

/** Lo que dice un lector de pantalla de cada pieza: título, autor y avance. */
function etiqueta(item: LibraryItem, l: Dictionary['library']): string {
  return [item.title, item.authors.join(', '), textoAvance(item, l)].filter(Boolean).join(', ');
}

/** Una pieza en la rejilla de portadas (RF-BL1): la portada y, debajo, título y autor. Tocarla la abre (RF-BL17). */
export function LibraryCoverCard({ item, width, onPress }: { item: LibraryItem; width: number; onPress: () => void }) {
  const l = useT().library;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tarjeta, { width }, pressed ? styles.presionada : null]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta(item, l)}
      accessibilityHint={l.openBook(item.title)}>
      <BookCover item={item} width={width} />
      <View>
        <AppText variant="label" numberOfLines={1}>
          {item.title}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {item.authors.length > 0 ? item.authors.join(', ') : ' '}
        </AppText>
      </View>
    </Pressable>
  );
}

/** Una pieza en la lista (RF-BL3): portada chica, título y autor, y el avance a la derecha. Tocarla la abre. */
export function LibraryRow({ item, onPress }: { item: LibraryItem; onPress: () => void }) {
  const theme = useTheme();
  const l = useT().library;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.fila, { borderColor: theme.border }, pressed ? styles.presionada : null]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta(item, l)}
      accessibilityHint={l.openBook(item.title)}>
      <BookCover item={item} width={40} thumb />
      <View style={styles.textos}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {item.title}
        </AppText>
        {item.authors.length > 0 ? (
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {item.authors.join(', ')}
          </AppText>
        ) : null}
      </View>
      <AppText variant="caption" color="textTertiary" tabular>
        {textoAvance(item, l)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: { gap: Spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  textos: { flex: 1, gap: 2 },
  presionada: { opacity: 0.85 },
});
