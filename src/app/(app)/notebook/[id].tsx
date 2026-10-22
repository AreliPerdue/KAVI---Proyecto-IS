import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, IdCard, MoreHorizontal, Plus, Scissors, Trash2 } from 'lucide-react-native';
import { memo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CanvasPreview, type FuentesDeMiniatura } from '@/components/library/canvas-preview';
import { NewCanvasSheet } from '@/components/library/new-canvas-sheet';
import { ActionRow, AppText, Button, ErrorState, IconButton, LoadingState, Sheet } from '@/components/ui';
import { stickerPorId } from '@/constants/stickers';
import { IconSize, IconStroke, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useLibraryImageUrls } from '@/hooks/use-annotations';
import { useCanvases, useCreateCanvas, useRemoveCanvas } from '@/hooks/use-canvases';
import { useClips } from '@/hooks/use-clips';
import { useLibraryItem, useLibraryItems } from '@/hooks/use-library';
import { useStickerPacks, useStickerSources } from '@/hooks/use-sticker-packs';
import { useTheme } from '@/hooks/use-theme';
import { useUserStickerImages, useUserStickers, useUserStickerSources } from '@/hooks/use-user-stickers';
import { useT } from '@/i18n';
import { uuidv4 } from '@/lib/gym/ids';
import { type LibroEnLienzo, rutasDeImagenes } from '@/lib/library/canvas';
import { usarPlantilla } from '@/lib/library/canvas-templates';
import { colorDePortada, rutaDePortada } from '@/lib/library/shelf';
import { fuenteDeSticker } from '@/lib/library/sticker-packs';
import { useConfirm, useSnackbar } from '@/providers';
import type { LibraryCanvas } from '@/types/domain';

/**
 * Mi libreta de un libro (spec 13h, RF-CC23; T342): lo personal de esa lectura junto. Los **recortes** con su
 * miniatura (tocar uno lo abre; su ⋯ lo borra) y "Nuevo recorte", que pregunta la forma de la página; abajo, los
 * **fragmentos** del libro y sus **fichas**, que viven en sus propias pantallas.
 */
export default function NotebookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const tx = useT();
  const n = tx.library.notebook;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const libro = useLibraryItem(id);
  const piezas = useLibraryItems();
  const recortes = useCanvases(id);
  const crear = useCreateCanvas();
  const borrar = useRemoveCanvas();
  const confirmar = useConfirm();
  const avisar = useSnackbar();
  const clips = useClips();
  const [creando, setCreando] = useState(false);
  const [menuDe, setMenuDe] = useState<LibraryCanvas | null>(null);

  const lista = recortes.data ?? [];
  const deEsteLibro = (clips.data ?? []).filter((c) => c.item_id === id).length;
  const columnas = Math.min(MaxContentWidth, width) >= 900 ? 4 : Math.min(MaxContentWidth, width) >= 600 ? 3 : 2;
  const anchoMiniatura = Math.floor((Math.min(MaxContentWidth, width) - Spacing.lg * 2 - Spacing.md * (columnas - 1)) / columnas);

  // Lo que hace falta para ver las imágenes y stickers de todas las miniaturas, de una vez.
  const elementos = lista.flatMap((c) => c.doc.elements);
  // Los libros puestos en los recortes (T343): su título, color y portada.
  const claveIdsDeLibros = [...new Set(elementos.flatMap((e) => (e.type === 'book' && e.content.itemId ? [e.content.itemId] : [])))].sort().join('|');
  // El React Compiler memoriza estas listas y `fuentes`: las miniaturas no se rehacen si nada cambió.
  const idsDeLibros = new Set(claveIdsDeLibros ? claveIdsDeLibros.split('|') : []);
  const librosPuestos = (piezas.data ?? []).filter((p) => idsDeLibros.has(p.id));
  const urls = useLibraryImageUrls([...rutasDeImagenes(elementos), ...librosPuestos.flatMap((p) => (rutaDePortada(p) ? [rutaDePortada(p) as string] : []))]);
  const stickers = elementos.flatMap((e) => (e.type === 'sticker' && e.content.sticker ? [e.content.sticker] : []));
  const claveStickers = [...new Set(stickers)].sort().join('|');
  const packs = useStickerPacks();
  const losPacks = packs.data?.packs;
  const misStickers = useUserStickers();
  const imagenesPropias = useUserStickerImages(misStickers.data);
  const propias = useUserStickerSources(stickers, imagenesPropias);
  const tienda = useStickerSources(
    stickers.filter((s) => !s.startsWith('nobi-pink/')),
    packs.data?.packs,
  );
  const fuentes: FuentesDeMiniatura = (() => {
    const deStickers = new Map<string, string | number | { uri: string }>();
    for (const s of claveStickers ? claveStickers.split('|') : []) {
      const incluido = stickerPorId(s);
      const src = incluido ? incluido.imagen : fuenteDeSticker(s, tienda, losPacks, propias);
      if (src) deStickers.set(s, src as string);
    }
    const libros = new Map<string, LibroEnLienzo>();
    for (const p of librosPuestos) {
      const ruta = rutaDePortada(p);
      libros.set(p.id, { title: p.title, color: colorDePortada(p), ...(ruta && urls.get(ruta) ? { src: urls.get(ruta) } : {}) });
    }
    return { imagenes: urls, stickers: deStickers as FuentesDeMiniatura['stickers'], libros };
  })();

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/(app)/library'));
  const abrir = (c: LibraryCanvas) => router.push({ pathname: '/(app)/canvas/[id]', params: { id: c.id, item: id } });
  const quitar = async (c: LibraryCanvas) => {
    setMenuDe(null);
    const ok = await confirmar({ title: n.removeTitle, message: n.removeMessage, confirmLabel: n.removeConfirm, destructive: true });
    if (!ok) return;
    borrar(c);
    avisar({ message: n.removed });
  };

  const icono = (Icono: typeof Plus, color: string = theme.text) => <Icono size={IconSize.inline} strokeWidth={IconStroke} color={color} />;

  const encabezado = (
    <View style={styles.encabezado}>
      <View style={styles.barra}>
        <IconButton label={tx.common.back} onPress={volver}>
          <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
        <View style={styles.flex}>
          <AppText variant="title" accessibilityRole="header">
            {n.title}
          </AppText>
          {libro.data ? (
            <AppText variant="label" color="textSecondary" numberOfLines={1}>
              {libro.data.title}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.seccion}>
        <AppText variant="heading">{n.scraps}</AppText>
        <Button title={tx.library.canvas.newCanvas} icon={icono(Plus, theme.onInk)} onPress={() => setCreando(true)} />
      </View>
    </View>
  );

  const pie = (
    <View style={styles.pie}>
      <ActionRow
        icon={icono(Scissors)}
        label={`${n.fragments} · ${n.fragmentsCount(deEsteLibro)}`}
        onPress={() => router.push({ pathname: '/(app)/fragments', params: { libro: id } })}
      />
      <ActionRow icon={icono(IdCard)} label={n.cards} onPress={() => router.push({ pathname: '/(app)/book-cards/[id]', params: { id } })} />
    </View>
  );

  return (
    <View style={[styles.pantalla, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <FlatList
        key={columnas}
        data={lista}
        numColumns={columnas}
        keyExtractor={(c) => c.id}
        contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + Spacing.xl }]}
        columnWrapperStyle={columnas > 1 ? styles.fila : undefined}
        ListHeaderComponent={encabezado}
        ListFooterComponent={pie}
        ListEmptyComponent={
          recortes.isPending ? (
            <LoadingState />
          ) : recortes.isError ? (
            <ErrorState message={n.error} onRetry={() => void recortes.refetch()} />
          ) : (
            <AppText variant="body" color="textSecondary" style={styles.vacio}>
              {n.empty}
            </AppText>
          )
        }
        renderItem={({ item }) => <Tarjeta recorte={item} ancho={anchoMiniatura} fuentes={fuentes} onAbrir={abrir} onMenu={setMenuDe} />}
      />
      <NewCanvasSheet
        item={creando && libro.data ? libro.data : null}
        onClose={() => setCreando(false)}
        onCrear={(p, como) => {
          setCreando(false);
          // Con plantilla, el recorte se copia con ids nuevos y "este libro" se vuelve este (T344).
          const doc = como.doc ? usarPlantilla(como.doc, p.id, uuidv4) : undefined;
          router.push({ pathname: '/(app)/canvas/[id]', params: { id: crear(p.id, como.orientacion, como.titulo ?? '', doc), item: p.id } });
        }}
      />
      <Sheet visible={menuDe !== null} onClose={() => setMenuDe(null)} title={menuDe?.title || tx.library.canvas.untitled}>
        {menuDe ? (
          <>
            <ActionRow
              icon={icono(ChevronRight)}
              label={n.open}
              onPress={() => {
                setMenuDe(null);
                abrir(menuDe);
              }}
            />
            <ActionRow icon={icono(Trash2, theme.danger)} label={n.remove} color="danger" onPress={() => void quitar(menuDe)} />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

const Tarjeta = memo(function Tarjeta({
  recorte,
  ancho,
  fuentes,
  onAbrir,
  onMenu,
}: {
  recorte: LibraryCanvas;
  ancho: number;
  fuentes: FuentesDeMiniatura;
  onAbrir: (c: LibraryCanvas) => void;
  onMenu: (c: LibraryCanvas) => void;
}) {
  const theme = useTheme();
  const tx = useT();
  const titulo = recorte.title || tx.library.canvas.untitled;
  return (
    <View style={[styles.tarjeta, { width: ancho }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={titulo}
        accessibilityHint={tx.library.notebook.openHint}
        onPress={() => onAbrir(recorte)}
        style={({ pressed }) => [pressed ? styles.presionada : null]}>
        <CanvasPreview doc={recorte.doc} orientacion={recorte.orientation} ancho={ancho} fuentes={fuentes} />
      </Pressable>
      <View style={styles.pieTarjeta}>
        <AppText variant="label" numberOfLines={1} style={styles.flex}>
          {titulo}
        </AppText>
        <IconButton label={tx.library.notebook.actionsFor(titulo)} onPress={() => onMenu(recorte)}>
          <MoreHorizontal size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        </IconButton>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: { paddingHorizontal: Spacing.lg, gap: Spacing.md, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  encabezado: { gap: Spacing.lg, paddingBottom: Spacing.sm },
  barra: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginLeft: -Spacing.sm, paddingTop: Spacing.sm },
  seccion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  fila: { gap: Spacing.md },
  flex: { flex: 1 },
  vacio: { paddingVertical: Spacing.lg },
  tarjeta: { gap: Spacing.xs },
  presionada: { opacity: 0.85 },
  pieTarjeta: { flexDirection: 'row', alignItems: 'center' },
  pie: { paddingTop: Spacing.lg, borderRadius: Radius.md },
});
