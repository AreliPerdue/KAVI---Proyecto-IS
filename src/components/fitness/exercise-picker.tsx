import { Archive, Check, ChevronDown, Ellipsis, Plus, Search, Star, X } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, TextInput, type TextStyle, View } from 'react-native';

import { AppText, Chip, IconButton, Sheet } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useExerciseMutations, useExercisePrefs, useExercises } from '@/hooks/use-exercises';
import { useTheme } from '@/hooks/use-theme';
import { equipmentName, exerciseName, muscleName } from '@/lib/gym/display-names';
import { isExactExercise, searchExercises } from '@/lib/gym/search';
import type { Exercise } from '@/types/domain';
import { type Dictionary, type Language, useLanguage, useT } from '@/i18n';

/** Alto fijo de la fila: deja que la lista calcule posiciones sin medir cada una. */
const ALTO_FILA = 64;

const SIN_ANILLO: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle) : {};

type Filtro = 'muscle' | 'equipment' | 'pattern' | 'mechanic';

const FILTROS: Filtro[] = ['muscle', 'equipment', 'pattern', 'mechanic'];

/** Qué ofrece cada filtro, con su etiqueta en el idioma de la interfaz (RF-F23). */
function opciones(tx: Dictionary): Record<Filtro, { titulo: string; valores: Record<string, string> }> {
  const { filters, mechanics } = tx.fitness.picker;
  return {
    muscle: { titulo: filters.muscle, valores: tx.catalog.muscles },
    equipment: { titulo: filters.equipment, valores: tx.catalog.equipment },
    pattern: { titulo: filters.pattern, valores: tx.catalog.patterns },
    mechanic: { titulo: filters.mechanic, valores: mechanics },
  };
}

const etiquetaMusculos = (e: Exercise, lang: Language) =>
  e.primary_muscles.slice(0, 2).map((m) => muscleName(m, lang)).join(', ');
const etiquetaEquipo = (e: Exercise, lang: Language) =>
  e.equipment.slice(0, 2).map((q) => equipmentName(q, lang)).join(', ');

function cumple(e: Exercise, filtros: Partial<Record<Filtro, string>>): boolean {
  if (filtros.muscle && !e.primary_muscles.includes(filtros.muscle)) return false;
  if (filtros.equipment && !e.equipment.includes(filtros.equipment)) return false;
  if (filtros.pattern && e.movement_pattern !== filtros.pattern) return false;
  if (filtros.mechanic && e.mechanic !== filtros.mechanic) return false;
  return true;
}

export type ExercisePickerProps = {
  visible: boolean;
  onClose: () => void;
  onPick: (exercise: Exercise) => void;
};

/**
 * Selector de ejercicios del catálogo (RF-F20 – RF-F25).
 *
 * Una sola hoja: buscador arriba, filtros debajo y la lista virtualizada, porque con 530
 * ejercicios un `ScrollView` pintaría todos de golpe. Los filtros se despliegan en línea,
 * sin abrir otra hoja encima (nada de modales anidados, kavi-design).
 *
 * Escribir un nombre que no existe ofrece crearlo como personalizado al vuelo: así nunca
 * se pierde la libertad de v1 de anotar el ejercicio "a tu manera" (RF-F24).
 */
export function ExercisePicker({ visible, onClose, onPick }: ExercisePickerProps) {
  const theme = useTheme();
  const tx = useT();
  const OPCIONES = opciones(tx);
  const catalogo = useExercises();
  const prefs = useExercisePrefs();
  const { createCustom, toggleFavorite, markUsed, updateCustom } = useExerciseMutations();
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState<Partial<Record<Filtro, string>>>({});
  const [filtroAbierto, setFiltroAbierto] = useState<Filtro | null>(null);
  const [menuDe, setMenuDe] = useState<string | null>(null);

  const favoritos = useMemo(() => new Set((prefs.data ?? []).filter((p) => p.is_favorite).map((p) => p.exercise_id)), [prefs.data]);
  const recientes = useMemo(
    () =>
      (prefs.data ?? [])
        .filter((p) => p.last_used_at)
        .sort((a, b) => (b.last_used_at as string).localeCompare(a.last_used_at as string))
        .slice(0, 8)
        .map((p) => p.exercise_id),
    [prefs.data],
  );
  const recientesSet = useMemo(() => new Set(recientes), [recientes]);

  const resultados = useMemo(() => {
    // Los personalizados archivados no se ofrecen; siguen existiendo para el historial.
    const vivos = (catalogo.data ?? []).filter((e) => !e.archived_at && cumple(e, filtros));
    return searchExercises(vivos, busqueda, catalogo.index, { recentIds: recientes, favoriteIds: favoritos });
  }, [catalogo.data, catalogo.index, busqueda, filtros, recientes, favoritos]);

  /** ¿Lo escrito ya es el nombre exacto de un ejercicio? Si no, se ofrece crearlo. */
  const q = busqueda.trim();
  const existeExacto = useMemo(() => isExactExercise(q, catalogo.index), [catalogo.index, q]);

  const cerrar = useCallback(() => {
    setBusqueda('');
    setFiltros({});
    setFiltroAbierto(null);
    setMenuDe(null);
    onClose();
  }, [onClose]);

  const elegir = useCallback(
    (e: Exercise) => {
      markUsed.mutate(e.id);
      onPick(e);
      cerrar();
    },
    [markUsed, onPick, cerrar],
  );

  const crear = () =>
    createCustom.mutate({ name_es: q }, { onSuccess: (nuevo) => elegir(nuevo) });

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <Fila
        exercise={item}
        favorito={favoritos.has(item.id)}
        reciente={recientesSet.has(item.id)}
        menuAbierto={menuDe === item.id}
        onPick={elegir}
        onToggleFavorito={(e, fav) => toggleFavorite.mutate({ exerciseId: e.id, favorite: fav })}
        onToggleMenu={(e) => setMenuDe((actual) => (actual === e.id ? null : e.id))}
        onArchivar={(e) => {
          setMenuDe(null);
          updateCustom.mutate({ id: e.id, patch: { archived: true } });
        }}
      />
    ),
    [favoritos, recientesSet, menuDe, elegir, toggleFavorite, updateCustom],
  );

  return (
    <Sheet visible={visible} onClose={cerrar} title={tx.fitness.picker.title} scrollable={false} maxHeightRatio={0.9}>
      <View style={[styles.buscador, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
        <Search size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder={tx.fitness.picker.searchPlaceholder}
          placeholderTextColor={theme.textTertiary}
          accessibilityLabel={tx.fitness.picker.searchA11y}
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.buscadorInput, SIN_ANILLO, { color: theme.text }]}
        />
        {busqueda ? (
          <IconButton label={tx.fitness.picker.clearSearch} onPress={() => setBusqueda('')}>
            <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
          </IconButton>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosScroll} contentContainerStyle={styles.filtros}>
        {FILTROS.map((f) => {
          const valor = filtros[f];
          const etiqueta = valor ? OPCIONES[f].valores[valor] : OPCIONES[f].titulo;
          return (
            <Chip
              key={f}
              compact
              label={etiqueta}
              selected={!!valor || filtroAbierto === f}
              icon={valor ? <X size={14} strokeWidth={IconStroke} color={theme.onInk} /> : <ChevronDown size={14} strokeWidth={IconStroke} color={theme.textSecondary} />}
              onPress={() => {
                if (valor) {
                  // Un filtro activo se quita con el mismo toque que lo puso.
                  setFiltros(({ [f]: _quitado, ...resto }) => resto);
                  setFiltroAbierto(null);
                } else {
                  setFiltroAbierto((actual) => (actual === f ? null : f));
                }
              }}
            />
          );
        })}
      </ScrollView>

      {filtroAbierto ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosScroll} contentContainerStyle={styles.filtros}>
          {Object.entries(OPCIONES[filtroAbierto].valores).map(([clave, etiqueta]) => (
            <Chip
              key={clave}
              compact
              label={etiqueta}
              selected={false}
              onPress={() => {
                setFiltros((previos) => ({ ...previos, [filtroAbierto]: clave }));
                setFiltroAbierto(null);
              }}
            />
          ))}
        </ScrollView>
      ) : null}

      <FlatList
        data={resultados}
        keyExtractor={(e) => e.id}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({ length: ALTO_FILA, offset: ALTO_FILA * index, index })}
        initialNumToRender={14}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        style={styles.lista}
        ListHeaderComponent={
          !existeExacto ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tx.fitness.picker.createA11y(q)}
              onPress={crear}
              disabled={createCustom.isPending}
              style={({ pressed }) => [styles.crear, { borderColor: theme.border }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
              <Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />
              <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                {tx.fitness.picker.create(q)}
              </AppText>
              <AppText variant="caption" color="textTertiary">
                {tx.fitness.picker.custom}
              </AppText>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          catalogo.isPending ? (
            <AppText color="textSecondary" style={styles.vacio}>
              {tx.fitness.picker.loadingCatalog}
            </AppText>
          ) : q ? null : (
            <AppText color="textSecondary" style={styles.vacio}>
              {tx.fitness.picker.nothingWithFilters}
            </AppText>
          )
        }
      />
    </Sheet>
  );
}

type FilaProps = {
  exercise: Exercise;
  favorito: boolean;
  reciente: boolean;
  menuAbierto: boolean;
  onPick: (e: Exercise) => void;
  onToggleFavorito: (e: Exercise, favorito: boolean) => void;
  onToggleMenu: (e: Exercise) => void;
  onArchivar: (e: Exercise) => void;
};

/**
 * Una fila del selector. Tocarla elige; la estrella marca favorito sin elegir. Los
 * personalizados llevan además un menú en línea para archivarlos.
 */
const Fila = memo(function Fila({ exercise, favorito, reciente, menuAbierto, onPick, onToggleFavorito, onToggleMenu, onArchivar }: FilaProps) {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const p = tx.fitness.picker;
  const nombre = exerciseName(exercise, lang);
  const propio = exercise.created_by !== null;
  const detalle = [etiquetaMusculos(exercise, lang), etiquetaEquipo(exercise, lang)].filter(Boolean).join(' · ');

  if (menuAbierto) {
    return (
      <View style={[styles.fila, styles.menu, { backgroundColor: theme.surfaceAlt }]}>
        <AppText variant="label" numberOfLines={1} style={styles.flex}>
          {nombre}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={p.archiveA11y(nombre)}
          onPress={() => onArchivar(exercise)}
          style={({ pressed }) => [styles.accionMenu, pressed ? styles.pressed : null]}>
          <Archive size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />
          <AppText variant="label">{p.archive}</AppText>
        </Pressable>
        <IconButton label={p.closeOptions} onPress={() => onToggleMenu(exercise)}>
          <Check size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        </IconButton>
      </View>
    );
  }

  return (
    <View style={styles.fila}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={p.chooseA11y(nombre)}
        onPress={() => onPick(exercise)}
        style={({ pressed }) => [styles.tocable, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
        <View style={styles.flex}>
          <AppText variant="body" numberOfLines={1}>
            {nombre}
          </AppText>
          <AppText variant="caption" color="textTertiary" numberOfLines={1}>
            {[reciente ? p.recent : null, propio ? p.yours : null, detalle || null].filter(Boolean).join(' · ')}
          </AppText>
        </View>
      </Pressable>
      {propio ? (
        <IconButton label={p.optionsFor(nombre)} onPress={() => onToggleMenu(exercise)}>
          <Ellipsis size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
        </IconButton>
      ) : null}
      <IconButton
        label={favorito ? p.unfavorite(nombre) : p.favorite(nombre)}
        onPress={() => onToggleFavorito(exercise, !favorito)}>
        <Star
          size={IconSize.inline}
          strokeWidth={IconStroke}
          color={favorito ? theme.text : theme.textTertiary}
          fill={favorito ? theme.text : 'transparent'}
        />
      </IconButton>
    </View>
  );
});

const styles = StyleSheet.create({
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    paddingLeft: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  buscadorInput: { flex: 1, fontSize: 16, paddingVertical: Spacing.sm },
  filtrosScroll: { flexGrow: 0 },
  filtros: { gap: Spacing.xs, alignItems: 'center' },
  lista: { flex: 1 },
  fila: { height: ALTO_FILA, flexDirection: 'row', alignItems: 'center' },
  tocable: {
    flex: 1,
    height: ALTO_FILA - 8,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  menu: { gap: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: Radius.md, borderCurve: 'continuous' },
  accionMenu: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, minHeight: 44, paddingHorizontal: Spacing.sm },
  crear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  vacio: { padding: Spacing.lg, textAlign: 'center' },
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
});
