import { StyleSheet, View } from "react-native";

import { AppText, Wordmark } from "@/components/ui";
import { Spacing } from "@/constants/theme";

export type AuthHeaderProps = {
  title: string;
  subtitle?: string;
  /** Muestra el eslogan bajo el wordmark (solo la pantalla de entrada). */
  slogan?: boolean;
};

/** Encabezado de las pantallas de auth: wordmark + puntos de las 7 dimensiones. */
export function AuthHeader({
  title,
  subtitle,
  slogan = false,
}: AuthHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Wordmark size={44} slogan={slogan} />
        {/*         <DimensionDots /> */}
      </View>
      <View style={styles.copy}>
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
        <AppText color="textSecondary">{subtitle}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xl },
  brand: { gap: Spacing.md },
  copy: { gap: Spacing.xs },
});
