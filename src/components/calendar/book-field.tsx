import { BookOpen, Check } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { BookCover } from '@/components/library/book-cover';
import { AppText, Button, FieldButton, Sheet, TextField } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useLibraryItems } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { plegar } from '@/lib/library/filters';
import type { LibraryItem } from '@/types/domain';

/**
 * Campo "Libro" de una actividad de Lectura (spec 13 §4, T302): liga la actividad a un libro de mi Biblioteca
 * para abrirlo desde ella donde iba. Es opcional; "Sin libro" lo quita.
 */
export function BookField({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const theme = useTheme();
  const f = useT().calendar.form;
  const [abierto, setAbierto] = useState(false);
  const piezas = useLibraryItems();
  const elegido = value ? (piezas.data?.find((p) => p.id === value) ?? null) : null;

  const elegir = useCallback(
    (id: string | null) => {
      onChange(id);
      setAbierto(false);
    },
    [onChange],
  );

  return (
    <>
      <FieldButton
        label={f.book}
        value={elegido?.title ?? null}
        placeholder={f.bookNone}
        onPress={() => setAbierto(true)}
        leading={<BookOpen size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
      />
      <Sheet visible={abierto} onClose={() => setAbierto(false)} title={f.bookTitle} scrollable={false} maxHeightRatio={0.8}>
        <ListaDeLibros piezas={piezas.data} cargando={piezas.isPending} error={piezas.isError} onReintentar={() => void piezas.refetch()} valor={value} onElegir={elegir} />
      </Sheet>
    </>
  );
}

function ListaDeLibros({
  piezas,
  cargando,
  error,
  onReintentar,
  valor,
  onElegir,
}: {
  piezas: LibraryItem[] | undefined;
  cargando: boolean;
  error: boolean;
  onReintentar: () => void;
  valor: string | null;
  onElegir: (id: string | null) => void;
}) {
  const theme = useTheme();
  const tx = useT();
  const f = tx.calendar.form;
  const [busqueda, setBusqueda] = useState('');
  const termino = plegar(busqueda.trim());
  const lista = useMemo(
    () => (piezas ?? []).filter((p) => !termino || plegar(p.title).includes(termino) || p.authors.some((a) => plegar(a).includes(termino))),
    [piezas, termino],
  );

  if (cargando && !piezas) {
    return (
      <View style={styles.centro} accessibilityLiveRegion="polite">
        <ActivityIndicator color={theme.textSecondary} />
      </View>
    );
  }
  if (error && !piezas) {
    return (
      <View style={styles.centro} accessibilityRole="alert">
        <AppText variant="body">{f.bookError}</AppText>
        <Button title={tx.common.retry} variant="secondary" onPress={onReintentar} />
      </View>
    );
  }

  return (
    <View style={styles.cuerpo}>
      {piezas?.length ? <TextField label={f.bookSearch} value={busqueda} onChangeText={setBusqueda} returnKeyType="search" /> : null}
      <FlatList
        data={lista}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<Fila titulo={f.bookNone} elegida={!valor} onPress={() => onElegir(null)} />}
        ListEmptyComponent={
          <AppText variant="body" color="textSecondary" style={styles.vacio}>
            {piezas?.length ? f.bookNoResults : f.bookEmpty}
          </AppText>
        }
        renderItem={({ item }) => <Fila pieza={item} titulo={item.title} autores={item.authors.join(', ')} elegida={item.id === valor} onPress={() => onElegir(item.id)} />}
      />
    </View>
  );
}

const Fila = memo(function Fila({
  pieza,
  titulo,
  autores,
  elegida,
  onPress,
}: {
  pieza?: LibraryItem;
  titulo: string;
  autores?: string;
  elegida: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: elegida }}
      accessibilityLabel={autores ? `${titulo}, ${autores}` : titulo}
      onPress={onPress}
      style={({ pressed }) => [styles.fila, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
      {pieza ? (
        <BookCover item={pieza} width={36} thumb />
      ) : (
        <View style={styles.sinPortada}>
          <BookOpen size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        </View>
      )}
      <View style={styles.texto}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {titulo}
        </AppText>
        {autores ? (
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {autores}
          </AppText>
        ) : null}
      </View>
      {elegida ? <Check size={IconSize.inline} strokeWidth={IconStroke} color={theme.ink} /> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cuerpo: { flexShrink: 1, gap: Spacing.sm },
  centro: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  vacio: { paddingVertical: Spacing.lg, textAlign: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 56, paddingVertical: Spacing.sm },
  sinPortada: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1, gap: 2 },
});
