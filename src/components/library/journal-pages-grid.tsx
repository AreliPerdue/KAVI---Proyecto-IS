import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { CanvasPreview, type FuentesDeMiniatura } from '@/components/library/canvas-preview';
import { JournalCover } from '@/components/library/journal-cover';
import { AppText } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { DocumentoDeLienzo } from '@/lib/library/canvas';
import type { PortadaDeJournal } from '@/lib/library/journal';
import type { LibraryCanvas } from '@/types/domain';

type Hoja = { clave: string; numero: number; tipo: 'front' | 'page' | 'back'; lienzo?: LibraryCanvas };

/**
 * "Páginas", otra forma de ver un Journal en el lector (13i; T364): la portada, cada página y la contraportada en
 * miniatura, en orden. Tocar una lleva a esa hoja (`numero`, contando la portada como la 1).
 */
export function JournalPagesGrid({
  portada,
  paginas,
  tapas,
  fuentes,
  onIr,
}: {
  portada: PortadaDeJournal;
  paginas: readonly LibraryCanvas[];
  tapas: { front?: { doc: DocumentoDeLienzo }; back?: { doc: DocumentoDeLienzo } };
  fuentes: FuentesDeMiniatura;
  onIr: (numero: number) => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const contenido = Math.min(width, MaxContentWidth) - Spacing.lg * 2;
  const columnas = contenido >= 860 ? 5 : contenido >= 560 ? 4 : 3;
  const ancho = Math.max(60, Math.floor((contenido - Spacing.md * (columnas - 1)) / columnas));
  const hojas: Hoja[] = [
    { clave: 'front', numero: 1, tipo: 'front' },
    ...paginas.map((lienzo, i) => ({ clave: lienzo.id, numero: i + 2, tipo: 'page' as const, lienzo })),
    { clave: 'back', numero: paginas.length + 2, tipo: 'back' },
  ];
  return (
    <FlatList
      key={columnas}
      data={hojas}
      numColumns={columnas}
      keyExtractor={(h) => h.clave}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.contenido}
      columnWrapperStyle={styles.fila}
      renderItem={({ item }) => <Miniatura hoja={item} ancho={ancho} portada={portada} tapas={tapas} fuentes={fuentes} onIr={onIr} />}
    />
  );
}

const Miniatura = memo(function Miniatura({
  hoja,
  ancho,
  portada,
  tapas,
  fuentes,
  onIr,
}: {
  hoja: Hoja;
  ancho: number;
  portada: PortadaDeJournal;
  tapas: { front?: { doc: DocumentoDeLienzo }; back?: { doc: DocumentoDeLienzo } };
  fuentes: FuentesDeMiniatura;
  onIr: (numero: number) => void;
}) {
  const tx = useT();
  const j = tx.library.journal;
  const nombre = hoja.tipo === 'front' ? j.faces.front : hoja.tipo === 'back' ? j.faces.back : j.pageN(hoja.numero - 1);
  const tapa = hoja.tipo === 'front' ? tapas.front : hoja.tipo === 'back' ? tapas.back : undefined;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={nombre} onPress={() => onIr(hoja.numero)} style={({ pressed }) => [styles.hoja, { width: ancho }, pressed ? styles.presionada : null]}>
      {hoja.lienzo ? (
        <CanvasPreview doc={hoja.lienzo.doc} orientacion={hoja.lienzo.orientation} ancho={ancho} fuentes={fuentes} />
      ) : (
        <View accessible={false}>
          <JournalCover portada={portada} cara={hoja.tipo === 'back' ? 'back' : 'front'} ancho={ancho} decoracion={tapa ? { doc: tapa.doc, fuentes } : null} />
        </View>
      )}
      <AppText variant="caption" color="textSecondary" numberOfLines={1}>
        {nombre}
      </AppText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  contenido: { padding: Spacing.lg, gap: Spacing.md, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  fila: { gap: Spacing.md },
  hoja: { gap: Spacing.xs },
  presionada: { opacity: 0.85 },
});
