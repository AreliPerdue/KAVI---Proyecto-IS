import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, Sheet } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { prepararSticker } from '@/lib/library/cover/prepare';
import { desdeArchivo, desdeCamara, desdeGaleria, PUEDE_TOMAR_FOTO } from '@/lib/library/cover/sources';

/** Los márgenes que se ofrecen, en px para una imagen de 512 (el motor los escala). */
export const MARGENES = { none: 0, thin: 6, medium: 12, thick: 20 } as const;
type Margen = keyof typeof MARGENES;

export type StickerHecho = { dataUrl: string; ancho: number; alto: number };

/**
 * Hacer un sticker con una imagen propia (spec 13c, RF-BH13; T335): elegirla (galería, cámara o archivo), ver
 * cómo queda con margen blanco o sin él y guardarlo en "Mis stickers". `procesar` lo hace el motor del lector:
 * recorta lo transparente de alrededor y dibuja el margen siguiendo la silueta.
 */
export function CreateStickerSheet({
  visible,
  onClose,
  procesar,
  onGuardar,
  guardando,
}: {
  visible: boolean;
  onClose: () => void;
  procesar: (src: string, margen: number) => Promise<StickerHecho>;
  onGuardar: (hecho: StickerHecho, margen: number) => void;
  guardando: boolean;
}) {
  const t = useT().library.stickers;
  return (
    <Sheet visible={visible} onClose={onClose} title={t.createTitle}>
      {visible ? <Creador procesar={procesar} onGuardar={onGuardar} guardando={guardando} /> : null}
    </Sheet>
  );
}

function Creador({ procesar, onGuardar, guardando }: { procesar: (src: string, margen: number) => Promise<StickerHecho>; onGuardar: (h: StickerHecho, m: number) => void; guardando: boolean }) {
  const theme = useTheme();
  const t = useT().library.stickers;
  const [original, setOriginal] = useState<string | null>(null);
  const [margen, setMargen] = useState<Margen>('medium');
  const [hecho, setHecho] = useState<StickerHecho | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const turno = useRef(0);

  // Cada vez que cambia la imagen o el margen, el motor lo vuelve a hacer (el último pedido gana).
  const hacer = (src: string, m: Margen) => {
    const mio = ++turno.current;
    setCargando(true);
    procesar(src, MARGENES[m])
      .then((h) => {
        if (mio !== turno.current) return;
        setHecho(h);
        setError(null);
      })
      .catch(() => mio === turno.current && setError(t.createFailed))
      .finally(() => mio === turno.current && setCargando(false));
  };
  const cambiarMargen = (m: Margen) => {
    setMargen(m);
    if (original) hacer(original, m);
  };

  const elegir = async (desde: () => Promise<string | null>) => {
    setError(null);
    try {
      const uri = await desde();
      if (!uri) return;
      setCargando(true);
      const lista = await prepararSticker(uri);
      setHecho(null);
      setOriginal(lista.dataUrl);
      hacer(lista.dataUrl, margen);
    } catch (e) {
      setCargando(false);
      setError(e instanceof Error ? e.message : t.createFailed);
    }
  };

  if (!original) {
    return (
      <View style={styles.cuerpo}>
        <AppText variant="body" color="textSecondary">
          {t.createHint}
        </AppText>
        <Button title={t.fromGallery} variant="secondary" onPress={() => void elegir(desdeGaleria)} />
        {PUEDE_TOMAR_FOTO ? <Button title={t.fromCamera} variant="secondary" onPress={() => void elegir(desdeCamara)} /> : null}
        <Button title={t.fromFile} variant="secondary" onPress={() => void elegir(desdeArchivo)} />
        {cargando ? <ActivityIndicator /> : null}
        {error ? (
          <AppText variant="label" color="danger" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.cuerpo}>
      {/* Sobre cuadritos, como en un editor: así se ve lo transparente y el margen blanco. */}
      <View style={[styles.vista, { backgroundColor: theme.surfaceAlt }]}>
        {hecho ? (
          <Image source={{ uri: hecho.dataUrl }} contentFit="contain" style={[styles.imagen, { aspectRatio: hecho.ancho / hecho.alto }]} accessibilityLabel={t.createPreview} />
        ) : null}
        {cargando ? <ActivityIndicator style={styles.cargando} /> : null}
      </View>
      <AppText variant="label" color="textSecondary">
        {t.margin}
      </AppText>
      <View style={styles.margenes} accessibilityRole="radiogroup" accessibilityLabel={t.margin}>
        {(Object.keys(MARGENES) as Margen[]).map((m) => (
          <Chip key={m} label={t.margins[m]} selected={margen === m} onPress={() => cambiarMargen(m)} compact />
        ))}
      </View>
      <AppText variant="caption" color="textSecondary">
        {t.marginHint}
      </AppText>
      {error ? (
        <AppText variant="label" color="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
      <Button title={t.createSave} loading={guardando} disabled={!hecho || cargando} onPress={() => hecho && onGuardar(hecho, MARGENES[margen])} />
      <Button title={t.createOther} variant="ghost" onPress={() => (setOriginal(null), setHecho(null))} />
    </View>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.md },
  vista: { borderRadius: Radius.lg, borderCurve: 'continuous', padding: Spacing.lg, minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  imagen: { width: '100%', maxWidth: 280, maxHeight: 260 },
  cargando: { position: 'absolute' },
  margenes: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
