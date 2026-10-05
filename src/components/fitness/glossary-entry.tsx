import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import type { GlossaryEntry } from '@/constants/glossary';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/** Una entrada del glosario: qué significa, un ejemplo y la idea en pocas palabras (RF-F64). */
export function GlossaryEntryBody({ entry }: { entry: GlossaryEntry }) {
  const theme = useTheme();
  const g = useT().glossary;
  return (
    <View style={styles.cuerpo}>
      <AppText>{entry.meaning}</AppText>
      <View style={[styles.ejemplo, { backgroundColor: theme.surfaceAlt }]}>
        <AppText variant="label" color="textSecondary">
          {g.example}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {entry.example}
        </AppText>
      </View>
      <AppText variant="bodyStrong">{entry.short}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.sm },
  ejemplo: { gap: 2, padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous' },
});
