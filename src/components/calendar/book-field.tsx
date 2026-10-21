import { BookOpen } from 'lucide-react-native';
import { useCallback, useState } from 'react';

import { BookList } from '@/components/library/book-list';
import { FieldButton, Sheet } from '@/components/ui';
import { IconSize, IconStroke } from '@/constants/theme';
import { useLibraryItems } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

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
        <BookList piezas={piezas.data} cargando={piezas.isPending} error={piezas.isError} onReintentar={() => void piezas.refetch()} valor={value} ninguno={f.bookNone} onElegir={elegir} />
      </Sheet>
    </>
  );
}
