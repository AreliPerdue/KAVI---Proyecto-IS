import { Check, Ellipsis } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { BookCover } from './book-cover';

import { AppText } from '@/components/ui';
import { IconStroke, PAPER, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Dictionary, useT } from '@/i18n';
import { tap } from '@/lib/haptics';
import { avanceDe } from '@/lib/library/shelf';
import type { LibraryItem } from '@/types/domain';

/** "p. 120 de 340", "35 % leído", "Terminado" o "Sin abrir" (RF-BL3). */
function textoAvance(item: LibraryItem, l: Dictionary['library']): string {
  const avance = avanceDe(item);
  if (!avance) return l.unread;
  if (avance.tipo === 'terminado') return l.finished;
  return avance.tipo === 'pagina' ? l.progressPage(avance.pagina, avance.total) : l.progressPercent(avance.porcentaje);
}

/** Lo que dice un lector de pantalla de cada pieza: título, autor y avance (y si está elegida). */
function etiqueta(item: LibraryItem, l: Dictionary['library'], seleccion?: boolean): string {
  const estado = seleccion === undefined ? null : seleccion ? l.selection.selected : l.selection.notSelected;
  return [item.title, item.authors.join(', '), textoAvance(item, l), estado].filter(Boolean).join(', ');
}

/** Mantener presionado sin mover selecciona, como en Listas (RF-BL15, RF-L28). */
const RETARDO_MS = 350;

export type LibraryItemProps = {
  item: LibraryItem;
  /** Tocar: abrir (RF-BL17), o elegir/soltar mientras se selecciona. */
  onPress: () => void;
  /** Mantener presionado: empezar a seleccionar. Sin él, lo atiende quien envuelve (la rejilla que se arrastra). */
  onLongPress?: () => void;
  /** El botón ⋯: el menú de la pieza (RF-BL16). */
  onMenu: () => void;
  seleccionando: boolean;
  elegida: boolean;
};

/**
 * El botón ⋯ o, mientras se selecciona, la palomita. Va **al lado** de la pieza y no dentro: con mouse
 * no hay pulsación larga, así que sin botón visible el menú quedaría inalcanzable en web, y un botón
 * dentro de otro es HTML inválido (mismo criterio que las tarjetas de Listas).
 */
function Esquina({
  item,
  onMenu,
  seleccionando,
  elegida,
  sobreImagen,
}: Pick<LibraryItemProps, 'item' | 'onMenu' | 'seleccionando' | 'elegida'> & { sobreImagen: boolean }) {
  const theme = useTheme();
  const l = useT().library;
  if (seleccionando) {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.palomita,
          elegida ? { backgroundColor: theme.ink, borderColor: theme.ink } : { backgroundColor: theme.background, borderColor: theme.textTertiary },
        ]}>
        {elegida ? <Check size={14} strokeWidth={3} color={theme.onInk} /> : null}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={l.actionsFor(item.title)}
      hitSlop={10}
      onPress={onMenu}
      style={({ pressed }) => [styles.mas, sobreImagen ? { backgroundColor: theme.overlay } : null, pressed ? styles.presionada : null]}>
      {/* Sobre la portada va claro en un círculo oscuro, para leerse sobre cualquier imagen. */}
      <Ellipsis size={16} strokeWidth={IconStroke} color={sobreImagen ? PAPER : theme.textSecondary} />
    </Pressable>
  );
}

/** Una pieza en la rejilla de portadas (RF-BL1): la portada y, debajo, título y autor. */
export function LibraryCoverCard({ width, ...props }: LibraryItemProps & { width: number }) {
  const { item, onPress, onLongPress, seleccionando, elegida } = props;
  const theme = useTheme();
  const l = useT().library;
  return (
    <View style={{ width }}>
      <Pressable
        onPress={onPress}
        onLongPress={
          onLongPress
            ? () => {
                tap();
                onLongPress();
              }
            : undefined
        }
        delayLongPress={RETARDO_MS}
        style={({ pressed }) => [styles.tarjeta, pressed ? styles.presionada : null]}
        accessibilityRole="button"
        accessibilityLabel={etiqueta(item, l, seleccionando ? elegida : undefined)}
        accessibilityHint={seleccionando ? undefined : l.openBook(item.title)}
        accessibilityState={seleccionando ? { selected: elegida } : undefined}>
        <View>
          <BookCover item={item} width={width} />
          {elegida ? <View pointerEvents="none" style={[styles.elegida, { borderColor: theme.ink }]} /> : null}
        </View>
        <View>
          <AppText variant="label" numberOfLines={1}>
            {item.title}
          </AppText>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {item.authors.length > 0 ? item.authors.join(', ') : ' '}
          </AppText>
        </View>
      </Pressable>
      <View style={styles.esquinaPortada}>
        <Esquina {...props} sobreImagen />
      </View>
    </View>
  );
}

/** Una pieza en la lista (RF-BL3): portada chica, título y autor, y el avance a la derecha. */
export function LibraryRow(props: LibraryItemProps) {
  const { item, onPress, onLongPress, seleccionando, elegida } = props;
  const theme = useTheme();
  const l = useT().library;
  return (
    <View style={[styles.fila, { borderColor: theme.border }]}>
      <Pressable
        onPress={onPress}
        onLongPress={
          onLongPress
            ? () => {
                tap();
                onLongPress();
              }
            : undefined
        }
        delayLongPress={RETARDO_MS}
        style={({ pressed }) => [styles.filaToque, pressed ? styles.presionada : null]}
        accessibilityRole="button"
        accessibilityLabel={etiqueta(item, l, seleccionando ? elegida : undefined)}
        accessibilityHint={seleccionando ? undefined : l.openBook(item.title)}
        accessibilityState={seleccionando ? { selected: elegida } : undefined}>
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
      <Esquina {...props} sobreImagen={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: { gap: Spacing.sm },
  // La portada elegida lleva un marco de tinta encima (RF-BL15): no cambia el tamaño ni mueve nada.
  elegida: { ...StyleSheet.absoluteFill, borderWidth: 3, borderRadius: Radius.sm, borderCurve: 'continuous' },
  esquinaPortada: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  filaToque: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  textos: { flex: 1, gap: 2 },
  presionada: { opacity: 0.85 },
  mas: { padding: 4, borderRadius: Radius.full },
  palomita: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
