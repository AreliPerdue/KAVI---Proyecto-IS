import { Image } from 'expo-image';
import { Camera, ClipboardPaste, FileImage, Images, Pipette } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, type GestureResponderEvent, Platform, Pressable, StyleSheet, View } from 'react-native';

import { BookCover } from './book-cover';
import { CoverDrop } from './cover-drop';

import { ActionRow, AppText, Banner, Button, ColorSwatch, Segmented, Sheet, TextField } from '@/components/ui';
import { LIBRARY_FILTER_COLORS } from '@/constants/library';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useCoverParts, useLibraryFileUrl, useLibraryItem } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { colorEn, type Muestra, muestraDe } from '@/lib/library/cover/eyedropper';
import { colorDeParte, hexValido, type ParteDeTapa, rutaDeParte, tieneImagenPropia } from '@/lib/library/cover/parts';
import { type PortadaLista, prepararPortada } from '@/lib/library/cover/prepare';
import { desdeArchivo, desdeCamara, desdeGaleria, desdePortapapeles, PUEDE_TOMAR_FOTO } from '@/lib/library/cover/sources';
import { useSnackbar } from '@/providers';
import type { LibraryItem } from '@/types/domain';

export type CoverSheetProps = { item: LibraryItem | null; onClose: () => void };

/** Medidas de la vista previa: la portada y la contraportada en proporción de libro; el lomo, angosto. */
const ANCHO = 140;
const ALTO = Math.round(ANCHO * 1.5);
const ANCHO_LOMO = 36;

/**
 * Las caras del libro (RF-BL20, RF-BL21, RF-BL23; T311, T314): **portada, lomo y contraportada**. A cada
 * una se le pone imagen (galería, cámara, archivo, portapapeles; en la web también arrastrar o pegar) y
 * color: el cuentagotas toma el del punto que se toca, o se escribe el hex, o se elige de la paleta.
 */
export function CoverSheet({ item, onClose }: CoverSheetProps) {
  const tx = useT();
  return (
    <Sheet visible={item !== null} onClose={onClose} title={tx.library.cover.title}>
      {item ? <Contenido key={item.id} item={item} onClose={onClose} /> : null}
    </Sheet>
  );
}

function Contenido({ item: inicial, onClose }: { item: LibraryItem; onClose: () => void }) {
  // La pieza viva: la hoja se queda abierta al guardar y tiene que ver la imagen y el color nuevos.
  const item = useLibraryItem(inicial.id).data ?? inicial;
  const theme = useTheme();
  const tx = useT();
  const c = tx.library.cover;
  const showSnackbar = useSnackbar();
  const { poner, quitar, colorear } = useCoverParts();
  const [parte, setParte] = useState<ParteDeTapa>('front');
  const [lista, setLista] = useState<PortadaLista | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gotero, setGotero] = useState(false);
  const [hex, setHex] = useState('');

  const ruta = rutaDeParte(item, parte);
  const firmada = useLibraryFileUrl(lista ? null : ruta);
  const imagen = lista?.vistaPrevia ?? firmada.data ?? null;
  const colorActual = colorDeParte(item, parte);

  // El cuentagotas lee de una muestra chica de la imagen que se ve; sin imagen no hay de dónde tomar.
  const [muestra, setMuestra] = useState<{ uri: string; m: Muestra | null } | null>(null);
  useEffect(() => {
    if (!gotero || !imagen || muestra?.uri === imagen) return;
    let vivo = true;
    void muestraDe(imagen).then((m) => vivo && setMuestra({ uri: imagen, m }));
    return () => {
      vivo = false;
    };
  }, [gotero, imagen, muestra?.uri]);

  const cambiarParte = (p: ParteDeTapa) => {
    setParte(p);
    setLista(null);
    setError(null);
    setGotero(false);
    setHex('');
  };

  const usar = async (obtener: () => Promise<string | null>, siNoHay?: string) => {
    setError(null);
    setGotero(false);
    try {
      const uri = await obtener();
      if (!uri) {
        if (siNoHay) setError(siNoHay);
        return;
      }
      setPreparando(true);
      setLista(await prepararPortada(uri));
    } catch (e) {
      setError(e instanceof Error ? e.message : c.unreadable);
    } finally {
      setPreparando(false);
    }
  };

  const guardar = () => {
    if (!lista) return;
    poner.mutate(
      { item, parte, jpeg: lista.jpeg, color: lista.color },
      {
        onSuccess: () => {
          showSnackbar({ message: c.saved });
          setLista(null);
        },
        onError: () => setError(c.failed),
      },
    );
  };

  const ponerColor = (nuevo: string) => {
    colorear.mutate({ item, parte, hex: nuevo }, { onSuccess: () => showSnackbar({ message: c.colorSaved }), onError: () => showSnackbar({ message: c.failed }) });
    setGotero(false);
    setHex('');
  };

  /** El toque sobre la imagen con el cuentagotas: el punto, en proporción a la vista previa. */
  const tomarColor = (e: GestureResponderEvent) => {
    if (!gotero || !muestra?.m) return;
    const punto = puntoTocado(e, parte === 'spine' ? ANCHO_LOMO : ANCHO, ALTO);
    const elegido = punto ? colorEn(muestra.m, punto.fx, punto.fy) : null;
    if (elegido) ponerColor(elegido);
  };

  const icono = (C: typeof Images) => <C size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />;
  const etiquetaParte: Record<ParteDeTapa, string> = { front: c.front, spine: c.spine, back: c.back };

  const vistaPrevia =
    parte === 'front' ? (
      <BookCover item={lista ? { ...item, custom_cover_path: null, cover_color: lista.color } : item} width={ANCHO} uri={lista?.vistaPrevia} />
    ) : (
      <View style={[styles.cara, { width: parte === 'spine' ? ANCHO_LOMO : ANCHO, height: ALTO, backgroundColor: lista?.color ?? colorActual, borderColor: theme.border }]}>
        {imagen ? <Image source={{ uri: imagen }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      </View>
    );

  return (
    <View style={styles.contenido}>
      <Segmented<ParteDeTapa>
        fullWidth
        label={c.title}
        options={[
          { value: 'front', label: c.front },
          { value: 'spine', label: c.spine },
          { value: 'back', label: c.back },
        ]}
        value={parte}
        onChange={cambiarParte}
      />

      <CoverDrop onImage={(uri) => void usar(async () => uri)}>
        <Pressable
          accessible
          accessibilityRole={gotero ? 'button' : undefined}
          accessibilityLabel={gotero ? c.eyedropperTap : c.preview(item.title)}
          onPress={tomarColor}
          disabled={!gotero}
          style={styles.toque}>
          {/* Sin toques en los hijos: así el punto se mide contra la vista previa entera. */}
          <View pointerEvents="none">{vistaPrevia}</View>
        </Pressable>
      </CoverDrop>
      {gotero ? (
        <AppText variant="caption" color="textSecondary" style={styles.centrado}>
          {muestra?.uri === imagen && !muestra.m ? c.eyedropperUnavailable : c.eyedropperHint}
        </AppText>
      ) : null}
      {preparando ? (
        <View style={styles.preparando}>
          <ActivityIndicator color={theme.textSecondary} />
          <AppText variant="label" color="textSecondary">
            {c.preparing}
          </AppText>
        </View>
      ) : null}
      {error ? <Banner tone="error" message={error} /> : null}

      {lista ? (
        <>
          <Button title={c.saveFor(etiquetaParte[parte])} onPress={guardar} loading={poner.isPending} />
          <Button title={c.choose} variant="ghost" onPress={() => setLista(null)} disabled={poner.isPending} />
        </>
      ) : (
        <>
          <View>
            {Platform.OS !== 'web' ? <ActionRow icon={icono(Images)} label={c.gallery} onPress={() => usar(desdeGaleria)} /> : null}
            {PUEDE_TOMAR_FOTO ? <ActionRow icon={icono(Camera)} label={c.camera} onPress={() => usar(desdeCamara)} /> : null}
            <ActionRow icon={icono(FileImage)} label={c.file} onPress={() => usar(desdeArchivo)} />
            <ActionRow icon={icono(ClipboardPaste)} label={c.paste} onPress={() => usar(desdePortapapeles, c.nothingToPaste)} />
            {Platform.OS === 'web' ? (
              <AppText variant="caption" color="textSecondary" style={styles.pista}>
                {c.webHint}
              </AppText>
            ) : null}
          </View>

          {/* Color de esta cara (RF-BL21): cuentagotas, hex o paleta. */}
          <View style={styles.seccion}>
            <View style={styles.filaMuestra}>
              <View style={[styles.muestra, { backgroundColor: colorActual, borderColor: theme.border }]} />
              <AppText variant="label" style={styles.flex}>
                {c.colorOf(etiquetaParte[parte])} · {colorActual}
              </AppText>
              {imagen ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: gotero }}
                  accessibilityLabel={c.eyedropper}
                  onPress={() => setGotero((g) => !g)}
                  hitSlop={8}
                  style={[styles.gotero, { borderColor: gotero ? theme.ink : theme.border, backgroundColor: gotero ? theme.surfaceAlt : 'transparent' }]}>
                  <Pipette size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.paleta}>
              {LIBRARY_FILTER_COLORS.map((p) => (
                <ColorSwatch key={p.id} hex={p.hex} label={tx.library.find.colorNames[p.id] ?? p.id} selected={colorActual === p.hex} onPress={() => ponerColor(p.hex)} />
              ))}
            </View>
            <View style={styles.filaColor}>
              <View style={styles.flex}>
                <TextField label={c.hex} placeholder={colorActual} value={hex} onChangeText={setHex} autoCapitalize="characters" autoCorrect={false} />
              </View>
              <Button title={c.apply} variant="secondary" disabled={!hexValido(hex)} onPress={() => ponerColor(hexValido(hex) as string)} style={styles.aplicar} />
            </View>
          </View>

          {tieneImagenPropia(item, parte) ? (
            <Button
              title={parte === 'front' ? c.restore : c.removeImage}
              variant="secondary"
              onPress={() => {
                quitar.mutate({ id: item.id, parte }, { onSuccess: () => showSnackbar({ message: parte === 'front' ? c.restored : c.removed }) });
                if (parte === 'front') onClose();
              }}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

/**
 * Dónde cayó el toque, de 0 a 1. En el teléfono el evento trae `locationX/Y`; en la web es un clic del
 * navegador y se mide contra el rectángulo del elemento.
 */
function puntoTocado(e: GestureResponderEvent, ancho: number, alto: number): { fx: number; fy: number } | null {
  const n = e.nativeEvent as Partial<GestureResponderEvent['nativeEvent']> & { clientX?: number; clientY?: number };
  if (Platform.OS === 'web') {
    const caja = (e.currentTarget as unknown as { getBoundingClientRect?: () => DOMRect }).getBoundingClientRect?.();
    if (!caja || n.clientX == null || n.clientY == null || !caja.width || !caja.height) return null;
    return { fx: (n.clientX - caja.left) / caja.width, fy: (n.clientY - caja.top) / caja.height };
  }
  if (n.locationX == null || n.locationY == null) return null;
  return { fx: n.locationX / ancho, fy: n.locationY / alto };
}

const styles = StyleSheet.create({
  contenido: { gap: Spacing.lg },
  cara: { borderRadius: Radius.sm, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', alignSelf: 'center' },
  toque: { alignSelf: 'center' },
  preparando: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  pista: { textAlign: 'center', marginVertical: Spacing.sm },
  centrado: { textAlign: 'center' },
  seccion: { gap: Spacing.md },
  filaColor: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  flex: { flex: 1 },
  filaMuestra: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  muestra: { width: 24, height: 24, borderRadius: 12, borderWidth: 1 },
  gotero: { width: 44, height: 44, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  paleta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  aplicar: { marginBottom: 2 },
});
