import { StyleSheet, View } from 'react-native';

import { AppText, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';

/** Pantalla provisional de una sección aún no construida. */
export function PlaceholderScreen({ title, description }: { title: string; description: string }) {
  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      <View style={styles.body}>
        <AppText color="textSecondary">{description}</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.sm },
});
