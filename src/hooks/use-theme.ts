import { useColorScheme } from 'react-native';

import { Colors, type ColorScheme, type ThemeColors } from '@/constants/theme';
import { usePreferencesStore } from '@/store/preferences-store';

/** Punto de partida cuando no hay preferencia guardada: KAVI nació en oscuro. */
export const DEFAULT_SCHEME: ColorScheme = 'dark';

/**
 * Esquema activo (NFR-18).
 *
 * Con `system` se sigue al teléfono; con `light` o `dark` se fija. El valor del
 * sistema puede llegar `null` —en web antes de hidratar, o en un dispositivo sin
 * preferencia—, y en ese caso se cae al oscuro en lugar de parpadear a claro.
 */
export function useResolvedScheme(): ColorScheme {
  const appearance = usePreferencesStore((s) => s.appearance);
  const delSistema = useColorScheme();
  if (appearance === 'light' || appearance === 'dark') return appearance;
  return delSistema === 'light' || delSistema === 'dark' ? delSistema : DEFAULT_SCHEME;
}

export function useTheme(): ThemeColors {
  return Colors[useResolvedScheme()];
}
