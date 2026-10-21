import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Ellipsis, Scissors } from 'lucide-react-native';
import { memo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ClipSheet } from '@/components/library/clip-sheet';
import { AppText, Chip, EmptyState, ErrorState, IconButton, LoadingState, Screen, Segmented } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useClipImages, useClips, useRemoveClip, useUpdateClipNote } from '@/hooks/use-clips';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';
import { type Language } from '@/i18n/language';
import { dondeDeFragmento, type FiltroDeFragmentos, filtrarFragmentos, librosConFragmentos, posicionDeFragmento } from '@/lib/library/clips';
import { formatDate } from '@/lib/dates';
import { useConfirm, useSnackbar } from '@/providers';
import type { LibraryClip } from '@/types/domain';

/**
 * Mis fragmentos (spec 13c, RF-BH21; T317): todo lo recortado al leer, de texto y de imagen, el más nuevo
 * primero, con filtros por tipo y por libro. Tocar uno abre su libro en ese lugar; "Nota y más" le escribe una
 * nota, copia su texto o lo borra. Los de un libro que se borró se quedan con su título.
 */
export default function FragmentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tx = useT();
  const c = tx.library.clips;
  const lang = useLanguage();
  const clips = useClips();
  const imagenes = useClipImages(clips.data);
  const nota = useUpdateClipNote();
  const borrar = useRemoveClip();
  const confirmar = useConfirm();
  const avisar = useSnackbar();
  // Desde Mi libreta (T342) llega el libro: se abre con su filtro puesto.
  const { libro: libroDeRuta } = useLocalSearchParams<{ libro?: string }>();
  const [filtro, setFiltro] = useState<FiltroDeFragmentos>({ kind: 'all', libro: libroDeRuta ?? null });
  const [abiertoId, setAbiertoId] = useState<string | null>(null);

  const todos = clips.data ?? [];
  const libros = librosConFragmentos(todos);
  // Un libro que ya no tiene fragmentos deja de filtrar.
  const libroVigente = filtro.libro && libros.some((l) => l.clave === filtro.libro) ? filtro.libro : null;
  const visibles = filtrarFragmentos(todos, { ...filtro, libro: libroVigente });
  const abierto = todos.find((x) => x.id === abiertoId) ?? null;

  const abrirEnLibro = (f: LibraryClip) => {
    if (!f.item_id) {
      avisar({ message: c.bookGone });
      return;
    }
    const lugar = posicionDeFragmento(f.locator);
    router.push({ pathname: '/(app)/book/[id]', params: { id: f.item_id, ...(lugar ? { ir: JSON.stringify(lugar) } : {}) } });
  };

  const guardarNota = (texto: string) => {
    if (!abierto) return;
    nota.mutate({ id: abierto.id, note: texto.trim() || null }, { onSuccess: () => avisar({ message: c.noteSaved }), onError: (e) => avisar({ message: e.message }) });
  };

  const copiar = async () => {
    if (!abierto?.text) return;
    await Clipboard.setStringAsync(abierto.text);
    avisar({ message: c.copied });
  };

  const quitar = async () => {
    if (!abierto) return;
    const id = abierto.id;
    const ok = await confirmar({ title: c.removeTitle, message: c.removeMessage, confirmLabel: c.remove, destructive: true });
    if (!ok) return;
    setAbiertoId(null);
    borrar.mutate(id, { onSuccess: () => avisar({ message: c.removed }), onError: (e) => avisar({ message: e.message }) });
  };

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/(app)/library'));

  const encabezado = (
    <View style={styles.encabezado}>
      <View style={styles.titulo}>
        <IconButton label={tx.common.back} onPress={volver}>
          <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
        <AppText variant="title" accessibilityRole="header" style={styles.flex}>
          {c.title}
        </AppText>
      </View>
      {todos.length > 0 ? (
        <>
          <Segmented<FiltroDeFragmentos['kind']>
            fullWidth
            label={c.kindLabel}
            options={(['all', 'text', 'image'] as const).map((k) => ({ value: k, label: c.kinds[k] }))}
            value={filtro.kind}
            onChange={(kind) => setFiltro((f) => ({ ...f, kind }))}
          />
          {libros.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.libros} accessibilityLabel={c.bookLabel}>
              <Chip label={c.allBooks} selected={!libroVigente} onPress={() => setFiltro((f) => ({ ...f, libro: null }))} compact />
              {libros.map((l) => (
                <Chip key={l.clave} label={l.titulo} selected={libroVigente === l.clave} onPress={() => setFiltro((f) => ({ ...f, libro: l.clave }))} compact />
              ))}
            </ScrollView>
          ) : null}
        </>
      ) : null}
      {clips.isPending ? <LoadingState /> : null}
      {clips.isError ? <ErrorState message={clips.error.message} onRetry={() => clips.refetch()} /> : null}
      {clips.isSuccess && todos.length === 0 ? (
        <EmptyState icon={<Scissors size={32} strokeWidth={IconStroke} color={theme.textTertiary} />} title={c.emptyTitle} description={c.emptyDescription} />
      ) : null}
      {todos.length > 0 && visibles.length === 0 ? (
        <AppText variant="body" color="textSecondary" style={styles.vacio}>
          {c.noResults}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <FlatList
        testID="clips-list"
        data={visibles}
        keyExtractor={(f) => f.id}
        ListHeaderComponent={encabezado}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <Tarjeta fragmento={item} imagen={imagenes.get(item.id) ?? null} lang={lang} onAbrir={abrirEnLibro} onMas={setAbiertoId} />
        )}
      />
      <ClipSheet
        fragmento={abierto}
        onClose={() => setAbiertoId(null)}
        onNota={guardarNota}
        guardandoNota={nota.isPending}
        onAbrir={abierto?.item_id ? () => (setAbiertoId(null), abrirEnLibro(abierto)) : null}
        onCopiar={() => void copiar()}
        onBorrar={() => void quitar()}
      />
    </Screen>
  );
}

const Tarjeta = memo(function Tarjeta({
  fragmento: f,
  imagen,
  lang,
  onAbrir,
  onMas,
}: {
  fragmento: LibraryClip;
  imagen: string | null;
  lang: Language;
  onAbrir: (f: LibraryClip) => void;
  onMas: (id: string) => void;
}) {
  const theme = useTheme();
  const c = useT().library.clips;
  const donde = dondeDeFragmento(f.locator, c);
  const meta = [f.book_title, donde, formatDate(new Date(f.created_at), lang)].filter(Boolean).join(' · ');
  return (
    <View style={[styles.tarjeta, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${f.kind === 'image' ? c.imageA11y(f.book_title) : (f.text ?? c.noCopy)}. ${meta}. ${f.item_id ? c.goToBook : c.bookGone}`}
        onPress={() => onAbrir(f)}
        style={({ pressed }) => [styles.toque, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {meta}
        </AppText>
        {f.kind === 'image' ? (
          <View style={[styles.marcoImagen, { backgroundColor: theme.surfaceAlt }]}>
            {imagen ? (
              <Image source={{ uri: imagen }} contentFit="contain" style={[styles.imagen, { aspectRatio: 1 / (f.ar ?? 1) }]} accessible={false} />
            ) : null}
          </View>
        ) : f.text ? (
          <View style={[styles.cita, { borderColor: theme.border }]}>
            <AppText variant="body" numberOfLines={8}>
              {f.text}
            </AppText>
          </View>
        ) : (
          <AppText variant="label" color="textSecondary">
            {c.noCopy}
          </AppText>
        )}
        {f.note ? (
          <AppText variant="label" color="textSecondary" numberOfLines={3}>
            {f.note}
          </AppText>
        ) : null}
      </Pressable>
      <IconButton label={c.more} onPress={() => onMas(f.id)} style={styles.mas}>
        <Ellipsis size={IconSize.action} strokeWidth={IconStroke} color={theme.textSecondary} />
      </IconButton>
    </View>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  encabezado: { gap: Spacing.md, paddingBottom: Spacing.md },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginLeft: -Spacing.sm },
  libros: { gap: Spacing.sm },
  vacio: { textAlign: 'center', paddingVertical: Spacing.xl },
  lista: { gap: Spacing.md, paddingBottom: Spacing.xl },
  tarjeta: { borderWidth: 1, borderRadius: Radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
  toque: { gap: Spacing.sm, padding: Spacing.lg, paddingRight: Spacing.lg + 44 },
  marcoImagen: { borderRadius: Radius.md, borderCurve: 'continuous', overflow: 'hidden', alignItems: 'center' },
  imagen: { width: '100%', maxHeight: 280 },
  cita: { borderLeftWidth: 3, paddingLeft: Spacing.md },
  mas: { position: 'absolute', top: Spacing.xs, right: Spacing.xs },
});
