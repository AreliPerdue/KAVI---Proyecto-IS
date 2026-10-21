import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Segmented, Sheet } from '@/components/ui';
import { type AssetDeLienzo, ASSETS_DE_LIENZO, CATEGORIAS_DE_ASSET, type CategoriaDeAsset } from '@/constants/canvas-assets';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/**
 * "Papeles y más" (spec 13h, RF-CC15 – RF-CC17; T343b): los assets del lienzo por categoría —papeles, notas, cintas y
 * doodles—, en gris. Tocar uno lo deja listo para pegarse donde se toque; su color se elige después en Estilo.
 */
export function AssetSheet({ visible, onClose, onElegir }: { visible: boolean; onClose: () => void; onElegir: (a: AssetDeLienzo) => void }) {
  const theme = useTheme();
  const t = useT().library.canvas.assets;
  const [categoria, setCategoria] = useState<CategoriaDeAsset>('papel');
  const lista = ASSETS_DE_LIENZO.filter((a) => a.categoria === categoria);
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
              accessibilityLabel={t.names[a.nombre]}
              onPress={() => onElegir(a)}
              style={({ pressed }) => [styles.celda, { backgroundColor: pressed ? theme.surfaceAlt : theme.background, borderColor: theme.border }]}>
              <Image source={a.imagen} style={styles.imagen} contentFit="contain" tintColor={a.modo === 'trazo' ? theme.text : undefined} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.md, paddingBottom: Spacing.md },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  celda: { width: 96, height: 96, padding: Spacing.sm, borderRadius: Radius.md, borderCurve: 'continuous', borderWidth: 1 },
  imagen: { width: '100%', height: '100%' },
});
