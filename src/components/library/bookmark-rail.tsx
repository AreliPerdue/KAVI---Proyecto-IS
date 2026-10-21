import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

export type PestanaDelCanto = { id: string; lugar: number; color: string; palabra: string; donde: string };

/**
 * El canto del libro (spec 13c, RF-BH15; T290): todos los separadores asoman del borde derecho de la pantalla, a la
 * altura de su lugar en el libro, como las pestañas que salen de un libro de verdad. Tocar uno salta a su página.
 * Se ve en las tres formas de leer. Cada pestaña mide poco a la vista pero tiene 44 px para el dedo. Con mouse,
 * pasar encima de una muestra su palabra y su página (T360).
 */
export function BookmarkRail({ pestanas, arriba, abajo, onIr }: { pestanas: readonly PestanaDelCanto[]; arriba: number; abajo: number; onIr: (id: string) => void }) {
  const a = useT().library.annotations;
  if (!pestanas.length) return null;
  return (
    <View style={[styles.canto, { top: arriba + 8, bottom: abajo + 8 }]} pointerEvents="box-none" accessibilityLabel={a.bookmarkRail}>
      {pestanas.map((p) => (
        <Pestana key={p.id} pestana={p} onIr={onIr} />
      ))}
    </View>
  );
}

function Pestana({ pestana: p, onIr }: { pestana: PestanaDelCanto; onIr: (id: string) => void }) {
  const a = useT().library.annotations;
  const theme = useTheme();
  const [encima, setEncima] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a.bookmarkGoTo(p.palabra, p.donde)}
      onPress={() => onIr(p.id)}
      onHoverIn={() => setEncima(true)}
      onHoverOut={() => setEncima(false)}
      hitSlop={8}
      style={[styles.toque, { top: `${p.lugar * 100}%` }]}>
      {encima ? (
        <View style={[styles.etiqueta, { backgroundColor: theme.surface, borderColor: theme.border }]} pointerEvents="none" aria-hidden>
          <AppText variant="caption" numberOfLines={1}>
            {a.bookmarkHover(p.palabra, p.donde)}
          </AppText>
        </View>
      ) : null}
      <View style={[styles.pestana, { backgroundColor: p.color }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  canto: { position: 'absolute', right: 0, width: 28 },
  toque: { position: 'absolute', right: 0, width: 28, height: 36, marginTop: -18, alignItems: 'flex-end', justifyContent: 'center' },
  pestana: {
    width: 8,
    height: 28,
    borderTopLeftRadius: Radius.sm,
    borderBottomLeftRadius: Radius.sm,
    borderCurve: 'continuous',
    boxShadow: '-1px 1px 3px rgba(0,0,0,0.3)',
  },
  etiqueta: {
    position: 'absolute',
    right: 32,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    boxShadow: '0 4px 16px rgba(22,23,26,0.08)',
    maxWidth: 240,
  },
});
