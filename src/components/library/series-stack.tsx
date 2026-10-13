import { Pressable, StyleSheet, View } from 'react-native';

import { BookCover } from './book-cover';

import { AppText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { tap } from '@/lib/haptics';
import type { LibraryItem, LibrarySeries } from '@/types/domain';

export type SeriesStackProps = {
  saga: LibrarySeries;
  /** Sus libros, ya en orden de número. */
  piezas: readonly LibraryItem[];
  onPress: () => void;
  /** Mantener presionada: elegir todos sus libros. */
  onLongPress: () => void;
};

/** Hasta tres portadas, una detrás de otra, como una pila de libros. */
function Pila({ piezas, ancho }: { piezas: readonly LibraryItem[]; ancho: number }) {
  const atras = piezas.slice(1, 3).reverse();
  const corrimiento = Math.max(4, Math.round(ancho * 0.05));
  const frente = ancho - corrimiento * atras.length;
  return (
    <View style={{ width: ancho, height: Math.round(frente * 1.5) + corrimiento * atras.length }}>
      {atras.map((p, i) => {
        const nivel = atras.length - i;
        return (
          <View key={p.id} style={[styles.capa, { left: corrimiento * nivel, top: 0, opacity: 1 - nivel * 0.15 }]}>
            <BookCover item={p} width={frente} />
          </View>
        );
      })}
      <View style={[styles.capa, { left: 0, top: corrimiento * atras.length }]}>
        <BookCover item={piezas[0]} width={frente} />
      </View>
    </View>
  );
}

/** Una saga apilada en la rejilla de portadas (RF-BL25): la pila, el nombre y cuántos libros son. */
export function SeriesStackCard({ saga, piezas, onPress, onLongPress, width }: SeriesStackProps & { width: number }) {
  const s = useT().library.series;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => {
        tap();
        onLongPress();
      }}
      delayLongPress={350}
      style={({ pressed }) => [styles.tarjeta, { width }, pressed ? styles.presionada : null]}
      accessibilityRole="button"
      accessibilityLabel={s.stack(saga.name, piezas.length)}>
      <Pila piezas={piezas} ancho={width} />
      <View>
        <AppText variant="label" numberOfLines={1}>
          {saga.name}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {s.stackCount(piezas.length)}
        </AppText>
      </View>
    </Pressable>
  );
}

/** Una saga apilada en la lista (RF-BL25). */
export function SeriesStackRow({ saga, piezas, onPress, onLongPress }: SeriesStackProps) {
  const theme = useTheme();
  const s = useT().library.series;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => {
        tap();
        onLongPress();
      }}
      delayLongPress={350}
      style={({ pressed }) => [styles.fila, { borderColor: theme.border }, pressed ? styles.presionada : null]}
      accessibilityRole="button"
      accessibilityLabel={s.stack(saga.name, piezas.length)}>
      <Pila piezas={piezas} ancho={48} />
      <View style={styles.textos}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {saga.name}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {s.stackCount(piezas.length)}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: { gap: Spacing.sm },
  capa: { position: 'absolute', borderRadius: Radius.sm, borderCurve: 'continuous', boxShadow: '0 2px 6px rgba(0,0,0,0.35)' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  textos: { flex: 1, gap: 2 },
  presionada: { opacity: 0.85 },
});
