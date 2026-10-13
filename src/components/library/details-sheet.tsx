import { Check, ChevronRight, Link2, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BookCover } from './book-cover';

import { AppText, Banner, Button, IconButton, Sheet } from '@/components/ui';
import { Fonts, IconSize, IconStroke, Radius, Spacing, Typography } from '@/constants/theme';
import { useLinkMutations, useLinks } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';
import { formatShortDate } from '@/lib/dates';
import { formatBytes } from '@/lib/library/files';
import { plegar } from '@/lib/library/filters';
import { enlaceParaGuardar, enlacesDe, OPCIONES_DE_ENLACE, type OpcionDeEnlace, yaEnlazados } from '@/lib/library/links';
import { etiquetaDeSaga } from '@/lib/library/series';
import { avanceDe } from '@/lib/library/shelf';
import { useSnackbar } from '@/providers';
import type { LibraryItem, LibrarySeries, LibraryShelf } from '@/types/domain';

export type DetailsSheetProps = {
  item: LibraryItem | null;
  /** Toda la librería: para los títulos de los enlazados y para elegir con cuál enlazar. */
  items: readonly LibraryItem[];
  sagas: readonly LibrarySeries[];
  libreros: readonly LibraryShelf[];
  /** En qué libreros está cada libro. */
  membresia: ReadonlyMap<string, ReadonlySet<string>>;
  onClose: () => void;
  /** Mostrar los detalles de otro libro (al tocar un enlazado). */
  onShow: (item: LibraryItem) => void;
  /** Abrir el libro en el lector. */
  onRead: (item: LibraryItem) => void;
};

/**
 * Los detalles de un libro (RF-BL16, RF-BL27): sus datos y sus libros enlazados, que se leen desde los
 * dos lados ("Precuela: …", "Secuela: …"). Tocar un enlazado muestra el suyo; desde aquí se enlaza con
 * otro libro o se quita un enlace.
 */
export function DetailsSheet(props: DetailsSheetProps) {
  const tx = useT();
  return (
    <Sheet visible={props.item !== null} onClose={props.onClose} title={tx.library.details.title}>
      {props.item ? <Contenido key={props.item.id} {...props} item={props.item} /> : null}
    </Sheet>
  );
}

function Contenido({ item, items, sagas, libreros, membresia, onShow, onRead }: DetailsSheetProps & { item: LibraryItem }) {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const d = tx.library.details;
  const k = tx.library.links;
  const enlaces = useLinks();
  const { quitar } = useLinkMutations();
  const [enlazando, setEnlazando] = useState(false);

  const porId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const vistos = enlacesDe(item.id, enlaces.data ?? []).filter((e) => porId.has(e.otro));
  if (enlazando) return <Enlazar item={item} items={items} onDone={() => setEnlazando(false)} />;

  const saga = sagas.find((s) => s.id === item.series_id);
  const enLibreros = libreros.filter((l) => membresia.get(item.id)?.has(l.id)).map((l) => l.name);
  const avance = avanceDe(item);
  const filas: [string, string][] = [
    [d.format, item.kind.toUpperCase()],
    [d.size, formatBytes(item.file_size, lang)],
    [d.pages, item.page_count ? String(item.page_count) : d.none],
    [d.added, formatShortDate(new Date(item.created_at), lang)],
    [d.progress, !avance ? tx.library.unread : avance.tipo === 'terminado' ? tx.library.finished : avance.tipo === 'pagina' ? tx.library.progressPage(avance.pagina, avance.total) : tx.library.progressPercent(avance.porcentaje)],
    [d.category, item.category ?? d.none],
    [d.genres, item.genres.join(', ') || d.none],
    [d.series, saga ? etiquetaDeSaga(saga.name, item.series_index) : d.none],
    [d.shelves, enLibreros.join(', ') || d.none],
  ];

  return (
    <View style={styles.contenido}>
      <View style={styles.cabecera}>
        <BookCover item={item} width={96} />
        <View style={styles.flex}>
          <AppText variant="heading" numberOfLines={3}>
            {item.title}
          </AppText>
          {item.authors.length ? (
            <AppText variant="body" color="textSecondary" numberOfLines={2}>
              {item.authors.join(', ')}
            </AppText>
          ) : null}
          <Button title={d.read} onPress={() => onRead(item)} style={styles.leer} />
        </View>
      </View>

      <View>
        {filas.map(([etiqueta, valor]) => (
          <View key={etiqueta} style={[styles.dato, { borderColor: theme.border }]}>
            <AppText variant="label" color="textSecondary" style={styles.etiqueta}>
              {etiqueta}
            </AppText>
            <AppText variant="body" style={styles.flex} tabular>
              {valor}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.seccion}>
        <AppText variant="label" color="textSecondary">
          {k.title}
        </AppText>
        {vistos.length === 0 ? (
          <AppText variant="caption" color="textTertiary">
            {k.empty}
          </AppText>
        ) : (
          vistos.map((e) => {
            const otro = porId.get(e.otro) as LibraryItem;
            return (
              <View key={e.id} style={[styles.enlace, { borderColor: theme.border }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${k.roles[e.papel]}: ${otro.title}`}
                  onPress={() => onShow(otro)}
                  style={({ pressed }) => [styles.enlaceToque, pressed ? styles.presionada : null]}>
                  <BookCover item={otro} width={32} thumb />
                  <View style={styles.flex}>
                    <AppText variant="caption" color="textSecondary">
                      {k.roles[e.papel]}
                    </AppText>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {otro.title}
                    </AppText>
                  </View>
                  <ChevronRight size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
                </Pressable>
                <IconButton label={k.remove(otro.title)} onPress={() => quitar.mutate(e.id)}>
                  <X size={16} strokeWidth={IconStroke} color={theme.textSecondary} />
                </IconButton>
              </View>
            );
          })
        )}
        <Button
          title={k.add}
          variant="secondary"
          icon={<Link2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
          onPress={() => setEnlazando(true)}
          disabled={items.length < 2}
        />
      </View>
    </View>
  );
}

/** Enlazar en dos pasos: qué es este libro respecto al otro, y cuál es el otro. */
function Enlazar({ item, items, onDone }: { item: LibraryItem; items: readonly LibraryItem[]; onDone: () => void }) {
  const theme = useTheme();
  const tx = useT();
  const k = tx.library.links;
  const showSnackbar = useSnackbar();
  const enlaces = useLinks();
  const { enlazar } = useLinkMutations();
  const [opcion, setOpcion] = useState<OpcionDeEnlace | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!opcion) {
    return (
      <View style={styles.contenido} accessibilityRole="radiogroup" accessibilityLabel={k.howTitle}>
        <AppText variant="heading">{k.addTitle(item.title)}</AppText>
        <AppText variant="label" color="textSecondary">
          {k.howTitle}
        </AppText>
        {OPCIONES_DE_ENLACE.map((o) => (
          <Pressable
            key={o}
            accessibilityRole="radio"
            accessibilityState={{ checked: false }}
            accessibilityLabel={k.options[o]}
            onPress={() => setOpcion(o)}
            style={({ pressed }) => [styles.opcion, { borderColor: theme.border }, pressed ? styles.presionada : null]}>
            <AppText variant="body" style={styles.flex}>
              {k.options[o]}…
            </AppText>
            <ChevronRight size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
          </Pressable>
        ))}
        <Button title={tx.common.cancel} variant="ghost" onPress={onDone} />
      </View>
    );
  }

  const palabras = plegar(busqueda).split(/\s+/).filter(Boolean);
  const candidatos = items.filter((i) => i.id !== item.id && palabras.every((p) => plegar(`${i.title} ${i.authors.join(' ')}`).includes(p)));
  const elegir = (otro: LibraryItem) => {
    const { from, to, kind } = enlaceParaGuardar(item.id, otro.id, opcion);
    enlazar.mutate(
      { from, to, kind },
      {
        onSuccess: () => {
          showSnackbar({ message: k.added });
          onDone();
        },
        onError: (e) => setError(e instanceof Error ? e.message : k.duplicate),
      },
    );
  };

  return (
    <View style={styles.contenido}>
      <AppText variant="heading">{`${item.title} ${k.options[opcion]}…`}</AppText>
      <View style={[styles.campo, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Search size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder={k.searchPlaceholder}
          placeholderTextColor={theme.textTertiary}
          accessibilityLabel={k.searchPlaceholder}
          style={[styles.entrada, { color: theme.text }]}
        />
      </View>
      {error ? <Banner tone="error" message={error} /> : null}
      {candidatos.length === 0 ? (
        <AppText variant="caption" color="textTertiary">
          {k.noBooks}
        </AppText>
      ) : (
        candidatos.map((otro) => {
          const ya = yaEnlazados(item.id, otro.id, enlaces.data ?? []);
          return (
            <Pressable
              key={otro.id}
              accessibilityRole="button"
              accessibilityLabel={ya ? `${otro.title}, ${k.already}` : otro.title}
              accessibilityState={{ disabled: ya }}
              disabled={ya || enlazar.isPending}
              onPress={() => elegir(otro)}
              style={({ pressed }) => [styles.opcion, { borderColor: theme.border, opacity: ya ? 0.5 : 1 }, pressed ? styles.presionada : null]}>
              <BookCover item={otro} width={32} thumb />
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {otro.title}
                </AppText>
                {otro.authors.length ? (
                  <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                    {otro.authors.join(', ')}
                  </AppText>
                ) : null}
              </View>
              {ya ? <Check size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} /> : null}
            </Pressable>
          );
        })
      )}
      <Button title={tx.common.cancel} variant="ghost" onPress={() => setOpcion(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: Spacing.lg },
  cabecera: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'flex-start' },
  flex: { flex: 1, gap: 2 },
  leer: { marginTop: Spacing.sm, alignSelf: 'flex-start' },
  dato: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  etiqueta: { width: 96 },
  seccion: { gap: Spacing.sm },
  enlace: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  enlaceToque: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 52, paddingHorizontal: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: Radius.sm },
  campo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingLeft: Spacing.md, minHeight: 44, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
  entrada: { flex: 1, minWidth: 0, ...Typography.body, fontFamily: Fonts?.sans, paddingVertical: Spacing.sm },
  presionada: { opacity: 0.85 },
});
