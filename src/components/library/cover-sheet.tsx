import { Camera, ClipboardPaste, FileImage, Images } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { BookCover } from './book-cover';
import { CoverDrop } from './cover-drop';

import { ActionRow, AppText, Banner, Button, Sheet } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useCustomCover } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { type PortadaLista, prepararPortada } from '@/lib/library/cover/prepare';
import { desdeArchivo, desdeCamara, desdeGaleria, desdePortapapeles, PUEDE_TOMAR_FOTO } from '@/lib/library/cover/sources';
import { useSnackbar } from '@/providers';
import type { LibraryItem } from '@/types/domain';

export type CoverSheetProps = { item: LibraryItem | null; onClose: () => void };

/**
 * Cambiar la portada de un libro (RF-BL23, T314). Por omisión se ve la que trae el archivo; aquí se
 * pone otra desde la galería, la cámara, un archivo o el portapapeles, y en la web también
 * arrastrándola o pegándola. Antes de guardar se ve cómo queda. "Volver a la original" quita la propia.
 */
export function CoverSheet({ item, onClose }: CoverSheetProps) {
  const tx = useT();
  return (
    <Sheet visible={item !== null} onClose={onClose} title={tx.library.cover.title}>
      {item ? <Contenido key={item.id} item={item} onClose={onClose} /> : null}
    </Sheet>
  );
}

function Contenido({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const theme = useTheme();
  const c = useT().library.cover;
  const showSnackbar = useSnackbar();
  const { poner, quitar } = useCustomCover();
  const [lista, setLista] = useState<PortadaLista | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usar = async (obtener: () => Promise<string | null>, siNoHay?: string) => {
    setError(null);
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
      { item, jpeg: lista.jpeg, color: lista.color },
      {
        onSuccess: () => {
          showSnackbar({ message: c.saved });
          onClose();
        },
        onError: () => setError(c.failed),
      },
    );
  };

  const restaurar = () => {
    quitar.mutate(item.id, { onSuccess: () => showSnackbar({ message: c.restored }), onError: () => showSnackbar({ message: c.failed }) });
    onClose();
  };

  const icono = (C: typeof Images) => <C size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />;
  const vista = lista ? { ...item, custom_cover_path: null, cover_color: lista.color } : item;

  return (
    <View style={styles.contenido}>
      <CoverDrop onImage={(uri) => void usar(async () => uri)}>
        <View accessible accessibilityLabel={c.preview(item.title)}>
          <BookCover item={vista} width={140} uri={lista?.vistaPrevia} />
        </View>
      </CoverDrop>
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
          <Button title={c.save} onPress={guardar} loading={poner.isPending} />
          <Button title={c.choose} variant="ghost" onPress={() => setLista(null)} disabled={poner.isPending} />
        </>
      ) : (
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
          {item.custom_cover_path ? <Button title={c.restore} variant="secondary" onPress={restaurar} /> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: Spacing.lg },
  preparando: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  pista: { textAlign: 'center', marginVertical: Spacing.sm },
});
