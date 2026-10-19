import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FAMILIA_DE_LETRA, ICONO_DE_SIMBOLO } from '@/components/library/card-view';
import { Radius, Spacing } from '@/constants/theme';
import { useT } from '@/i18n';
import { aspectoDe, camposDe, type SimboloDeEscala } from '@/lib/library/cards';
import type { LibraryCard, LibraryCardTemplate } from '@/types/domain';

const PAPEL = '#FBF7EE';
const TINTA = '#1F1F1F';

/**
 * Una ficha pegada que asoma en el lector (spec 13d, RF-BF4; T294): una tarjetita ladeada con la banda de su
 * color, su nombre y su primera escala. Tocarla la abre.
 */
export function CardPeek({ ficha, plantilla, onPress }: { ficha: LibraryCard; plantilla: LibraryCardTemplate; onPress: () => void }) {
  const o = useT().library.cards.offer;
  const aspecto = aspectoDe(plantilla.look);
  const escala = camposDe(plantilla.fields).find((c) => c.type === 'scale');
  const n = escala && typeof ficha.values[escala.id] === 'number' ? (ficha.values[escala.id] as number) : 0;
  const Simbolo = escala ? (ICONO_DE_SIMBOLO[(escala.symbol as SimboloDeEscala) ?? 'star'] ?? ICONO_DE_SIMBOLO.star) : null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={o.peek(plantilla.name)} onPress={onPress} style={({ pressed }) => [styles.tarjeta, pressed ? styles.presionada : null]}>
      <View style={[styles.banda, { backgroundColor: aspecto.color }]} />
      <Text style={[styles.nombre, { fontFamily: FAMILIA_DE_LETRA[aspecto.font] }]} numberOfLines={2}>
        {plantilla.name}
      </Text>
      {Simbolo && escala ? (
        <View style={styles.simbolos}>
          <Simbolo size={14} strokeWidth={1.8} color={TINTA} fill={n ? aspecto.color : 'transparent'} />
          <Text style={styles.valor}>{`${n}/${escala.max === 10 ? 10 : 5}`}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    width: 120,
    minHeight: 76,
    backgroundColor: PAPEL,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    padding: Spacing.sm,
    paddingTop: Spacing.md,
    gap: 4,
    overflow: 'hidden',
    transform: [{ rotate: '-4deg' }],
    boxShadow: '0 3px 10px rgba(0,0,0,0.28)',
  },
  presionada: { opacity: 0.85 },
  banda: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },
  nombre: { fontSize: 14, lineHeight: 18, fontWeight: '700', color: TINTA },
  simbolos: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  valor: { fontSize: 13, color: TINTA, fontVariant: ['tabular-nums'] },
});
