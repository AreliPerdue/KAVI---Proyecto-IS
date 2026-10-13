import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Banner, Button, Chip, Sheet, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useUpdateLibraryItem } from '@/hooks/use-library';
import { useT } from '@/i18n';
import { useSnackbar } from '@/providers';
import type { LibraryItem } from '@/types/domain';

export type EditItemSheetProps = { item: LibraryItem | null; onClose: () => void };

/** "Ana, Luis" → dos; vacío → ninguno. */
function lista(texto: string): string[] {
  return texto
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Editar los datos de una pieza (RF-BL16): título, autores, categoría (una sola, con sugerencias,
 * RF-BL9) y géneros. La portada se cambia aparte (T314).
 */
export function EditItemSheet({ item, onClose }: EditItemSheetProps) {
  const tx = useT();
  return (
    <Sheet visible={item !== null} onClose={onClose} title={tx.library.item.editTitle}>
      {item ? <Formulario key={item.id} item={item} onClose={onClose} /> : null}
    </Sheet>
  );
}

function Formulario({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const tx = useT();
  const l = tx.library;
  const m = l.item;
  const showSnackbar = useSnackbar();
  const actualizar = useUpdateLibraryItem();
  const [titulo, setTitulo] = useState(item.title);
  // Como al importar: lo que no se toca se guarda tal cual, sin partirlo por sus comas.
  const [autores, setAutores] = useState<string | null>(null);
  const [generos, setGeneros] = useState<string | null>(null);
  const [categoria, setCategoria] = useState(item.category ?? '');
  const [error, setError] = useState<string | null>(null);

  const guardar = () => {
    if (!titulo.trim()) {
      setError(m.titleRequired);
      return;
    }
    actualizar.mutate(
      {
        id: item.id,
        patch: {
          title: titulo.trim(),
          authors: autores === null ? item.authors : lista(autores),
          genres: generos === null ? item.genres : lista(generos),
          category: categoria.trim() || null,
        },
      },
      { onSuccess: () => showSnackbar({ message: m.saved }), onError: () => showSnackbar({ message: m.failed }) },
    );
    onClose();
  };

  return (
    <View style={styles.contenido}>
      <TextField
        label={l.fieldTitle}
        value={titulo}
        onChangeText={(t) => {
          setTitulo(t);
          setError(null);
        }}
        error={error ?? undefined}
        autoCapitalize="sentences"
      />
      <TextField label={l.fieldAuthors} hint={l.listHint} value={autores ?? item.authors.join(', ')} onChangeText={setAutores} autoCapitalize="words" />
      <View style={styles.categoria}>
        <TextField label={m.fieldCategory} hint={m.categoryHint} value={categoria} onChangeText={setCategoria} autoCapitalize="sentences" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          {m.categorySuggestions.map((c) => (
            <Chip key={c} label={c} compact selected={categoria.trim() === c} onPress={() => setCategoria(categoria.trim() === c ? '' : c)} />
          ))}
        </ScrollView>
      </View>
      <TextField label={l.fieldGenres} hint={l.listHint} value={generos ?? item.genres.join(', ')} onChangeText={setGeneros} />
      {actualizar.isError ? <Banner tone="error" message={m.failed} /> : null}
      <Button title={m.save} onPress={guardar} />
      <Button title={tx.common.cancel} variant="ghost" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: Spacing.lg },
  categoria: { gap: Spacing.sm },
  chips: { gap: Spacing.sm },
});
