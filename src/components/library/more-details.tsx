import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, TextField } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { LibraryItem } from '@/types/domain';

/** Los más datos como los escribe la persona (todo texto) mientras se editan. */
export type MasDatos = { publisher: string; publish_place: string; edition: string; chapter_count: string; synopsis: string };

export const MAS_DATOS_VACIOS: MasDatos = { publisher: '', publish_place: '', edition: '', chapter_count: '', synopsis: '' };

export function masDatosDe(item: Partial<Pick<LibraryItem, 'publisher' | 'publish_place' | 'edition' | 'chapter_count' | 'synopsis'>>): MasDatos {
  return {
    publisher: item.publisher ?? '',
    publish_place: item.publish_place ?? '',
    edition: item.edition ?? '',
    chapter_count: item.chapter_count != null ? String(item.chapter_count) : '',
    synopsis: item.synopsis ?? '',
  };
}

/** Lo que se guarda: vacío es `null`, y los capítulos, un entero no negativo o nada. */
export function masDatosParaGuardar(d: MasDatos): Pick<LibraryItem, 'publisher' | 'publish_place' | 'edition' | 'chapter_count' | 'synopsis'> {
  const texto = (v: string) => v.trim() || null;
  const capitulos = Number.parseInt(d.chapter_count.trim(), 10);
  return {
    publisher: texto(d.publisher),
    publish_place: texto(d.publish_place),
    edition: texto(d.edition),
    chapter_count: Number.isFinite(capitulos) && capitulos >= 0 ? capitulos : null,
    synopsis: texto(d.synopsis),
  };
}

/**
 * "Más datos" del libro (RF-BL19, de KAVI Reader): editorial, lugar de publicación, edición, número de
 * capítulos y sinopsis. Todos opcionales, plegados por omisión para que importar siga siendo rápido;
 * se abren solos si ya hay alguno.
 */
export function MoreDetails({ value, onChange }: { value: MasDatos; onChange: (d: MasDatos) => void }) {
  const theme = useTheme();
  const t = useT().library.more;
  const [abierto, setAbierto] = useState(() => Object.values(value).some((v) => v.trim()));
  const poner = (campo: keyof MasDatos) => (v: string) => onChange({ ...value, [campo]: v });
  return (
    <View style={styles.contenido}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        accessibilityLabel={t.title}
        onPress={() => setAbierto((a) => !a)}
        style={({ pressed }) => [styles.cabecera, pressed ? styles.presionada : null]}>
        <AppText variant="label" color="textSecondary" style={styles.flex}>
          {t.title}
        </AppText>
        {abierto ? (
          <ChevronUp size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        ) : (
          <ChevronDown size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        )}
      </Pressable>
      {abierto ? (
        <View style={styles.campos}>
          <TextField label={t.publisher} value={value.publisher} onChangeText={poner('publisher')} autoCapitalize="words" />
          <TextField label={t.place} value={value.publish_place} onChangeText={poner('publish_place')} autoCapitalize="words" />
          <View style={styles.fila}>
            <View style={styles.flex}>
              <TextField label={t.edition} placeholder={t.editionPlaceholder} value={value.edition} onChangeText={poner('edition')} />
            </View>
            <View style={styles.flex}>
              <TextField label={t.chapters} value={value.chapter_count} onChangeText={poner('chapter_count')} keyboardType="number-pad" />
            </View>
          </View>
          <TextField label={t.synopsis} value={value.synopsis} onChangeText={poner('synopsis')} multiline numberOfLines={5} style={styles.sinopsis} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: Spacing.sm },
  cabecera: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  flex: { flex: 1 },
  campos: { gap: Spacing.lg },
  fila: { flexDirection: 'row', gap: Spacing.md },
  sinopsis: { minHeight: 120, textAlignVertical: 'top' },
  presionada: { opacity: 0.85 },
});
