import { Image } from 'expo-image';
import { useState } from 'react';
import { type ImageSourcePropType, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { TarjetaDePack } from '@/components/library/sticker-sheet';
import { AppText, Segmented, Sheet } from '@/components/ui';
import { ASSETS_DE_LIENZO, CATEGORIAS_DE_ASSET, type CategoriaDeAsset, type ModoDeAsset } from '@/constants/canvas-assets';
import { Radius, Spacing } from '@/constants/theme';
import { useMyStickerPacks, useStickerPacks } from '@/hooks/use-sticker-packs';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';
import { uriLocal } from '@/lib/library/offline/sticker-packs';
import { idDeSticker, pesoDe, soloPapeles, urlDeSticker } from '@/lib/library/sticker-packs';

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
              style={({ pressed }) => [styles.celda, { backgroundColor: pressed ? theme.surfaceAlt : theme.background, borderColor: theme.border }]}>
              <Image source={a.imagen} style={styles.imagen} contentFit="contain" tintColor={a.modo === 'trazo' ? theme.text : undefined} />
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
              papeles.map((p) => <TarjetaDePack key={p.id} pack={p} descargado={!!mios.data?.includes(p.id)} onAbrir={() => undefined} meta={t.packMeta(p.stickers.length, pesoDe(p.bytes))} />)
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
  tienda: { gap: Spacing.sm, paddingTop: Spacing.sm },
});
