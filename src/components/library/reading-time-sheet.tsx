import { StyleSheet, View } from 'react-native';

import { ReadingSummary, useDuracion } from './reading-summary';

import { AppText, Sheet } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useReadingSessions } from '@/hooks/use-reading-sessions';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { LibraryItem } from '@/types/domain';

const LIBROS = 5;

/**
 * El tiempo de lectura de toda la biblioteca (spec 13b, RF-BR13; T318): el resumen, los libros en que más
 * se ha leído y las sesiones, cada una con su libro.
 */
export function ReadingTimeSheet({ visible, onClose, piezas }: { visible: boolean; onClose: () => void; piezas: readonly LibraryItem[] }) {
  const theme = useTheme();
  const t = useT().library.time;
  const sesiones = useReadingSessions();
  const duracion = useDuracion();
  const porId = new Map(piezas.map((p) => [p.id, p]));
  // Las de libros que ya no están no cuentan (se borran con el libro; esto cubre lo que aún no se refresca).
  const lista = (sesiones.data ?? []).filter((s) => porId.has(s.item_id));
  const porLibro = new Map<string, number>();
  for (const s of lista) porLibro.set(s.item_id, (porLibro.get(s.item_id) ?? 0) + s.seconds);
  const masLeidos = [...porLibro.entries()].sort((a, b) => b[1] - a[1]).slice(0, LIBROS);

  return (
    <Sheet visible={visible} onClose={onClose} title={t.title}>
      <View style={styles.cuerpo}>
        <AppText variant="caption" color="textSecondary">
          {t.hint}
        </AppText>
        {masLeidos.length > 1 ? (
          <View style={styles.seccion}>
            <AppText variant="label" color="textSecondary">
              {t.perBook}
            </AppText>
            {masLeidos.map(([id, segundos]) => (
              <View key={id} style={[styles.fila, { borderColor: theme.border }]}>
                <AppText variant="body" numberOfLines={1} style={styles.flex}>
                  {porId.get(id)?.title}
                </AppText>
                <AppText variant="bodyStrong" tabular>
                  {duracion(segundos)}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
        <ReadingSummary sesiones={lista} piezas={porId} vacio={t.empty} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.md },
  seccion: { gap: Spacing.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1 },
});
