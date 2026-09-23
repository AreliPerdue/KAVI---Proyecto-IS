import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

import { Colors, type ColorScheme, type ThemeColors } from '@/constants/theme';
import { usePreferencesStore } from '@/store/preferences-store';

/** Punto de partida cuando no hay preferencia guardada: KAVI nació en oscuro. */
export const DEFAULT_SCHEME: ColorScheme = 'dark';

/**
 * Esquema activo, resuelto desde la preferencia (NFR-18).
 *
 * Con `system` se sigue al teléfono; con `light` o `dark` se fija. El valor del
 * sistema puede llegar `null` —en web antes de hidratar, o en un dispositivo sin
 * preferencia—, y en ese caso se cae al oscuro en lugar de parpadear a claro.
 */
export function useSchemeFromPreference(): ColorScheme {
  const appearance = usePreferencesStore((s) => s.appearance);
  const delSistema = useColorScheme();
  if (appearance === 'light' || appearance === 'dark') return appearance;
  return delSistema === 'light' || delSistema === 'dark' ? delSistema : DEFAULT_SCHEME;
}

/**
 * El esquema se reparte por contexto y **no** lo resuelve cada componente por su
 * cuenta (RF-N/NFR-18).
 *
 * Con una suscripción por componente basta con que uno no se vuelva a renderizar para
 * que se quede pintado con el tema anterior, y la pantalla acaba a medias: fondos
 * oscuros con contenido claro. Pasaba en Android bajo la barra de pestañas nativa, que
 * mantiene montadas las pantallas de cada pestaña y no las re-renderiza al cambiar un
 * estado de arriba. Un cambio de contexto sí atraviesa memoización y contenedores
 * nativos: o cambia todo el subárbol, o no cambia nada.
 *
 * `null` significa "sin proveedor". Se distingue de un esquema válido para que el
 * respaldo sea deliberado y no un valor por omisión que tape un árbol mal montado.
 */
const SchemeContext = createContext<ColorScheme | null>(null);

export function ThemeSchemeProvider({ scheme, children }: { scheme: ColorScheme; children: React.ReactNode }) {
  return <SchemeContext.Provider value={scheme}>{children}</SchemeContext.Provider>;
}

/**
 * Esquema activo. Fuera del proveedor —una prueba que monta un componente suelto— se
 * resuelve igual que antes, para que montar sin él siga funcionando.
 */
export function useResolvedScheme(): ColorScheme {
  const delContexto = useContext(SchemeContext);
  const propio = useSchemeFromPreference();
  return delContexto ?? propio;
}

export function useTheme(): ThemeColors {
  return Colors[useResolvedScheme()];
}
