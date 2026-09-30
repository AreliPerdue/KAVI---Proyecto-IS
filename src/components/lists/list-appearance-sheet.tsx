import { Check } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { tint } from '@/components/calendar/activity-style';
import { AppText, Sheet, ThemeIcon } from '@/components/ui';
import { THEME_ICON_NAMES } from '@/constants/icons';
import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LIST_COLORS } from '@/lib/schemas/list';

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
 * lista se abre porque hay algo que apuntar ya, y elegir un color entre veintiuno mientras
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

  return (
    <Sheet visible={visible} onClose={onClose} title="Color e icono">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cuerpo}>
        <View style={styles.seccion}>
          <AppText variant="label" color="textSecondary">
            Color
          </AppText>
          <View style={styles.rejilla}>
            {LIST_COLORS.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={`Color ${c}`}
                accessibilityState={{ selected: color === c }}
                onPress={() => onChangeColor(c)}
                style={({ pressed }) => [styles.punto, { backgroundColor: c }, pressed ? styles.pressed : null]}>
                {color === c ? <Check size={IconSize.inline} strokeWidth={3} color="#FFFFFF" /> : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.seccion}>
          <AppText variant="label" color="textSecondary">
            Icono
          </AppText>
          <View style={styles.rejilla}>
            {THEME_ICON_NAMES.map((n) => (
              <Pressable
                key={n}
                accessibilityRole="button"
                accessibilityLabel={`Icono ${n}`}
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
  punto: { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
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
