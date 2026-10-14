import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Segmented, Sheet } from '@/components/ui';
import { STICKERS, type Sticker, stickerPorId } from '@/constants/stickers';
import { IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { giroDe, stickerDe } from '@/lib/library/annotations';
import type { LibraryAnnotation } from '@/types/domain';

type Vista = 'coleccion' | 'quitados';

/**
 * Elegir un sticker (spec 13c, RF-BH13; T290): de la colección incluida o de la charola "Quitados" de este
 * libro. Elegir uno cierra la hoja y el siguiente toque en la página lo pega ahí; uno de la charola vuelve con
 * su tamaño y su giro. Desde la charola también se tira para siempre.
 */
export function StickerSheet({
  visible,
  quitados,
  onClose,
  onElegir,
  onDevolver,
  onTirar,
}: {
  visible: boolean;
  /** Los stickers quitados de este libro, el último primero. */
  quitados: readonly LibraryAnnotation[];
  onClose: () => void;
  onElegir: (s: Sticker) => void;
  onDevolver: (a: LibraryAnnotation, s: Sticker) => void;
  onTirar: (a: LibraryAnnotation) => void;
}) {
  const t = useT().library.stickers;
  const [vista, setVista] = useState<Vista>('coleccion');
  // Solo los que esta versión conoce: uno de un paquete que ya no existe no se puede pintar.
  const charola = quitados.flatMap((a) => {
    const s = stickerPorId(stickerDe(a));
    return s ? [{ a, s }] : [];
  });

  return (
    <Sheet visible={visible} onClose={onClose} title={t.title}>
      <View style={styles.cuerpo}>
        <Segmented<Vista>
          fullWidth
          label={t.title}
          options={[
            { value: 'coleccion', label: t.collection },
            { value: 'quitados', label: t.removed(charola.length) },
          ]}
          value={vista}
          onChange={setVista}
        />
        {vista === 'coleccion' ? (
          <>
            <AppText variant="label" color="textSecondary">
              {t.pack['nobi-pink']}
            </AppText>
            <View style={styles.rejilla}>
              {STICKERS.map((s) => (
                <Celda key={s.id} sticker={s} etiqueta={t.pick(t.names[s.nombre])} onPress={() => onElegir(s)} />
              ))}
            </View>
          </>
        ) : charola.length ? (
          <>
            <AppText variant="label" color="textSecondary">
              {t.removedHint}
            </AppText>
            <View style={styles.rejilla}>
              {charola.map(({ a, s }) => (
                <Celda
                  key={a.id}
                  sticker={s}
                  giro={giroDe(a)}
                  etiqueta={t.putBack(t.names[s.nombre])}
                  onPress={() => onDevolver(a, s)}
                  tirar={{ etiqueta: t.discard(t.names[s.nombre]), onPress: () => onTirar(a) }}
                />
              ))}
            </View>
          </>
        ) : (
          <AppText variant="body" color="textSecondary">
            {t.removedEmpty}
          </AppText>
        )}
      </View>
    </Sheet>
  );
}

function Celda({
  sticker,
  giro = 0,
  etiqueta,
  onPress,
  tirar,
}: {
  sticker: Sticker;
  giro?: number;
  etiqueta: string;
  onPress: () => void;
  tirar?: { etiqueta: string; onPress: () => void };
}) {
  const theme = useTheme();
  return (
    <View style={styles.celda}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        onPress={onPress}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.boton,
          { backgroundColor: pressed || hovered ? theme.surfaceAlt : 'transparent' },
        ]}>
        <Image source={sticker.imagen} contentFit="contain" style={[styles.imagen, giro ? { transform: [{ rotate: `${giro}deg` }] } : null]} accessible={false} />
      </Pressable>
      {tirar ? (
        // Chiquito para no tapar el sticker, pero con 48 px para tocarlo (hitSlop).
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tirar.etiqueta}
          hitSlop={10}
          onPress={tirar.onPress}
          style={({ pressed }) => [styles.tirar, { backgroundColor: pressed ? theme.surfaceAlt : theme.surface, borderColor: theme.border }]}>
          <X size={16} strokeWidth={IconStroke} color={theme.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.md },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  celda: { width: 76 },
  boton: { width: 76, height: 68, padding: Spacing.xs, borderRadius: Radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  imagen: { width: '100%', height: '100%' },
  tirar: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
    borderCurve: 'continuous',
  },
});
