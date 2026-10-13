import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ReaderEngine, type ReaderEngineHandle } from './reader-engine';

import { useLibraryFileUrl, useSaveCover } from '@/hooks/use-library';
import { base64ToBytes } from '@/lib/library/base64';
import { colorDeImagen } from '@/lib/library/import/cover-color';
import type { MensajeDelMotor } from '@/lib/library/reader-protocol';
import type { LibraryItem } from '@/types/domain';

/** Ancho de la portada dibujada: de sobra para la rejilla en web (6 columnas a 2x). */
const ANCHO_PORTADA = 600;

/**
 * Los PDF que ya se intentaron en esta sesión, bien o mal. Vive fuera del componente para que salir y
 * volver a la librería no repita uno que falló (sin red, archivo dañado).
 */
const intentados = new Set<string>();

/**
 * Le pone portada a los PDF que no tienen (RF-BL12). La portada de un PDF es su primera página, y
 * dibujarla necesita pdf.js: un motor de lectura invisible la dibuja, uno por uno, y se guarda en R2
 * con su color dominante. Así reciben portada los PDF recién importados y los que se subieron antes.
 */
export function PdfCoverWorker({ items }: { items: readonly LibraryItem[] }) {
  const [, setVuelta] = useState(0);
  const siguiente = items.find((i) => i.kind === 'pdf' && !i.cover_path && i.file_path && !intentados.has(i.id));
  const url = useLibraryFileUrl(siguiente?.file_path ?? null);
  const guardar = useSaveCover();
  const motor = useRef<ReaderEngineHandle>(null);
  const pedidoPara = useRef<string | null>(null);

  const terminar = (id: string) => {
    intentados.add(id);
    pedidoPara.current = null;
    setVuelta((v) => v + 1);
  };

  const alMensaje = (m: MensajeDelMotor) => {
    if (m.type === 'ready' && siguiente && url.data && pedidoPara.current !== siguiente.id) {
      pedidoPara.current = siguiente.id;
      motor.current?.send({ type: 'cover', url: url.data, width: ANCHO_PORTADA });
      return;
    }
    const id = pedidoPara.current;
    if (!id) return;
    if (m.type === 'cover') {
      const jpeg = base64ToBytes(m.dataUrl);
      void colorDeImagen(jpeg, 'image/jpeg').then((color) => {
        guardar.mutate({ id, jpeg, color });
        terminar(id);
      });
    } else if (m.type === 'error') terminar(id);
  };

  if (!siguiente || !url.data) return null;
  // Un motor por PDF (con su `key`): al cambiar de libro se recarga y vuelve a decir `ready`.
  return (
    <View style={styles.oculto} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <ReaderEngine key={siguiente.id} ref={motor} onMessage={alMensaje} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Invisible pero dentro de la pantalla: un WebView fuera de ella puede dejar de pintar en Android.
  oculto: { position: 'absolute', left: 0, bottom: 0, width: 2, height: 2, opacity: 0.01 },
});
