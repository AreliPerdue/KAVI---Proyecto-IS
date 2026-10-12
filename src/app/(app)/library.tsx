import { BookOpen, FlaskConical } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { LibraryCoverCard, LibraryRow } from '@/components/library/library-item';
import { ModalHeader } from '@/components/modal-header';
import { AppText, EmptyState, ErrorState, LoadingState, Screen, Segmented } from '@/components/ui';
import { LIBRARY_WARN_RATIO } from '@/constants/library';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useLibraryItems, useLibraryUsage } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';
import { formatBytes } from '@/lib/library/files';
import { columnasPara, type LibraryView } from '@/lib/library/shelf';
import { usePreferencesStore } from '@/store/preferences-store';
import type { LibraryItem } from '@/types/domain';

/**
 * KAVI Library, laboratorio (spec 13 §4, T276).
 *
 * Mientras se construye por etapas, Library no está en Más ni en la barra: se llega desde
 * Perfil → En desarrollo. Esta pantalla crece con cada etapa y en L7 pasa a ser el módulo visible.
 *
 * La librería (spec 13a, T277): portadas en rejilla o lista, y la vista elegida se recuerda en el
 * dispositivo (RF-BL4). La rejilla y la lista son un solo `FlatList` (NFR-3) con el encabezado
 * dentro, para que todo se desplace junto.
 */
export default function LibraryScreen() {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const l = tx.library;
  const piezas = useLibraryItems();
  const espacio = useLibraryUsage();

  const usado = espacio.data?.usedBytes ?? 0;
  const tope = espacio.data?.limitBytes ?? 1;
  const proporcion = Math.min(1, usado / tope);
  const casiLlena = proporcion >= LIBRARY_WARN_RATIO;

  const vista = usePreferencesStore((s) => s.libraryView);
  const setVista = usePreferencesStore((s) => s.setLibraryView);
  const [ancho, setAncho] = useState(0);
  const columnas = vista === 'covers' ? columnasPara(ancho) : 1;
  const anchoPortada = columnas > 1 ? Math.floor((ancho - Spacing.lg * (columnas - 1)) / columnas) : 0;
  const hayPiezas = piezas.isSuccess && piezas.data.length > 0;

  const encabezado = (
    <View style={styles.content}>
      <ModalHeader back title={l.title} />

      <View style={[styles.aviso, { backgroundColor: theme.surfaceAlt }]}>
        <FlaskConical size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        <View style={styles.flex}>
          <AppText variant="label">{l.inDevelopment}</AppText>
          <AppText variant="caption" color="textSecondary">
            {l.devHint}
          </AppText>
        </View>
      </View>

      {espacio.data ? (
        <View
          style={styles.espacio}
          accessible
          accessibilityLabel={l.usageA11y(formatBytes(usado, lang), formatBytes(tope, lang), Math.round(proporcion * 100))}>
          <View style={styles.espacioFila}>
            <AppText variant="caption" color="textSecondary">
              {piezas.data ? l.pieces(piezas.data.length) : ''}
            </AppText>
            <AppText variant="caption" color={casiLlena ? 'today' : 'textSecondary'} tabular>
              {l.usage(formatBytes(usado, lang), formatBytes(tope, lang))}
            </AppText>
          </View>
          <View style={[styles.barra, { backgroundColor: theme.surfaceAlt }]}>
            <View style={[styles.relleno, { width: `${proporcion * 100}%`, backgroundColor: casiLlena ? theme.today : theme.ink }]} />
          </View>
          {casiLlena ? (
            <AppText variant="caption" color="today">
              {l.usageAlmostFull}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {hayPiezas ? (
        <Segmented<LibraryView>
          fullWidth
          label={l.viewLabel}
          options={[
            { value: 'covers', label: l.viewCovers },
            { value: 'list', label: l.viewList },
          ]}
          value={vista}
          onChange={setVista}
        />
      ) : null}

      {piezas.isPending ? <LoadingState /> : null}
      {piezas.isError ? <ErrorState message={piezas.error.message} onRetry={() => piezas.refetch()} /> : null}
      {piezas.isSuccess && piezas.data.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={32} strokeWidth={IconStroke} color={theme.textTertiary} />}
          title={l.emptyTitle}
          description={l.emptyDescription}
        />
      ) : null}
    </View>
  );

  return (
    <Screen>
      <FlatList<LibraryItem>
        // Cambiar el número de columnas pide montar la lista de nuevo.
        key={`${vista}-${columnas}`}
        testID="library-list"
        data={hayPiezas ? piezas.data : []}
        keyExtractor={(p) => p.id}
        numColumns={columnas}
        ListHeaderComponent={encabezado}
        onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
        columnWrapperStyle={columnas > 1 ? styles.fila : undefined}
        contentContainerStyle={vista === 'covers' ? styles.rejilla : undefined}
        renderItem={({ item }) =>
          vista === 'covers' ? (ancho > 0 ? <LibraryCoverCard item={item} width={anchoPortada} /> : null) : <LibraryRow item={item} />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.md, paddingBottom: Spacing.lg },
  rejilla: { gap: Spacing.xl },
  fila: { gap: Spacing.lg },
  flex: { flex: 1, gap: 2 },
  aviso: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous' },
  espacio: { gap: Spacing.xs },
  espacioFila: { flexDirection: 'row', justifyContent: 'space-between' },
  barra: { height: 6, borderRadius: Radius.full, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: Radius.full },
});
