import { useRouter } from 'expo-router';
import { ArrowDownWideNarrow, ChevronLeft, IdCard, SlidersHorizontal, Star, X } from 'lucide-react-native';
import { memo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { BookCover } from '@/components/library/book-cover';
import { CardView } from '@/components/library/card-view';
import type { StickerElegible } from '@/components/library/sticker-sheet';
import { AppText, Button, Chip, EmptyState, ErrorState, IconButton, LoadingState, Screen, Sheet } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useCards, useCardTemplates } from '@/hooks/use-cards';
import { useLibraryItems } from '@/hooks/use-library';
import { useStickerElegible } from '@/hooks/use-sticker-elegible';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import {
  aniosDe,
  type CampoFiltrable,
  camposFiltrables,
  type FiltroDeResena,
  filtrarResenas,
  type OrdenDeResenas,
  ordenarResenas,
  totalesDeResenas,
} from '@/lib/library/reviews';
import type { LibraryCard, LibraryCardTemplate, LibraryItem } from '@/types/domain';

/**
 * Mis reseñas (spec 13d, RF-BF8 – RF-BF10; T295): todas las fichas llenas como tarjetas con la portada de su
 * libro; arriba, cuántos libros, el promedio de estrellas y el género más leído de lo que se ve. Se filtran
 * por cualquier campo de escala, opción o fecha ("picante 4 o más", "en 2026") y se ordenan por recientes o
 * por un campo. Tocar una la abre.
 */
export default function ReviewsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tx = useT();
  const r = tx.library.cards.reviews;
  const plantillas = useCardTemplates();
  const fichas = useCards();
  const piezas = useLibraryItems();
  const sticker = useStickerElegible();
  const [filtros, setFiltros] = useState<FiltroDeResena[]>([]);
  const [orden, setOrden] = useState<OrdenDeResenas>({ por: 'recent' });
  const [filtrando, setFiltrando] = useState(false);
  const [ordenando, setOrdenando] = useState(false);

  const todas = fichas.data ?? [];
  const lista = plantillas.data ?? [];
  const campos = camposFiltrables(lista, todas);
  // Un filtro de un campo que ya no está (se borró su plantilla) deja de contar.
  const vigentes = filtros.filter((f) => campos.some((c) => c.id === f.campo));
  const visibles = ordenarResenas(filtrarResenas(todas, lista, vigentes), lista, orden);
  const totales = totalesDeResenas(visibles, lista);
  const etiquetaDe = (id: string) => campos.find((c) => c.id === id)?.label ?? id;
  const textoDeFiltro = (f: FiltroDeResena) =>
    r.chip(etiquetaDe(f.campo), f.tipo === 'scale' ? r.atLeast(f.min) : f.tipo === 'choice' ? f.opcion : r.inYear(f.anio));
  const ordenActual = orden.por === 'recent' ? r.recent : r.byField(etiquetaDe(orden.campo));
  const poner = (f: FiltroDeResena) => {
    setFiltros((xs) => [...xs.filter((x) => x.campo !== f.campo), f]);
    setFiltrando(false);
  };
  const abrir = (f: LibraryCard) => router.push({ pathname: '/(app)/card/[itemId]', params: { itemId: f.item_id, plantilla: f.template_id } });

  const encabezado = (
    <View style={styles.encabezado}>
      <View style={styles.titulo}>
        <IconButton label={tx.common.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/library'))}>
          <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
        <AppText variant="title" accessibilityRole="header" style={styles.flex}>
          {r.title}
        </AppText>
        <IconButton label={r.designs} onPress={() => router.push('/(app)/card-templates')}>
          <IdCard size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
      </View>
      {todas.length ? (
        <>
          <View style={styles.totales}>
            <Total etiqueta={r.books} valor={String(totales.libros)} />
            <Total
              etiqueta={r.average}
              valor={totales.promedio !== null ? totales.promedio.toLocaleString(undefined, { minimumFractionDigits: 1 }) : r.none}
              icono={totales.promedio !== null ? <Star size={16} strokeWidth={IconStroke} color={theme.text} fill={theme.text} /> : null}
            />
            <Total etiqueta={r.topGenre} valor={totales.genero ?? r.none} />
          </View>
          <View style={styles.controles}>
            <Button title={r.filter(vigentes.length)} variant="secondary" icon={<SlidersHorizontal size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} onPress={() => setFiltrando(true)} />
            <Button title={r.order(ordenActual)} variant="ghost" icon={<ArrowDownWideNarrow size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} onPress={() => setOrdenando(true)} />
          </View>
          {vigentes.length ? (
            <View style={styles.chips}>
              {vigentes.map((f) => {
                const texto = textoDeFiltro(f);
                return (
                  <Pressable
                    key={f.campo}
                    accessibilityRole="button"
                    accessibilityLabel={r.removeFilter(texto)}
                    onPress={() => setFiltros((xs) => xs.filter((x) => x.campo !== f.campo))}
                    style={[styles.filtro, { backgroundColor: theme.ink }]}>
                    <AppText variant="label" style={{ color: theme.onInk }}>
                      {texto}
                    </AppText>
                    <X size={14} strokeWidth={IconStroke} color={theme.onInk} />
                  </Pressable>
                );
              })}
              {vigentes.length > 1 ? <Chip label={r.clearAll} selected={false} onPress={() => setFiltros([])} compact /> : null}
            </View>
          ) : null}
        </>
      ) : null}
      {fichas.isPending || plantillas.isPending ? <LoadingState /> : null}
      {fichas.isError ? <ErrorState message={fichas.error.message} onRetry={() => fichas.refetch()} /> : null}
      {fichas.isSuccess && !todas.length ? (
        <EmptyState
          icon={<Star size={32} strokeWidth={IconStroke} color={theme.textTertiary} />}
          title={r.emptyTitle}
          description={r.emptyDescription}
          action={<Button title={r.designs} variant="secondary" onPress={() => router.push('/(app)/card-templates')} />}
        />
      ) : null}
      {todas.length && !visibles.length ? (
        <AppText variant="body" color="textSecondary" style={styles.vacio}>
          {r.noResults}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <FlatList
        testID="reviews-list"
        data={visibles}
        keyExtractor={(f) => f.id}
        ListHeaderComponent={encabezado}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <Resena
            ficha={item}
            plantilla={lista.find((p) => p.id === item.template_id)}
            pieza={piezas.data?.find((p) => p.id === item.item_id)}
            sticker={sticker}
            onAbrir={abrir}
          />
        )}
      />

      <Sheet visible={filtrando} onClose={() => setFiltrando(false)} title={r.chooseField}>
        <FiltroNuevo campos={campos} fichas={todas} plantillas={lista} onElegir={poner} />
      </Sheet>

      <Sheet visible={ordenando} onClose={() => setOrdenando(false)} title={r.orderTitle}>
        <View style={styles.opciones} accessibilityRole="radiogroup">
          {[{ por: 'recent' } as OrdenDeResenas, ...campos.filter((c) => c.type !== 'choice').map((c): OrdenDeResenas => ({ por: 'field', campo: c.id }))].map((o) => {
            const etiqueta = o.por === 'recent' ? r.recent : r.byField(etiquetaDe(o.campo));
            const elegido = o.por === orden.por && (o.por === 'recent' || (orden.por === 'field' && orden.campo === o.campo));
            return (
              <Chip
                key={etiqueta}
                label={etiqueta}
                selected={elegido}
                onPress={() => {
                  setOrden(o);
                  setOrdenando(false);
                }}
              />
            );
          })}
        </View>
      </Sheet>
    </Screen>
  );
}

function Total({ etiqueta, valor, icono }: { etiqueta: string; valor: string; icono?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.total, { backgroundColor: theme.surface, borderColor: theme.border }]} accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
      <View style={styles.totalValor}>
        {icono}
        <AppText variant="heading" numberOfLines={1} tabular>
          {valor}
        </AppText>
      </View>
      <AppText variant="caption" color="textSecondary" numberOfLines={2}>
        {etiqueta}
      </AppText>
    </View>
  );
}

/** Elegir un campo y luego qué buscar en él. */
function FiltroNuevo({
  campos,
  fichas,
  plantillas,
  onElegir,
}: {
  campos: readonly CampoFiltrable[];
  fichas: readonly LibraryCard[];
  plantillas: readonly LibraryCardTemplate[];
  onElegir: (f: FiltroDeResena) => void;
}) {
  const r = useT().library.cards.reviews;
  const [campoId, setCampoId] = useState<string | null>(null);
  const campo = campos.find((c) => c.id === campoId) ?? null;
  if (!campos.length) {
    return (
      <AppText variant="body" color="textSecondary">
        {r.noFields}
      </AppText>
    );
  }
  return (
    <View style={styles.opciones}>
      <View style={styles.chips}>
        {campos.map((c) => (
          <Chip key={c.id} label={c.label} selected={campoId === c.id} onPress={() => setCampoId(c.id)} />
        ))}
      </View>
      {campo?.type === 'scale' ? (
        <View style={styles.chips}>
          {Array.from({ length: campo.max }, (_, i) => i + 1).map((n) => (
            <Chip key={n} label={r.atLeast(n)} selected={false} onPress={() => onElegir({ campo: campo.id, tipo: 'scale', min: n })} />
          ))}
        </View>
      ) : null}
      {campo?.type === 'choice' ? (
        <View style={styles.chips}>
          {campo.options.map((o) => (
            <Chip key={o} label={o} selected={false} onPress={() => onElegir({ campo: campo.id, tipo: 'choice', opcion: o })} />
          ))}
        </View>
      ) : null}
      {campo?.type === 'date' ? <Anios campo={campo} fichas={fichas} plantillas={plantillas} onElegir={onElegir} /> : null}
    </View>
  );
}

function Anios({ campo, fichas, plantillas, onElegir }: { campo: CampoFiltrable; fichas: readonly LibraryCard[]; plantillas: readonly LibraryCardTemplate[]; onElegir: (f: FiltroDeResena) => void }) {
  const r = useT().library.cards.reviews;
  const anios = aniosDe(fichas, plantillas, campo.id);
  if (!anios.length) {
    return (
      <AppText variant="body" color="textSecondary">
        {r.noYears}
      </AppText>
    );
  }
  return (
    <View style={styles.chips}>
      {anios.map((a) => (
        <Chip key={a} label={r.inYear(a)} selected={false} onPress={() => onElegir({ campo: campo.id, tipo: 'date', anio: a })} />
      ))}
    </View>
  );
}

const Resena = memo(function Resena({
  ficha,
  plantilla,
  pieza,
  sticker,
  onAbrir,
}: {
  ficha: LibraryCard;
  plantilla: LibraryCardTemplate | undefined;
  pieza: LibraryItem | undefined;
  sticker: (id: string) => StickerElegible | null;
  onAbrir: (f: LibraryCard) => void;
}) {
  const r = useT().library.cards.reviews;
  if (!plantilla) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={r.open(pieza?.title ?? '', plantilla.name)}
      onPress={() => onAbrir(ficha)}
      style={({ pressed }) => [styles.resena, pressed ? styles.presionada : null]}>
      {pieza ? <BookCover item={pieza} width={84} /> : <View style={styles.sinPortada} />}
      <View style={styles.flex}>
        <CardView plantilla={plantilla} valores={ficha.values} subtitulo={pieza?.title} compacta sticker={sticker} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  encabezado: { gap: Spacing.md, paddingBottom: Spacing.md },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginLeft: -Spacing.sm },
  totales: { flexDirection: 'row', gap: Spacing.sm },
  total: { flex: 1, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', padding: Spacing.md, gap: 2 },
  totalValor: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  controles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  filtro: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, borderCurve: 'continuous', paddingHorizontal: Spacing.md, minHeight: 36 },
  vacio: { textAlign: 'center', paddingVertical: Spacing.xl },
  lista: { gap: Spacing.lg, paddingBottom: Spacing.xl },
  opciones: { gap: Spacing.md },
  resena: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  sinPortada: { width: 84 },
  presionada: { opacity: 0.85 },
});
