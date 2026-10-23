import { Image } from 'expo-image';
import { useState } from 'react';
import { type ImageSourcePropType, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DetalleDePack, TarjetaDePack } from '@/components/library/sticker-sheet';
import { AppText, Segmented, Sheet } from '@/components/ui';
import { ASSETS_DE_LIENZO, CATEGORIAS_DE_ASSET, type CategoriaDeAsset, FONDO_DE_VISTA_PREVIA, type ModoDeAsset } from '@/constants/canvas-assets';
import { Radius, Spacing } from '@/constants/theme';
import { useMyStickerPacks, useStickerPacks } from '@/hooks/use-sticker-packs';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';
import { uriLocal } from '@/lib/library/offline/sticker-packs';
import { idDeSticker, pesoDe, soloPapeles, urlDeSticker } from '@/lib/library/sticker-packs';
import type { StickerPack } from '@/types/domain';

/** Lo que se pega: su id (`<pack>/<nombre>`), su proporción, cómo se recolorea y su nombre en el idioma de la app. */
export type AssetElegible = { id: string; ar: number; modo: ModoDeAsset; label: string };
type Pieza = AssetElegible & { categoria: CategoriaDeAsset; imagen: ImageSourcePropType };

/**
 * "Papeles y más" (spec 13h, RF-CC15 – RF-CC17; T343b, T343c): los assets del lienzo por categoría —papeles, notas,
 * cintas y doodles—, en gris. Los básicos vienen en la app; abajo, la tienda de packs de papeles (en la nube, como los
 * stickers): al obtener uno, sus piezas entran a sus categorías (en el teléfono se guardan para verse sin red). Tocar
 * una la deja lista para pegarse donde se toque; su color se elige después en Estilo.
 */
export function AssetSheet({ visible, onClose, onElegir }: { visible: boolean; onClose: () => void; onElegir: (a: AssetElegible) => void }) {
  const theme = useTheme();
  const tx = useT();
  const t = tx.library.canvas.assets;
  const idioma = useLanguage();
  const [categoria, setCategoria] = useState<CategoriaDeAsset>('papel');
  const [viendo, setViendo] = useState<StickerPack | null>(null);
  const packs = useStickerPacks();
  const mios = useMyStickerPacks();
  const papeles = soloPapeles(packs.data?.packs ?? []);
  const descargados = papeles.filter((p) => mios.data?.includes(p.id));

  const basicos: Pieza[] = ASSETS_DE_LIENZO.map((a) => ({ id: a.id, ar: a.ar, modo: a.modo, label: t.names[a.nombre], categoria: a.categoria, imagen: a.imagen }));
  const deLaTienda: Pieza[] = descargados.flatMap((p) =>
    p.stickers.flatMap((s) =>
      s.category
        ? [
            {
              id: idDeSticker(p.id, s.name),
              ar: s.ar,
              modo: s.mode ?? 'textura',
              label: (idioma === 'en' ? s.label_en : s.label_es) ?? s.name,
              categoria: s.category,
              imagen: { uri: uriLocal(p, s.name) ?? urlDeSticker(p, s.name) },
            },
          ]
        : [],
    ),
  );
  const lista = [...basicos, ...deLaTienda].filter((a) => a.categoria === categoria);

  if (viendo) {
    const etiquetas = new Map(viendo.stickers.map((s) => [s.name, (idioma === 'en' ? s.label_en : s.label_es) ?? s.name]));
    return (
      <Sheet visible={visible} onClose={onClose} title={t.title}>
        <DetalleDePack
          pack={viendo}
          descargado={!!mios.data?.includes(viendo.id)}
          onVolver={() => setViendo(null)}
          nombreDe={(n) => etiquetas.get(n) ?? n}
          meta={t.packMeta(viendo.stickers.length, pesoDe(viendo.bytes))}
          fondo={FONDO_DE_VISTA_PREVIA}
        />
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={t.title}>
      <View style={styles.cuerpo}>
        <Segmented label={t.title} options={CATEGORIAS_DE_ASSET.map((c) => ({ value: c, label: t.categories[c] }))} value={categoria} onChange={setCategoria} fullWidth />
        <AppText variant="caption" color="textSecondary">
          {t.hint}
        </AppText>
        <ScrollView contentContainerStyle={styles.rejilla}>
          {lista.map((a) => (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={() => onElegir({ id: a.id, ar: a.ar, modo: a.modo, label: a.label })}
              style={({ pressed }) => [styles.celda, { backgroundColor: FONDO_DE_VISTA_PREVIA, borderColor: theme.border }, pressed ? styles.presionado : null]}>
              {/* Sobre la mesa clara se ven igual los doodles (trazo negro) que los papeles (casi blancos). */}
              <Image source={a.imagen} style={styles.imagen} contentFit="contain" />
            </Pressable>
          ))}
        </ScrollView>
        {papeles.length ? (
          <View style={styles.tienda}>
            <AppText variant="label" color="textSecondary">
              {t.store}
            </AppText>
            {packs.data?.sinRed ? (
              <AppText variant="caption" color="textSecondary">
                {tx.library.stickers.storeOffline}
              </AppText>
            ) : (
              papeles.map((p) => <TarjetaDePack key={p.id} pack={p} descargado={!!mios.data?.includes(p.id)} onAbrir={() => setViendo(p)} meta={t.packMeta(p.stickers.length, pesoDe(p.bytes))} />)
            )}
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.md, paddingBottom: Spacing.md },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  celda: { width: 96, height: 96, padding: Spacing.sm, borderRadius: Radius.md, borderCurve: 'continuous', borderWidth: 1 },
  imagen: { width: '100%', height: '100%' },
  presionado: { opacity: 0.85 },
  tienda: { gap: Spacing.sm, paddingTop: Spacing.sm },
});
