import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor, Typography, type TypographyVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ThemeColor;
  /** Números tabulares para horas y fechas. */
  tabular?: boolean;
};

export function AppText({
  variant = 'body',
  color = 'text',
  tabular = false,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  return (
    <Text
      style={[
        styles.base,
        Typography[variant],
        { color: theme[color] },
        tabular ? styles.tabular : null,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { fontFamily: Fonts?.sans },
  tabular: { fontVariant: ['tabular-nums'] },
});
