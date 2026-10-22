import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { JournalEnLibreria } from '@/components/library/journal-in-library';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useLibraryFileUrl } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { colorDePortada, rutaDePortada, textoSobre } from '@/lib/library/shelf';
import type { LibraryItem } from '@/types/domain';

type Props = {
  item: Pick<LibraryItem, 'id' | 'title' | 'authors' | 'cover_path' | 'cover_color'> & Partial<Pick<LibraryItem, 'custom_cover_path' | 'custom_cover_color' | 'kind' | 'journal'>>;
  /** Ancho en px; el alto sale de la proporción de libro, 2:3 (RF-BL1). */
  width: number;
  /** Miniatura de la lista (RF-BL3): sin texto, que a ese tamaño no se lee. */
  thumb?: boolean;
  /** Una imagen que todavía no está en Storage, como la del libro que se está importando. */
  uri?: string | null;
};

/**
 * La portada de una pieza. Si tiene imagen, la imagen; si no —o mientras llega—, una portada
 * generada con el título sobre el color de la pieza (RF-BL12), que siempre es el mismo.
 * Es decorativa: quien la usa pone el título en su etiqueta de accesibilidad.
 */
export function BookCover({ item, width, thumb = false, uri }: Props) {
  const theme = useTheme();
  const firmada = useLibraryFileUrl(uri ? null : rutaDePortada(item));
  const url = { data: uri ?? firmada.data };
  // Si la imagen no carga (dirección vencida, sin red), se queda la portada generada con su título.
  const [fallo, setFallo] = useState<string | null>(null);
  const imagen = url.data && url.data !== fallo ? url.data : null;
  const fondo = colorDePortada(item);
  const tinta = textoSobre(fondo);

  // Un Journal (13i; T345) se ve como los demás libros: su material y su encuadernación llenan la misma portada.
  if (item.kind === 'journal' && item.journal) {
    return (
      <View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none">
        <JournalEnLibreria id={item.id} portada={item.journal} cara="front" ancho={width} alto={Math.round(width * 1.5)} />
      </View>
    );
  }

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      // Decorativa también para el puntero: en web, el navegador arrastraba la imagen (`<img>`) por su
      // cuenta y eso cancelaba el gesto de acomodar los libros. El toque lo atiende la tarjeta.
      pointerEvents="none"
      style={[
        styles.portada,
        thumb ? styles.portadaChica : null,
        { width, height: Math.round(width * 1.5), backgroundColor: fondo, borderColor: theme.border },
      ]}>
      {!thumb && !imagen ? (
        <View style={styles.generada}>
          <Text numberOfLines={4} style={[styles.titulo, { color: tinta, fontSize: width < 130 ? 14 : 16 }]}>
            {item.title}
          </Text>
          {item.authors.length > 0 ? (
            <Text numberOfLines={2} style={[styles.autor, { color: tinta }]}>
              {item.authors.join(', ')}
            </Text>
          ) : null}
        </View>
      ) : null}
      {imagen ? (
        <Image source={{ uri: imagen }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} onError={() => setFallo(imagen)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  portada: { borderRadius: Radius.sm, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  portadaChica: { borderRadius: 4 },
  generada: { flex: 1, padding: Spacing.md, justifyContent: 'space-between' },
  titulo: { ...Typography.bodyStrong, lineHeight: undefined },
  autor: { ...Typography.caption, opacity: 0.85 },
});
