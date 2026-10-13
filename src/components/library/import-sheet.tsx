import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BookCover } from './book-cover';
import { MAS_DATOS_VACIOS, MoreDetails, masDatosParaGuardar } from './more-details';
import { SeriesField } from './series-field';

import { AppText, Banner, Button, Sheet, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useImportBook } from '@/hooks/use-library';
import { useLanguage, useT } from '@/i18n';
import { bytesToBase64 } from '@/lib/library/base64';
import { formatBytes } from '@/lib/library/files';
import type { LibroLeido } from '@/lib/library/import';
import { leerNumeroDeSaga, numeroDeSaga } from '@/lib/library/series';
import { useSnackbar } from '@/providers';

export type ImportSheetProps = {
  /** El libro leído y el id que tendrá; `null` cierra la hoja. */
  pendiente: { id: string; libro: LibroLeido } | null;
  onClose: () => void;
};

/**
 * Revisar los datos antes de guardar un libro importado (RF-BL12): KAVI propone lo que leyó del
 * archivo y la persona corrige título, autores y géneros. La portada es la del archivo o la
 * generada, la misma que se verá en la librería.
 */
export function ImportSheet({ pendiente, onClose }: ImportSheetProps) {
  const tx = useT();
  return (
    <Sheet visible={!!pendiente} onClose={onClose} title={tx.library.reviewTitle}>
      {pendiente ? <Contenido key={pendiente.id} {...pendiente} onClose={onClose} /> : null}
    </Sheet>
  );
}

/** "Ana, Luis" → dos; vacío → ninguno. */
function lista(texto: string): string[] {
  return texto
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function Contenido({ id, libro, onClose }: { id: string; libro: LibroLeido; onClose: () => void }) {
  const tx = useT();
  const lang = useLanguage();
  const l = tx.library;
  const showSnackbar = useSnackbar();
  const importar = useImportBook();
  const { datos, archivo, formato, color } = libro;

  const [titulo, setTitulo] = useState(datos.title);
  // Lo que viene del archivo se guarda tal cual mientras no se toque: un autor "Cortázar, Julio"
  // no debe partirse en dos solo porque el campo separa con comas.
  const [autores, setAutores] = useState<string | null>(null);
  const [generos, setGeneros] = useState<string | null>(null);
  // La saga que trae el EPUB, si la trae (RF-BL24); se puede cambiar o quitar.
  const [saga, setSaga] = useState(datos.serie?.nombre ?? '');
  const [numero, setNumero] = useState(datos.serie?.numero != null ? numeroDeSaga(datos.serie.numero) : '');
  // Más datos (RF-BL19): el EPUB propone editorial y sinopsis.
  const [mas, setMas] = useState({ ...MAS_DATOS_VACIOS, publisher: datos.editorial ?? '', synopsis: datos.sinopsis ?? '' });

  const portada = useMemo(
    () => (datos.cover ? `data:${datos.cover.mime};base64,${bytesToBase64(datos.cover.bytes)}` : null),
    [datos.cover],
  );
  const vistaPrevia = { id, title: titulo.trim() || datos.title, authors: autores === null ? datos.authors : lista(autores), cover_path: null, cover_color: color };

  const guardar = () => {
    importar.mutate(
      {
        id,
        libro,
        title: titulo,
        authors: autores === null ? datos.authors : lista(autores),
        genres: generos === null ? datos.genres : lista(generos),
        serie: saga.trim() ? { nombre: saga, numero: leerNumeroDeSaga(numero) } : null,
        mas: masDatosParaGuardar(mas),
      },
      {
        onSuccess: (item) => {
          showSnackbar({ message: l.added(item.title) });
          onClose();
        },
      },
    );
  };

  return (
    <View style={styles.contenido}>
      <View style={styles.cabecera}>
        <BookCover item={vistaPrevia} width={88} uri={portada} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={3}>
            {vistaPrevia.title}
          </AppText>
          <AppText variant="caption" color="textSecondary" tabular>
            {l.bookMeta(formato.toUpperCase(), formatBytes(archivo.bytes.length, lang), datos.pageCount)}
          </AppText>
        </View>
      </View>

      <TextField label={l.fieldTitle} value={titulo} onChangeText={setTitulo} autoCapitalize="sentences" returnKeyType="next" />
      <TextField
        label={l.fieldAuthors}
        hint={l.listHint}
        value={autores ?? datos.authors.join(', ')}
        onChangeText={setAutores}
        autoCapitalize="words"
      />
      <TextField label={l.fieldGenres} hint={l.listHint} value={generos ?? datos.genres.join(', ')} onChangeText={setGeneros} />
      <SeriesField nombre={saga} onNombre={setSaga} numero={numero} onNumero={setNumero} />
      <MoreDetails value={mas} onChange={setMas} />

      {importar.isError ? <Banner tone="error" message={importar.error.message} /> : null}

      <Button title={l.add} onPress={guardar} loading={importar.isPending} />
      <Button title={tx.common.cancel} variant="ghost" onPress={onClose} disabled={importar.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: Spacing.lg },
  cabecera: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'center' },
  flex: { flex: 1, gap: Spacing.xs },
});
