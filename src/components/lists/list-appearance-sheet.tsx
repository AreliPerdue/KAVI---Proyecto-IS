import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { tint } from '@/components/calendar/activity-style';
import { AppText, ColorSwatch, Sheet, ThemeIcon } from '@/components/ui';
import { THEME_ICON_NAMES } from '@/constants/icons';
import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LIST_COLOR_OPTIONS } from '@/lib/schemas/list';
import { useT } from '@/i18n';

export type ListAppearanceSheetProps = {
  visible: boolean;
  onClose: () => void;
  color: string;
  icon: string;
  onChangeColor: (color: string) => void;
  onChangeIcon: (icon: string) => void;
};

/**
 * Color e icono de una lista, en una hoja aparte (RF-L2).
 *
 * Vivían en un formulario **antes** de poder escribir nada, y ese era el problema: una
 * lista se abre porque hay algo que apuntar ya, y elegir un color entre veinticinco mientras
 * tanto es justo el tiempo que tarda uno en olvidar qué iba a anotar. Aquí la
 * personalización es un extra al que se entra cuando se quiere, no un peaje.
 */
export function ListAppearanceSheet({
  visible,
  onClose,
  color,
  icon,
  onChangeColor,
  onChangeIcon,
}: ListAppearanceSheetProps) {
  const theme = useTheme();
  const tx = useT();

  return (
    <Sheet visible={visible} onClose={onClose} title={tx.lists.appearanceTitle}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cuerpo}>
        <View style={styles.seccion}>
          <AppText variant="label" color="textSecondary">
            {tx.lists.colorLabel}
          </AppText>
          <View style={styles.rejilla}>
            {LIST_COLOR_OPTIONS.map((c) => (
              <ColorSwatch key={c.id} hex={c.hex} label={tx.lists.colorA11y((tx.colors[c.id] ?? c.label).toLowerCase())} selected={color === c.hex} onPress={() => onChangeColor(c.hex)} />
            ))}
          </View>
        </View>

        <View style={styles.seccion}>
          <AppText variant="label" color="textSecondary">
            {tx.lists.iconLabel}
          </AppText>
          <View style={styles.rejilla}>
            {THEME_ICON_NAMES.map((n) => (
              <Pressable
                key={n}
                accessibilityRole="button"
                accessibilityLabel={tx.lists.iconA11y(n)}
                accessibilityState={{ selected: icon === n }}
                onPress={() => onChangeIcon(n)}
                style={({ pressed }) => [
                  styles.iconoCelda,
                  {
                    borderColor: icon === n ? color : theme.border,
                    backgroundColor: icon === n ? tint(color, 0.16) : 'transparent',
                  },
                  pressed ? styles.pressed : null,
                ]}>
                <ThemeIcon name={n} color={icon === n ? color : theme.textSecondary} size={IconSize.inline} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.lg, paddingBottom: Spacing.md },
  seccion: { gap: Spacing.sm },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconoCelda: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
});
