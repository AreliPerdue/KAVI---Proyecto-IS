import { useRouter } from 'expo-router';
import { BookOpen, FlaskConical, Tag, Trash2, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, FlatList, type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { BulkCategorySheet } from '@/components/library/bulk-category-sheet';
import { CoverSheet } from '@/components/library/cover-sheet';
import { EditItemSheet } from '@/components/library/edit-item-sheet';
import { ImportSheet } from '@/components/library/import-sheet';
import { ItemSheet } from '@/components/library/item-sheet';
import { PdfCoverWorker } from '@/components/library/pdf-cover-worker';
import { LibraryCoverCard, LibraryRow } from '@/components/library/library-item';
import { ModalHeader } from '@/components/modal-header';
import { AppText, Banner, EmptyState, ErrorState, Fab, IconButton, LoadingState, Screen, Segmented } from '@/components/ui';
import { LIBRARY_WARN_RATIO } from '@/constants/library';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useLibraryItems, useLibraryUsage, useRemoveLibraryItems, useSetLibraryCategory } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';
import { uuidv4 } from '@/lib/gym/ids';
import { formatBytes } from '@/lib/library/files';
import type { LibroLeido } from '@/lib/library/import';
import { columnasPara, type LibraryView } from '@/lib/library/shelf';
import { useConfirm, useSnackbar } from '@/providers';
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
 *
 * Cada pieza (T281): tocar la abre; el ⋯ abre su menú (RF-BL16); mantener presionado empieza a
 * seleccionar (RF-BL15), y con varias elegidas se les cambia la categoría o se eliminan.
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
  const router = useRouter();
  const abrir = (id: string) => router.push({ pathname: '/(app)/book/[id]', params: { id } });
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const eliminar = useRemoveLibraryItems();
  const categorizar = useSetLibraryCategory();
  const m = l.item;
  const sel = l.selection;

  // Menú, edición y selección (T281).
  const [menuDe, setMenuDe] = useState<LibraryItem | null>(null);
  const [editando, setEditando] = useState<LibraryItem | null>(null);
  const [portadaDe, setPortadaDe] = useState<LibraryItem | null>(null);
  const [seleccion, setSeleccion] = useState<ReadonlySet<string>>(() => new Set());
  const [categoriaVarias, setCategoriaVarias] = useState(false);
  const seleccionando = seleccion.size > 0;
  const salirDeSeleccion = () => setSeleccion(new Set());
  const alternar = (id: string) =>
    setSeleccion((previa) => {
      const siguiente = new Set(previa);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  const seleccionadas = useMemo(() => (piezas.data ?? []).filter((p) => seleccion.has(p.id)), [piezas.data, seleccion]);

  // "Atrás" de Android sale de la selección en vez de salir de la Biblioteca.
  useEffect(() => {
    if (!seleccionando) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSeleccion(new Set());
      return true;
    });
    return () => sub.remove();
  }, [seleccionando]);

  const eliminarPiezas = async (lista: readonly LibraryItem[]) => {
    const una = lista.length === 1 ? lista[0] : null;
    const ok = await confirm({
      title: una ? m.deleteTitle(una.title) : sel.deleteTitle(lista.length),
      message: m.deleteMessage,
      confirmLabel: m.delete,
      destructive: true,
    });
    if (!ok) return;
    salirDeSeleccion();
    eliminar.mutate(
      lista.map((p) => p.id),
      {
        onSuccess: () => showSnackbar({ message: una ? m.deleted(una.title) : sel.deleted(lista.length) }),
        onError: () => showSnackbar({ message: sel.failed }),
      },
    );
  };

  const aplicarCategoria = (categoria: string | null) => {
    const ids = [...seleccion];
    setCategoriaVarias(false);
    salirDeSeleccion();
    categorizar.mutate(
      { ids, category: categoria },
      {
        onSuccess: () => showSnackbar({ message: categoria ? sel.categorized(categoria, ids.length) : sel.uncategorized(ids.length) }),
        onError: () => showSnackbar({ message: sel.failed }),
      },
    );
  };

  const propsDe = (item: LibraryItem) => ({
    item,
    seleccionando,
    elegida: seleccion.has(item.id),
    onPress: () => (seleccionando ? alternar(item.id) : abrir(item.id)),
    onLongPress: () => alternar(item.id),
    onMenu: () => setMenuDe(item),
  });

  // Importar (RF-BL11 – RF-BL14): elegir, leer y revisar. El + lleva directo al archivo; "Crear"
  // (cuadernos, diarios, álbumes) se suma a este botón en L5.
  const [leyendo, setLeyendo] = useState(false);
  const [errorImportar, setErrorImportar] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<{ id: string; libro: LibroLeido } | null>(null);
  const importar = async () => {
    if (leyendo) return;
    setErrorImportar(null);
    try {
      // El lector de PDF y EPUB pesa y solo hace falta al importar: se evalúa hasta aquí, así un
      // problema al cargarlo se queda en este botón y no tumba la pantalla.
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga perezosa
      const { elegirLibro, leerLibro } = require('@/lib/library/import') as typeof import('@/lib/library/import');
      const archivo = await elegirLibro();
      if (!archivo) return;
      setLeyendo(true);
      setPendiente({ id: uuidv4(), libro: await leerLibro(archivo) });
    } catch (e) {
      setErrorImportar(e instanceof Error ? e.message : String(e));
    } finally {
      setLeyendo(false);
    }
  };

  const encabezado = (
    <View style={styles.content}>
      {seleccionando ? (
        <View style={styles.barraSeleccion}>
          <IconButton label={sel.cancel} onPress={salirDeSeleccion}>
            <X size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
          <AppText variant="heading" tabular accessibilityLabel={sel.count(seleccion.size)} style={styles.flex}>
            {seleccion.size}
          </AppText>
          <IconButton label={sel.category} onPress={() => setCategoriaVarias(true)}>
            <Tag size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
          <IconButton label={sel.delete} onPress={() => eliminarPiezas(seleccionadas)}>
            <Trash2 size={IconSize.action} strokeWidth={IconStroke} color={theme.danger} />
          </IconButton>
        </View>
      ) : (
        <ModalHeader back title={l.title} />
      )}

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

      {leyendo ? <Banner message={l.reading} /> : null}
      {errorImportar ? <Banner tone="error" message={errorImportar} /> : null}

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
        // La selección cambia cómo se pinta cada pieza (palomita, marco): que la lista se entere.
        extraData={seleccion}
        keyExtractor={(p) => p.id}
        numColumns={columnas}
        ListHeaderComponent={encabezado}
        onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
        columnWrapperStyle={columnas > 1 ? styles.fila : undefined}
        contentContainerStyle={vista === 'covers' ? styles.rejilla : undefined}
        renderItem={({ item }) =>
          vista === 'covers' ? (
            ancho > 0 ? <LibraryCoverCard {...propsDe(item)} width={anchoPortada} /> : null
          ) : (
            <LibraryRow {...propsDe(item)} />
          )
        }
        showsVerticalScrollIndicator={false}
        // Que la última fila no quede bajo el +.
        ListFooterComponent={<View style={styles.pie} />}
      />
      {seleccionando ? null : <Fab label={l.importBook} onPress={importar} />}
      <ImportSheet pendiente={pendiente} onClose={() => setPendiente(null)} />
      <ItemSheet
        item={menuDe}
        onClose={() => setMenuDe(null)}
        onOpen={(p) => abrir(p.id)}
        onEdit={setEditando}
        onCover={setPortadaDe}
        onSelect={(p) => setSeleccion(new Set([p.id]))}
        onDelete={(p) => eliminarPiezas([p])}
      />
      <EditItemSheet item={editando} onClose={() => setEditando(null)} />
      <CoverSheet item={portadaDe} onClose={() => setPortadaDe(null)} />
      <BulkCategorySheet count={seleccion.size} visible={categoriaVarias} onClose={() => setCategoriaVarias(false)} onApply={aplicarCategoria} />
      {hayPiezas ? <PdfCoverWorker items={piezas.data} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.md, paddingBottom: Spacing.lg },
  rejilla: { gap: Spacing.xl },
  pie: { height: 88 },
  fila: { gap: Spacing.lg },
  flex: { flex: 1, gap: 2 },
  barraSeleccion: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: Spacing.xs },
  aviso: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous' },
  espacio: { gap: Spacing.xs },
  espacioFila: { flexDirection: 'row', justifyContent: 'space-between' },
  barra: { height: 6, borderRadius: Radius.full, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: Radius.full },
});
