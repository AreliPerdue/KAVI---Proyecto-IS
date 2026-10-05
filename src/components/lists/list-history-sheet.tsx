import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText, EmptyState, LoadingState, Sheet } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useListHistory } from '@/hooks/use-lists';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate, fromDayKey } from '@/lib/dates';
import { resumirVueltas } from '@/lib/list-runs';
import { useLanguage, useT } from '@/i18n';

export type ListHistorySheetProps = {
  visible: boolean;
  onClose: () => void;
  listId: string;
  accent: string;
};

/**
 * Cómo te ha ido con una rutina (RF-L21).
 *
 * **Cuenta lo hecho, nunca lo que falta.** Sin porcentaje de incumplimiento, sin racha, sin
 * nada que se pueda romper: un número que se rompe convierte un mal día en una pérdida, y
 * ese es el momento en que la gente abandona la rutina y de paso la app que se la recuerda.
 *
 * Las vueltas sueltas se muestran como "5 de 7" y no como un porcentaje. Quien quiera leer
 * una proporción la lee; la app no la convierte en calificación.
 */
export function ListHistorySheet({ visible, onClose, listId, accent }: ListHistorySheetProps) {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const historial = useListHistory(visible ? listId : undefined);
  const vueltas = historial.data ?? [];
  const resumen = resumirVueltas(vueltas);

  return (
    <Sheet visible={visible} onClose={onClose} title={tx.lists.historyTitle}>
      {historial.isPending ? <LoadingState /> : null}

      {historial.isSuccess && vueltas.length === 0 ? (
        <EmptyState
          title={tx.lists.noRunsTitle}
          description={tx.lists.noRunsDescription}
        />
      ) : null}

      {vueltas.length > 0 ? (
        <ScrollView contentContainerStyle={styles.cuerpo} showsVerticalScrollIndicator={false}>
          <View style={[styles.titular, { borderColor: accent }]}>
            <AppText variant="display" tabular>
              {resumen.completas}
            </AppText>
            <AppText variant="body" color="textSecondary">
              {tx.lists.timesComplete(resumen.completas)}
            </AppText>
          </View>

          <AppText variant="caption" color="textTertiary">
            {tx.lists.runsLogged(resumen.registradas)}
            {resumen.promedioTotal > 0 ? tx.lists.averagePerRun(resumen.promedioHechos, resumen.promedioTotal) : ''}
          </AppText>

          <View style={styles.lista}>
            {vueltas.map((v) => {
              const completa = v.total_count > 0 && v.completed_count >= v.total_count;
              return (
                <View key={v.id} style={styles.fila}>
                  <AppText variant="body" color="textSecondary" style={styles.fecha}>
                    {formatShortDate(fromDayKey(v.run_date), lang)}
                  </AppText>
                  <AppText variant="bodyStrong" color={completa ? 'text' : 'textSecondary'} tabular>
                    {v.completed_count} de {v.total_count}
                  </AppText>
                  {/* El punto marca las completas. Lo demás no se señala: no hay nada que señalar. */}
                  <View style={[styles.punto, completa ? { backgroundColor: accent } : null]} />
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.md, paddingBottom: Spacing.md },
  titular: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  lista: { gap: Spacing.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 36 },
  fecha: { flex: 1 },
  punto: { width: 8, height: 8, borderRadius: 4 },
});
