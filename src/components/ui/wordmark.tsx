import { StyleSheet, Text, View } from 'react-native';

import { Brand, BrandFonts, SLOGAN, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type WordmarkProps = {
  /** Tamaño del wordmark en px; el eslogan se escala en proporción. */
  size?: number;
  color?: ThemeColor;
  /** Muestra el eslogan bajo el wordmark, como en el logo. */
  slogan?: boolean;
};

/**
 * Wordmark de KAVI: "KAVI" en Moirai One, con el eslogan opcional en Poiret One.
 * Reproduce las proporciones del logo (`Brand`), así que ambas piezas escalan juntas.
 * Es la única parte de la app que usa fuentes que no son la del sistema.
 */
export function Wordmark({ size = 34, color = 'text', slogan = false }: WordmarkProps) {
  const theme = useTheme();
  const sloganSize = Math.round(size * Brand.sloganScale);

  return (
    <View style={styles.root}>
      {/* Sin `accessibilityRole="header"`: es la marca, no el encabezado de la
          pantalla. Marcarla como encabezado la anunciaba en la barra web de todas
          las pantallas y dejaba el título real fuera de la lista de encabezados. */}
      <Text
        style={[
          styles.wordmark,
          {
            color: theme[color],
            fontSize: size,
            // Moirai One es una display de contorno: necesita más caja que una sans.
            lineHeight: Math.round(size * 1.3),
            letterSpacing: size * Brand.wordmarkTracking,
          },
        ]}
      >
        KAVI
      </Text>
      {slogan ? (
        <Text
          style={[
            styles.slogan,
            {
              color: theme[color],
              fontSize: sloganSize,
              lineHeight: Math.round(sloganSize * 1.4),
              letterSpacing: sloganSize * Brand.sloganTracking,
            },
          ]}
        >
          {SLOGAN}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'flex-start' },
  wordmark: { fontFamily: BrandFonts.wordmark, includeFontPadding: false },
  slogan: { fontFamily: BrandFonts.slogan, includeFontPadding: false },
});
