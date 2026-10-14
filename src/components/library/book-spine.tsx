import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { etiqueta, type LibraryItemProps, RETARDO_MS } from './library-item';

import { AppText } from '@/components/ui';
import { Motion, Radius, Typography } from '@/constants/theme';
import { useLibraryFileUrl } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { tap } from '@/lib/haptics';
import { colorDeParte } from '@/lib/library/cover/parts';
import { textoSobre } from '@/lib/library/shelf';
import { ANCHO_RESTO, anchoDeLomo, altoDeLomo, LOMOS_DE_SAGA } from '@/lib/library/spines';
import { usePreferencesStore } from '@/store/preferences-store';
import { useSpineRatiosStore } from '@/store/spine-ratios-store';
import type { LibraryItem, LibrarySeries } from '@/types/domain';

/** Cuánto sube un lomo al sacarlo del librero (RF-BL2). */
export const SALIDA = 18;

type PiezaDeLomo = Pick<LibraryItem, 'id' | 'title' | 'cover_path' | 'cover_color' | 'page_count'> &
  Partial<Pick<LibraryItem, 'custom_cover_path' | 'custom_cover_color' | 'spine_path' | 'spine_color' | 'series_id'>>;

/**
 * El lomo de un libro (RF-BL2, RF-BL2b, RF-BL20): la imagen del lomo si la tiene, completa (el lomo toma el
 * ancho que pide la imagen a su alto); si no, su color con el título en vertical, de abajo hacia arriba como
 * en los libros en español, en uno o dos renglones. El alto sale del ajuste (variado o igual) y es el mismo
 * para los tomos de una saga. Es decorativo: quien lo usa pone la etiqueta de accesibilidad.
 */
export function BookSpine({ item }: { item: PiezaDeLomo }) {
  const theme = useTheme();
  const modo = usePreferencesStore((s) => s.librarySpineHeights);
  const alto = altoDeLomo(item, modo);
  const ruta = item.spine_path ?? null;
  const proporcion = useSpineRatiosStore((s) => (ruta ? s.porRuta[ruta] : undefined));
  const ponerProporcion = useSpineRatiosStore((s) => s.poner);
  const fondo = colorDeParte(item, 'spine');
  const tinta = textoSobre(fondo);
  const firmada = useLibraryFileUrl(item.spine_path ?? null);
  // Si la imagen no carga, se queda el lomo de color con su título.
  const [fallo, setFallo] = useState<string | null>(null);
  const imagen = firmada.data && firmada.data !== fallo ? firmada.data : null;
  const { ancho: grosor, ajustada } = anchoDeLomo(item.page_count, alto, imagen ? proporcion : null);
  // El título en uno o dos renglones, con la letra que quepa en el grosor.
  const letra = Math.min(14, Math.max(10, Math.round(grosor * 0.3)));
  // El texto girado ocupa el alto del lomo como su ancho, menos las bandas de arriba y abajo.
  const largo = alto - 28;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      testID="lomo"
      style={[styles.lomo, { width: grosor, height: alto, backgroundColor: fondo, borderColor: theme.border }]}>
      {imagen ? (
        <Image
          testID="lomo-imagen"
          source={{ uri: imagen }}
          style={StyleSheet.absoluteFill}
          // Con su ancho cubre justo; si se topó, se ve entera dentro: nunca se recorta.
          contentFit={proporcion && !ajustada ? 'contain' : 'cover'}
          transition={150}
          onLoad={(e) => ruta && e.source.height > 0 && ponerProporcion(ruta, e.source.width / e.source.height)}
          onError={() => setFallo(imagen)}
        />
      ) : (
        <>
          <View style={[styles.banda, styles.bandaArriba, { backgroundColor: tinta }]} />
          <View
            style={[
              styles.giro,
              { width: largo, height: grosor, left: (grosor - largo) / 2, top: (alto - grosor) / 2 },
            ]}>
            {/* Si no cabe en un renglón, pasa a dos (lo que sobre de ahí, con puntos suspensivos). */}
            <Text numberOfLines={2} style={[styles.titulo, { color: tinta, fontSize: letra, lineHeight: Math.round(letra * 1.15) }]}>
              {item.title}
            </Text>
          </View>
          <View style={[styles.banda, styles.bandaAbajo, { backgroundColor: tinta }]} />
        </>
      )}
    </View>
  );
}

/** Sube y baja el lomo: sacado del librero o en su lugar. Sin animación con movimiento reducido. */
function useSalida(sacado: boolean) {
  const y = useSharedValue(0);
  const sinMovimiento = useReducedMotion();
  useEffect(() => {
    const destino = sacado ? -SALIDA : 0;
    y.value = sinMovimiento ? destino : withTiming(destino, { duration: Motion.base });
  }, [sacado, sinMovimiento, y]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
}

/** La marca de elegido mientras se selecciona: marco de tinta y una palomita arriba (RF-BL15). */
function Marca({ elegida }: { elegida: boolean }) {
  const theme = useTheme();
  return (
    <>
      {elegida ? <View pointerEvents="none" style={[styles.marco, { borderColor: theme.ink }]} /> : null}
      <View
        pointerEvents="none"
        style={[
          styles.palomita,
          elegida ? { backgroundColor: theme.ink, borderColor: theme.ink } : { backgroundColor: theme.background, borderColor: theme.textTertiary },
        ]}>
        {elegida ? <Check size={10} strokeWidth={3} color={theme.onInk} /> : null}
      </View>
    </>
  );
}

/**
 * Un libro en el librero (RF-BL2). Tocarlo lo saca (sube) y quien lo usa muestra su portada; mientras se
 * selecciona, tocar lo elige. Mantener presionado empieza a seleccionar, como en las otras vistas.
 */
export function LibrarySpine({ item, onPress, onLongPress, seleccionando, elegida, sacado, etiquetaSaga }: Omit<LibraryItemProps, 'onMenu'> & { sacado: boolean }) {
  const l = useT().library;
  const animado = useSalida(sacado);
  return (
    <Animated.View style={animado}>
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
        style={({ pressed }) => (pressed ? styles.presionada : null)}
        accessibilityRole="button"
        accessibilityLabel={etiqueta(item, l, seleccionando ? elegida : undefined, etiquetaSaga)}
        accessibilityHint={seleccionando ? undefined : l.spine.takeOut(item.title)}
        accessibilityState={seleccionando ? { selected: elegida } : undefined}>
        <BookSpine item={item} />
        {seleccionando ? <Marca elegida={elegida} /> : null}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Una saga apilada en el librero (RF-BL25): sus primeros lomos pegados, como una colección; si son más,
 * cuántos faltan. Tocarla la abre; mantenerla presionada elige todos sus libros.
 */
export function SeriesSpines({ saga, piezas, onPress, onLongPress }: { saga: LibrarySeries; piezas: readonly LibraryItem[]; onPress: () => void; onLongPress: () => void }) {
  const theme = useTheme();
  const l = useT().library;
  const resto = piezas.length - LOMOS_DE_SAGA;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => {
        tap();
        onLongPress();
      }}
      delayLongPress={RETARDO_MS}
      style={({ pressed }) => [styles.saga, pressed ? styles.presionada : null]}
      accessibilityRole="button"
      accessibilityLabel={l.series.stack(saga.name, piezas.length)}>
      {piezas.slice(0, LOMOS_DE_SAGA).map((p) => (
        <BookSpine key={p.id} item={p} />
      ))}
      {resto > 0 ? (
        <View style={[styles.resto, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <AppText variant="caption" color="textSecondary" tabular>
            {l.spine.moreInSeries(resto)}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lomo: { borderRadius: 3, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  banda: { position: 'absolute', left: 0, right: 0, height: 2, opacity: 0.35 },
  bandaArriba: { top: 8 },
  bandaAbajo: { bottom: 8 },
  giro: { position: 'absolute', justifyContent: 'center', transform: [{ rotate: '-90deg' }] },
  titulo: { ...Typography.label, fontWeight: '600', lineHeight: undefined, textAlign: 'center' },
  presionada: { opacity: 0.85 },
  marco: { ...StyleSheet.absoluteFill, borderWidth: 3, borderRadius: 3 },
  palomita: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saga: { flexDirection: 'row', alignItems: 'flex-end' },
  resto: { width: ANCHO_RESTO, height: 48, borderRadius: Radius.sm, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
});
