import { Colors, type ColorScheme, type ThemeColors } from '@/constants/theme';

/** Tema por defecto del producto: KAVI es oscuro en las tres plataformas. */
export const DEFAULT_SCHEME: ColorScheme = 'dark';

/**
 * Esquema activo. KAVI se entrega en oscuro y no sigue la preferencia del sistema:
 * `app.json` fija `userInterfaceStyle: "dark"` en nativo y aquí se fija para web.
 * Los tokens claros siguen definidos en `constants/theme.ts` para cuando exista
 * un ajuste de apariencia en Perfil.
 */
export function useResolvedScheme(): ColorScheme {
  return DEFAULT_SCHEME;
}

export function useTheme(): ThemeColors {
  return Colors[useResolvedScheme()];
}
