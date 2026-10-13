import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CoverDropProps } from './cover-drop';

import { AppText } from '@/components/ui';
import { PAPER, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

export type { CoverDropProps } from './cover-drop';

/** La primera imagen de una lista de archivos, como dirección local del navegador. */
function primeraImagen(archivos: FileList | DataTransferItemList | undefined | null): string | null {
  if (!archivos) return null;
  for (const a of Array.from(archivos as ArrayLike<File | DataTransferItem>)) {
    const archivo = 'getAsFile' in a ? (a.kind === 'file' ? a.getAsFile() : null) : a;
    if (archivo?.type.startsWith('image/')) return URL.createObjectURL(archivo);
  }
  return null;
}

/**
 * En la web, la portada se cambia también **arrastrando** una imagen sobre ella o **pegándola** con
 * ⌘V / Ctrl+V (RF-BL23). La zona se ilumina mientras se arrastra encima; pegar funciona mientras la
 * hoja está abierta, sin tener que hacer clic en ningún lado.
 */
export function CoverDrop({ children, onImage }: CoverDropProps) {
  const theme = useTheme();
  const tx = useT();
  const zona = useRef<View>(null);
  const [encima, setEncima] = useState(false);
  const alImagen = useRef(onImage);
  useEffect(() => {
    alImagen.current = onImage;
  }, [onImage]);

  useEffect(() => {
    const el = zona.current as unknown as HTMLElement | null;
    if (!el?.addEventListener) return;
    const sobre = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setEncima(true);
    };
    const fuera = () => setEncima(false);
    const soltar = (e: DragEvent) => {
      e.preventDefault();
      setEncima(false);
      const uri = primeraImagen(e.dataTransfer?.files);
      if (uri) alImagen.current(uri);
    };
    const pegar = (e: ClipboardEvent) => {
      const uri = primeraImagen(e.clipboardData?.items);
      if (!uri) return;
      e.preventDefault();
      alImagen.current(uri);
    };
    el.addEventListener('dragenter', sobre);
    el.addEventListener('dragover', sobre);
    el.addEventListener('dragleave', fuera);
    el.addEventListener('drop', soltar);
    window.addEventListener('paste', pegar);
    return () => {
      el.removeEventListener('dragenter', sobre);
      el.removeEventListener('dragover', sobre);
      el.removeEventListener('dragleave', fuera);
      el.removeEventListener('drop', soltar);
      window.removeEventListener('paste', pegar);
    };
  }, []);

  return (
    <View ref={zona} style={[styles.zona, { borderColor: encima ? theme.ink : 'transparent' }]}>
      {children}
      {encima ? (
        <View pointerEvents="none" style={[styles.aviso, { backgroundColor: theme.overlay }]}>
          <AppText variant="label" style={styles.texto}>
            {tx.library.cover.dropHere}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  zona: { borderWidth: 2, borderStyle: 'dashed', borderRadius: Radius.md, borderCurve: 'continuous', padding: Spacing.sm, alignItems: 'center' },
  aviso: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, padding: Spacing.lg },
  texto: { textAlign: 'center', color: PAPER },
});
