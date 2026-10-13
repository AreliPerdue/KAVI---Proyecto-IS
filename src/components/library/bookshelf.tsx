import { StyleSheet, View } from 'react-native';

import { BookCover } from './book-cover';
import { SALIDA } from './book-spine';
import { textoAvance } from './library-item';

import { AppText, Button, Sheet } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { ENTRE_LOMOS, LOMO_ALTO_MAX } from '@/lib/library/spines';
import type { LibraryItem } from '@/types/domain';

/**
 * Una repisa del librero (RF-BL2): los lomos parados sobre una tabla. Deja arriba el espacio para que un
 * lomo suba al sacarlo sin tapar la repisa de arriba.
 */
export function Repisa({ numero, children }: { numero: number; children: React.ReactNode }) {
  const theme = useTheme();
  const l = useT().library;
  return (
    <View accessibilityLabel={l.spine.shelfLabel(numero)} style={styles.repisa}>
      <View style={styles.lomos}>{children}</View>
      <View style={[styles.tabla, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]} />
    </View>
  );
}

/**
 * El libro sacado del librero (RF-BL2): su portada, título, autor y avance antes de abrirlo. Desde aquí se
 * lee o se llega a su menú (RF-BL16).
 */
export function SpinePreviewSheet({
  item,
  onClose,
  onRead,
  onMenu,
}: {
  item: LibraryItem | null;
  onClose: () => void;
  onRead: (item: LibraryItem) => void;
  onMenu: (item: LibraryItem) => void;
}) {
  const l = useT().library;
  return (
    <Sheet visible={item !== null} onClose={onClose} title={item?.title ?? ''}>
      {item ? (
        <View style={styles.vista}>
          <View style={styles.portada}>
            <BookCover item={item} width={160} />
          </View>
          {item.authors.length > 0 ? (
            <AppText variant="body" color="textSecondary" style={styles.centro}>
              {item.authors.join(', ')}
            </AppText>
          ) : null}
          <AppText variant="caption" color="textTertiary" tabular style={styles.centro}>
            {textoAvance(item, l)}
          </AppText>
          <Button title={l.spine.read} onPress={() => onRead(item)} />
          <Button title={l.spine.more} variant="ghost" onPress={() => onMenu(item)} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  repisa: { paddingTop: SALIDA + Spacing.xs },
  lomos: { flexDirection: 'row', alignItems: 'flex-end', gap: ENTRE_LOMOS, minHeight: LOMO_ALTO_MAX, paddingHorizontal: Spacing.xs },
  tabla: { height: 10, borderRadius: Radius.sm / 2, borderWidth: StyleSheet.hairlineWidth },
  vista: { gap: Spacing.md },
  portada: { alignSelf: 'center', marginBottom: Spacing.sm },
  centro: { textAlign: 'center' },
});
