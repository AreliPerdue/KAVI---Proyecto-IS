import { Bookmark, Highlighter, Image as ImageIcon, NotebookText, PenLine, Smile, StickyNote, Type } from 'lucide-react-native';
import { memo, useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, ColorDot, ColorSwatch, Sheet } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { COLORES_DE_ANOTACION, colorDe, type FiltroDeAnotaciones, filtrarAnotaciones, notaDe, opcionesDeFiltro, ordenarAnotaciones, textoDe } from '@/lib/library/annotations';
import type { LibraryAnnotation, LibraryAnnotationKind } from '@/types/domain';

const ICONOS: Record<LibraryAnnotationKind, typeof StickyNote> = {
  highlight: Highlighter,
  note: NotebookText,
  textbox: Type,
  ink: PenLine,
  sticker: Smile,
  postit: StickyNote,
  bookmark: Bookmark,
  image: ImageIcon,
};

type Props = {
  visible: boolean;
  onClose: () => void;
  anotaciones: readonly LibraryAnnotation[] | undefined;
  cargando: boolean;
  error: boolean;
  onReintentar: () => void;
  onIr: (a: LibraryAnnotation) => void;
  /** En una copia de club (13f, T307): quién la hizo y quién la cambió. */
  autoria?: (a: LibraryAnnotation) => string | null;
};

/**
 * El panel de lo anotado (spec 13c, RF-BH17; T286): todo lo de la pieza en el orden del libro, con su
 * página (o su avance en EPUB). Se filtra por tipo y por color; tocar uno lleva ahí.
 */
export function AnnotationsSheet({ visible, onClose, anotaciones, cargando, error, onReintentar, onIr, autoria }: Props) {
  const tx = useT();
  const a = tx.library.annotations;
  const theme = useTheme();
  const [filtro, setFiltro] = useState<FiltroDeAnotaciones>({ tipo: null, color: null });

  const todas = anotaciones ?? [];
  const { tipos, colores } = opcionesDeFiltro(todas);
  // Un filtro que ya no encuentra nada (se quitó lo último de ese color) se suelta solo.
  const vigente: FiltroDeAnotaciones = {
    tipo: filtro.tipo && tipos.includes(filtro.tipo) ? filtro.tipo : null,
    color: filtro.color && colores.includes(filtro.color) ? filtro.color : null,
  };
  const lista = ordenarAnotaciones(filtrarAnotaciones(todas, vigente));
  const nombreDeColor = (hex: string) => {
    const c = COLORES_DE_ANOTACION.find((x) => x.hex.toUpperCase() === hex);
    return c ? (tx.colors[c.id] ?? c.label) : hex;
  };

  const ir = useCallback((x: LibraryAnnotation) => onIr(x), [onIr]);
  const hayAlgo = todas.some((x) => !x.removed);

  return (
    <Sheet visible={visible} onClose={onClose} title={a.panel} scrollable={false} maxHeightRatio={0.8}>
      {cargando && !anotaciones ? (
        <View style={styles.centro} accessibilityLiveRegion="polite">
          <ActivityIndicator color={theme.textSecondary} />
          <AppText variant="label" color="textSecondary">
            {a.loading}
          </AppText>
        </View>
      ) : error && !anotaciones ? (
        <View style={styles.centro} accessibilityRole="alert">
          <AppText variant="body" style={styles.textoCentro}>
            {a.error}
          </AppText>
          <Button title={tx.library.reader.retry} variant="secondary" onPress={onReintentar} />
        </View>
      ) : !hayAlgo ? (
        <View style={styles.centro}>
          <StickyNote size={IconSize.tab} strokeWidth={IconStroke} color={theme.textTertiary} />
          <AppText variant="body" color="textSecondary" style={styles.textoCentro}>
            {a.empty}
          </AppText>
        </View>
      ) : (
        <>
          {tipos.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros} style={styles.sinCrecer}>
              <Chip label={a.all} selected={!vigente.tipo} onPress={() => setFiltro({ ...vigente, tipo: null })} compact />
              {tipos.map((t) => (
                <Chip key={t} label={a.kind[t]} selected={vigente.tipo === t} onPress={() => setFiltro({ ...vigente, tipo: t })} compact />
              ))}
            </ScrollView>
          ) : null}
          {colores.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros} style={styles.sinCrecer}>
              <Chip label={a.allColors} selected={!vigente.color} onPress={() => setFiltro({ ...vigente, color: null })} compact />
              {colores.map((c) => (
                <ColorSwatch
                  key={c}
                  hex={c}
                  label={a.colorFilter(nombreDeColor(c))}
                  selected={vigente.color === c}
                  onPress={() => setFiltro({ ...vigente, color: vigente.color === c ? null : c })}
                  size={28}
                />
              ))}
            </ScrollView>
          ) : null}
          <FlatList
            data={lista}
            keyExtractor={(x) => x.id}
            renderItem={({ item }) => <Fila anotacion={item} onPress={ir} autor={autoria?.(item) ?? null} />}
            ItemSeparatorComponent={Separador}
            ListEmptyComponent={
              <AppText variant="body" color="textSecondary" style={styles.textoCentro}>
                {a.emptyFilter}
              </AppText>
            }
            style={styles.lista}
          />
        </>
      )}
    </Sheet>
  );
}

function Separador() {
  const theme = useTheme();
  return <View style={[styles.separador, { backgroundColor: theme.border }]} />;
}

const Fila = memo(function Fila({ anotacion, onPress, autor }: { anotacion: LibraryAnnotation; onPress: (a: LibraryAnnotation) => void; autor: string | null }) {
  const theme = useTheme();
  const a = useT().library.annotations;
  const Icono = ICONOS[anotacion.kind];
  const color = colorDe(anotacion);
  const texto = textoDe(anotacion);
  const nota = notaDe(anotacion);
  const l = anotacion.locator;
  const lugar = l.page != null ? a.page(l.page) : a.percent(Math.round((l.fraction ?? 0) * 100));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[a.rowA11y(a.kindOne[anotacion.kind], nota ? `${texto || a.emptyText}. ${a.note}: ${nota}` : texto || a.emptyText, lugar), autor].filter(Boolean).join('. ')}
      onPress={() => onPress(anotacion)}
      style={({ pressed }) => [styles.fila, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
      <Icono size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
      {color ? <ColorDot hex={color} size={12} background={theme.surface} /> : null}
      <View style={styles.cuerpo}>
        <AppText variant="label" color="textSecondary">
          {autor ? `${a.kindOne[anotacion.kind]} · ${autor}` : a.kindOne[anotacion.kind]}
        </AppText>
        <AppText variant="body" numberOfLines={2} color={texto ? 'text' : 'textTertiary'}>
          {texto || a.emptyText}
        </AppText>
        {nota ? (
          <AppText variant="label" color="textSecondary" numberOfLines={2}>
            {a.note}: {nota}
          </AppText>
        ) : null}
      </View>
      <AppText variant="label" color="textSecondary" tabular>
        {lugar}
      </AppText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  textoCentro: { textAlign: 'center', paddingVertical: Spacing.lg },
  filtros: { gap: Spacing.sm, alignItems: 'center', paddingVertical: Spacing.xs },
  sinCrecer: { flexGrow: 0 },
  lista: { flex: 1 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 56,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  cuerpo: { flex: 1, gap: 2 },
  separador: { height: StyleSheet.hairlineWidth, marginLeft: Spacing['2xl'] },
});
