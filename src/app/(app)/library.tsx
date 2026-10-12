import { BookOpen, FlaskConical } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { AppText, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { LIBRARY_WARN_RATIO } from '@/constants/library';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useLibraryItems, useLibraryUsage } from '@/hooks/use-library';
import { useTheme } from '@/hooks/use-theme';
import { formatBytes } from '@/lib/library/files';
import { useLanguage, useT } from '@/i18n';

/**
 * KAVI Library, laboratorio (spec 13 §4, T276).
 *
 * Mientras se construye por etapas, Library no está en Más ni en la barra: se llega desde
 * Perfil → En desarrollo. Esta pantalla crece con cada etapa (L1: la librería de verdad) y en L7
 * pasa a ser el módulo visible.
 */
export default function LibraryScreen() {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const l = tx.library;
  const piezas = useLibraryItems();
  const espacio = useLibraryUsage();

  const usado = espacio.data?.usedBytes ?? 0;
  const tope = espacio.data?.limitBytes ?? 1;
  const proporcion = Math.min(1, usado / tope);
  const casiLlena = proporcion >= LIBRARY_WARN_RATIO;

  return (
    <Screen scroll contentStyle={styles.content}>
      <ModalHeader back title={l.title} />

      <View style={[styles.aviso, { backgroundColor: theme.surfaceAlt }]}>
        <FlaskConical size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        <View style={styles.flex}>
          <AppText variant="label">{l.inDevelopment}</AppText>
          <AppText variant="caption" color="textSecondary">
            {l.devHint}
          </AppText>
        </View>
      </View>

      {espacio.data ? (
        <View
          style={styles.espacio}
          accessible
          accessibilityLabel={l.usageA11y(formatBytes(usado, lang), formatBytes(tope, lang), Math.round(proporcion * 100))}>
          <View style={styles.espacioFila}>
            <AppText variant="caption" color="textSecondary">
              {piezas.data ? l.pieces(piezas.data.length) : ''}
            </AppText>
            <AppText variant="caption" color={casiLlena ? 'today' : 'textSecondary'} tabular>
              {l.usage(formatBytes(usado, lang), formatBytes(tope, lang))}
            </AppText>
          </View>
          <View style={[styles.barra, { backgroundColor: theme.surfaceAlt }]}>
            <View style={[styles.relleno, { width: `${proporcion * 100}%`, backgroundColor: casiLlena ? theme.today : theme.ink }]} />
          </View>
          {casiLlena ? (
            <AppText variant="caption" color="today">
              {l.usageAlmostFull}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {piezas.isPending ? <LoadingState /> : null}
      {piezas.isError ? <ErrorState message={piezas.error.message} onRetry={() => piezas.refetch()} /> : null}
      {piezas.isSuccess && piezas.data.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={32} strokeWidth={IconStroke} color={theme.textTertiary} />}
          title={l.emptyTitle}
          description={l.emptyDescription}
        />
      ) : null}
      {piezas.isSuccess
        ? piezas.data.map((p) => (
            <View key={p.id} style={[styles.pieza, { borderColor: theme.border }]}>
              <AppText variant="bodyStrong">{p.title}</AppText>
              {p.authors.length > 0 ? (
                <AppText variant="caption" color="textSecondary">
                  {p.authors.join(', ')}
                </AppText>
              ) : null}
            </View>
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.md },
  flex: { flex: 1, gap: 2 },
  aviso: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous' },
  espacio: { gap: Spacing.xs },
  espacioFila: { flexDirection: 'row', justifyContent: 'space-between' },
  barra: { height: 6, borderRadius: Radius.full, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: Radius.full },
  pieza: { padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', gap: 2 },
});
