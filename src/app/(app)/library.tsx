import { useRouter } from 'expo-router';
import { BookOpen, ChevronLeft, FolderMinus, FolderPlus, FlaskConical, Library, Search, SlidersHorizontal, Tag, Trash2, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, FlatList, type LayoutChangeEvent, StyleSheet, TextInput, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { ActiveFilters } from '@/components/library/active-filters';
import { BulkCategorySheet } from '@/components/library/bulk-category-sheet';
import { CoverSheet } from '@/components/library/cover-sheet';
import { DetailsSheet } from '@/components/library/details-sheet';
import { EditItemSheet } from '@/components/library/edit-item-sheet';
import { ImportSheet } from '@/components/library/import-sheet';
import { LibraryHeader } from '@/components/library/library-header';
import { ItemSheet } from '@/components/library/item-sheet';
import { PdfCoverWorker } from '@/components/library/pdf-cover-worker';
import { ShelfEditSheet } from '@/components/library/shelf-edit-sheet';
import { ShelfTabs } from '@/components/library/shelf-tabs';
import { BulkSeriesSheet } from '@/components/library/bulk-series-sheet';
import { SeriesStackCard, SeriesStackRow } from '@/components/library/series-stack';
import { LibrarySpine, SeriesSpines } from '@/components/library/book-spine';
import { Repisa, SpinePreviewSheet } from '@/components/library/bookshelf';
import { AddToShelfSheet, ShelvesManageSheet } from '@/components/library/shelves-sheets';
import { SortFilterSheet } from '@/components/library/sort-filter-sheet';
import { arrastreReciente } from '@/components/lists/drag-guard';
import { DraggableGrid } from '@/components/lists/draggable-grid';
import { DraggableRows } from '@/components/lists/draggable-rows';
import { LibraryCoverCard, LibraryRow } from '@/components/library/library-item';
import { AppText, Banner, EmptyState, ErrorState, Fab, IconButton, LoadingState, Screen, Segmented } from '@/components/ui';
import { LIBRARY_WARN_RATIO } from '@/constants/library';
import { Fonts, IconSize, IconStroke, Motion, Radius, Spacing, Typography } from '@/constants/theme';
import {
  useLibraryItems,
  useLibraryUsage,
  useRemoveLibraryItems,
  useSetLibraryCategory,
  useShelfItems,
  useShelfMutations,
  useAssignSeries,
  useSeries,
  useShelves,
  useUpdateLibraryItem,
} from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';
import { uuidv4 } from '@/lib/gym/ids';
import { formatBytes } from '@/lib/library/files';
import type { LibroLeido } from '@/lib/library/import';
import { cuantosFiltros, type FiltrosBiblioteca, opcionesDeFiltro, ordenEntre, piezasVisibles, SIN_FILTROS } from '@/lib/library/filters';
import { agruparSagas, type EntradaDeLibreria, etiquetaDeSaga, porNumero } from '@/lib/library/series';
import { columnasPara, type LibraryView } from '@/lib/library/shelf';
import { anchoDeSaga, medidaDeLomo, repartirEnRepisas } from '@/lib/library/spines';
import { useConfirm, useSnackbar } from '@/providers';
import { usePreferencesStore } from '@/store/preferences-store';
import { useSpineRatiosStore } from '@/store/spine-ratios-store';
import type { LibraryItem, LibraryShelf } from '@/types/domain';

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
 *
 * El librero (T282, RF-BL2): las mismas entradas, de lomo y repartidas en repisas según el ancho; tocar
 * un lomo lo saca y muestra su portada antes de abrirlo. Ahí no se arrastra: se acomoda en Portadas o Lista
 * y el librero sigue ese orden.
 *
 * Organizar (T280): libreros como pestañas (RF-BL5 – RF-BL7), buscador (RF-BL18), orden recordado y
 * filtros combinables con sus chips (RF-BL8, RF-BL10). Dentro de un librero, "Como los acomodé" deja
 * reordenar arrastrando, con la misma rejilla que Listas.
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
  // La rejilla que se arrastra deja su propio espacio entre celdas (el de Listas).
  const anchoPortadaRejilla = columnas > 1 ? Math.floor((ancho - Spacing.sm * (columnas - 1)) / columnas) : 0;
  const hayPiezas = piezas.isSuccess && piezas.data.length > 0;
  const router = useRouter();
  const abrir = (id: string) => router.push({ pathname: '/(app)/book/[id]', params: { id } });
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const eliminar = useRemoveLibraryItems();
  const categorizar = useSetLibraryCategory();
  const actualizar = useUpdateLibraryItem();
  const m = l.item;
  const sel = l.selection;
  const sh = l.shelves;
  const f = l.find;

  // Organizar (T280).
  const libreros = useShelves();
  const enLibreros = useShelfItems();
  const librerosMut = useShelfMutations();
  const orden = usePreferencesStore((s) => s.libraryOrder);
  const setOrden = usePreferencesStore((s) => s.setLibraryOrder);
  const [libreroId, setLibreroId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState<FiltrosBiblioteca>(SIN_FILTROS);
  const [filtrando, setFiltrando] = useState(false);
  const [libreroEditando, setLibreroEditando] = useState<LibraryShelf | 'nuevo' | null>(null);
  const [administrando, setAdministrando] = useState(false);
  const [agregandoA, setAgregandoA] = useState<readonly string[] | null>(null);
  // Al crear un librero desde "Agregar a librero", los libros que se estaban agregando entran en él.
  const [agregarAlCrear, setAgregarAlCrear] = useState<readonly string[] | null>(null);

  // Sagas (T315).
  const sagasConsulta = useSeries();
  const asignarSaga = useAssignSeries();
  const sagas = useMemo(() => sagasConsulta.data ?? [], [sagasConsulta.data]);
  const nombresDeSagas = useMemo(() => new Map(sagas.map((x) => [x.id, x.name])), [sagas]);
  const vistaSagas = usePreferencesStore((s) => s.librarySeriesView);
  const setVistaSagas = usePreferencesStore((s) => s.setLibrarySeriesView);
  const altoDeLomos = usePreferencesStore((s) => s.librarySpineHeights);
  const setAltoDeLomos = usePreferencesStore((s) => s.setLibrarySpineHeights);
  const proporciones = useSpineRatiosStore((s) => s.porRuta);
  const [sagaAbiertaId, setSagaAbiertaId] = useState<string | null>(null);
  const [sagaVarias, setSagaVarias] = useState(false);

  const listaLibreros = useMemo(() => libreros.data ?? [], [libreros.data]);
  const libreroActual = listaLibreros.find((x) => x.id === libreroId) ?? null;
  const enLibrerosDatos = useMemo(() => enLibreros.data ?? [], [enLibreros.data]);
  const sagaAbierta = sagas.find((x) => x.id === sagaAbiertaId) ?? null;
  const visibles = useMemo(() => {
    const lista = piezasVisibles(piezas.data ?? [], { busqueda, orden, filtros, libreroId: libreroActual?.id ?? null, enLibreros: enLibrerosDatos, nombresDeSagas });
    // Una saga abierta muestra solo sus libros, siempre por número (RF-BL25).
    return sagaAbierta ? lista.filter((p) => p.series_id === sagaAbierta.id).sort(porNumero) : lista;
  }, [piezas.data, busqueda, orden, filtros, libreroActual, enLibrerosDatos, nombresDeSagas, sagaAbierta]);
  // Apiladas: cada saga es una pila en el lugar de su primer libro (RF-BL25).
  const apilando = vistaSagas === 'stacked' && !sagaAbierta;
  const entradas: EntradaDeLibreria[] = useMemo(
    () => (apilando ? agruparSagas(visibles, sagas) : visibles.map((pieza) => ({ tipo: 'pieza' as const, pieza }))),
    [apilando, visibles, sagas],
  );
  // El librero (RF-BL2): las mismas entradas, de lomo, en las repisas que quepan en el ancho.
  const repisas: RepisaDelLibrero[] = useMemo(() => {
    if (vista !== 'shelf' || ancho === 0) return [];
    // Cada lomo con su ancho de verdad (el de su imagen, si ya se conoce), para que la repisa no se pase.
    const lomo = (p: LibraryItem) => medidaDeLomo(p, altoDeLomos, proporciones).ancho;
    const anchoDe = (e: EntradaDeLibreria) => (e.tipo === 'saga' ? anchoDeSaga(e.piezas.map(lomo)) : lomo(e.pieza));
    return repartirEnRepisas(entradas, anchoDe, ancho - Spacing.xs * 2).map((fila, i) => ({ tipo: 'repisa' as const, numero: i + 1, entradas: fila }));
  }, [vista, ancho, entradas, altoDeLomos, proporciones]);
  // Tocar un lomo primero lo sube y, ya afuera, se abre su portada; con movimiento reducido, de una vez.
  const [sacada, setSacada] = useState<LibraryItem | null>(null);
  const [sacandoId, setSacandoId] = useState<string | null>(null);
  const sinMovimiento = useReducedMotion();
  const sacar = (pieza: LibraryItem) => {
    setSacandoId(pieza.id);
    if (sinMovimiento) setSacada(pieza);
    else setTimeout(() => setSacada(pieza), Motion.base + 80);
  };
  const devolver = () => {
    setSacada(null);
    setSacandoId(null);
  };
  const opciones = useMemo(() => opcionesDeFiltro(piezas.data ?? []), [piezas.data]);
  const membresia = useMemo(() => {
    const mapa = new Map<string, Set<string>>();
    for (const e of enLibrerosDatos) mapa.set(e.item_id, (mapa.get(e.item_id) ?? new Set()).add(e.shelf_id));
    return mapa;
  }, [enLibrerosDatos]);
  const cuentas = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const e of enLibrerosDatos) mapa.set(e.shelf_id, (mapa.get(e.shelf_id) ?? 0) + 1);
    return mapa;
  }, [enLibrerosDatos]);
  const nFiltros = cuantosFiltros(filtros);

  const guardarLibrero = (datos: { name: string; color: string; icon: string }) => {
    if (libreroEditando && libreroEditando !== 'nuevo') {
      librerosMut.editar.mutate({ id: libreroEditando.id, datos });
      return;
    }
    const pendientes = agregarAlCrear;
    setAgregarAlCrear(null);
    librerosMut.crear.mutate(datos, {
      onSuccess: (nuevo) => {
        if (pendientes?.length) {
          librerosMut.agregar.mutate({ shelfId: nuevo.id, itemIds: pendientes });
          showSnackbar({ message: sh.added(nuevo.name, pendientes.length) });
        } else setLibreroId(nuevo.id);
      },
    });
  };

  const eliminarLibrero = async (librero: LibraryShelf) => {
    const ok = await confirm({ title: sh.deleteTitle(librero.name), message: sh.deleteMessage, confirmLabel: sh.delete, destructive: true });
    if (!ok) return;
    if (libreroId === librero.id) setLibreroId(null);
    librerosMut.borrar.mutate(librero.id);
  };

  const alternarEnLibrero = (librero: LibraryShelf, agregar: boolean) => {
    const ids = agregandoA ?? [];
    if (ids.length === 1 && !agregar) {
      librerosMut.quitar.mutate({ shelfId: librero.id, itemIds: ids });
      showSnackbar({ message: sh.removed(librero.name, 1) });
      return;
    }
    librerosMut.agregar.mutate({ shelfId: librero.id, itemIds: ids });
    showSnackbar({ message: sh.added(librero.name, ids.length) });
    // Con varios, elegir un librero termina la acción; con uno se pueden marcar varios libreros.
    if (ids.length > 1) {
      setAgregandoA(null);
      salirDeSeleccion();
    }
  };

  const quitarDelLibrero = (ids: readonly string[]) => {
    if (!libreroActual) return;
    librerosMut.quitar.mutate({ shelfId: libreroActual.id, itemIds: ids });
    showSnackbar({ message: sh.removed(libreroActual.name, ids.length) });
    salirDeSeleccion();
  };

  /**
   * Mover una pieza (RF-BL7): toma el punto medio entre sus nuevos vecinos, así solo se escribe una
   * fila. En un librero cambia su lugar en ese librero; en Todos, su lugar en la librería.
   */
  const acomodar = (from: number, to: number) => {
    if (from === to) return;
    const movida = visibles[from];
    const sin = visibles.filter((_, i) => i !== from);
    const antes = sin[to - 1];
    const despues = sin[to];
    if (libreroActual) {
      const ordenDe = (id: string) => Number(enLibrerosDatos.find((e) => e.shelf_id === libreroActual.id && e.item_id === id)?.sort_order ?? 0);
      librerosMut.mover.mutate({
        shelfId: libreroActual.id,
        itemId: movida.id,
        orden: ordenEntre(antes ? ordenDe(antes.id) : undefined, despues ? ordenDe(despues.id) : undefined),
      });
      return;
    }
    actualizar.mutate({ id: movida.id, patch: { sort_order: ordenEntre(antes?.sort_order, despues?.sort_order) } });
  };

  // Menú, edición y selección (T281).
  const [menuDe, setMenuDe] = useState<LibraryItem | null>(null);
  const [editando, setEditando] = useState<LibraryItem | null>(null);
  const [portadaDe, setPortadaDe] = useState<LibraryItem | null>(null);
  const [detallesDe, setDetallesDe] = useState<LibraryItem | null>(null);
  const [seleccion, setSeleccion] = useState<ReadonlySet<string>>(() => new Set());
  const [categoriaVarias, setCategoriaVarias] = useState(false);
  const seleccionando = seleccion.size > 0;
  // Arrastrar para acomodar (RF-BL7): en "Como los acomodé" y viendo todo —sin búsqueda ni filtros, que
  // esconderían a los vecinos—, en Todos o en un librero.
  // Con las sagas apiladas o una saga abierta (que va por número) no se arrastra: las pilas no tienen un
  // solo lugar.
  // En el librero tampoco: los lomos se acomodan en Portadas o Lista y el librero sigue ese orden.
  const acomodando = orden === 'manual' && !busqueda.trim() && nFiltros === 0 && !seleccionando && !apilando && !sagaAbierta && vista !== 'shelf';
  const salirDeSeleccion = () => setSeleccion(new Set());
  const alternar = (id: string) =>
    setSeleccion((previa) => {
      const siguiente = new Set(previa);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  const seleccionadas = useMemo(() => (piezas.data ?? []).filter((p) => seleccion.has(p.id)), [piezas.data, seleccion]);

  // "Atrás" de Android cierra la saga abierta antes de salir de la Biblioteca.
  useEffect(() => {
    if (!sagaAbiertaId) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSagaAbiertaId(null);
      return true;
    });
    return () => sub.remove();
  }, [sagaAbiertaId]);

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
    onPress: () => {
      // Soltar una pieza que se acaba de arrastrar no debe abrirla.
      if (arrastreReciente()) return;
      if (seleccionando) alternar(item.id);
      else abrir(item.id);
    },
    onLongPress: () => alternar(item.id),
    onMenu: () => setMenuDe(item),
    // En la vista suelta, cada libro de una saga dice cuál es (RF-BL25).
    etiquetaSaga: item.series_id && nombresDeSagas.has(item.series_id) ? etiquetaDeSaga(nombresDeSagas.get(item.series_id) as string, item.series_index) : undefined,
  });

  const propsDePila = (entrada: Extract<EntradaDeLibreria, { tipo: 'saga' }>) => ({
    saga: entrada.saga,
    piezas: entrada.piezas,
    onPress: () => (seleccionando ? entrada.piezas.forEach((p) => alternar(p.id)) : setSagaAbiertaId(entrada.saga.id)),
    // Mantener presionada una pila elige todos sus libros.
    onLongPress: () => setSeleccion((previa) => new Set([...previa, ...entrada.piezas.map((p) => p.id)])),
  });

  /** Poner en saga a los elegidos, numerados en el orden en que se eligieron si se pidió. */
  const ponerEnSaga = (nombre: string, numerar: boolean) => {
    const ids = [...seleccion];
    setSagaVarias(false);
    salirDeSeleccion();
    asignarSaga.mutate(
      { nombre, asignar: ids.map((id, i) => (numerar ? { id, numero: i + 1 } : { id })) },
      {
        onSuccess: () => showSnackbar({ message: l.series.put_done(nombre, ids.length) }),
        onError: () => showSnackbar({ message: sel.failed }),
      },
    );
  };

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
          <IconButton label={sh.addTo} onPress={() => setAgregandoA([...seleccion])}>
            <FolderPlus size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
          {libreroActual ? (
            <IconButton label={sh.removeFrom(libreroActual.name)} onPress={() => quitarDelLibrero([...seleccion])}>
              <FolderMinus size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
            </IconButton>
          ) : null}
          <IconButton label={l.series.put} onPress={() => setSagaVarias(true)}>
            <Library size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
          <IconButton label={sel.category} onPress={() => setCategoriaVarias(true)}>
            <Tag size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
          <IconButton label={sel.delete} onPress={() => eliminarPiezas(seleccionadas)}>
            <Trash2 size={IconSize.action} strokeWidth={IconStroke} color={theme.danger} />
          </IconButton>
        </View>
      ) : (
        <LibraryHeader />
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

      {hayPiezas ? (
        <>
          <ShelfTabs
            shelves={listaLibreros}
            value={libreroActual?.id ?? null}
            onChange={setLibreroId}
            onNew={() => setLibreroEditando('nuevo')}
            onManage={() => setAdministrando(true)}
          />
          <View style={styles.buscar}>
            <View style={[styles.campo, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Search size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
              <TextInput
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder={f.searchPlaceholder}
                placeholderTextColor={theme.textTertiary}
                accessibilityLabel={f.search}
                returnKeyType="search"
                style={[styles.entrada, { color: theme.text }]}
              />
              {busqueda ? (
                <IconButton label={f.clearSearch} onPress={() => setBusqueda('')}>
                  <X size={16} strokeWidth={IconStroke} color={theme.textSecondary} />
                </IconButton>
              ) : null}
            </View>
            <View>
              <IconButton label={f.filterCount(nFiltros)} onPress={() => setFiltrando(true)}>
                <SlidersHorizontal size={IconSize.action} strokeWidth={IconStroke} color={nFiltros ? theme.today : theme.text} />
              </IconButton>
              {nFiltros ? (
                <View pointerEvents="none" style={[styles.insignia, { backgroundColor: theme.today }]}>
                  <AppText variant="caption" style={{ color: theme.onInk }} tabular>
                    {nFiltros}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
          <ActiveFilters filtros={filtros} onChange={setFiltros} nombresDeSagas={nombresDeSagas} />
          {sagaAbierta ? (
            <View style={styles.sagaAbierta}>
              <IconButton label={l.series.back} onPress={() => setSagaAbiertaId(null)}>
                <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
              </IconButton>
              <View style={styles.flex}>
                <AppText variant="heading" numberOfLines={1}>
                  {sagaAbierta.name}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {l.series.stackCount(visibles.length)}
                </AppText>
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      {leyendo ? <Banner message={l.reading} /> : null}
      {errorImportar ? <Banner tone="error" message={errorImportar} /> : null}

      {hayPiezas ? (
        <Segmented<LibraryView>
          fullWidth
          label={l.viewLabel}
          options={[
            { value: 'covers', label: l.viewCovers },
            { value: 'shelf', label: l.viewShelf },
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
      {hayPiezas && visibles.length === 0 ? (
        <AppText variant="body" color="textSecondary" style={styles.vacio}>
          {busqueda.trim() || nFiltros ? f.noResults : sh.empty}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <FlatList<EntradaDeLibreria | RepisaDelLibrero>
        // Cambiar el número de columnas pide montar la lista de nuevo.
        key={`${vista}-${columnas}`}
        testID="library-list"
        // Acomodando dentro de un librero, las piezas van en la rejilla que se arrastra (abajo).
        data={!hayPiezas || acomodando ? [] : vista === 'shelf' ? repisas : entradas}
        // La selección cambia cómo se pinta cada pieza (palomita, marco): que la lista se entere.
        extraData={[seleccion, sacandoId]}
        keyExtractor={(e) => (e.tipo === 'repisa' ? `repisa-${e.numero}` : e.tipo === 'saga' ? `saga-${e.saga.id}` : e.pieza.id)}
        numColumns={columnas}
        ListHeaderComponent={encabezado}
        onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
        columnWrapperStyle={columnas > 1 ? styles.fila : undefined}
        contentContainerStyle={vista === 'covers' ? styles.rejilla : undefined}
        renderItem={({ item: e }) => {
          if (vista === 'covers' && ancho === 0) return null;
          if (e.tipo === 'repisa') {
            return (
              <Repisa numero={e.numero}>
                {e.entradas.map((x) =>
                  x.tipo === 'saga' ? (
                    <SeriesSpines key={`saga-${x.saga.id}`} {...propsDePila(x)} />
                  ) : (
                    <LibrarySpine
                      key={x.pieza.id}
                      {...propsDe(x.pieza)}
                      sacado={sacandoId === x.pieza.id}
                      onPress={() => {
                        if (seleccionando) alternar(x.pieza.id);
                        else if (!sacandoId) sacar(x.pieza);
                      }}
                    />
                  ),
                )}
              </Repisa>
            );
          }
          if (e.tipo === 'saga') return vista === 'covers' ? <SeriesStackCard {...propsDePila(e)} width={anchoPortada} /> : <SeriesStackRow {...propsDePila(e)} />;
          return vista === 'covers' ? <LibraryCoverCard {...propsDe(e.pieza)} width={anchoPortada} /> : <LibraryRow {...propsDe(e.pieza)} />;
        }}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <>
            {acomodando && visibles.length > 0 ? (
              vista === 'covers' ? (
                <DraggableGrid
                  items={visibles}
                  columns={columnas}
                  keyOf={(p) => p.id}
                  onReorder={acomodar}
                  onHold={(p) => alternar(p.id)}
                  renderItem={(p) => <LibraryCoverCard {...propsDe(p)} onLongPress={undefined} width={anchoPortadaRejilla} />}
                />
              ) : (
                <DraggableRows items={visibles} keyOf={(p) => p.id} onReorder={acomodar} onHold={(p) => alternar(p.id)} renderItem={(p) => <LibraryRow {...propsDe(p)} onLongPress={undefined} />} />
              )
            ) : null}
            {/* Que la última fila no quede bajo el +. */}
            <View style={styles.pie} />
          </>
        }
      />
      {seleccionando ? null : <Fab label={l.importBook} onPress={importar} />}
      <ImportSheet pendiente={pendiente} onClose={() => setPendiente(null)} />
      <ItemSheet
        item={menuDe}
        onClose={() => setMenuDe(null)}
        onOpen={(p) => abrir(p.id)}
        onEdit={setEditando}
        onDetails={setDetallesDe}
        onCover={setPortadaDe}
        onAddToShelf={(p) => setAgregandoA([p.id])}
        shelfName={libreroActual?.name}
        onRemoveFromShelf={libreroActual ? (p) => quitarDelLibrero([p.id]) : undefined}
        onSelect={(p) => setSeleccion(new Set([p.id]))}
        onDelete={(p) => eliminarPiezas([p])}
      />
      <SpinePreviewSheet
        item={sacada}
        onClose={devolver}
        onRead={(p) => {
          devolver();
          abrir(p.id);
        }}
        onMenu={(p) => {
          devolver();
          setMenuDe(p);
        }}
      />
      <EditItemSheet item={editando} onClose={() => setEditando(null)} />
      <DetailsSheet
        item={detallesDe}
        items={piezas.data ?? []}
        sagas={sagas}
        libreros={listaLibreros}
        membresia={membresia}
        onClose={() => setDetallesDe(null)}
        onShow={setDetallesDe}
        onRead={(p) => {
          setDetallesDe(null);
          abrir(p.id);
        }}
      />
      <CoverSheet item={portadaDe} onClose={() => setPortadaDe(null)} />
      <BulkSeriesSheet count={seleccion.size} visible={sagaVarias} onClose={() => setSagaVarias(false)} onApply={ponerEnSaga} />
      <BulkCategorySheet count={seleccion.size} visible={categoriaVarias} onClose={() => setCategoriaVarias(false)} onApply={aplicarCategoria} />
      <AddToShelfSheet
        itemIds={agregandoA}
        shelves={listaLibreros}
        membership={membresia}
        onClose={() => setAgregandoA(null)}
        onToggle={alternarEnLibrero}
        onNew={() => {
          setAgregarAlCrear(agregandoA);
          setLibreroEditando('nuevo');
        }}
      />
      <ShelfEditSheet
        shelf={libreroEditando}
        onClose={() => {
          setLibreroEditando(null);
        }}
        onSave={guardarLibrero}
        onDelete={eliminarLibrero}
      />
      <ShelvesManageSheet
        visible={administrando}
        shelves={listaLibreros}
        counts={cuentas}
        onClose={() => setAdministrando(false)}
        onReorder={(ids) => librerosMut.reordenar.mutate(ids)}
        onEdit={setLibreroEditando}
      />
      <SortFilterSheet
        visible={filtrando}
        onClose={() => setFiltrando(false)}
        orden={orden}
        onOrden={setOrden}
        filtros={filtros}
        onFiltros={setFiltros}
        opciones={opciones}
        enLibrero={!!libreroActual}
        sagas={sagas}
        vistaSagas={vistaSagas}
        onVistaSagas={setVistaSagas}
        altoDeLomos={altoDeLomos}
        onAltoDeLomos={setAltoDeLomos}
      />
      {hayPiezas ? <PdfCoverWorker items={piezas.data} /> : null}
    </Screen>
  );
}

/** Una repisa del librero con sus entradas (libros o sagas apiladas). */
type RepisaDelLibrero = { tipo: 'repisa'; numero: number; entradas: EntradaDeLibreria[] };

const styles = StyleSheet.create({
  content: { gap: Spacing.md, paddingBottom: Spacing.lg },
  rejilla: { gap: Spacing.xl },
  pie: { height: 88 },
  fila: { gap: Spacing.lg },
  flex: { flex: 1, gap: 2 },
  barraSeleccion: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: Spacing.xs },
  buscar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  sagaAbierta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  campo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: Spacing.md,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  entrada: { flex: 1, minWidth: 0, ...Typography.body, fontFamily: Fonts?.sans, paddingVertical: Spacing.sm },
  insignia: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  vacio: { textAlign: 'center', paddingVertical: Spacing.xl },
  aviso: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous' },
  espacio: { gap: Spacing.xs },
  espacioFila: { flexDirection: 'row', justifyContent: 'space-between' },
  barra: { height: 6, borderRadius: Radius.full, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: Radius.full },
});
